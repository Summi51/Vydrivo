import { createHash } from 'node:crypto';
import { supabaseConfig } from './auth-server.js';

export class RequestSafetyError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const CLIENT_KEY = /^[A-Za-z0-9_-]{16,128}$/;

export function validClientKey(value) {
  return typeof value === 'string' && CLIENT_KEY.test(value);
}

export function requestSafetyKey(ownerId, scope, clientKey) {
  if (!ownerId || !scope || !validClientKey(clientKey)) return null;
  return createHash('sha256').update(`${ownerId}:${scope}:${clientKey}`).digest('hex');
}

export function requestHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function rest(path, { method = 'GET', access, body, query, env, prefer } = {}) {
  if (typeof access !== 'string' || !access) {
    throw new RequestSafetyError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
  }
  const config = supabaseConfig(env);
  if (!config.configured) {
    throw new RequestSafetyError(503, 'REQUEST_SAFETY_UNAVAILABLE', 'Request safety is not configured on this server.');
  }
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
    throw new RequestSafetyError(503, 'REQUEST_SAFETY_UNAVAILABLE', 'Request safety did not respond.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  return { ok: response.ok, status: response.status, payload };
}

export async function beginIdempotentRequest(access, { ownerId, scope, clientKey, body, env = process.env } = {}) {
  const key = requestSafetyKey(ownerId, scope, clientKey);
  if (!key) return { state: 'disabled', key: null };
  const hash = requestHash(body);
  try {
    const created = await rest('request_idempotency', {
      method: 'POST',
      access,
      env,
      prefer: 'return=representation',
      body: { key, scope, request_hash: hash, status: 'in_progress' },
    });
    if (created.ok) return { state: 'new', key };
    if (created.status !== 409) return { state: 'unavailable', key };
  } catch {
    return { state: 'unavailable', key };
  }

  try {
    const existing = await rest('request_idempotency', {
      access,
      env,
      query: { select: 'status,request_hash,response_status,response_body,expires_at', key: `eq.${key}`, limit: 1 },
    });
    const row = Array.isArray(existing.payload) ? existing.payload[0] : null;
    if (!row) return { state: 'unavailable', key };
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      return { state: 'new', key };
    }
    if (row.request_hash !== hash) return { state: 'mismatch', key };
    if (row.status === 'completed') {
      return {
        state: 'replay',
        key,
        response: { status: row.response_status || 200, body: row.response_body },
      };
    }
    if (row.status === 'failed') return { state: 'failed', key };
    return { state: 'in_progress', key };
  } catch {
    return { state: 'unavailable', key };
  }
}

export async function completeIdempotentRequest(access, key, { status, body, env = process.env } = {}) {
  if (!key) return false;
  try {
    const result = await rest('request_idempotency', {
      method: 'PATCH',
      access,
      env,
      query: { key: `eq.${key}` },
      prefer: 'return=minimal',
      body: { status: 'completed', response_status: status, response_body: body },
    });
    return result.ok;
  } catch {
    return false;
  }
}

export async function failIdempotentRequest(access, key, { status = 500, body, env = process.env } = {}) {
  if (!key) return false;
  try {
    const result = await rest('request_idempotency', {
      method: 'PATCH',
      access,
      env,
      query: { key: `eq.${key}` },
      prefer: 'return=minimal',
      body: { status: 'failed', response_status: status, response_body: body },
    });
    return result.ok;
  } catch {
    return false;
  }
}

export async function consumeRateLimit(access, { bucket, limit, windowSeconds, env = process.env } = {}) {
  try {
    const result = await rest('rpc/consume_request_rate_limit', {
      method: 'POST',
      access,
      env,
      body: { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds },
    });
    if (!result.ok || !result.payload || typeof result.payload !== 'object') {
      return { available: false, allowed: true };
    }
    return { available: true, ...result.payload };
  } catch {
    return { available: false, allowed: true };
  }
}
