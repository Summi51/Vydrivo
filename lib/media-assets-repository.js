import { supabaseConfig } from './auth-server.js';
import { isMediaUuid } from './media-rules.js';

export const MEDIA_QUOTA_BYTES = 500 * 1024 * 1024;

const SELECT_COLUMNS = [
  'id',
  'project_id',
  'kind',
  'status',
  'storage_backend',
  'object_key',
  'filename',
  'declared_bytes',
  'bytes',
  'mime',
  'sha256',
  'rejected_reason',
  'created_at',
  'validated_at',
  'expires_at',
  'deleted_at',
].join(',');

export class MediaAssetError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requireConfig(env) {
  const config = supabaseConfig(env);
  if (!config.configured) {
    throw new MediaAssetError(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are not available right now.');
  }
  return config;
}

function assetError(status, payload, path = '') {
  const message = String(payload?.message || '');
  if (status === 401 || status === 403 || message.includes('AUTH_REQUIRED')) {
    return new MediaAssetError(401, 'AUTH_REQUIRED', 'Sign in again to access media.');
  }
  if (message.includes('PROJECT_NOT_FOUND')) {
    return new MediaAssetError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  }
  if (message.includes('INVALID_MEDIA_')) {
    return new MediaAssetError(422, 'INVALID_MEDIA', 'Choose a valid media file.');
  }
  if (path.startsWith('rpc/') && status === 404) {
    return new MediaAssetError(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are not available right now.');
  }
  if (payload?.code === '42P01' || /does not exist|schema cache/i.test(message)) {
    return new MediaAssetError(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are not available right now.');
  }
  if (status === 404) {
    return new MediaAssetError(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  }
  if (status === 409) {
    return new MediaAssetError(409, 'MEDIA_ASSET_CONFLICT', 'This media asset changed. Reload and try again.');
  }
  if (status === 400 || status === 422) {
    return new MediaAssetError(422, 'MEDIA_LIBRARY_REJECTED', message || 'This reference could not be saved.');
  }
  if (status >= 500) {
    return new MediaAssetError(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads are temporarily unavailable.');
  }
  return new MediaAssetError(502, 'MEDIA_LIBRARY_FAILED', 'Reference upload request failed.');
}

async function rest(path, { method = 'GET', access, body, query, env, prefer } = {}) {
  if (typeof access !== 'string' || !access) {
    throw new MediaAssetError(401, 'AUTH_REQUIRED', 'Sign in to access media.');
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
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new MediaAssetError(503, 'MEDIA_LIBRARY_UNAVAILABLE', 'Reference uploads did not respond.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) throw assetError(response.status, payload, path);
  return { payload, headers: response.headers };
}

export function mapMediaAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    status: row.status,
    storageBackend: row.storage_backend || 's3',
    key: row.object_key,
    filename: row.filename || 'reference',
    declaredBytes: Number(row.declared_bytes) || 0,
    bytes: row.bytes === null || row.bytes === undefined ? null : Number(row.bytes),
    mime: row.mime,
    sha256: row.sha256 || '',
    rejectedReason: row.rejected_reason || '',
    createdAt: row.created_at,
    validatedAt: row.validated_at || null,
    expiresAt: row.expires_at || null,
    deletedAt: row.deleted_at || null,
  };
}

function quotaShape(payload, limitBytes) {
  const usedBytes = Math.max(0, Number(payload?.usedBytes) || 0);
  const limit = Math.max(1, Number(payload?.limitBytes) || limitBytes);
  return {
    usedBytes,
    limitBytes: limit,
    remainingBytes: Math.max(0, Number(payload?.remainingBytes) || limit - usedBytes),
  };
}

export async function reserveMediaAsset(access, {
  projectId,
  kind,
  key,
  mime,
  bytes,
  filename = 'reference',
  limitBytes = MEDIA_QUOTA_BYTES,
  env = process.env,
} = {}) {
  if (!isMediaUuid(projectId)) throw new MediaAssetError(422, 'INVALID_PROJECT', 'Choose a valid project.');
  const { payload } = await rest('rpc/reserve_media_asset', {
    method: 'POST',
    access,
    env,
    body: {
      p_project_id: projectId,
      p_kind: kind,
      p_object_key: key,
      p_mime: mime,
      p_bytes: bytes,
      p_limit: limitBytes,
      p_filename: filename,
    },
  });
  if (!payload || typeof payload !== 'object') {
    throw new MediaAssetError(502, 'MEDIA_LIBRARY_FAILED', 'Reference upload did not return a reservation.');
  }
  const quota = quotaShape(payload, limitBytes);
  if (payload.allowed !== true) {
    throw new MediaAssetError(
      413,
      'MEDIA_QUOTA_EXCEEDED',
      `This upload would exceed the ${Math.round(quota.limitBytes / (1024 * 1024))} MB reference-media limit. Remove an asset and try again.`,
      quota,
    );
  }
  const asset = mapMediaAsset(payload.asset);
  if (!asset) throw new MediaAssetError(502, 'MEDIA_LIBRARY_FAILED', 'Reference upload did not return an asset.');
  return { asset, quota };
}

export async function mediaQuotaUsage(access, { limitBytes = MEDIA_QUOTA_BYTES, env = process.env } = {}) {
  const { payload } = await rest('rpc/media_quota_usage', {
    method: 'POST',
    access,
    env,
    body: { p_limit: limitBytes },
  });
  return quotaShape(payload, limitBytes);
}

export async function listMediaAssets(access, { projectId, env = process.env } = {}) {
  if (!isMediaUuid(projectId)) throw new MediaAssetError(422, 'INVALID_PROJECT', 'Choose a valid project.');
  const { payload } = await rest('media_assets', {
    access,
    env,
    query: {
      select: SELECT_COLUMNS,
      project_id: `eq.${projectId}`,
      status: 'in.(pending,validated)',
      order: 'created_at.desc',
      limit: 50,
    },
  });
  const now = Date.now();
  const assets = (Array.isArray(payload) ? payload : [])
    .map(mapMediaAsset)
    .filter((asset) => asset.status !== 'pending' || !asset.expiresAt || Date.parse(asset.expiresAt) > now);
  return { assets, quota: await mediaQuotaUsage(access, { env }) };
}

export async function listProjectMediaKeys(access, projectId, { env = process.env } = {}) {
  if (!isMediaUuid(projectId)) return [];
  const { payload } = await rest('media_assets', {
    access,
    env,
    query: {
      select: 'object_key',
      project_id: `eq.${projectId}`,
      status: 'in.(pending,validated)',
      limit: 200,
    },
  });
  return (Array.isArray(payload) ? payload : [])
    .map((row) => row.object_key)
    .filter((key) => typeof key === 'string' && key);
}

export async function getMediaAsset(access, id, { env = process.env } = {}) {
  if (!isMediaUuid(id)) throw new MediaAssetError(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  const { payload } = await rest('media_assets', {
    access,
    env,
    query: { select: SELECT_COLUMNS, id: `eq.${id}`, limit: 1 },
  });
  return Array.isArray(payload) && payload[0] ? mapMediaAsset(payload[0]) : null;
}

export async function finalizeMediaAsset(access, id, { bytes, mime, env = process.env } = {}) {
  if (!isMediaUuid(id)) throw new MediaAssetError(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  const { payload } = await rest('media_assets', {
    method: 'PATCH',
    access,
    env,
    prefer: 'return=representation',
    query: {
      select: SELECT_COLUMNS,
      id: `eq.${id}`,
      status: 'eq.pending',
    },
    body: {
      status: 'validated',
      bytes,
      mime,
      validated_at: new Date().toISOString(),
    },
  });
  if (Array.isArray(payload) && payload[0]) return mapMediaAsset(payload[0]);

  const current = await getMediaAsset(access, id, { env });
  if (!current) throw new MediaAssetError(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  if (current.status === 'validated') {
    if (current.bytes === bytes && current.mime === mime) return current;
    throw new MediaAssetError(409, 'MEDIA_ASSET_CONFLICT', 'This media asset already has different details.');
  }
  if (current.status === 'pending' && current.expiresAt && Date.parse(current.expiresAt) <= Date.now()) {
    throw new MediaAssetError(410, 'MEDIA_INTENT_EXPIRED', 'This upload link expired. Start the upload again.');
  }
  throw new MediaAssetError(409, 'MEDIA_ASSET_NOT_PENDING', 'This media asset is not waiting for an upload.');
}

export async function rejectMediaAsset(access, id, { reason = '', env = process.env } = {}) {
  if (!isMediaUuid(id)) return null;
  const { payload } = await rest('media_assets', {
    method: 'PATCH',
    access,
    env,
    prefer: 'return=representation',
    query: { select: SELECT_COLUMNS, id: `eq.${id}`, status: 'eq.pending' },
    body: {
      status: 'rejected',
      rejected_reason: String(reason || '').slice(0, 500),
      deleted_at: new Date().toISOString(),
    },
  });
  return Array.isArray(payload) && payload[0] ? mapMediaAsset(payload[0]) : null;
}

export async function deleteMediaAsset(access, id, { env = process.env } = {}) {
  if (!isMediaUuid(id)) throw new MediaAssetError(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  const { payload } = await rest('media_assets', {
    method: 'PATCH',
    access,
    env,
    prefer: 'return=representation',
    query: {
      select: SELECT_COLUMNS,
      id: `eq.${id}`,
      status: 'in.(pending,validated)',
    },
    body: {
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    },
  });
  if (Array.isArray(payload) && payload[0]) return mapMediaAsset(payload[0]);

  const current = await getMediaAsset(access, id, { env });
  if (!current) throw new MediaAssetError(404, 'MEDIA_ASSET_NOT_FOUND', 'Media asset not found.');
  if (current.status === 'deleted') return current;
  throw new MediaAssetError(409, 'MEDIA_ASSET_NOT_ACTIVE', 'This media asset cannot be removed.');
}
