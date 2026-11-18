import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { verifiedAccess } from '../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../lib/projects-repository.js';
import { getProjectScript, isVideoStorageUnavailable, upsertProjectScript } from '../../../../../../lib/video-renders-repository.js';
import { GraphicsTranslateError, translateScenes } from '../../../../../../lib/graphics-translate.js';
import { scriptFromRenderData, scriptFromTranslation, validateGraphicsScript } from '../../../../../../lib/graphics-script.js';

export const dynamic = 'force-dynamic';
// Amplify Hosting cuts an SSR request off at about 30 seconds and returns an
// empty 504. The page therefore asks for one scene per request. One scene plus
// one validation retry must finish inside that cutoff.
export const maxDuration = 30;
const PREPARE_TIMEOUT_MS = 12000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROOT = process.cwd();
// Runtime output folders. Do not trace the project into the deploy.
const SCRIPTS = path.join(/* turbopackIgnore: true */ ROOT, 'prototype/output/graphics-scripts');
const JOBS = path.join(/* turbopackIgnore: true */ ROOT, 'prototype/output/graphics-jobs');

function readJsonFile(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readScript(projectId) {
  return readJsonFile(path.join(SCRIPTS, `${projectId}.json`));
}

function writeScript(projectId, script) {
  // Amplify compute is read-only outside /tmp. The durable table is the source
  // of truth; a local mirror must not fail a cloud save.
  try {
    mkdirSync(SCRIPTS, { recursive: true });
    const file = path.join(SCRIPTS, `${projectId}.json`);
    const temp = `${file}.tmp`;
    writeFileSync(temp, JSON.stringify(script, null, 2), { mode: 0o600 });
    renameSync(temp, file);
    return true;
  } catch {
    return false;
  }
}

async function readDurableScript(access, projectId) {
  try {
    const row = await getProjectScript(access, projectId);
    return row?.script || null;
  } catch (error) {
    if (isVideoStorageUnavailable(error)) return null;
    throw error;
  }
}

async function saveDurableScript(access, projectId, script) {
  try {
    await upsertProjectScript(access, projectId, script);
    return true;
  } catch (error) {
    if (isVideoStorageUnavailable(error)) return false;
    throw error;
  }
}

function latestRender(projectId, ownerId) {
  let entries = [];
  try {
    entries = readdirSync(JOBS, { withFileTypes: true });
  } catch {
    return null;
  }
  let best = null;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'locks') continue;
    const directory = path.join(JOBS, entry.name);
    const job = readJsonFile(path.join(directory, 'job.json'));
    const status = readJsonFile(path.join(directory, 'status.json'));
    if (!job || !status || status.state !== 'done' || job.testMode === true) continue;
    if (job.projectId !== projectId || job.ownerId !== ownerId) continue;
    const data = readJsonFile(path.join(directory, 'data.json'));
    if (!data) continue;
    const createdAt = Date.parse(job.createdAt || status.updatedAt || '') || 0;
    if (!best || createdAt > best.createdAt) best = { data, runId: entry.name, createdAt };
  }
  return best;
}

function failure(error) {
  if (error instanceof ProjectRepositoryError) return errorResult(error.status, error.code, error.message);
  if (error instanceof GraphicsTranslateError) return errorResult(error.status, error.code, error.message);
  if (error?.status && error?.code) return errorResult(error.status, error.code, error.message);
  if (error instanceof Error) return errorResult(422, 'GRAPHICS_SCRIPT_INVALID', error.message);
  return errorResult(503, 'GRAPHICS_SCRIPT_UNAVAILABLE', 'Scene text is temporarily unavailable.');
}

async function approvedProject(access, id) {
  const project = await getProject(access, id);
  if (!project) return { error: errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.') };
  if (project.review?.approved !== true) {
    return { error: errorResult(409, 'APPROVAL_REQUIRED', 'Approve the storyboard before editing scene text.') };
  }
  return { project };
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');

  try {
    const { project, error } = await approvedProject(session.access, id);
    if (error) return error;
    let script = await readDurableScript(session.access, id);
    const hadDurable = Boolean(script);
    let durable = hadDurable;
    if (!script) script = readScript(id);
    if (script) {
      try {
        const normalized = validateGraphicsScript(project, script);
        script = {
          schemaVersion: 1,
          projectId: id,
          sourceRunId: typeof script.sourceRunId === 'string' ? script.sourceRunId : null,
          updatedAt: typeof script.updatedAt === 'string' ? script.updatedAt : new Date().toISOString(),
          ...normalized,
        };
      } catch {
        script = null;
        durable = false;
      }
    }
    if (!script) {
      const latest = latestRender(id, session.user.id);
      if (latest) script = scriptFromRenderData(project, latest.data, latest.runId);
    }
    if (script && !hadDurable) {
      durable = await saveDurableScript(session.access, id, script);
    }
    return jsonResult(200, { script: script || null, sourceRunId: script?.sourceRunId || null, durable });
  } catch (error) {
    return failure(error);
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
  const keys = allowKeys(parsed.body, ['sceneId']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  try {
    const { project, error } = await approvedProject(session.access, id);
    if (error) return error;
    const sourceScenes = Array.isArray(project.storyboard?.scenes) ? project.storyboard.scenes : [];
    const sceneId = typeof parsed.body.sceneId === 'string' ? parsed.body.sceneId : '';
    const sceneIndex = sourceScenes.findIndex((scene) => scene.id === sceneId);
    if (sceneIndex < 0) return errorResult(422, 'GRAPHICS_SCRIPT_INVALID', 'Choose one approved scene to prepare.');
    const translated = await translateScenes([sourceScenes[sceneIndex]], {
      timeoutMs: PREPARE_TIMEOUT_MS,
      deadlineMs: 22000,
      attempts: 2,
      retryDelayMs: 250,
      isLastScene: sceneIndex === sourceScenes.length - 1,
      sceneIndex,
      sceneCount: sourceScenes.length,
    });
    const seeded = scriptFromTranslation(
      { ...project, storyboard: { ...project.storyboard, scenes: [sourceScenes[sceneIndex]] } },
      { scenes: translated },
    );
    if (!seeded?.scenes?.[0]) throw new Error('Scene text could not be prepared from the storyboard.');
    return jsonResult(200, {
      scene: seeded.scenes[0],
      index: sceneIndex,
      total: sourceScenes.length,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const { id } = await params;
  if (!UUID.test(id)) return errorResult(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['script']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  try {
    const { project, error } = await approvedProject(session.access, id);
    if (error) return error;
    const normalized = validateGraphicsScript(project, parsed.body.script);
    const existing = await readDurableScript(session.access, id) || readScript(id);
    const incomingSource = parsed.body.script?.sourceRunId;
    const script = {
      schemaVersion: 1,
      projectId: id,
      sourceRunId: typeof existing?.sourceRunId === 'string'
        ? existing.sourceRunId
        : (typeof incomingSource === 'string' ? incomingSource : null),
      updatedAt: new Date().toISOString(),
      ...normalized,
    };
    writeScript(id, script);
    const durable = await saveDurableScript(session.access, id, script);
    return jsonResult(200, { script, durable });
  } catch (error) {
    return failure(error);
  }
}
