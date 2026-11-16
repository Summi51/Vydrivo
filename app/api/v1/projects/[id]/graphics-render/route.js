import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { validateGraphicsScript } from '../../../../../../lib/graphics-script.js';
import { getProjectScript, getVideoRender, isVideoStorageUnavailable, upsertVideoRender } from '../../../../../../lib/video-renders-repository.js';
import { headPrivateObject } from '../../../../../../lib/r2-private.js';
import { videoRenderKey } from '../../../../../../lib/video-storage.js';
import { persistLocalVideoRender } from '../../../../../../lib/video-persist.js';
import { validateStoryboard } from '../../../../../../prototype/storyboard.mjs';
import { isGraphicsVoice } from '../../../../../../lib/voice-options.js';
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
  readQueueJson,
  removeQueueObject,
  writeQueueJson,
} from '../../../../../../lib/graphics-queue.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANGUAGES = new Set(['hindi', 'english']);
const ROOT = process.cwd();
// Runtime output folders. Do not trace the project into the deploy.
const JOBS = path.join(/* turbopackIgnore: true */ ROOT, 'prototype/output/graphics-jobs');
const LOCKS = path.join(/* turbopackIgnore: true */ JOBS, 'locks');
const LOCK_TTL_MS = 15 * 60 * 1000;

function failure(error) {
  if (error instanceof ProjectRepositoryError) return errorResult(error.status, error.code, error.message);
  if (error?.status && error?.code) return errorResult(error.status, error.code, error.message);
  return errorResult(503, 'GRAPHICS_RENDER_UNAVAILABLE', 'Graphics rendering is temporarily unavailable.');
}

function readStatus(runId) {
  try {
    return JSON.parse(readFileSync(path.join(JOBS, runId, 'status.json'), 'utf8'));
  } catch {
    return null;
  }
}

function jobPayload({ runId, projectId, ownerId, title, language, voice, testMode, script, storyboard }) {
  return {
    runId,
    projectId,
    ownerId,
    title,
    language,
    voice,
    testMode,
    script,
    storyboard,
    createdAt: new Date().toISOString(),
  };
}

async function enqueueRemoteJob(job) {
  const lockKey = graphicsLockKey(job.projectId);
  const existing = await readQueueJson(lockKey);
  if (lockIsFresh(existing)) {
    const error = new Error('A graphics render is already running for this project.');
    error.status = 409;
    error.code = 'GRAPHICS_RENDER_BUSY';
    throw error;
  }
  const queued = { state: 'queued', progress: 0, updatedAt: job.createdAt, message: 'Waiting for the studio computer.' };
  await writeQueueJson(graphicsPendingKey(job.runId), job);
  await writeQueueJson(graphicsStatusKey(job), queued);
  await writeQueueJson(graphicsLatestKey(job), { runId: job.runId, createdAt: job.createdAt });
  await writeQueueJson(lockKey, { runId: job.runId, updatedAt: job.createdAt });
  return queued;
}

async function indexRemoteRender(session, job, status) {
  const existing = await getVideoRender(session.access, { projectId: job.projectId, runId: job.runId });
  if (existing?.videoKey) return true;
  const videoKey = videoRenderKey({ ownerId: job.ownerId, projectId: job.projectId, runId: job.runId, kind: 'video' });
  const video = await headPrivateObject({ key: videoKey });
  if (!video.bytes) return false;
  const seconds = Math.round(Number(status.seconds) * 10) / 10;
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  const record = {
    project_id: job.projectId,
    run_id: job.runId,
    title: String(job.title || 'Untitled video').trim().slice(0, 160) || 'Untitled video',
    language: job.language === 'english' ? 'english' : 'hindi',
    voice: catalogVoice(job.voice),
    status: 'ready',
    seconds,
    width: Number(status.width) || 1080,
    height: Number(status.height) || 1920,
    video_key: videoKey,
    thumbnail_key: status.thumbnailKey || null,
    script_key: status.scriptKey || null,
    metadata_key: status.metadataKey || null,
    bytes: video.bytes,
    thumbnail_bytes: Number(status.thumbnailBytes) || null,
    script_bytes: Number(status.scriptBytes) || null,
    metadata: {
      language: job.language === 'english' ? 'english' : 'hindi',
      voice: catalogVoice(job.voice),
      voicePreset: job.voice,
      testMode: false,
      createdAt: job.createdAt,
      render: { seconds, width: Number(status.width) || 1080, height: Number(status.height) || 1920 },
    },
    ...(job.createdAt ? { created_at: job.createdAt } : {}),
  };
  await upsertVideoRender(session.access, record);
  return true;
}

async function remoteStatus(session, projectId, runId) {
  const job = await readQueueJson(graphicsPendingKey(runId))
    || await readQueueJson(graphicsClaimedKey(runId));
  const status = await readQueueJson(graphicsStatusKey({ ownerId: session.user.id, projectId, runId }));
  if (!status) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  // The studio computer removes the queue copy after upload. The owner-scoped
  // status remains, and a finished render is also in video_renders.
  if (job && (job.projectId !== projectId || job.ownerId !== session.user.id)) {
    return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  }
  if (!job && status.state === 'error') {
    return jsonResult(200, publicRenderStatus(status, { projectId, runId, durable: false }));
  }
  if (!job) {
    const saved = await getVideoRender(session.access, { projectId, runId }).catch((error) => {
      if (isVideoStorageUnavailable(error)) return null;
      throw error;
    });
    if (!saved || saved.status !== 'ready') {
      return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    }
    return jsonResult(200, publicRenderStatus(
      { ...status, state: 'done', progress: 100, seconds: saved.seconds, width: saved.width, height: saved.height },
      { projectId, runId, testMode: saved.metadata?.testMode === true, durable: true },
    ));
  }
  let durable = false;
  if (status.state === 'done' && job.testMode !== true) {
    try {
      durable = await indexRemoteRender(session, job, status);
      if (durable) await removeQueueObject(graphicsClaimedKey(runId));
    } catch {
      durable = false;
    }
  } else if (status.state === 'error') {
    await removeQueueObject(graphicsClaimedKey(runId)).catch(() => {});
  }
  return jsonResult(200, publicRenderStatus(status, { projectId, runId, testMode: job.testMode === true, durable }));
}

function startLocalJob(job) {
  mkdirSync(JOBS, { recursive: true });
  mkdirSync(LOCKS, { recursive: true });
  const lockPath = path.join(LOCKS, `${job.projectId}.lock`);
  if (existsSync(lockPath)) {
    const age = Date.now() - statSync(lockPath).mtimeMs;
    if (age < LOCK_TTL_MS) {
      const error = new Error('A graphics render is already running for this project.');
      error.status = 409;
      error.code = 'GRAPHICS_RENDER_BUSY';
      throw error;
    }
    rmSync(lockPath, { force: true });
  }
  const jobDir = path.join(JOBS, job.runId);
  mkdirSync(jobDir, { recursive: true });
  const jobPath = path.join(jobDir, 'job.json');
  writeFileSync(jobPath, JSON.stringify(job, null, 2), { mode: 0o600 });
  writeFileSync(lockPath, job.runId, { mode: 0o600 });
  writeFileSync(path.join(JOBS, `${job.projectId}-latest.json`), JSON.stringify({ runId: job.runId, createdAt: job.createdAt }), { mode: 0o600 });
  writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify({ state: 'queued', progress: 0, updatedAt: job.createdAt }), { mode: 0o600 });
  const log = openSync(path.join(jobDir, 'render.log'), 'a');
  try {
    const nodeArgs = existsSync(path.join(ROOT, '.env.local')) ? ['--env-file=.env.local'] : [];
    const child = spawn(process.execPath, [...nodeArgs, 'prototype/project-graphics-render.mjs', jobPath], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', log, log],
    });
    child.unref();
  } catch {
    writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify({ state: 'error', progress: 100, message: 'Could not start the graphics renderer.' }));
    rmSync(lockPath, { force: true });
    const error = new Error('Could not start the graphics renderer.');
    error.status = 503;
    error.code = 'GRAPHICS_RENDER_UNAVAILABLE';
    throw error;
  } finally {
    closeSync(log);
  }
}

export async function POST(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['language', 'voice', 'testMode']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const language = parsed.body.language === undefined ? 'hindi' : parsed.body.language;
  const voice = parsed.body.voice === undefined ? 'male' : parsed.body.voice;
  if (!LANGUAGES.has(language)) return errorResult(422, 'INVALID_LANGUAGE', 'Choose Hindi or English.');
  if (!isGraphicsVoice(voice)) return errorResult(422, 'INVALID_VOICE', 'Choose a supported voice.');
  if (parsed.body.testMode !== undefined && typeof parsed.body.testMode !== 'boolean') {
    return errorResult(422, 'INVALID_TEST_MODE', 'testMode must be true or false.');
  }
  const testMode = parsed.body.testMode === true;

  try {
    const project = await getProject(session.access, id);
    if (!project) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    if (project.review?.approved !== true) {
      return errorResult(409, 'APPROVAL_REQUIRED', 'Approve the storyboard before rendering a graphics video.');
    }
    try {
      validateStoryboard(project.storyboard);
    } catch (error) {
      return errorResult(422, 'STORYBOARD_INVALID', error.message || 'The storyboard is invalid.');
    }

    let savedScript = null;
    if (!testMode) {
      try {
        const durable = await getProjectScript(session.access, id);
        if (durable?.script) {
          const normalized = validateGraphicsScript(project, durable.script);
          savedScript = {
            schemaVersion: 1,
            projectId: id,
            sourceRunId: typeof durable.script.sourceRunId === 'string' ? durable.script.sourceRunId : null,
            updatedAt: typeof durable.script.updatedAt === 'string'
              ? durable.script.updatedAt
              : typeof durable.updatedAt === 'string' ? durable.updatedAt : null,
            ...normalized,
          };
        }
      } catch (error) {
        if (!isVideoStorageUnavailable(error)) throw error;
      }
      if (!savedScript) {
        const scriptPath = path.join(/* turbopackIgnore: true */ ROOT, 'prototype/output/graphics-scripts', `${id}.json`);
        if (existsSync(scriptPath)) {
          try {
            const rawScript = JSON.parse(readFileSync(scriptPath, 'utf8'));
            const normalized = validateGraphicsScript(project, rawScript);
            savedScript = {
              schemaVersion: 1,
              projectId: id,
              sourceRunId: typeof rawScript.sourceRunId === 'string' ? rawScript.sourceRunId : null,
              updatedAt: typeof rawScript.updatedAt === 'string' ? rawScript.updatedAt : null,
              ...normalized,
            };
          } catch {
            return errorResult(422, 'GRAPHICS_SCRIPT_INVALID', 'Update the scene text before rendering.');
          }
        }
      }
    }

    const job = jobPayload({
      runId: randomUUID(),
      projectId: id,
      ownerId: session.user.id,
      title: project.title,
      language,
      voice,
      testMode,
      script: savedScript,
      storyboard: project.storyboard,
    });
    if (graphicsHostCanRender()) {
      startLocalJob(job);
    } else {
      await enqueueRemoteJob(job);
    }
    return jsonResult(202, { runId: job.runId, state: 'queued', progress: 0, testMode });
  } catch (error) {
    return failure(error);
  }
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const requested = new URL(request.url).searchParams.get('runId');
  let runId = requested;
  if (runId && !UUID.test(runId)) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  const hosted = !graphicsHostCanRender();
  if (!runId && !hosted) {
    try {
      const latest = JSON.parse(readFileSync(path.join(JOBS, `${id}-latest.json`), 'utf8'));
      runId = latest.runId;
    } catch {
      runId = null;
    }
  }
  if (!runId && hosted) {
    const latest = await readQueueJson(graphicsLatestKey({ ownerId: session.user.id, projectId: id }));
    runId = latest?.runId || null;
  }
  if (!runId) return jsonResult(200, { runId: null, state: 'idle', progress: 0, outputUrl: null });
  if (hosted) return remoteStatus(session, id, runId);
  try {
    let job = null;
    try {
      job = JSON.parse(readFileSync(path.join(JOBS, runId, 'job.json'), 'utf8'));
    } catch {
      job = null;
    }
    if (!job || job.projectId !== id || job.ownerId !== session.user.id) {
      return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    }
    const status = readStatus(runId);
    if (!status) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    let durable = false;
    if (status.state === 'done' && job.testMode !== true) {
      try {
        const persisted = await persistLocalVideoRender({
          access: session.access,
          ownerId: session.user.id,
          projectId: id,
          runId,
          jobsDir: JOBS,
        });
        durable = Boolean(persisted.video);
      } catch {
        durable = false;
      }
    }
    return jsonResult(200, {
      runId,
      ...status,
      testMode: job.testMode === true,
      durable,
      outputUrl: status.state === 'done' ? `/api/v1/projects/${id}/graphics-render/${runId}/file` : null,
      downloadUrl: status.state === 'done' ? `/api/v1/projects/${id}/graphics-render/${runId}/file?download=1` : null,
    });
  } catch {
    return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  }
}
