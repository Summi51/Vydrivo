import assert from 'node:assert/strict';
import test from 'node:test';
import {
  catalogVoice,
  graphicsClaimedKey,
  graphicsHostCanRender,
  graphicsLatestKey,
  graphicsLockKey,
  graphicsPendingKey,
  graphicsStatusKey,
  lockIsFresh,
  publicRenderStatus,
  runIdFromQueueKey,
} from './graphics-queue.js';

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const projectId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const runId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('queue keys stay owner-scoped and reject unsafe ids', () => {
  assert.equal(graphicsPendingKey(runId), `graphics-queue/pending/${runId}.json`);
  assert.equal(graphicsClaimedKey(runId), `graphics-queue/claimed/${runId}.json`);
  assert.equal(graphicsLockKey(projectId), `graphics-queue/locks/${projectId}.json`);
  assert.equal(
    graphicsStatusKey({ ownerId, projectId, runId }),
    `users/${ownerId}/projects/${projectId}/renders/${runId}/queue-status.json`,
  );
  assert.equal(graphicsLatestKey({ ownerId, projectId }), `users/${ownerId}/projects/${projectId}/renders/latest.json`);
  assert.equal(graphicsPendingKey('../secret'), '');
  assert.equal(graphicsStatusKey({ ownerId: 'nope', projectId, runId }), '');
  assert.equal(runIdFromQueueKey(graphicsPendingKey(runId)), runId);
  assert.equal(runIdFromQueueKey(`graphics-queue/pending/${runId}.json/../secret`), '');
});

test('a hosted render is queued unless this computer has the renderer', () => {
  assert.equal(graphicsHostCanRender({ env: { GRAPHICS_RENDER_MODE: 'queue' }, root: '/missing' }), false);
  assert.equal(graphicsHostCanRender({ env: { GRAPHICS_RENDER_MODE: 'local' }, root: '/missing' }), true);
  assert.equal(graphicsHostCanRender({ env: {}, root: '/missing-renderer' }), false);
});

test('a project lock expires after fifteen minutes', () => {
  const now = Date.parse('2026-11-16T00:15:00.000Z');
  assert.equal(lockIsFresh({ updatedAt: '2026-11-16T00:01:00.000Z' }, now), true);
  assert.equal(lockIsFresh({ updatedAt: '2026-11-15T23:59:00.000Z' }, now), false);
  assert.equal(lockIsFresh({}, now), false);
});

test('catalog voice and public status stay inside the existing contract', () => {
  assert.equal(catalogVoice('female'), 'female');
  assert.equal(catalogVoice('indian-english-female'), 'female');
  assert.equal(catalogVoice('gemini-Kore'), 'male');
  const queued = publicRenderStatus({ state: 'rendering', progress: 140 }, { projectId, runId });
  assert.equal(queued.progress, 100);
  assert.equal(queued.outputUrl, null);
  const done = publicRenderStatus({ state: 'done', progress: 100 }, { projectId, runId, durable: true });
  assert.equal(done.outputUrl, `/api/v1/projects/${projectId}/graphics-render/${runId}/file`);
  assert.equal(done.durable, true);
});
