import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isMediaUuid, validateMediaIntent } from './media-rules.js';

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export class MediaStorageError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function r2PrivateConfig(env = process.env) {
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(env.MEDIA_S3_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.MEDIA_S3_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = String(env.MEDIA_S3_BUCKET || env.R2_PRIVATE_BUCKET_NAME || '').trim();
  const endpoint = String(
    env.MEDIA_S3_ENDPOINT || env.R2_S3_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''),
  ).trim().replace(/\/+$/, '');
  const region = String(env.MEDIA_S3_REGION || env.R2_S3_REGION || 'auto').trim();
  return {
    configured: Boolean(accessKeyId && secretAccessKey && bucket && endpoint),
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    region,
  };
}

export function validateUploadIntent(input = {}) {
  const result = validateMediaIntent(input);
  if (!result.ok) throw new MediaStorageError(422, result.code, result.message);
  return result.value;
}

export function privateObjectKey({ ownerId, projectId, kind, mime } = {}) {
  if (!isMediaUuid(ownerId)) {
    throw new MediaStorageError(401, 'AUTH_REQUIRED', 'Sign in again.');
  }
  const intent = validateUploadIntent({ projectId, kind, mime, bytes: 1 });
  return `users/${ownerId}/projects/${projectId}/${kind}/${randomUUID()}.${intent.ext}`;
}

export function ownsPrivateKey(ownerId, key) {
  if (!isMediaUuid(ownerId) || typeof key !== 'string') return false;
  const escaped = ownerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^users/${escaped}/projects/${UUID_SOURCE}/(reference|thumbnail)/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(mp4|webm|jpg|png)$`,
    'i',
  );
  return pattern.test(key);
}

export function privateKeyMatchesIntent(ownerId, projectId, kind, key) {
  if (!ownsPrivateKey(ownerId, key) || !isMediaUuid(projectId)) return false;
  return key.startsWith(`users/${ownerId}/projects/${projectId}/${kind}/`);
}

function requireConfig(env) {
  const config = r2PrivateConfig(env);
  if (!config.configured) {
    throw new MediaStorageError(503, 'MEDIA_STORAGE_UNAVAILABLE', 'Private media storage is not configured on this server.');
  }
  return config;
}

function client(config) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

function expiry(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function storageFailure(error, message) {
  if (error instanceof MediaStorageError) return error;
  if (error?.$metadata?.httpStatusCode === 412 || error?.name === 'PreconditionFailed') {
    return new MediaStorageError(409, 'MEDIA_OBJECT_CHANGED', 'The uploaded file changed during validation. Start the upload again.');
  }
  if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') {
    return new MediaStorageError(404, 'MEDIA_OBJECT_NOT_FOUND', 'The uploaded file was not found.');
  }
  return new MediaStorageError(503, 'MEDIA_STORAGE_UNAVAILABLE', message || 'Private media storage did not respond.');
}

export async function createPrivateUploadUrl({
  ownerId,
  projectId,
  kind,
  mime,
  bytes,
  key: providedKey,
  env = process.env,
  expiresIn = 900,
} = {}) {
  if (!isMediaUuid(ownerId)) {
    throw new MediaStorageError(401, 'AUTH_REQUIRED', 'Sign in again.');
  }
  const intent = validateUploadIntent({ projectId, kind, mime, bytes });
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 3600) {
    throw new MediaStorageError(422, 'INVALID_EXPIRY', 'Upload links must expire in 1–60 minutes.');
  }
  const config = requireConfig(env);
  const key = providedKey || privateObjectKey({ ownerId, projectId, kind, mime });
  if (!privateKeyMatchesIntent(ownerId, projectId, kind, key)) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  const uploadUrl = await getSignedUrl(client(config), new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: mime,
    ContentLength: bytes,
  }), { expiresIn });
  return {
    key,
    method: 'PUT',
    uploadUrl,
    headers: { 'Content-Type': mime },
    maxBytes: intent.maxBytes,
    expiresAt: expiry(expiresIn),
  };
}

export async function createPrivateAccessUrl({ ownerId, key, env = process.env, expiresIn = 300 } = {}) {
  if (!isMediaUuid(ownerId)) {
    throw new MediaStorageError(401, 'AUTH_REQUIRED', 'Sign in again.');
  }
  if (!ownsPrivateKey(ownerId, key)) {
    throw new MediaStorageError(404, 'MEDIA_NOT_FOUND', 'Media not found.');
  }
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 900) {
    throw new MediaStorageError(422, 'INVALID_EXPIRY', 'Access links must expire in 1–15 minutes.');
  }
  const config = requireConfig(env);
  const url = await getSignedUrl(client(config), new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }), { expiresIn });
  return { url, expiresAt: expiry(expiresIn) };
}

export async function headPrivateObject({ key, env = process.env } = {}) {
  if (typeof key !== 'string' || !key) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  const config = requireConfig(env);
  try {
    const result = await client(config).send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    return {
      bytes: Number(result.ContentLength) || 0,
      mime: String(result.ContentType || '').split(';')[0].trim().toLowerCase(),
      etag: result.ETag || '',
    };
  } catch (error) {
    throw storageFailure(error, 'Private media storage did not confirm the upload.');
  }
}

export async function readPrivateObjectPrefix({ key, length = 16, ifMatch, env = process.env } = {}) {
  if (typeof key !== 'string' || !key) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  const size = Math.min(64, Math.max(8, Number(length) || 16));
  const config = requireConfig(env);
  try {
    const result = await client(config).send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Range: `bytes=0-${size - 1}`,
      ...(ifMatch ? { IfMatch: ifMatch } : {}),
    }));
    return await result.Body.transformToByteArray();
  } catch (error) {
    throw storageFailure(error, 'Private media storage did not return the uploaded file.');
  }
}

export async function copyPrivateObject({ sourceKey, destinationKey, ifMatch, env = process.env } = {}) {
  if (typeof sourceKey !== 'string' || !sourceKey || typeof destinationKey !== 'string' || !destinationKey) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose valid media objects.');
  }
  if (sourceKey === destinationKey) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'The committed media key must be new.');
  }
  const config = requireConfig(env);
  const encodedSource = encodeURIComponent(sourceKey).replace(/%2F/g, '/');
  try {
    const result = await client(config).send(new CopyObjectCommand({
      Bucket: config.bucket,
      Key: destinationKey,
      CopySource: `${config.bucket}/${encodedSource}`,
      ...(ifMatch ? { CopySourceIfMatch: ifMatch } : {}),
      MetadataDirective: 'COPY',
    }));
    return { etag: result.CopyObjectResult?.ETag || '' };
  } catch (error) {
    throw storageFailure(error, 'Private media storage did not copy the uploaded file.');
  }
}

export async function downloadPrivateObjectToFile({
  key,
  filePath,
  maxBytes = 100 * 1024 * 1024,
  ifMatch,
  env = process.env,
} = {}) {
  if (typeof key !== 'string' || !key) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  if (typeof filePath !== 'string' || !filePath) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_PATH', 'Choose a valid validation path.');
  }
  const config = requireConfig(env);
  try {
    const result = await client(config).send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ...(ifMatch ? { IfMatch: ifMatch } : {}),
    }));
    const bytes = Number(result.ContentLength) || 0;
    if (bytes > maxBytes) {
      throw new MediaStorageError(413, 'MEDIA_TOO_LARGE', 'The uploaded file is too large to validate.');
    }
    await pipeline(result.Body, createWriteStream(filePath));
    return { bytes };
  } catch (error) {
    throw storageFailure(error, 'Private media storage did not return the uploaded file.');
  }
}

export function sniffMediaMime(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  if (
    bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') {
    return 'video/mp4';
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'video/webm';
  }
  return '';
}

export async function deletePrivateObject({ key, env = process.env } = {}) {
  if (typeof key !== 'string' || !key) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  const config = requireConfig(env);
  try {
    await client(config).send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    return true;
  } catch (error) {
    const failure = storageFailure(error, 'Private media storage did not delete the object.');
    if (failure.status === 404) return true;
    throw failure;
  }
}

export async function putPrivateObject({
  key,
  body,
  contentType,
  contentLength,
  cacheControl = 'private, max-age=3600',
  env = process.env,
} = {}) {
  if (typeof key !== 'string' || !key) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  if (body === undefined || body === null) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_BODY', 'Choose a file to store.');
  }
  const config = requireConfig(env);
  try {
    const result = await client(config).send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ...(contentType ? { ContentType: contentType } : {}),
      ...(Number.isInteger(contentLength) && contentLength > 0 ? { ContentLength: contentLength } : {}),
      CacheControl: cacheControl,
    }));
    return { etag: result.ETag || '' };
  } catch (error) {
    throw storageFailure(error, 'Private media storage did not store the file.');
  }
}

export async function putPrivateFile({
  key,
  filePath,
  contentType,
  cacheControl = 'private, max-age=3600',
  env = process.env,
} = {}) {
  if (typeof filePath !== 'string' || !filePath) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_PATH', 'Choose a valid file.');
  }
  let size;
  try {
    size = statSync(filePath).size;
  } catch {
    throw new MediaStorageError(404, 'MEDIA_OBJECT_NOT_FOUND', 'The local file was not found.');
  }
  if (!Number.isFinite(size) || size < 1) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_SIZE', 'The local file is empty.');
  }
  return putPrivateObject({
    key,
    body: createReadStream(filePath),
    contentType,
    contentLength: size,
    cacheControl,
    env,
  });
}

export async function createPrivateSignedUrl({
  key,
  expiresIn = 300,
  downloadName,
  contentType,
  env = process.env,
} = {}) {
  if (typeof key !== 'string' || !key) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 900) {
    throw new MediaStorageError(422, 'INVALID_EXPIRY', 'Access links must expire in 1–15 minutes.');
  }
  const config = requireConfig(env);
  const safeName = typeof downloadName === 'string'
    ? downloadName.replace(/[\r\n"\\]/g, '').trim().slice(0, 120)
    : '';
  const url = await getSignedUrl(client(config), new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ...(safeName ? { ResponseContentDisposition: `attachment; filename="${safeName}"` } : {}),
    ...(contentType ? { ResponseContentType: contentType } : {}),
  }), { expiresIn });
  return { url, expiresAt: expiry(expiresIn) };
}
