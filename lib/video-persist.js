import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getVideoRender, upsertVideoRender } from './video-renders-repository.js';
import { deleteVideoRenderObjects, uploadVideoRenderFiles } from './video-storage.js';

export class VideoPersistError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readLocalRender({ jobsDir, runId, ownerId, projectId } = {}) {
  if (!jobsDir || !runId) {
    throw new VideoPersistError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  }
  const directory = path.join(jobsDir, runId);
  const job = readJson(path.join(directory, 'job.json'));
  const status = readJson(path.join(directory, 'status.json'));
  const report = readJson(path.join(directory, 'report.json'));
  const data = readJson(path.join(directory, 'data.json'));
  if (!job || !status || !report) {
    throw new VideoPersistError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  }
  if (job.ownerId !== ownerId || job.projectId !== projectId) {
    throw new VideoPersistError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  }
  if (status.state !== 'done') {
    throw new VideoPersistError(404, 'VIDEO_RENDER_NOT_READY', 'Video is not ready yet.');
  }
  if (job.testMode === true) {
    throw new VideoPersistError(422, 'VIDEO_TEST_RENDER', 'Test renders are not saved to the video library.');
  }
  const seconds = Number(report.seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new VideoPersistError(422, 'VIDEO_RENDER_INVALID', 'The render duration is invalid.');
  }
  const videoPath = path.join(directory, 'output.mp4');
  if (!existsSync(videoPath)) {
    throw new VideoPersistError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  }

  return {
    runId,
    directory,
    job,
    status,
    report,
    data,
    seconds: Math.round(seconds * 10) / 10,
    videoPath,
    thumbnailPath: existsSync(path.join(directory, 'thumbnail.jpg')) ? path.join(directory, 'thumbnail.jpg') : null,
    dataPath: data && existsSync(path.join(directory, 'data.json')) ? path.join(directory, 'data.json') : null,
  };
}

export async function persistLocalVideoRender({
  access,
  ownerId,
  projectId,
  runId,
  jobsDir,
  env = process.env,
} = {}) {
  if (!access) throw new VideoPersistError(401, 'AUTH_REQUIRED', 'Sign in again.');

  const existing = await getVideoRender(access, { projectId, runId, env });
  if (existing?.videoKey) {
    return { video: existing, skipped: true };
  }

  const local = readLocalRender({ jobsDir, runId, ownerId, projectId });
  const metadata = {
    language: local.job.language === 'english' ? 'english' : 'hindi',
    voice: local.job.voice === 'female' ? 'female' : 'male',
    testMode: false,
    createdAt: local.job.createdAt || local.status.updatedAt || null,
    render: {
      seconds: local.seconds,
      width: Number(local.report.width) || 1080,
      height: Number(local.report.height) || 1920,
    },
  };

  const files = [
    { kind: 'video', filePath: local.videoPath, contentType: 'video/mp4' },
    { kind: 'metadata', body: JSON.stringify(metadata), contentType: 'application/json' },
  ];
  if (local.thumbnailPath) files.push({ kind: 'thumbnail', filePath: local.thumbnailPath, contentType: 'image/jpeg' });
  if (local.dataPath) files.push({ kind: 'script', filePath: local.dataPath, contentType: 'application/json' });

  const uploaded = await uploadVideoRenderFiles({ ownerId, projectId, runId, files, env });
  try {
    const record = {
      project_id: projectId,
      run_id: runId,
      title: typeof local.job.title === 'string' && local.job.title.trim()
        ? local.job.title.trim().slice(0, 160)
        : 'Untitled video',
      language: metadata.language,
      voice: metadata.voice,
      status: 'ready',
      seconds: local.seconds,
      width: metadata.render.width,
      height: metadata.render.height,
      video_key: uploaded.keys.video,
      thumbnail_key: uploaded.keys.thumbnail || null,
      script_key: uploaded.keys.script || null,
      metadata_key: uploaded.keys.metadata || null,
      bytes: uploaded.bytes.video,
      thumbnail_bytes: uploaded.bytes.thumbnail || null,
      script_bytes: uploaded.bytes.script || null,
      metadata,
      ...(metadata.createdAt ? { created_at: metadata.createdAt } : {}),
    };
    const video = await upsertVideoRender(access, record, { env });
    return { video, skipped: false };
  } catch (error) {
    await deleteVideoRenderObjects({ keys: Object.values(uploaded.keys), env });
    throw error;
  }
}
