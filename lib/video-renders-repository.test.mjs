import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VideoRenderError,
  isVideoStorageUnavailable,
  mapVideoRender,
} from './video-renders-repository.js';

const projectId = 'cd979cb3-d0f0-431b-9439-726baf1ad4ff';
const runId = 'b723ed26-d67e-4b0c-9ea1-b4ce4c90a460';

const row = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  project_id: projectId,
  run_id: runId,
  title: 'Three signs your content workflow is slowing you down',
  language: 'hindi',
  voice: 'male',
  status: 'ready',
  seconds: '88.4',
  width: 1080,
  height: 1920,
  video_key: `users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/projects/${projectId}/renders/${runId}/video.mp4`,
  thumbnail_key: `users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/projects/${projectId}/renders/${runId}/thumbnail.jpg`,
  script_key: null,
  metadata_key: `users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/projects/${projectId}/renders/${runId}/metadata.json`,
  bytes: '6500000',
  thumbnail_bytes: null,
  script_bytes: null,
  metadata: { language: 'hindi' },
  created_at: '2026-11-07T00:00:00.000Z',
  updated_at: '2026-11-07T00:01:00.000Z',
};

test('maps a durable render to the videos API shape', () => {
  const video = mapVideoRender(row);
  assert.equal(video.runId, runId);
  assert.equal(video.projectId, projectId);
  assert.equal(video.title, row.title);
  assert.equal(video.seconds, 88.4);
  assert.equal(video.bytes, 6500000);
  assert.equal(video.storage, 'cloud');
  assert.equal(video.outputUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/file`);
  assert.equal(video.downloadUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/file?download=1`);
  assert.equal(video.thumbnailUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/thumbnail`);
});

test('returns null for a missing row', () => {
  assert.equal(mapVideoRender(null), null);
});

test('identifies an unavailable storage table', () => {
  assert.equal(
    isVideoStorageUnavailable(new VideoRenderError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Not set up.')),
    true,
  );
  assert.equal(
    isVideoStorageUnavailable(new VideoRenderError(422, 'VIDEO_RENDER_REJECTED', 'Invalid.')),
    false,
  );
});
