import assert from 'node:assert/strict';
import test from 'node:test';
import {
  copyPrivateObject,
  createPrivateAccessUrl,
  createPrivateSignedUrl,
  createPrivateUploadUrl,
  MediaStorageError,
  ownsPrivateKey,
  privateKeyMatchesIntent,
  privateObjectKey,
  r2PrivateConfig,
  sniffMediaMime,
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

test('signs AWS reads on the bucket host and keeps R2 path-style', async () => {
  const aws = {
    MEDIA_S3_ACCESS_KEY_ID: 'access',
    MEDIA_S3_SECRET_ACCESS_KEY: 'secret',
    MEDIA_S3_BUCKET: 'vydrivo-private',
    MEDIA_S3_ENDPOINT: 'https://s3.us-east-1.amazonaws.com',
    MEDIA_S3_REGION: 'us-east-1',
  };
  const key = 'users/11111111-1111-4111-8111-111111111111/renders/video.mp4';
  const awsSigned = await createPrivateSignedUrl({ key, env: aws, expiresIn: 900, contentType: 'video/mp4' });
  const awsUrl = new URL(awsSigned.url);
  assert.equal(awsUrl.hostname, 'vydrivo-private.s3.us-east-1.amazonaws.com');
  assert.equal(awsUrl.pathname, `/${key}`);

  const r2Signed = await createPrivateSignedUrl({ key, env, expiresIn: 900 });
  const r2Url = new URL(r2Signed.url);
  assert.equal(r2Url.hostname, 'account-test.r2.cloudflarestorage.com');
  assert.equal(r2Url.pathname, `/vydrivo-private-test/${key}`);
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
  assert.equal(privateKeyMatchesIntent(ownerId, projectId, 'reference', key), true);
  assert.equal(privateKeyMatchesIntent(ownerId, '99999999-9999-4999-8999-999999999999', 'reference', key), false);
  assert.equal(privateKeyMatchesIntent(ownerId, projectId, 'thumbnail', key), false);
});

test('sniffs supported media signatures for finalize checks', () => {
  assert.equal(sniffMediaMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(sniffMediaMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  const mp4 = new Uint8Array(12);
  mp4.set([0x66, 0x74, 0x79, 0x70], 4);
  assert.equal(sniffMediaMime(mp4), 'video/mp4');
  assert.equal(sniffMediaMime(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])), 'video/webm');
  assert.equal(sniffMediaMime(new Uint8Array([0x00, 0x01, 0x02, 0x03])), '');
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

test('committed copies require two distinct keys and configured storage', async () => {
  await assert.rejects(
    () => copyPrivateObject({ sourceKey: '', destinationKey: 'users/x.png', env }),
    (error) => error instanceof MediaStorageError && error.status === 422,
  );
  await assert.rejects(
    () => copyPrivateObject({ sourceKey: 'users/x.png', destinationKey: 'users/x.png', env }),
    (error) => error instanceof MediaStorageError && error.status === 422,
  );
  await assert.rejects(
    () => copyPrivateObject({ sourceKey: 'users/x.png', destinationKey: 'users/y.png', env: {} }),
    (error) => error instanceof MediaStorageError && error.status === 503,
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
