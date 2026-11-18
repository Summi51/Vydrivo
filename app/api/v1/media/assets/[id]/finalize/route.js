import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifiedAccess } from '../../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../../lib/auth-http.js';
import {
  copyPrivateObject,
  deletePrivateObject,
  downloadPrivateObjectToFile,
  headPrivateObject,
  readPrivateObject,
  readPrivateObjectRange,
  MediaStorageError,
  privateObjectKey,
  readPrivateObjectPrefix,
  sniffMediaMime,
} from '../../../../../../../lib/r2-private.js';
import { MediaProbeError, probeImageBytes, probeMediaFile, probeMp4Bytes } from '../../../../../../../lib/media-probe.js';
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

// Phone cameras write the movie header at the end. Read the start and, when the
// header is not there, the last 2 MB. Never download the whole clip on Amplify.
async function readMp4Header(key, bytes) {
  const headLength = Math.min(bytes, 64 * 1024);
  const headBytes = await readPrivateObjectRange({ key, start: 0, end: headLength - 1 });
  const early = Buffer.from(headBytes).indexOf('moov');
  if (early >= 0 && early < headLength - 4) return headBytes;
  if (bytes <= headLength) return headBytes;
  const tailStart = Math.max(0, bytes - 2 * 1024 * 1024);
  const tail = await readPrivateObjectRange({ key, start: tailStart, end: bytes - 1 });
  const joined = new Uint8Array(headBytes.length + tail.length);
  joined.set(headBytes, 0);
  joined.set(tail, headBytes.length);
  return joined;
}

async function rejectAndClean(access, asset, reason, { probeError = '' } = {}) {
  try { await deletePrivateObject({ key: asset.key }); } catch { /* best effort */ }
  try { await rejectMediaAsset(access, asset.id, { reason, probeError }); } catch { /* best effort */ }
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

    let prefix;
    try {
      prefix = await readPrivateObjectPrefix({ key: asset.key, length: 16, ifMatch: head.etag });
    } catch (error) {
      if (error instanceof MediaStorageError && error.status === 404) {
        await rejectAndClean(session.access, asset, 'The uploaded object disappeared during validation.');
        return errorResult(422, 'MEDIA_OBJECT_NOT_FOUND', 'The uploaded file was not found. Start the upload again.');
      }
      if (error instanceof MediaStorageError && error.status === 409) {
        await rejectAndClean(session.access, asset, error.message);
        return errorResult(error.status, error.code, error.message);
      }
      throw error;
    }
    const sniffed = sniffMediaMime(prefix);
    if (sniffed !== asset.mime) {
      await rejectAndClean(session.access, asset, `File signature ${sniffed || 'unknown'} did not match ${asset.mime}.`);
      return errorResult(422, 'MEDIA_CONTENT_MISMATCH', 'The file content does not match its declared type.');
    }

    // Move the validated object to a new key before probing it. The original
    // presigned PUT URL remains valid until expiry, so the asset must not point
    // at that key.
    const committedKey = privateObjectKey({
      ownerId: session.user.id,
      projectId: asset.projectId,
      kind: asset.kind,
      mime: asset.mime,
    });
    let copied;
    try {
      copied = await copyPrivateObject({ sourceKey: asset.key, destinationKey: committedKey, ifMatch: head.etag });
    } catch (error) {
      await deletePrivateObject({ key: committedKey }).catch(() => {});
      throw error;
    }

    let persisted = false;
    let committedCleaned = false;
    async function cleanupCommitted() {
      if (committedCleaned) return;
      try {
        await deletePrivateObject({ key: committedKey });
        committedCleaned = true;
      } catch {
        // Leave the flag false so a later cleanup attempt can retry.
      }
    }

    // The hosted server has no ffprobe. Images and MP4 clips are checked from
    // their own headers. WebM still needs the server probe.
    const isImage = asset.mime === 'image/png' || asset.mime === 'image/jpeg';
    const isMp4 = asset.mime === 'video/mp4';
    if (isImage || isMp4) {
      let imageProps;
      try {
        const bytes = isImage
          ? await readPrivateObject({ key: committedKey, maxBytes: 20 * 1024 * 1024 })
          : await readMp4Header(committedKey, head.bytes);
        imageProps = isImage ? probeImageBytes(bytes, { mime: asset.mime }) : probeMp4Bytes(bytes);
      } catch (error) {
        await cleanupCommitted();
        if (error instanceof MediaProbeError) {
          await rejectAndClean(session.access, asset, error.message, { probeError: error.code });
          return errorResult(error.status, error.code, error.message);
        }
        throw error;
      }
      try {
        const validated = await finalizeMediaAsset(session.access, asset.id, {
          bytes: head.bytes,
          mime: head.mime,
          key: committedKey,
          nativeProperties: imageProps,
        });
        await deletePrivateObject({ key: asset.key }).catch(() => {});
        let quota = null;
        try { quota = await mediaQuotaUsage(session.access); } catch { /* optional display data */ }
        return jsonResult(200, { asset: validated, quota });
      } catch (error) {
        await cleanupCommitted();
        throw error;
      }
    }

    try {
      const directory = await mkdtemp(join(tmpdir(), 'vydrivo-media-'));
      let nativeProperties;
      try {
        const filePath = join(directory, 'upload.bin');
        const downloaded = await downloadPrivateObjectToFile({
          key: committedKey,
          filePath,
          ifMatch: copied.etag || undefined,
        });
        if (downloaded.bytes !== head.bytes) {
          await cleanupCommitted();
          await rejectAndClean(session.access, asset, 'The uploaded file size changed during validation.');
          return errorResult(422, 'MEDIA_SIZE_MISMATCH', 'The uploaded file changed during validation. Start the upload again.');
        }
        nativeProperties = await probeMediaFile(filePath, { mime: asset.mime });
      } catch (error) {
        if (error instanceof MediaProbeError) {
          // A missing server binary is retryable; do not destroy a valid upload.
          if (error.status === 422) {
            await cleanupCommitted();
            await rejectAndClean(session.access, asset, error.message, { probeError: error.code });
          } else {
            await cleanupCommitted();
          }
          return errorResult(error.status, error.code, error.message);
        }
        if (error instanceof MediaStorageError && (error.status === 404 || error.status === 409 || error.status === 413)) {
          await cleanupCommitted();
          await rejectAndClean(session.access, asset, error.message);
          return errorResult(error.status, error.code, error.message);
        }
        throw error;
      } finally {
        await rm(directory, { recursive: true, force: true });
      }

      const validated = await finalizeMediaAsset(session.access, asset.id, {
        bytes: head.bytes,
        mime: head.mime,
        key: committedKey,
        nativeProperties,
      });
      persisted = true;
      await deletePrivateObject({ key: asset.key }).catch(() => {});
      let quota = null;
      try { quota = await mediaQuotaUsage(session.access); } catch { /* optional display data */ }
      return jsonResult(200, { asset: validated, quota });
    } catch (error) {
      if (!persisted) await cleanupCommitted();
      throw error;
    }
  } catch (error) {
    return failure(error);
  }
}
