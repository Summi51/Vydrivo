import test from 'node:test';
import assert from 'node:assert/strict';
import { latestProjectVideo, publishReadiness } from './publish-step.js';

const PROJECT = '8b5ac7d7-1895-45ca-86ce-20a1f52dddd6';

test('the latest project video is the first matching entry and other projects are ignored', () => {
  const videos = [
    { runId: 'a', projectId: 'other-project' },
    { runId: 'b', projectId: PROJECT },
    { runId: 'c', projectId: PROJECT },
  ];
  assert.equal(latestProjectVideo(videos, PROJECT).runId, 'b');
  assert.equal(latestProjectVideo(videos, 'missing-project'), null);
  assert.equal(latestProjectVideo(null, PROJECT), null);
  assert.equal(latestProjectVideo(videos, ''), null);
});

test('publish readiness distinguishes missing, local, ready and posted videos', () => {
  assert.equal(publishReadiness(null), 'missing');
  assert.equal(publishReadiness({ storage: 'local' }), 'local');
  assert.equal(publishReadiness({ storage: 'cloud' }), 'ready');
  assert.equal(publishReadiness({ storage: 'cloud', instagram: { permalink: 'https://www.instagram.com/reel/x/' } }), 'posted');
  assert.equal(publishReadiness({ storage: 'cloud', instagram: {} }), 'posted');
});
