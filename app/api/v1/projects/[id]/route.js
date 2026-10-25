import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import {
  deleteProject,
  getProject,
  ProjectRepositoryError,
  updateProject,
} from '../../../../../lib/projects-repository.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPDATE_FIELDS = [
  'title',
  'topic',
  'format',
  'formatId',
  'targetSeconds',
  'targetLabel',
  'aspect',
  'storyboard',
];

function repositoryFailure(error) {
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is temporarily unavailable.');
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    return jsonResult(200, { project });
  } catch (error) {
    return repositoryFailure(error);
  }
}

export async function PATCH(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, UPDATE_FIELDS);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  try {
    return jsonResult(200, { project: await updateProject(session.access, id, parsed.body) });
  } catch (error) {
    return repositoryFailure(error);
  }
}

export async function DELETE(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  try {
    await deleteProject(session.access, id);
    return jsonResult(200, { deleted: true });
  } catch (error) {
    return repositoryFailure(error);
  }
}
