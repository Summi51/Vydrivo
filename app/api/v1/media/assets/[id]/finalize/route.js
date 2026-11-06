import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifiedAccess } from '../../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../../lib/auth-http.js';
import {
  deletePrivateObject,
  downloadPrivateObjectToFile,
  headPrivateObject,
  MediaStorageError,
  readPrivateObjectPrefix,
  sniffMediaMime,
} from '../../../../../../../lib/r2-private.js';
import { MediaProbeError, probeMediaFile } from '../../../../../../../lib/media-probe.js';
import {
  finalizeMediaAsset,
  getMediaAsset,
  mediaQuotaUsage,
  MediaAssetError,
  rejectMediaAsset,
} from '../../../../../../../lib/media-assets-repository.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof MediaAssetError) {
    return errorResult(error.status, error.code, error.message, { details: error.details });
  }
  if (error instanceof MediaStorageError) {
    return errorResult(error.status, error.code, error.message);
  }
  if (error instanceof MediaProbeError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are temporarily unavailable.');
}

async function rejectAndClean(access, asset, reason) {
  try { await deletePrivateObject({ key: asset.key }); } catch { /* best effort */ }
  try { await rejectMediaAsset(access, asset.id, { reason }); } catch { /* best effort */ }
}

export async function POST(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, []);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  try {
    const asset = await getMediaAsset(session.access, id);
    if (!asset) return errorResult(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
    if (asset.status === 'validated') {
      return jsonResult(200, { asset, quota: await mediaQuotaUsage(session.access) });
    }
    if (asset.status !== 'pending') {
      return errorResult(409, 'MEDIA_ASSET_NOT_PENDING', 'This media asset is not waiting for an upload.');
    }
    if (asset.expiresAt && Date.parse(asset.expiresAt) <= Date.now()) {
      return errorResult(410, 'MEDIA_INTENT_EXPIRED', 'This upload link expired. Start the upload again.');
    }

    let head;
    try {
      head = await headPrivateObject({ key: asset.key });
    } catch (error) {
      if (error instanceof MediaStorageError && error.status === 404) {
        await rejectAndClean(session.access, asset, 'The uploaded object was not found.');
        return errorResult(422, 'MEDIA_OBJECT_NOT_FOUND', 'The uploaded file was not found. Start the upload again.');
      }
      throw error;
    }

    if (head.bytes !== asset.declaredBytes) {
      await rejectAndClean(session.access, asset, `Uploaded ${head.bytes} bytes; expected ${asset.declaredBytes}.`);
      return errorResult(422, 'MEDIA_SIZE_MISMATCH', 'The uploaded file size does not match the request.');
    }
    if (head.mime !== asset.mime) {
      await rejectAndClean(session.access, asset, `Uploaded type ${head.mime || 'unknown'}; expected ${asset.mime}.`);
      return errorResult(422, 'MEDIA_TYPE_MISMATCH', 'The uploaded file type does not match the request.');
    }

    const prefix = await readPrivateObjectPrefix({ key: asset.key, length: 16 });
    const sniffed = sniffMediaMime(prefix);
    if (sniffed !== asset.mime) {
      await rejectAndClean(session.access, asset, `File signature ${sniffed || 'unknown'} did not match ${asset.mime}.`);
      return errorResult(422, 'MEDIA_CONTENT_MISMATCH', 'The file content does not match its declared type.');
    }

    const directory = await mkdtemp(join(tmpdir(), 'vydrivo-media-'));
    let nativeProperties;
    try {
      const filePath = join(directory, 'upload.bin');
      await downloadPrivateObjectToFile({ key: asset.key, filePath });
      nativeProperties = await probeMediaFile(filePath, { mime: asset.mime });
    } catch (error) {
      if (error instanceof MediaProbeError) {
        // A missing server binary is retryable; do not destroy a valid upload.
        if (error.status === 422) await rejectAndClean(session.access, asset, error.message);
        return errorResult(error.status, error.code, error.message);
      }
      throw error;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }

    const validated = await finalizeMediaAsset(session.access, asset.id, {
      bytes: head.bytes,
      mime: head.mime,
      nativeProperties,
    });
    return jsonResult(200, {
      asset: validated,
      quota: await mediaQuotaUsage(session.access),
    });
  } catch (error) {
    return failure(error);
  }
}
