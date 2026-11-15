import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../lib/projects-repository.js';
import {
  createPrivateUploadUrl,
  MediaStorageError,
  privateObjectKey,
  validateUploadIntent,
} from '../../../../../lib/r2-private.js';
import {
  deleteMediaAsset,
  MEDIA_QUOTA_BYTES,
  MediaAssetError,
  reserveMediaAsset,
} from '../../../../../lib/media-assets-repository.js';
import { cleanMediaFilename } from '../../../../../lib/media-rules.js';

export const dynamic = 'force-dynamic';

const FIELDS = ['projectId', 'kind', 'mime', 'bytes', 'filename'];

function failure(error) {
  if (error instanceof MediaAssetError) {
    return errorResult(error.status, error.code, error.message, { details: error.details });
  }
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
    const intent = validateUploadIntent({
      projectId,
      kind: parsed.body.kind,
      mime: parsed.body.mime,
      bytes: parsed.body.bytes,
    });
    const project = await getProject(session.access, projectId);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');

    const key = privateObjectKey({
      ownerId: session.user.id,
      projectId,
      kind: intent.kind,
      mime: intent.mime,
    });
    const reservation = await reserveMediaAsset(session.access, {
      projectId,
      kind: intent.kind,
      key,
      mime: intent.mime,
      bytes: intent.bytes,
      filename: cleanMediaFilename(parsed.body.filename),
      limitBytes: MEDIA_QUOTA_BYTES,
    });

    let upload;
    try {
      upload = await createPrivateUploadUrl({
        ownerId: session.user.id,
        projectId,
        kind: intent.kind,
        mime: intent.mime,
        bytes: intent.bytes,
        key,
      });
    } catch (error) {
      // The reservation is useless if signing failed; release its quota.
      try { await deleteMediaAsset(session.access, reservation.asset.id); } catch { /* best effort */ }
      throw error;
    }

    return jsonResult(201, {
      ...upload,
      assetId: reservation.asset.id,
      asset: reservation.asset,
      quota: reservation.quota,
    });
  } catch (error) {
    return failure(error);
  }
}
