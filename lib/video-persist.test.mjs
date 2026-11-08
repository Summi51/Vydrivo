import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readLocalRender } from './video-persist.js';

const ownerId = 'user-1';
const projectId = 'cd979cb3-d0f0-431b-9439-726baf1ad4ff';
const runId = 'b723ed26-d67e-4b0c-9ea1-b4ce4c90a460';

function fixture({ owner = ownerId, testMode = false, state = 'done' } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vydrivo-render-'));
  const directory = path.join(root, runId);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'job.json'), JSON.stringify({
    ownerId: owner,
    projectId,
    title: 'Three signs your content workflow is slowing you down',
    language: 'hindi',
    voice: 'male',
    testMode,
    createdAt: '2026-11-07T00:00:00.000Z',
  }));
  writeFileSync(path.join(directory, 'status.json'), JSON.stringify({ state, updatedAt: '2026-11-07T00:01:00.000Z' }));
  writeFileSync(path.join(directory, 'report.json'), JSON.stringify({ seconds: 88.363, width: 1080, height: 1920 }));
  writeFileSync(path.join(directory, 'data.json'), JSON.stringify({ scenes: [] }));
  writeFileSync(path.join(directory, 'output.mp4'), Buffer.from('mp4'));
  writeFileSync(path.join(directory, 'thumbnail.jpg'), Buffer.from('jpg'));
  return { root, directory };
}

test('reads a completed owner render from the local fallback', () => {
  const { root } = fixture();
  try {
    const render = readLocalRender({ jobsDir: root, runId, ownerId, projectId });
    assert.equal(render.seconds, 88.4);
    assert.equal(render.report.width, 1080);
    assert.equal(render.data.scenes.length, 0);
    assert.ok(render.videoPath.endsWith('output.mp4'));
    assert.ok(render.thumbnailPath.endsWith('thumbnail.jpg'));
    assert.ok(render.dataPath.endsWith('data.json'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects another owner', () => {
  const { root } = fixture({ owner: 'user-2' });
  try {
    assert.throws(
      () => readLocalRender({ jobsDir: root, runId, ownerId, projectId }),
      (error) => error.code === 'VIDEO_RENDER_NOT_FOUND',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a test render', () => {
  const { root } = fixture({ testMode: true });
  try {
    assert.throws(
      () => readLocalRender({ jobsDir: root, runId, ownerId, projectId }),
      (error) => error.code === 'VIDEO_TEST_RENDER',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects an unfinished render', () => {
  const { root } = fixture({ state: 'rendering' });
  try {
    assert.throws(
      () => readLocalRender({ jobsDir: root, runId, ownerId, projectId }),
      (error) => error.code === 'VIDEO_RENDER_NOT_READY',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
