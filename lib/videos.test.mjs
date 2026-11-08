import assert from 'node:assert/strict';
import test from 'node:test';
import { videoMetadata } from './videos.js';

const projectId = 'cd979cb3-d0f0-431b-9439-726baf1ad4ff';
const runId = 'b723ed26-d67e-4b0c-9ea1-b4ce4c90a460';
const job = {
  ownerId: 'user-1',
  projectId,
  title: 'Three signs your content workflow is slowing you down',
  language: 'hindi',
  voice: 'male',
  createdAt: '2026-11-07T00:00:00.000Z',
};
const status = { state: 'done', updatedAt: '2026-11-07T00:01:00.000Z' };
const report = { seconds: 88.363, width: 1080, height: 1920 };

test('returns metadata for an owner completed render', () => {
  const video = videoMetadata({ job, status, report, hasThumbnail: true, runId, ownerId: 'user-1' });
  assert.equal(video.title, job.title);
  assert.equal(video.projectId, projectId);
  assert.equal(video.seconds, 88.4);
  assert.equal(video.width, 1080);
  assert.equal(video.height, 1920);
  assert.equal(video.outputUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/file`);
  assert.equal(video.downloadUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/file?download=1`);
  assert.equal(video.thumbnailUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/thumbnail`);
  assert.equal(video.storage, 'local');
});

test('rejects another owner', () => {
  assert.equal(videoMetadata({ job, status, report, hasThumbnail: true, runId, ownerId: 'user-2' }), null);
});

test('rejects a test render', () => {
  assert.equal(videoMetadata({ job: { ...job, testMode: true }, status, report, hasThumbnail: true, runId, ownerId: 'user-1' }), null);
});

test('rejects an unfinished render', () => {
  assert.equal(videoMetadata({ job, status: { state: 'rendering' }, report, hasThumbnail: true, runId, ownerId: 'user-1' }), null);
});

test('rejects a missing duration', () => {
  assert.equal(videoMetadata({ job, status, report: {}, hasThumbnail: true, runId, ownerId: 'user-1' }), null);
});

test('omits the thumbnail url when no thumbnail exists', () => {
  const video = videoMetadata({ job, status, report, hasThumbnail: false, runId, ownerId: 'user-1' });
  assert.equal(video.thumbnailUrl, null);
});

test('rejects an invalid run id', () => {
  assert.equal(videoMetadata({ job, status, report, hasThumbnail: true, runId: 'not-a-uuid', ownerId: 'user-1' }), null);
});
