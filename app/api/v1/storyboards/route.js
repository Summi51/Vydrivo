import { guardMutation } from '../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../lib/auth-http.js';
import { draftStoryboard, reviewStoryboard } from '../../../../lib/storyboard-plan.js';
import { verifiedAccess } from '../../../../lib/api-session.js';

export const dynamic = 'force-dynamic';

const inflight = new Map();

function plannerError(error) {
  const status = error.status || 422;
  return errorResult(status, error.code || 'PLANNER_REJECTED', error.message || 'Storyboard draft failed.');
}

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['topic']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  const topic = String(parsed.body.topic || '');
  const pending = inflight.get(topic) || draftStoryboard(topic).finally(() => inflight.delete(topic));
  inflight.set(topic, pending);
  try {
    return jsonResult(200, await pending);
  } catch (error) {
    return plannerError(error);
  }
}

export async function PUT(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['storyboard', 'approved']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  try {
    return jsonResult(200, reviewStoryboard(parsed.body.storyboard, parsed.body.approved));
  } catch (error) {
    return plannerError(error);
  }
}
