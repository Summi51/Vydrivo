import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { validateStoryboard } from '../../../../../../prototype/storyboard.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANGUAGES = new Set(['hindi', 'english']);
const VOICES = new Set(['male', 'female']);
const ROOT = process.cwd();
const JOBS = path.join(ROOT, 'prototype/output/graphics-jobs');
const LOCKS = path.join(JOBS, 'locks');
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
  if (!VOICES.has(voice)) return errorResult(422, 'INVALID_VOICE', 'Choose a supported voice.');
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

    mkdirSync(JOBS, { recursive: true });
    mkdirSync(LOCKS, { recursive: true });
    const lockPath = path.join(LOCKS, `${id}.lock`);
    if (existsSync(lockPath)) {
      const age = Date.now() - statSync(lockPath).mtimeMs;
      if (age < LOCK_TTL_MS) {
        return errorResult(409, 'GRAPHICS_RENDER_BUSY', 'A graphics render is already running for this project.');
      }
      rmSync(lockPath, { force: true });
    }

    const runId = randomUUID();
    const jobDir = path.join(JOBS, runId);
    mkdirSync(jobDir, { recursive: true });
    const jobPath = path.join(jobDir, 'job.json');
    const job = {
      runId,
      projectId: id,
      ownerId: session.user.id,
      title: project.title,
      language,
      voice,
      testMode,
      storyboard: project.storyboard,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(jobPath, JSON.stringify(job, null, 2), { mode: 0o600 });
    writeFileSync(lockPath, runId, { mode: 0o600 });
    writeFileSync(path.join(JOBS, `${id}-latest.json`), JSON.stringify({ runId, createdAt: job.createdAt }), { mode: 0o600 });
    writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify({ state: 'queued', progress: 0, updatedAt: new Date().toISOString() }), { mode: 0o600 });

    const log = openSync(path.join(jobDir, 'render.log'), 'a');
    let child;
    try {
      child = spawn(process.execPath, ['--env-file=.env.local', 'prototype/project-graphics-render.mjs', jobPath], {
        cwd: ROOT,
        detached: true,
        stdio: ['ignore', log, log],
      });
      child.unref();
    } catch {
      writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify({ state: 'error', progress: 100, message: 'Could not start the graphics renderer.' }));
      rmSync(lockPath, { force: true });
      return errorResult(503, 'GRAPHICS_RENDER_UNAVAILABLE', 'Could not start the graphics renderer.');
    } finally {
      closeSync(log);
    }

    return jsonResult(202, { runId, state: 'queued', progress: 0, testMode });
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
  if (!runId) {
    try {
      const latest = JSON.parse(readFileSync(path.join(JOBS, `${id}-latest.json`), 'utf8'));
      runId = latest.runId;
    } catch {
      return jsonResult(200, { runId: null, state: 'idle', progress: 0, outputUrl: null });
    }
  }
  try {
    const job = JSON.parse(readFileSync(path.join(JOBS, runId, 'job.json'), 'utf8'));
    if (job.projectId !== id || job.ownerId !== session.user.id) {
      return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    }
    const status = readStatus(runId);
    if (!status) return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
    return jsonResult(200, {
      runId,
      ...status,
      testMode: job.testMode === true,
      outputUrl: status.state === 'done' ? `/api/v1/projects/${id}/graphics-render/${runId}/file` : null,
    });
  } catch {
    return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Graphics render not found.');
  }
}
