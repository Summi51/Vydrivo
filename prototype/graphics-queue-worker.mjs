// Finishes graphics jobs started on the hosted site. This computer renders them
// with the free voice path and uploads the MP4. No paid provider is called.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { putPrivateFile, putPrivateObject } from '../lib/r2-private.js';
import { videoRenderKey } from '../lib/video-storage.js';
import {
  graphicsClaimedKey,
  graphicsHostCanRender,
  graphicsLockKey,
  graphicsPendingKey,
  graphicsStatusKey,
  listPendingRunIds,
  readQueueJson,
  removeQueueObject,
  writeQueueJson,
} from '../lib/graphics-queue.js';

const ROOT = process.cwd();
const JOBS = path.join(ROOT, 'prototype/output/graphics-jobs');
const POLL_MS = 5000;

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishStatus(job, status) {
  // Keep the owner-scoped status after the queue copy is removed. The live page
  // reads it on every poll, including the poll that finds the finished video.
  await writeQueueJson(graphicsStatusKey(job), status);
  if (status.state === 'done' || status.state === 'error') {
    await removeQueueObject(graphicsLockKey(job.projectId));
    return;
  }
  await writeQueueJson(graphicsLockKey(job.projectId), {
    runId: job.runId,
    updatedAt: new Date().toISOString(),
  });
}

async function claim(runId) {
  const pendingKey = graphicsPendingKey(runId);
  const claimedKey = graphicsClaimedKey(runId);
  const existing = await readQueueJson(claimedKey);
  if (existing?.runId === runId) {
    await removeQueueObject(pendingKey);
    return null;
  }
  const job = await readQueueJson(pendingKey);
  if (!job || job.runId !== runId) return null;
  await writeQueueJson(claimedKey, job);
  await removeQueueObject(pendingKey);
  return job;
}

function render(job, onStatus) {
  const jobDir = path.join(JOBS, job.runId);
  mkdirSync(jobDir, { recursive: true });
  mkdirSync(path.join(JOBS, 'locks'), { recursive: true });
  const jobPath = path.join(jobDir, 'job.json');
  writeFileSync(jobPath, JSON.stringify(job, null, 2), { mode: 0o600 });
  writeFileSync(path.join(JOBS, 'locks', `${job.projectId}.lock`), job.runId, { mode: 0o600 });
  writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify({ state: 'queued', progress: 0 }), { mode: 0o600 });
  const child = spawn(process.execPath, ['--env-file=.env.local', 'prototype/project-graphics-render.mjs', jobPath], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  const timer = setInterval(() => {
    const status = readJson(path.join(jobDir, 'status.json'));
    if (status) onStatus(status);
  }, 4000);
  return new Promise((resolve) => {
    child.on('exit', (code) => {
      clearInterval(timer);
      resolve(code);
    });
  });
}

async function uploadFinished(job) {
  const directory = path.join(JOBS, job.runId);
  const report = readJson(path.join(directory, 'report.json'));
  const status = readJson(path.join(directory, 'status.json'));
  const videoPath = path.join(directory, 'output.mp4');
  if (!report || status?.state !== 'done' || !existsSync(videoPath)) {
    throw new Error('The graphics render did not produce a finished video.');
  }
  const seconds = Math.round(Number(report.seconds) * 10) / 10;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('The graphics render duration is invalid.');
  }
  const videoKey = videoRenderKey({ ownerId: job.ownerId, projectId: job.projectId, runId: job.runId, kind: 'video' });
  await putPrivateFile({ key: videoKey, filePath: videoPath, contentType: 'video/mp4' });
  const thumbnailPath = path.join(directory, 'thumbnail.jpg');
  const scriptPath = path.join(directory, 'data.json');
  let thumbnailKey = '';
  let scriptKey = '';
  if (existsSync(thumbnailPath)) {
    thumbnailKey = videoRenderKey({ ownerId: job.ownerId, projectId: job.projectId, runId: job.runId, kind: 'thumbnail' });
    await putPrivateFile({ key: thumbnailKey, filePath: thumbnailPath, contentType: 'image/jpeg' });
  }
  if (existsSync(scriptPath)) {
    scriptKey = videoRenderKey({ ownerId: job.ownerId, projectId: job.projectId, runId: job.runId, kind: 'script' });
    await putPrivateFile({ key: scriptKey, filePath: scriptPath, contentType: 'application/json' });
  }
  const metadata = {
    language: job.language === 'english' ? 'english' : 'hindi',
    voice: job.voice === 'female' || job.voice === 'indian-english-female' ? 'female' : 'male',
    testMode: job.testMode === true,
    createdAt: job.createdAt || status.updatedAt || null,
    render: {
      seconds,
      width: Number(report.width) || 1080,
      height: Number(report.height) || 1920,
    },
  };
  const metadataKey = videoRenderKey({ ownerId: job.ownerId, projectId: job.projectId, runId: job.runId, kind: 'metadata' });
  const metadataBody = JSON.stringify(metadata);
  await putPrivateObject({
    key: metadataKey,
    body: metadataBody,
    contentType: 'application/json',
    contentLength: Buffer.byteLength(metadataBody),
  });
  return {
    state: 'done',
    progress: 100,
    updatedAt: new Date().toISOString(),
    seconds,
    width: metadata.render.width,
    height: metadata.render.height,
    thumbnailKey,
    scriptKey,
    metadataKey,
    message: 'Video is ready.',
  };
}

async function finish(job) {
  let publishing = Promise.resolve();
  const code = await render(job, (status) => {
    if (status.state === 'done' || status.state === 'error') return;
    publishing = publishing.then(() => publishStatus(job, {
      state: status.state || 'rendering',
      progress: Number(status.progress) || 0,
      updatedAt: status.updatedAt || new Date().toISOString(),
      ...(status.message ? { message: String(status.message).slice(0, 500) } : {}),
    })).catch(() => {});
  });
  await publishing;
  if (code !== 0) {
    const status = readJson(path.join(JOBS, job.runId, 'status.json'));
    await publishStatus(job, {
      state: 'error',
      progress: 100,
      updatedAt: new Date().toISOString(),
      message: String(status?.message || 'Graphics render failed.').slice(0, 500),
    });
    // Leave the claimed job so the live page can show this error, then clear it.
    return;
  }
  // Leave the claimed job until the live page indexes the uploaded video.
  // Removing it here would make the next poll lose the owner and script.
  await publishStatus(job, await uploadFinished(job));
}

async function tick() {
  if (!graphicsHostCanRender({ env: { ...process.env, GRAPHICS_RENDER_MODE: 'local' } })) {
    throw new Error('This computer has no graphics renderer.');
  }
  const runIds = await listPendingRunIds({ maxKeys: 5 });
  for (const runId of runIds) {
    const job = await claim(runId);
    if (!job) continue;
    console.log(`Rendering hosted graphics job ${runId}`);
    try {
      await finish(job);
    } catch (error) {
      await publishStatus(job, {
        state: 'error',
        progress: 100,
        updatedAt: new Date().toISOString(),
        message: String(error instanceof Error ? error.message : 'Graphics render failed.').slice(0, 500),
      }).catch(() => {});
    }
  }
}

async function main() {
  if (!existsSync(path.join(ROOT, '.env.local'))) {
    throw new Error('Local provider settings are missing.');
  }
  console.log('Watching the hosted graphics queue. Leave this running while you render on the live site.');
  for (;;) {
    try {
      await tick();
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Graphics queue check failed.');
    }
    await sleep(POLL_MS);
  }
}

main();
