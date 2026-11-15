import { supabaseConfig } from './auth-server.js';

const SELECT_COLUMNS = [
  'id',
  'project_id',
  'run_id',
  'title',
  'language',
  'voice',
  'status',
  'seconds',
  'width',
  'height',
  'video_key',
  'thumbnail_key',
  'script_key',
  'metadata_key',
  'bytes',
  'thumbnail_bytes',
  'script_bytes',
  'metadata',
  'created_at',
  'updated_at',
].join(',');

export class VideoRenderError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireConfig(env) {
  const config = supabaseConfig(env);
  if (!config.configured) {
    throw new VideoRenderError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not configured on this server.');
  }
  return config;
}

function storageError(status, payload, path = '') {
  const message = String(payload?.message || '');
  if (status === 401 || status === 403 || message.includes('AUTH_REQUIRED')) {
    return new VideoRenderError(401, 'AUTH_REQUIRED', 'Sign in again to access videos.');
  }
  if (payload?.code === '42P01' || /does not exist|schema cache/i.test(message)) {
    return new VideoRenderError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not set up yet.');
  }
  if (status === 404) return new VideoRenderError(404, 'VIDEO_RENDER_NOT_FOUND', 'Video not found.');
  if (status === 409) return new VideoRenderError(409, 'VIDEO_RENDER_CONFLICT', 'This video changed. Reload and try again.');
  if (status === 400 || status === 422) {
    return new VideoRenderError(422, 'VIDEO_RENDER_REJECTED', message || 'This video could not be saved.');
  }
  if (status >= 500) {
    return new VideoRenderError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is temporarily unavailable.');
  }
  return new VideoRenderError(502, 'VIDEO_STORAGE_FAILED', 'Cloud video storage request failed.');
}

async function rest(path, { method = 'GET', access, body, query, env, prefer } = {}) {
  if (typeof access !== 'string' || !access) {
    throw new VideoRenderError(401, 'AUTH_REQUIRED', 'Sign in to access videos.');
  }
  const config = requireConfig(env);
  const url = new URL(`${config.url}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${access}`,
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new VideoRenderError(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage did not respond.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) throw storageError(response.status, payload, path);
  return { payload, headers: response.headers };
}

export function mapVideoRender(row) {
  if (!row) return null;
  const projectId = row.project_id;
  const runId = row.run_id;
  return {
    id: row.id,
    runId,
    projectId,
    title: row.title,
    language: row.language,
    voice: row.voice,
    status: row.status,
    createdAt: row.created_at,
    seconds: Number(row.seconds),
    width: Number(row.width),
    height: Number(row.height),
    videoKey: row.video_key,
    thumbnailKey: row.thumbnail_key || null,
    scriptKey: row.script_key || null,
    metadataKey: row.metadata_key || null,
    bytes: Number(row.bytes) || 0,
    thumbnailBytes: row.thumbnail_bytes === null || row.thumbnail_bytes === undefined ? null : Number(row.thumbnail_bytes),
    scriptBytes: row.script_bytes === null || row.script_bytes === undefined ? null : Number(row.script_bytes),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
    storage: 'cloud',
    thumbnailUrl: `/api/v1/projects/${projectId}/graphics-render/${runId}/thumbnail`,
    outputUrl: `/api/v1/projects/${projectId}/graphics-render/${runId}/file`,
    downloadUrl: `/api/v1/projects/${projectId}/graphics-render/${runId}/file?download=1`,
  };
}

export async function listVideoRenders(access, { limit = 60, env = process.env } = {}) {
  const { payload } = await rest('video_renders', {
    access,
    env,
    query: {
      select: SELECT_COLUMNS,
      order: 'created_at.desc',
      limit: Math.min(60, Math.max(1, Number(limit) || 60)),
    },
  });
  return (Array.isArray(payload) ? payload : []).map(mapVideoRender).filter(Boolean);
}

export async function getVideoRender(access, { projectId, runId, env = process.env } = {}) {
  const { payload } = await rest('video_renders', {
    access,
    env,
    query: {
      select: SELECT_COLUMNS,
      project_id: `eq.${projectId}`,
      run_id: `eq.${runId}`,
      limit: 1,
    },
  });
  const row = Array.isArray(payload) ? payload[0] : null;
  return mapVideoRender(row);
}

export async function upsertVideoRender(access, record, { env = process.env } = {}) {
  const { payload } = await rest('video_renders', {
    method: 'POST',
    access,
    env,
    query: { on_conflict: 'owner_id,run_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: record,
  });
  const row = Array.isArray(payload) ? payload[0] : payload;
  const video = mapVideoRender(row);
  if (!video) throw new VideoRenderError(502, 'VIDEO_STORAGE_FAILED', 'Cloud video storage did not return the saved render.');
  return video;
}

export async function deleteVideoRender(access, { projectId, runId, env = process.env } = {}) {
  await rest('video_renders', {
    method: 'DELETE',
    access,
    env,
    query: { project_id: `eq.${projectId}`, run_id: `eq.${runId}` },
  });
  return true;
}

export async function getProjectScript(access, projectId, { env = process.env } = {}) {
  const { payload } = await rest('project_graphics_scripts', {
    access,
    env,
    query: {
      select: 'script,updated_at',
      project_id: `eq.${projectId}`,
      limit: 1,
    },
  });
  const row = Array.isArray(payload) ? payload[0] : null;
  if (!row?.script || typeof row.script !== 'object') return null;
  return { script: row.script, updatedAt: row.updated_at || null };
}

export async function upsertProjectScript(access, projectId, script, { env = process.env } = {}) {
  const { payload } = await rest('project_graphics_scripts', {
    method: 'POST',
    access,
    env,
    query: { on_conflict: 'project_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: { project_id: projectId, script },
  });
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!row?.script) throw new VideoRenderError(502, 'VIDEO_STORAGE_FAILED', 'Cloud scene text did not return the saved script.');
  return row.script;
}

export function isVideoStorageUnavailable(error) {
  return error instanceof VideoRenderError && error.code === 'VIDEO_STORAGE_UNAVAILABLE';
}
