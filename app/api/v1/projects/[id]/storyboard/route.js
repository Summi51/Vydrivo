import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { updateProject, isProjectVersion, ProjectConflictError, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { listValidatedMediaAssetIds, MediaAssetError } from '../../../../../../lib/media-assets-repository.js';
import { storyboardHash, validateStoryboard } from '../../../../../../prototype/storyboard.mjs';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof ProjectConflictError) {
    return errorResult(409, error.code, error.message, { details: { project: error.project } });
  }
  if (error instanceof MediaAssetError) {
    return errorResult(error.status, error.code, error.message);
  }
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is temporarily unavailable.');
}

async function assertReferences(access, projectId, storyboard) {
  const scenes = Array.isArray(storyboard?.scenes) ? storyboard.scenes : [];
  const ids = scenes.map((scene) => scene?.referenceAssetId).filter(Boolean);
  if (!ids.length) return;
  if (ids.some((id) => typeof id !== 'string' || !UUID.test(id))) {
    throw new MediaAssetError(422, 'VALIDATION_FAILED', 'Scene references must be valid saved assets.');
  }
  const allowed = await listValidatedMediaAssetIds(access, projectId, ids);
  const missing = ids.filter((id) => !allowed.has(id));
  if (missing.length) {
    throw new MediaAssetError(422, 'MEDIA_REFERENCE_NOT_FOUND', 'Choose a saved reference from this project.');
  }
}

export async function PUT(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['storyboard', 'approved', 'baseUpdatedAt']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  if (typeof parsed.body.approved !== 'boolean') {
    return errorResult(422, 'VALIDATION_FAILED', 'Approval must be true or false.');
  }
  if (!isProjectVersion(parsed.body.baseUpdatedAt)) {
    return errorResult(428, 'PROJECT_VERSION_REQUIRED', 'Reload the project and send its current version.');
  }
  const baseUpdatedAt = parsed.body.baseUpdatedAt;
  const storyboard = parsed.body.storyboard;
  if (storyboard !== null && (typeof storyboard !== 'object' || Array.isArray(storyboard))) {
    return errorResult(422, 'VALIDATION_FAILED', 'Storyboard must be an object or null.');
  }

  try {
    if (parsed.body.approved) {
      validateStoryboard(storyboard);
      await assertReferences(session.access, id, storyboard);
      return jsonResult(200, {
        project: await updateProject(session.access, id, {
          storyboard,
          reviewApproved: true,
          storyboardHash: storyboardHash(storyboard),
          status: 'approved',
        }, { baseUpdatedAt }),
      });
    }
    await assertReferences(session.access, id, storyboard);
    const scenes = Array.isArray(storyboard?.scenes) ? storyboard.scenes : [];
    return jsonResult(200, {
      project: await updateProject(session.access, id, {
        storyboard,
        reviewApproved: false,
        storyboardHash: null,
        status: scenes.length ? 'planning' : 'draft',
      }, { baseUpdatedAt }),
    });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return failure(error);
    }
    if (error instanceof Error && !(error instanceof ProjectRepositoryError)) {
      return errorResult(422, 'VALIDATION_FAILED', error.message);
    }
    return failure(error);
  }
}
