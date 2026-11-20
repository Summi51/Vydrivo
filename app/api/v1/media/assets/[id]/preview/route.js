import { verifiedAccess } from '../../../../../../../lib/api-session.js';
import { errorResult } from '../../../../../../../lib/auth-http.js';
import { getMediaAsset, MediaAssetError } from '../../../../../../../lib/media-assets-repository.js';
import { MediaStorageError, readPrivateObject } from '../../../../../../../lib/r2-private.js';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof MediaAssetError || error instanceof MediaStorageError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are temporarily unavailable.');
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');

  try {
    const asset = await getMediaAsset(session.access, id);
    if (!asset || asset.status !== 'validated' || !String(asset.mime || '').startsWith('image/')) {
      return errorResult(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
    }
    const bytes = await readPrivateObject({ key: asset.key, maxBytes: 20 * 1024 * 1024 });
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': asset.mime,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
