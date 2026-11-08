import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VideoStorageError,
  ownsVideoRenderKey,
  signVideoRenderObject,
  uploadVideoRenderFiles,
  videoRenderKey,
} from './video-storage.js';

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherOwnerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const projectId = 'cd979cb3-d0f0-431b-9439-726baf1ad4ff';
const runId = 'b723ed26-d67e-4b0c-9ea1-b4ce4c90a460';

test('builds owner-scoped render keys', () => {
  assert.equal(
    videoRenderKey({ ownerId, projectId, runId, kind: 'video' }),
    `users/${ownerId}/projects/${projectId}/renders/${runId}/video.mp4`,
  );
  assert.equal(
    videoRenderKey({ ownerId, projectId, runId, kind: 'thumbnail' }),
    `users/${ownerId}/projects/${projectId}/renders/${runId}/thumbnail.jpg`,
  );
  assert.throws(
    () => videoRenderKey({ ownerId: 'not-a-uuid', projectId, runId, kind: 'video' }),
    (error) => error instanceof VideoStorageError && error.code === 'INVALID_RENDER_KEY',
  );
  assert.throws(
    () => videoRenderKey({ ownerId, projectId, runId, kind: 'unknown' }),
    (error) => error instanceof VideoStorageError && error.code === 'INVALID_RENDER_KIND',
  );
});

test('accepts only the owner render key', () => {
  const key = videoRenderKey({ ownerId, projectId, runId, kind: 'video' });
  assert.equal(ownsVideoRenderKey(ownerId, key), true);
  assert.equal(ownsVideoRenderKey(otherOwnerId, key), false);
  assert.equal(ownsVideoRenderKey(ownerId, `users/${ownerId}/projects/${projectId}/reference/foo.png`), false);
  assert.equal(ownsVideoRenderKey(ownerId, 'not-a-key'), false);
});

test('fails closed when private storage is not configured', async () => {
  await assert.rejects(
    () => uploadVideoRenderFiles({
      ownerId,
      projectId,
      runId,
      files: [{ kind: 'metadata', body: '{}', contentType: 'application/json' }],
      env: {},
    }),
    (error) => error instanceof VideoStorageError
      && error.status === 503
      && error.code === 'VIDEO_STORAGE_UNAVAILABLE',
  );

  await assert.rejects(
    () => signVideoRenderObject({
      ownerId,
      key: videoRenderKey({ ownerId, projectId, runId, kind: 'video' }),
      env: {},
    }),
    (error) => error instanceof VideoStorageError
      && error.status === 503
      && error.code === 'VIDEO_STORAGE_UNAVAILABLE',
  );
});
