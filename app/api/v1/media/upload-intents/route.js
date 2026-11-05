import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../lib/projects-repository.js';
import { createPrivateUploadUrl, MediaStorageError } from '../../../../../lib/r2-private.js';

export const dynamic = 'force-dynamic';

const FIELDS = ['projectId', 'kind', 'mime', 'bytes'];

function failure(error) {
  if (error instanceof MediaStorageError) {
    return errorResult(error.status, error.code, error.message);
  }
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'MEDIA_STORAGE_UNAVAILABLE', 'Private media storage is temporarily unavailable.');
}

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, FIELDS);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  const projectId = parsed.body.projectId;
  if (typeof projectId !== 'string') {
    return errorResult(422, 'INVALID_PROJECT', 'Choose a valid project.');
  }
  try {
    const project = await getProject(session.access, projectId);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    return jsonResult(201, await createPrivateUploadUrl({
      ownerId: session.user.id,
      projectId,
      kind: parsed.body.kind,
      mime: parsed.body.mime,
      bytes: parsed.body.bytes,
    }));
  } catch (error) {
    return failure(error);
  }
}
