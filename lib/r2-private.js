import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const UUID = new RegExp(`^${UUID_SOURCE}$`, 'i');
const KINDS = new Set(['reference', 'thumbnail']);
const MIME_RULES = {
  'video/mp4': { ext: 'mp4', max: 100 * 1024 * 1024, kinds: ['reference'] },
  'video/webm': { ext: 'webm', max: 100 * 1024 * 1024, kinds: ['reference'] },
  'image/jpeg': { ext: 'jpg', max: 20 * 1024 * 1024, kinds: ['reference', 'thumbnail'] },
  'image/png': { ext: 'png', max: 20 * 1024 * 1024, kinds: ['reference', 'thumbnail'] },
};

export class MediaStorageError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function r2PrivateConfig(env = process.env) {
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = String(env.R2_PRIVATE_BUCKET_NAME || '').trim();
  const endpoint = String(
    env.R2_S3_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''),
  ).trim().replace(/\/+$/, '');
  return {
    configured: Boolean(accessKeyId && secretAccessKey && bucket && endpoint),
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
  };
}

export function validateUploadIntent({ projectId, kind, mime, bytes } = {}) {
  if (typeof projectId !== 'string' || !UUID.test(projectId)) {
    throw new MediaStorageError(422, 'INVALID_PROJECT', 'Choose a valid project.');
  }
  if (typeof kind !== 'string' || !KINDS.has(kind)) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KIND', 'Choose a supported media kind.');
  }
  if (typeof mime !== 'string' || !MIME_RULES[mime]) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_TYPE', 'Choose a supported image or video type.');
  }
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > MIME_RULES[mime].max) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_SIZE', 'The file size is outside the allowed limit.');
  }
  if (!MIME_RULES[mime].kinds.includes(kind)) {
    throw new MediaStorageError(422, 'INVALID_MEDIA_KIND', 'This media kind does not support that file type.');
  }
  return { projectId, kind, mime, bytes, maxBytes: MIME_RULES[mime].max, ext: MIME_RULES[mime].ext };
}

export function privateObjectKey({ ownerId, projectId, kind, mime } = {}) {
  if (typeof ownerId !== 'string' || !UUID.test(ownerId)) {
    throw new MediaStorageError(401, 'AUTH_REQUIRED', 'Sign in again.');
  }
  const intent = validateUploadIntent({ projectId, kind, mime, bytes: 1 });
  return `users/${ownerId}/projects/${projectId}/${kind}/${randomUUID()}.${intent.ext}`;
}

export function ownsPrivateKey(ownerId, key) {
  if (typeof ownerId !== 'string' || !UUID.test(ownerId) || typeof key !== 'string') return false;
  const escaped = ownerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^users/${escaped}/projects/${UUID_SOURCE}/(reference|thumbnail)/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(mp4|webm|jpg|png)$`,
    'i',
  );
  return pattern.test(key);
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
    region: 'auto',
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

export async function createPrivateUploadUrl({
  ownerId,
  projectId,
  kind,
  mime,
  bytes,
  env = process.env,
  expiresIn = 900,
} = {}) {
  if (typeof ownerId !== 'string' || !UUID.test(ownerId)) {
    throw new MediaStorageError(401, 'AUTH_REQUIRED', 'Sign in again.');
  }
  const intent = validateUploadIntent({ projectId, kind, mime, bytes });
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 3600) {
    throw new MediaStorageError(422, 'INVALID_EXPIRY', 'Upload links must expire in 1–60 minutes.');
  }
  const config = requireConfig(env);
  const key = privateObjectKey({ ownerId, projectId, kind, mime });
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
  if (typeof ownerId !== 'string' || !UUID.test(ownerId)) {
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
