import { statSync } from 'node:fs';
import {
  createPrivateSignedUrl,
  createVideoRenderUploadUrl,
  deletePrivateObject,
  headPrivateObject,
  putPrivateFile,
  putPrivateObject,
  r2PrivateConfig,
} from './r2-private.js';
import { isMediaUuid } from './media-rules.js';

const KIND_EXT = {
  video: 'mp4',
  thumbnail: 'jpg',
  script: 'json',
  metadata: 'json',
};

const KIND_TYPE = {
  video: 'video/mp4',
  thumbnail: 'image/jpeg',
  script: 'application/json',
  metadata: 'application/json',
};

const KEY_PATTERN = /^users\/([0-9a-f-]{36})\/projects\/([0-9a-f-]{36})\/renders\/([0-9a-f-]{36})\/(video\.mp4|thumbnail\.jpg|script\.json|metadata\.json)$/i;

export class VideoStorageError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function videoRenderKey({ ownerId, projectId, runId, kind } = {}) {
  if (!isMediaUuid(ownerId) || !isMediaUuid(projectId) || !isMediaUuid(runId)) {
    throw new VideoStorageError(422, 'INVALID_RENDER_KEY', 'Choose a valid render.');
  }
  const ext = KIND_EXT[kind];
  if (!ext) throw new VideoStorageError(422, 'INVALID_RENDER_KIND', 'Choose a valid render file.');
  return `users/${ownerId}/projects/${projectId}/renders/${runId}/${kind}.${ext}`;
}

export function ownsVideoRenderKey(ownerId, key) {
  if (!isMediaUuid(ownerId) || typeof key !== 'string') return false;
  const match = KEY_PATTERN.exec(key);
  return Boolean(match && match[1].toLowerCase() === ownerId.toLowerCase());
}

function requireStorage(env) {
  const config = r2PrivateConfig(env);
  if (!config.configured) {
    throw new VideoStorageError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not configured on this server.');
  }
  return config;
}

function fileBytes(file) {
  if (file.body !== undefined && file.body !== null) {
    if (typeof file.body === 'string') return Buffer.byteLength(file.body);
    if (file.body instanceof Uint8Array) return file.body.byteLength;
    return 0;
  }
  try {
    return statSync(/* turbopackIgnore: true */ file.filePath).size;
  } catch {
    return 0;
  }
}

export async function uploadVideoRenderFiles({ ownerId, projectId, runId, files = [], env = process.env } = {}) {
  requireStorage(env);
  if (!Array.isArray(files) || !files.length) {
    throw new VideoStorageError(422, 'INVALID_RENDER_FILES', 'Choose at least one render file.');
  }

  const keys = {};
  const bytes = {};
  const uploaded = [];

  try {
    for (const file of files) {
      const key = videoRenderKey({ ownerId, projectId, runId, kind: file.kind });
      const contentType = file.contentType || KIND_TYPE[file.kind];
      if (file.filePath) {
        await putPrivateFile({ key, filePath: file.filePath, contentType, env });
      } else {
        await putPrivateObject({ key, body: file.body, contentType, env });
      }
      const size = fileBytes(file);
      if (size < 1) throw new VideoStorageError(422, 'INVALID_RENDER_FILE', 'A render file is empty.');
      keys[file.kind] = key;
      bytes[file.kind] = size;
      uploaded.push(key);
    }
  } catch (error) {
    await Promise.allSettled(uploaded.map((key) => deletePrivateObject({ key, env })));
    if (error instanceof VideoStorageError) throw error;
    throw new VideoStorageError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage did not store the render.');
  }

  return { keys, bytes };
}

export async function presignVideoRenderUpload({ ownerId, projectId, runId, kind = 'video', bytes, env = process.env } = {}) {
  const key = videoRenderKey({ ownerId, projectId, runId, kind });
  try {
    return await createVideoRenderUploadUrl({ key, bytes, contentType: KIND_TYPE[kind], env });
  } catch (error) {
    if (error instanceof VideoStorageError) throw error;
    if (error?.status && error?.code) {
      const code = error.code === 'MEDIA_STORAGE_UNAVAILABLE' ? 'VIDEO_STORAGE_UNAVAILABLE' : error.code;
      throw new VideoStorageError(error.status, code, error.message);
    }
    throw new VideoStorageError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is temporarily unavailable.');
  }
}

export async function headVideoRenderObject({ ownerId, key, env = process.env } = {}) {
  if (!ownsVideoRenderKey(ownerId, key)) {
    throw new VideoStorageError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  }
  try {
    return await headPrivateObject({ key, env });
  } catch (error) {
    if (error?.status && error?.code) {
      const code = error.code === 'MEDIA_STORAGE_UNAVAILABLE' ? 'VIDEO_STORAGE_UNAVAILABLE' : error.code;
      throw new VideoStorageError(error.status, code, error.message);
    }
    throw new VideoStorageError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is temporarily unavailable.');
  }
}

export async function signVideoRenderObject({ ownerId, key, downloadName, contentType, expiresIn = 300, env = process.env } = {}) {
  if (!ownsVideoRenderKey(ownerId, key)) {
    throw new VideoStorageError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  }
  const seconds = Math.min(900, Math.max(60, Number(expiresIn) || 300));
  try {
    return await createPrivateSignedUrl({ key, downloadName, contentType, env, expiresIn: seconds });
  } catch (error) {
    if (error?.status && error?.code) {
      const code = error.code === 'MEDIA_STORAGE_UNAVAILABLE' ? 'VIDEO_STORAGE_UNAVAILABLE' : error.code;
      throw new VideoStorageError(error.status, code, error.message);
    }
    throw new VideoStorageError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is temporarily unavailable.');
  }
}

export async function deleteVideoRenderObjects({ keys = [], env = process.env } = {}) {
  const unique = [...new Set(keys.filter((key) => typeof key === 'string' && key))];
  await Promise.allSettled(unique.map((key) => deletePrivateObject({ key, env })));
}
