import { supabaseConfig } from './auth-server.js';

const CONNECTION_COLUMNS = 'ig_user_id,username,business_id,connected_at,updated_at';
const SECRET_COLUMNS = 'ig_user_id,username,config_id,token_ciphertext,token_iv,token_tag';
const PUBLISH_COLUMNS = 'id,project_id,run_id,caption,status,container_id,media_id,permalink,error_code,created_at,updated_at';

export class InstagramRepositoryError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'InstagramRepositoryError';
    this.status = status;
    this.code = code;
  }
}

function requireConfig(env) {
  const config = supabaseConfig(env);
  if (!config.configured) {
    throw new InstagramRepositoryError(503, 'INSTAGRAM_NOT_READY', 'Instagram settings are not available on this server yet.');
  }
  return config;
}

function storageError(status, payload, message) {
  const detail = String(payload?.message || '');
  if (status === 401 || status === 403 || detail.includes('AUTH_REQUIRED') || payload?.code === '42501') {
    return new InstagramRepositoryError(401, 'AUTH_REQUIRED', 'Sign in again to manage your Instagram connection.');
  }
  if (
    status === 404
    || payload?.code === '42P01'
    || payload?.code === 'PGRST202'
    || payload?.code === 'PGRST205'
    || /does not exist|schema cache|could not find the (table|function)/i.test(detail)
  ) {
    return new InstagramRepositoryError(503, 'INSTAGRAM_NOT_READY', 'Instagram settings are not available on this server yet.');
  }
  if (status === 400 || status === 422) {
    return new InstagramRepositoryError(422, 'INSTAGRAM_REQUEST_REJECTED', message);
  }
  if (status >= 500) {
    return new InstagramRepositoryError(503, 'INSTAGRAM_UNAVAILABLE', 'Instagram settings are temporarily unavailable.');
  }
  return new InstagramRepositoryError(502, 'INSTAGRAM_REQUEST_FAILED', message);
}

async function rest(path, { method = 'GET', access, body, query, env, prefer } = {}) {
  const config = requireConfig(env);
  if (typeof access !== 'string' || !access) {
    throw new InstagramRepositoryError(401, 'AUTH_REQUIRED', 'Sign in to manage your Instagram connection.');
  }
  const url = new URL(`${config.url}/rest/v1/${path}`);
  for (const [key, item] of Object.entries(query || {})) {
    if (item !== undefined && item !== null) url.searchParams.set(key, String(item));
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
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new InstagramRepositoryError(503, 'INSTAGRAM_UNAVAILABLE', 'Instagram settings did not respond.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) {
    throw storageError(response.status, payload, 'Instagram settings could not complete this request.');
  }
  return payload;
}

// The callback runs before it can rely on the user's access cookie, so the two
// OAuth RPCs are callable with the public key. They are security-definer
// functions that accept only a hashed, unexpired, single-use state.
async function publicRpc(name, body, env) {
  const config = requireConfig(env);
  const url = new URL(`${config.url}/rest/v1/rpc/${name}`);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new InstagramRepositoryError(503, 'INSTAGRAM_UNAVAILABLE', 'Instagram settings did not respond.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok) {
    throw storageError(response.status, payload, 'Instagram settings could not complete this request.');
  }
  return payload;
}

export function mapInstagramConnection(row) {
  if (!row) return null;
  const igUserId = String(row.ig_user_id || '').trim();
  const username = String(row.username || '').trim();
  if (!igUserId || !username) return null;
  return {
    instagramUserId: igUserId,
    username,
    businessId: row.business_id || null,
    connectedAt: row.connected_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function createInstagramOAuthState(access, { stateHash, returnOrigin, expiresAt, env = process.env } = {}) {
  await rest('instagram_oauth_states', {
    method: 'POST',
    access,
    env,
    prefer: 'return=minimal',
    body: { state_hash: stateHash, return_origin: returnOrigin, expires_at: expiresAt },
  });
  return true;
}

export async function peekInstagramOAuthState(stateHash, { env = process.env } = {}) {
  const payload = await publicRpc('peek_instagram_oauth_state', { p_state_hash: stateHash }, env);
  return typeof payload === 'string' && payload ? payload : null;
}

export async function completeInstagramConnection(
  {
    stateHash,
    instagramUserId,
    username,
    businessId,
    configId,
    tokenCiphertext,
    tokenIv,
    tokenTag,
  },
  { env = process.env } = {},
) {
  const payload = await publicRpc(
    'complete_instagram_connection',
    {
      p_state_hash: stateHash,
      p_ig_user_id: instagramUserId,
      p_username: username,
      p_business_id: businessId,
      p_config_id: configId,
      p_token_ciphertext: tokenCiphertext,
      p_token_iv: tokenIv,
      p_token_tag: tokenTag,
    },
    env,
  );
  return payload === true;
}

export async function getInstagramConnection(access, ownerId, { env = process.env } = {}) {
  const payload = await rest('instagram_connections', {
    access,
    env,
    query: {
      select: CONNECTION_COLUMNS,
      owner_id: `eq.${ownerId}`,
      limit: 1,
    },
  });
  return mapInstagramConnection(Array.isArray(payload) ? payload[0] : null);
}

export async function deleteInstagramConnection(access, ownerId, { env = process.env } = {}) {
  await rest('instagram_connections', {
    method: 'DELETE',
    access,
    env,
    prefer: 'return=minimal',
    query: { owner_id: `eq.${ownerId}` },
  });
  return true;
}

export async function getInstagramConnectionSecret(access, ownerId, { env = process.env } = {}) {
  const payload = await rest('instagram_connections', {
    access,
    env,
    query: {
      select: SECRET_COLUMNS,
      owner_id: `eq.${ownerId}`,
      limit: 1,
    },
  });
  const row = Array.isArray(payload) ? payload[0] : null;
  if (!row) return null;
  return {
    instagramUserId: String(row.ig_user_id || ''),
    username: String(row.username || ''),
    configId: String(row.config_id || ''),
    token: {
      ciphertext: String(row.token_ciphertext || ''),
      iv: String(row.token_iv || ''),
      tag: String(row.token_tag || ''),
    },
  };
}

export function mapInstagramPublish(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    runId: row.run_id,
    caption: row.caption || '',
    status: row.status,
    containerId: row.container_id || null,
    mediaId: row.media_id || null,
    permalink: row.permalink || null,
    error: row.error_code || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function getInstagramPublish(access, { projectId, runId, env = process.env } = {}) {
  const payload = await rest('instagram_publishes', {
    access,
    env,
    query: {
      select: PUBLISH_COLUMNS,
      project_id: `eq.${projectId}`,
      run_id: `eq.${runId}`,
      limit: 1,
    },
  });
  const row = Array.isArray(payload) ? payload[0] : null;
  return mapInstagramPublish(row);
}

export async function listInstagramPublishes(access, { limit = 60, env = process.env } = {}) {
  const payload = await rest('instagram_publishes', {
    access,
    env,
    query: {
      select: 'run_id,project_id,caption,status,permalink,error_code,created_at,updated_at',
      order: 'created_at.desc',
      limit: Math.min(60, Math.max(1, Number(limit) || 60)),
    },
  });
  return (Array.isArray(payload) ? payload : []).map(mapInstagramPublish).filter(Boolean);
}

export async function upsertInstagramPublish(access, record, { env = process.env } = {}) {
  const payload = await rest('instagram_publishes', {
    method: 'POST',
    access,
    env,
    query: { on_conflict: 'owner_id,run_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: record,
  });
  const row = Array.isArray(payload) ? payload[0] : payload;
  const publish = mapInstagramPublish(row);
  if (!publish) {
    throw new InstagramRepositoryError(502, 'INSTAGRAM_PUBLISH_FAILED', 'The publish job could not be saved.');
  }
  return publish;
}

export async function updateInstagramPublish(access, id, patch, { env = process.env } = {}) {
  const payload = await rest(`instagram_publishes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    access,
    env,
    prefer: 'return=representation',
    body: patch,
  });
  const row = Array.isArray(payload) ? payload[0] : payload;
  return mapInstagramPublish(row);
}

export function isInstagramUnavailable(error) {
  return error instanceof InstagramRepositoryError && error.code === 'INSTAGRAM_NOT_READY';
}
