import { createHash } from 'node:crypto';
import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { suggestIdeas } from '../../../../../../lib/idea-planner.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEA_FIELDS = ['topic', 'audience', 'notes', 'feedback', 'previousSuggestions'];
const inflight = new Map();

function failure(error) {
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(
    error.status || 422,
    error.code || 'PLANNER_REJECTED',
    error.message || 'Idea suggestions failed.',
  );
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

  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    const inputHash = createHash('sha256').update(JSON.stringify(parsed.body)).digest('hex');
    const key = `${session.user.id}:${id}:${inputHash}`;
    const pending = inflight.get(key) || suggestIdeas(parsed.body).finally(() => inflight.delete(key));
    inflight.set(key, pending);
    return jsonResult(200, await pending);
  } catch (error) {
    return failure(error);
  }
}
