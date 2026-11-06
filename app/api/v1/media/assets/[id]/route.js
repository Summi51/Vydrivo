import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { errorResult, jsonResult } from '../../../../../../lib/auth-http.js';
import { deletePrivateObject, MediaStorageError } from '../../../../../../lib/r2-private.js';
import {
  deleteMediaAsset,
  getMediaAsset,
  mediaQuotaUsage,
  MediaAssetError,
} from '../../../../../../lib/media-assets-repository.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof MediaAssetError) {
    return errorResult(error.status, error.code, error.message, { details: error.details });
  }
  if (error instanceof MediaStorageError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are temporarily unavailable.');
}

export async function DELETE(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');

  try {
    const asset = await getMediaAsset(session.access, id);
    if (!asset) return errorResult(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
    if (asset.status === 'pending' || asset.status === 'validated') {
      await deletePrivateObject({ key: asset.key });
    }
    const deleted = await deleteMediaAsset(session.access, asset.id);
    return jsonResult(200, {
      deleted: true,
      asset: deleted,
      quota: await mediaQuotaUsage(session.access),
    });
  } catch (error) {
    return failure(error);
  }
}
