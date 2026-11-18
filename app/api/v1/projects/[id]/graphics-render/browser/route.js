import { randomUUID } from 'node:crypto';
import { verifiedAccess } from '../../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../../../lib/auth-http.js';
import { getProject, ProjectRepositoryError } from '../../../../../../../lib/projects-repository.js';
import { catalogVoice } from '../../../../../../../lib/graphics-queue.js';
import { isGraphicsVoice } from '../../../../../../../lib/voice-options.js';
import {
  headVideoRenderObject,
  presignVideoRenderUpload,
  uploadVideoRenderFiles,
  videoRenderKey,
} from '../../../../../../../lib/video-storage.js';
import { upsertVideoRender } from '../../../../../../../lib/video-renders-repository.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_VIDEO_BYTES = 1000;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

function failure(error) {
  if (error instanceof ProjectRepositoryError) return errorResult(error.status, error.code, error.message);
  if (error?.status && error?.code) return errorResult(error.status, error.code, error.message);
  return errorResult(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage did not store the render.');
}

function donePayload(id, runId) {
  return {
    runId,
    state: 'done',
    progress: 100,
    durable: true,
    outputUrl: `/api/v1/projects/${id}/graphics-render/${runId}/file`,
    downloadUrl: `/api/v1/projects/${id}/graphics-render/${runId}/file?download=1`,
  };
}

async function approvedProject(session, id) {
  const project = await getProject(session.access, id);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    error.code = 'PROJECT_NOT_FOUND';
    throw error;
  }
  if (project.review?.approved !== true) {
    const error = new Error('Approve the storyboard before rendering.');
    error.status = 409;
    error.code = 'APPROVAL_REQUIRED';
    throw error;
  }
  return project;
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
  const action = parsed.body.action === 'complete' ? 'complete' : 'start';
  const allowed = action === 'start'
    ? ['action', 'bytes', 'thumbnailBytes', 'language', 'voice', 'seconds']
    : ['action', 'runId', 'bytes', 'thumbnailBytes', 'language', 'voice', 'seconds', 'script'];
  const keys = allowKeys(parsed.body, allowed);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);

  const language = parsed.body.language === 'english' ? 'english' : 'hindi';
  const voice = typeof parsed.body.voice === 'string' ? parsed.body.voice : 'Kore';
  const seconds = Number(parsed.body.seconds);
  const bytes = Number(parsed.body.bytes);
  if (!isGraphicsVoice(voice)) return errorResult(422, 'INVALID_VOICE', 'Choose a supported voice.');
  if (!Number.isFinite(seconds) || seconds < 59.5 || seconds > 90.5) {
    return errorResult(422, 'INVALID_RENDER', 'The graphics video must be 60–90 seconds.');
  }
  if (!Number.isInteger(bytes) || bytes < MIN_VIDEO_BYTES || bytes > MAX_VIDEO_BYTES) {
    return errorResult(422, 'INVALID_RENDER', 'The browser video is missing or too large.');
  }

  try {
    const project = await approvedProject(session, id);
    if (action === 'start') {
      const runId = randomUUID();
      const upload = await presignVideoRenderUpload({
        ownerId: session.user.id,
        projectId: id,
        runId,
        kind: 'video',
        bytes,
      });
      const thumbnailBytes = Number(parsed.body.thumbnailBytes);
      let thumbnail = null;
      if (Number.isInteger(thumbnailBytes) && thumbnailBytes >= 100 && thumbnailBytes <= 2 * 1024 * 1024) {
        thumbnail = await presignVideoRenderUpload({
          ownerId: session.user.id,
          projectId: id,
          runId,
          kind: 'thumbnail',
          bytes: thumbnailBytes,
        });
      }
      return jsonResult(201, { runId, upload: { ...upload, thumbnail }, state: 'uploading', progress: 94 });
    }

    const runId = typeof parsed.body.runId === 'string' ? parsed.body.runId : '';
    if (!UUID.test(runId)) return errorResult(422, 'INVALID_RENDER', 'Choose the render that just finished.');
    const key = videoRenderKey({ ownerId: session.user.id, projectId: id, runId, kind: 'video' });
    const head = await headVideoRenderObject({ ownerId: session.user.id, key });
    if (head.bytes !== bytes || head.mime !== 'video/mp4') {
      return errorResult(422, 'INVALID_RENDER', 'The uploaded video did not match. Render again.');
    }
    const thumbnailBytes = Number(parsed.body.thumbnailBytes);
    let thumbnailKey = null;
    let thumbnailSize = null;
    if (Number.isInteger(thumbnailBytes) && thumbnailBytes >= 100) {
      const thumbKey = videoRenderKey({ ownerId: session.user.id, projectId: id, runId, kind: 'thumbnail' });
      const thumb = await headVideoRenderObject({ ownerId: session.user.id, key: thumbKey }).catch(() => null);
      if (thumb?.bytes === thumbnailBytes && thumb.mime === 'image/jpeg') {
        thumbnailKey = thumbKey;
        thumbnailSize = thumb.bytes;
      }
    }
    const script = typeof parsed.body.script === 'string' ? parsed.body.script.slice(0, 180000) : '{}';
    const uploaded = await uploadVideoRenderFiles({
      ownerId: session.user.id,
      projectId: id,
      runId,
      files: [
        { kind: 'script', body: script, contentType: 'application/json' },
        { kind: 'metadata', body: JSON.stringify({ source: 'browser', seconds, language, voice }), contentType: 'application/json' },
      ],
    });
    await upsertVideoRender(session.access, {
      project_id: id,
      run_id: runId,
      title: String(project.title || 'Untitled video').slice(0, 160),
      language,
      voice: catalogVoice(voice),
      status: 'ready',
      seconds: Math.round(seconds * 10) / 10,
      width: 1080,
      height: 1920,
      video_key: key,
      thumbnail_key: thumbnailKey,
      script_key: uploaded.keys.script,
      metadata_key: uploaded.keys.metadata,
      bytes: head.bytes,
      thumbnail_bytes: thumbnailSize,
      script_bytes: uploaded.bytes.script,
      metadata: { language, voice: catalogVoice(voice), voicePreset: voice, testMode: false, source: 'browser' },
    });
    return jsonResult(201, donePayload(id, runId));
  } catch (error) {
    return failure(error);
  }
}

