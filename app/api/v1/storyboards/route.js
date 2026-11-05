import { guardMutation } from '../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../lib/auth-http.js';
import { draftStoryboard, reviewStoryboard } from '../../../../lib/storyboard-plan.js';
import { verifiedAccess } from '../../../../lib/api-session.js';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  consumeRateLimit,
  failIdempotentRequest,
} from '../../../../lib/request-safety.js';

export const dynamic = 'force-dynamic';

const inflight = new Map();

function plannerError(error) {
  const status = error.status || 422;
  return errorResult(status, error.code || 'PLANNER_REJECTED', error.message || 'Storyboard draft failed.');
}

function rateLimitFailure(rate) {
  const reset = new Date(rate.resetAt).getTime();
  const retryAfter = Number.isFinite(reset) ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
  return errorResult(429, 'RATE_LIMITED', `Too many storyboard requests. Try again in ${retryAfter} seconds.`, { retryAfter });
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
  let idempotent = { key: null };
  try {
    const rate = await consumeRateLimit(session.access, { bucket: 'storyboards', limit: 20, windowSeconds: 3600 });
    if (rate.available && !rate.allowed) return rateLimitFailure(rate);
    idempotent = await beginIdempotentRequest(session.access, {
      ownerId: session.user.id,
      scope: 'storyboards',
      clientKey: request.headers.get('idempotency-key'),
      body: parsed.body,
    });
    if (idempotent.state === 'replay') {
      return jsonResult(idempotent.response.status || 200, idempotent.response.body);
    }
    if (idempotent.state === 'in_progress') {
      return errorResult(409, 'REQUEST_IN_PROGRESS', 'This storyboard is already being drafted.');
    }
    if (idempotent.state === 'mismatch') {
      return errorResult(422, 'IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for a different request.');
    }
    if (idempotent.state === 'failed') {
      return errorResult(409, 'PREVIOUS_ATTEMPT_FAILED', 'The previous attempt failed. Try again.');
    }

    const pending = inflight.get(topic) || draftStoryboard(topic).finally(() => inflight.delete(topic));
    inflight.set(topic, pending);
    const result = await pending;
    if (idempotent.key) await completeIdempotentRequest(session.access, idempotent.key, { status: 200, body: result });
    return jsonResult(200, result);
  } catch (error) {
    if (idempotent.key) {
      await failIdempotentRequest(session.access, idempotent.key, {
        status: error.status || 422,
        body: { message: error.message || 'Storyboard draft failed.' },
      });
    }
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
