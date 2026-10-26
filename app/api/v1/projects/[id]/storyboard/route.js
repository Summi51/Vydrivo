import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { updateProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { storyboardHash, validateStoryboard } from '../../../../../../prototype/storyboard.mjs';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof ProjectRepositoryError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'PROJECT_STORAGE_UNAVAILABLE', 'Project storage is temporarily unavailable.');
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
  const keys = allowKeys(parsed.body, ['storyboard', 'approved']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  if (typeof parsed.body.approved !== 'boolean') {
    return errorResult(422, 'VALIDATION_FAILED', 'Approval must be true or false.');
  }
  const storyboard = parsed.body.storyboard;
  if (storyboard !== null && (typeof storyboard !== 'object' || Array.isArray(storyboard))) {
    return errorResult(422, 'VALIDATION_FAILED', 'Storyboard must be an object or null.');
  }

  try {
    if (parsed.body.approved) {
      validateStoryboard(storyboard);
      return jsonResult(200, {
        project: await updateProject(session.access, id, {
          storyboard,
          reviewApproved: true,
          storyboardHash: storyboardHash(storyboard),
          status: 'approved',
        }),
      });
    }
    const scenes = Array.isArray(storyboard?.scenes) ? storyboard.scenes : [];
    return jsonResult(200, {
      project: await updateProject(session.access, id, {
        storyboard,
        reviewApproved: false,
        storyboardHash: null,
        status: scenes.length ? 'planning' : 'draft',
      }),
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ProjectRepositoryError)) {
      return errorResult(422, 'VALIDATION_FAILED', error.message);
    }
    return failure(error);
  }
}
