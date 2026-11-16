import { existsSync } from 'node:fs';
import path from 'node:path';
import { isMediaUuid } from './media-rules.js';
import {
  deletePrivateObject,
  listPrivateObjectKeys,
  putPrivateObject,
  readPrivateObject,
} from './r2-private.js';

export const GRAPHICS_LOCK_TTL_MS = 15 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGraphicsUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}

// The hosted site has no renderer and no headless browser. A job started there
// is written to private storage and finished by the studio computer.
export function graphicsHostCanRender({ env = process.env, root = process.cwd() } = {}) {
  if (env.GRAPHICS_RENDER_MODE === 'queue') return false;
  if (env.GRAPHICS_RENDER_MODE === 'local') return true;
  const browser = env.BROWSER_EXECUTABLE
    ? path.resolve(root, env.BROWSER_EXECUTABLE)
    : path.join(root, 'node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  return existsSync(/* turbopackIgnore: true */ browser);
}

export function graphicsPendingKey(runId) {
  if (!isGraphicsUuid(runId)) return '';
  return `graphics-queue/pending/${runId}.json`;
}

export function graphicsClaimedKey(runId) {
  if (!isGraphicsUuid(runId)) return '';
  return `graphics-queue/claimed/${runId}.json`;
}

export function graphicsLockKey(projectId) {
  if (!isGraphicsUuid(projectId)) return '';
  return `graphics-queue/locks/${projectId}.json`;
}

export function graphicsStatusKey({ ownerId, projectId, runId } = {}) {
  if (!isMediaUuid(ownerId) || !isGraphicsUuid(projectId) || !isGraphicsUuid(runId)) return '';
  return `users/${ownerId}/projects/${projectId}/renders/${runId}/queue-status.json`;
}

export function graphicsLatestKey({ ownerId, projectId } = {}) {
  if (!isMediaUuid(ownerId) || !isGraphicsUuid(projectId)) return '';
  return `users/${ownerId}/projects/${projectId}/renders/latest.json`;
}

export function runIdFromQueueKey(key) {
  const match = /^graphics-queue\/(?:pending|claimed)\/([0-9a-f-]{36})\.json$/i.exec(String(key || ''));
  return match && isGraphicsUuid(match[1]) ? match[1] : '';
}

export function lockIsFresh(lock, now = Date.now()) {
  const updated = Date.parse(lock?.updatedAt || '');
  return Number.isFinite(updated) && now - updated < GRAPHICS_LOCK_TTL_MS;
}

export function catalogVoice(value) {
  return value === 'female' || value === 'indian-english-female' ? 'female' : 'male';
}

export function publicRenderStatus(status, { projectId, runId, testMode = false, durable = false } = {}) {
  const state = typeof status?.state === 'string' ? status.state : 'queued';
  const done = state === 'done';
  return {
    runId,
    state,
    progress: Number.isFinite(Number(status?.progress)) ? Math.max(0, Math.min(100, Math.round(Number(status.progress)))) : 0,
    ...(status?.updatedAt ? { updatedAt: status.updatedAt } : {}),
    ...(status?.message ? { message: String(status.message).slice(0, 500) } : {}),
    testMode: testMode === true,
    durable,
    outputUrl: done ? `/api/v1/projects/${projectId}/graphics-render/${runId}/file` : null,
    downloadUrl: done ? `/api/v1/projects/${projectId}/graphics-render/${runId}/file?download=1` : null,
  };
}

export async function readQueueJson(key, { env = process.env } = {}) {
  if (!key) return null;
  try {
    const bytes = await readPrivateObject({ key, env });
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

export async function writeQueueJson(key, value, { env = process.env } = {}) {
  if (!key) throw new Error('Choose a valid graphics queue object.');
  const body = JSON.stringify(value);
  await putPrivateObject({
    key,
    body,
    contentType: 'application/json',
    contentLength: Buffer.byteLength(body),
    cacheControl: 'private, no-store',
    env,
  });
}

export async function removeQueueObject(key, { env = process.env } = {}) {
  if (!key) return false;
  return deletePrivateObject({ key, env });
}

export async function listPendingRunIds({ env = process.env, maxKeys = 20 } = {}) {
  const keys = await listPrivateObjectKeys({ prefix: 'graphics-queue/pending/', maxKeys, env });
  return keys.map(runIdFromQueueKey).filter(Boolean);
}
