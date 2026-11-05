import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPrivateAccessUrl,
  createPrivateUploadUrl,
  MediaStorageError,
  ownsPrivateKey,
  privateObjectKey,
  r2PrivateConfig,
  validateUploadIntent,
} from './r2-private.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const env = {
  R2_ACCOUNT_ID: 'account-test',
  R2_ACCESS_KEY_ID: 'access-test',
  R2_SECRET_ACCESS_KEY: 'secret-test',
  R2_S3_ENDPOINT: 'https://account-test.r2.cloudflarestorage.com',
  R2_PRIVATE_BUCKET_NAME: 'vydrivo-private-test',
};

test('private R2 configuration requires all server-only values', () => {
  assert.equal(r2PrivateConfig(env).configured, true);
  assert.equal(r2PrivateConfig(env).region, 'auto');
  assert.equal(r2PrivateConfig({}).configured, false);
  assert.equal(r2PrivateConfig({ ...env, R2_PRIVATE_BUCKET_NAME: '' }).configured, false);

  const aws = {
    MEDIA_S3_ACCESS_KEY_ID: 'access',
    MEDIA_S3_SECRET_ACCESS_KEY: 'secret',
    MEDIA_S3_BUCKET: 'vydrivo-private',
    MEDIA_S3_ENDPOINT: 'https://s3.us-east-1.amazonaws.com',
    MEDIA_S3_REGION: 'us-east-1',
  };
  assert.equal(r2PrivateConfig(aws).configured, true);
  assert.equal(r2PrivateConfig(aws).region, 'us-east-1');
});

test('validates upload intents by kind, MIME type and size', () => {
  assert.equal(validateUploadIntent({ projectId, kind: 'reference', mime: 'video/mp4', bytes: 1024 }).ext, 'mp4');
  assert.equal(validateUploadIntent({ projectId, kind: 'thumbnail', mime: 'image/png', bytes: 1024 }).ext, 'png');
  assert.throws(() => validateUploadIntent({ projectId, kind: 'footage', mime: 'video/mp4', bytes: 1024 }), /media kind/);
  assert.throws(() => validateUploadIntent({ projectId, kind: 'thumbnail', mime: 'video/mp4', bytes: 1024 }), /media kind/);
  assert.throws(() => validateUploadIntent({ projectId, kind: 'reference', mime: 'image/gif', bytes: 1024 }), /image or video type/);
  assert.throws(() => validateUploadIntent({ projectId, kind: 'reference', mime: 'video/mp4', bytes: 0 }), /file size/);
  assert.throws(() => validateUploadIntent({ projectId, kind: 'reference', mime: 'video/mp4', bytes: 100 * 1024 * 1024 + 1 }), /file size/);
});

test('generates owner/project-scoped keys and rejects other owners', () => {
  const key = privateObjectKey({ ownerId, projectId, kind: 'reference', mime: 'image/jpeg' });
  assert.match(key, new RegExp(`^users/${ownerId}/projects/${projectId}/reference/[0-9a-f-]{36}\\.jpg$`));
  assert.equal(ownsPrivateKey(ownerId, key), true);
  assert.equal(ownsPrivateKey('33333333-3333-4333-8333-333333333333', key), false);
  assert.equal(ownsPrivateKey(ownerId, `${key}/../secret`), false);
});

test('presigns a scoped upload URL without contacting R2', async () => {
  const intent = await createPrivateUploadUrl({
    ownerId,
    projectId,
    kind: 'reference',
    mime: 'image/jpeg',
    bytes: 2048,
    env,
  });

  assert.match(intent.key, /^users\//);
  assert.equal(intent.method, 'PUT');
  assert.equal(intent.headers['Content-Type'], 'image/jpeg');
  assert.equal(intent.maxBytes, 20 * 1024 * 1024);
  assert.match(intent.uploadUrl, /X-Amz-Expires=900/);
  assert.match(intent.uploadUrl, /X-Amz-Signature=/);
  assert.ok(intent.uploadUrl.includes(intent.key));
  assert.ok(Date.parse(intent.expiresAt) > Date.now());
});

test('presigns access only for the caller’s own key', async () => {
  const key = privateObjectKey({ ownerId, projectId, kind: 'thumbnail', mime: 'image/png' });
  const access = await createPrivateAccessUrl({ ownerId, key, env });
  assert.match(access.url, /X-Amz-Expires=300/);
  assert.ok(access.url.includes(key));

  await assert.rejects(
    () => createPrivateAccessUrl({ ownerId: '33333333-3333-4333-8333-333333333333', key, env }),
    (error) => error instanceof MediaStorageError && error.status === 404,
  );
});

test('fails closed when private storage is not configured', async () => {
  await assert.rejects(
    () => createPrivateUploadUrl({
      ownerId,
      projectId,
      kind: 'reference',
      mime: 'image/jpeg',
      bytes: 2048,
      env: {},
    }),
    (error) => error instanceof MediaStorageError && error.status === 503,
  );
});
