import { createHash } from 'node:crypto';
import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { getIdeaSuggestions, IdeaSuggestionsError, saveIdeaSuggestions } from '../../../../../../lib/idea-suggestions-repository.js';
import { suggestIdeas } from '../../../../../../lib/idea-planner.js';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  consumeRateLimit,
  failIdempotentRequest,
} from '../../../../../../lib/request-safety.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEA_FIELDS = ['topic', 'audience', 'notes', 'feedback', 'previousSuggestions'];
const inflight = new Map();

function failure(error) {
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  if (error instanceof IdeaSuggestionsError) {
    const status = error.status === 401 || error.status === 403 ? 401 : error.status >= 500 ? 503 : 422;
    return errorResult(status, 'IDEA_SUGGESTIONS_UNAVAILABLE', 'Saved directions are temporarily unavailable.');
  }
  return errorResult(
    error.status || 422,
    error.code || 'PLANNER_REJECTED',
    error.message || 'Idea suggestions failed.',
  );
}

function rateLimitFailure(rate) {
  const reset = new Date(rate.resetAt).getTime();
  const retryAfter = Number.isFinite(reset) ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
  return errorResult(429, 'RATE_LIMITED', `Too many idea requests. Try again in ${retryAfter} seconds.`, { retryAfter });
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    return jsonResult(200, await getIdeaSuggestions(session.access, id));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, IDEA_FIELDS);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  let idempotent = { key: null };
  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    const rate = await consumeRateLimit(session.access, { bucket: 'ideas', limit: 20, windowSeconds: 3600 });
    if (rate.available && !rate.allowed) return rateLimitFailure(rate);
    idempotent = await beginIdempotentRequest(session.access, {
      ownerId: session.user.id,
      scope: `ideas:${id}`,
      clientKey: request.headers.get('idempotency-key'),
      body: parsed.body,
    });
    if (idempotent.state === 'replay') {
      return jsonResult(idempotent.response.status || 200, idempotent.response.body);
    }
    if (idempotent.state === 'in_progress') {
      return errorResult(409, 'REQUEST_IN_PROGRESS', 'These directions are already being generated.');
    }
    if (idempotent.state === 'mismatch') {
      return errorResult(422, 'IDEMPOTENCY_KEY_REUSED', 'Use a new idempotency key for a different request.');
    }
    if (idempotent.state === 'failed') {
      return errorResult(409, 'PREVIOUS_ATTEMPT_FAILED', 'The previous attempt failed. Try again.');
    }

    const inputHash = createHash('sha256').update(JSON.stringify(parsed.body)).digest('hex');
    const key = `${session.user.id}:${id}:${inputHash}`;
    const pending = inflight.get(key) || suggestIdeas(parsed.body).finally(() => inflight.delete(key));
    inflight.set(key, pending);
    const result = await pending;
    try {
      await saveIdeaSuggestions(session.access, id, {
        suggestions: result.suggestions,
        sourceTopic: parsed.body.topic,
      });
    } catch {
      // Generation is still usable if the optional persistence table is absent.
    }
    if (idempotent.key) await completeIdempotentRequest(session.access, idempotent.key, { status: 200, body: result });
    return jsonResult(200, result);
  } catch (error) {
    if (idempotent.key) {
      await failIdempotentRequest(session.access, idempotent.key, {
        status: error.status || 422,
        body: { message: error.message || 'Idea suggestions failed.' },
      });
    }
    return failure(error);
  }
}
