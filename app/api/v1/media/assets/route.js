import { verifiedAccess } from '../../../../../lib/api-session.js';
import { errorResult, jsonResult } from '../../../../../lib/auth-http.js';
import { isMediaUuid } from '../../../../../lib/media-rules.js';
import { listMediaAssets, MediaAssetError } from '../../../../../lib/media-assets-repository.js';

export const dynamic = 'force-dynamic';

function failure(error) {
  if (error instanceof MediaAssetError) {
    return errorResult(error.status, error.code, error.message, { details: error.details });
  }
  return errorResult(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are temporarily unavailable.');
}

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const projectId = new URL(request.url).searchParams.get('projectId');
  if (!isMediaUuid(projectId)) {
    return errorResult(422, 'INVALID_PROJECT', 'Choose a valid project.');
  }
  try {
    return jsonResult(200, await listMediaAssets(session.access, { projectId }));
  } catch (error) {
    return failure(error);
  }
}
