import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Instagram API with Unified Login (Facebook Login for Business). The token is
// a Business Integration System User Access Token (SUAT). It belongs to the
// connected business portfolio, so it is encrypted before it reaches Postgres
// and never returned to the browser.
export const GRAPH_VERSION = 'v27.0';
export const GRAPH_ORIGIN = 'https://graph.facebook.com';
export const LOGIN_DIALOG = 'https://www.facebook.com/dialog/oauth';
export const INSTAGRAM_STATE_TTL_MS = 10 * 60 * 1000;
export const INSTAGRAM_STATE_TTL_SECONDS = INSTAGRAM_STATE_TTL_MS / 1000;

const STATE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const STATE_HASH = /^[0-9a-f]{64}$/;
const INSTAGRAM_ID = /^\d{1,64}$/;
const INSTAGRAM_USERNAME = /^[A-Za-z0-9._]{1,64}$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export class InstagramError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'InstagramError';
    this.status = status;
    this.code = code;
  }
}

function value(env, name) {
  return String(env?.[name] ?? '').trim();
}

function validRedirectUri(valueToCheck) {
  try {
    const url = new URL(valueToCheck);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function instagramConfig(env = process.env) {
  const appId = value(env, 'META_APP_ID');
  const appSecret = value(env, 'META_APP_SECRET');
  const configId = value(env, 'INSTAGRAM_CONFIG_ID');
  const redirectUri = value(env, 'INSTAGRAM_REDIRECT_URI');
  const configured = Boolean(
    /^\d{6,32}$/.test(appId)
    && appSecret.length >= 16
    && /^\d{6,32}$/.test(configId)
    && validRedirectUri(redirectUri),
  );
  return { configured, appId, appSecret, configId, redirectUri };
}

export function createOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function validOAuthState(state) {
  return typeof state === 'string' && STATE_TOKEN.test(state);
}

export function validStateHash(hash) {
  return typeof hash === 'string' && STATE_HASH.test(hash);
}

export function stateHash(state) {
  if (!validOAuthState(state)) {
    throw new InstagramError(400, 'INSTAGRAM_STATE_INVALID', 'This connection link is not valid.');
  }
  return createHash('sha256').update(state).digest('hex');
}

// The Facebook Login dialog fixes the redirect URI to the one registered in the
// app dashboard. The browser may start on localhost while that redirect stays on
// the deployed domain, so the state row records where the browser returns after
// the callback finishes.
export function instagramReturnOrigin(candidate, env = process.env) {
  let url;
  try {
    url = new URL(String(candidate || '').trim());
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  const origin = url.origin;
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) return origin;
  if (url.protocol !== 'https:') return null;

  const allowed = new Set();
  const config = instagramConfig(env);
  if (validRedirectUri(config.redirectUri)) allowed.add(new URL(config.redirectUri).origin);
  for (const extra of String(env?.INSTAGRAM_RETURN_ORIGINS || '').split(',')) {
    const trimmed = extra.trim();
    if (!trimmed) continue;
    try {
      allowed.add(new URL(trimmed).origin);
    } catch {
      // Ignore malformed allowlist entries instead of failing every connection.
    }
  }
  return allowed.has(origin) ? origin : null;
}

export function defaultReturnOrigin(env = process.env) {
  const config = instagramConfig(env);
  if (!validRedirectUri(config.redirectUri)) return null;
  return instagramReturnOrigin(new URL(config.redirectUri).origin, env);
}

export function buildInstagramLoginUrl({ state, env = process.env } = {}) {
  const config = instagramConfig(env);
  if (!config.configured) {
    throw new InstagramError(503, 'INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not available yet.');
  }
  if (!validOAuthState(state)) {
    throw new InstagramError(400, 'INSTAGRAM_STATE_INVALID', 'This connection link is not valid.');
  }
  const url = new URL(LOGIN_DIALOG);
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('config_id', config.configId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  // Always show both login choices; without this Meta may silently continue as
  // an already signed-in Facebook account.
  url.searchParams.set('prompt', 'login');
  return url.toString();
}

function tokenKey(env) {
  const explicit = value(env, 'INSTAGRAM_TOKEN_KEY');
  if (explicit) {
    const bytes = /^[0-9a-f]{64}$/i.test(explicit)
      ? Buffer.from(explicit, 'hex')
      : Buffer.from(explicit, 'base64');
    if (bytes.length === 32) return bytes;
    return createHash('sha256').update(`vydrivo:instagram-key:${explicit}`).digest();
  }
  const config = instagramConfig(env);
  if (!config.configured) {
    throw new InstagramError(503, 'INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not available yet.');
  }
  // Changing META_APP_SECRET without INSTAGRAM_TOKEN_KEY makes existing tokens
  // unreadable. Set INSTAGRAM_TOKEN_KEY before connecting real accounts.
  return createHash('sha256').update(`vydrivo:instagram-token:${config.appSecret}`).digest();
}

export function encryptInstagramToken(token, env = process.env) {
  const plaintext = String(token || '');
  if (plaintext.length < 20 || plaintext.length > 4096) {
    throw new InstagramError(502, 'INSTAGRAM_TOKEN_INVALID', 'The Instagram sign-in did not return a usable token.');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(env), iv);
  cipher.setAAD(Buffer.from('vydrivo:instagram:v1'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptInstagramToken(record, env = process.env) {
  const ciphertext = Buffer.from(String(record?.ciphertext || ''), 'base64');
  const iv = Buffer.from(String(record?.iv || ''), 'base64');
  const tag = Buffer.from(String(record?.tag || ''), 'base64');
  if (!ciphertext.length || iv.length !== 12 || tag.length !== 16) {
    throw new InstagramError(500, 'INSTAGRAM_TOKEN_UNREADABLE', 'The saved Instagram connection could not be read.');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', tokenKey(env), iv);
    decipher.setAAD(Buffer.from('vydrivo:instagram:v1'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new InstagramError(500, 'INSTAGRAM_TOKEN_UNREADABLE', 'The saved Instagram connection could not be read.');
  }
}

async function graphResponse(response) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  return { payload, text };
}

async function graphGet(pathname, params, { fetchImpl = fetch, timeout = 20000 } = {}) {
  const url = new URL(`${GRAPH_ORIGIN}/${GRAPH_VERSION}/${pathname.replace(/^\//, '')}`);
  for (const [key, item] of Object.entries(params || {})) {
    if (item !== undefined && item !== null && item !== '') url.searchParams.set(key, String(item));
  }
  let response;
  try {
    response = await fetchImpl(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(timeout) });
  } catch {
    throw new InstagramError(503, 'INSTAGRAM_UNAVAILABLE', 'Instagram did not respond. Try again.');
  }
  const { payload } = await graphResponse(response);
  if (!response.ok || payload?.error) {
    throw new InstagramError(502, 'INSTAGRAM_REQUEST_FAILED', 'Instagram could not complete this request.');
  }
  return payload;
}

export async function exchangeInstagramCode(code, env = process.env, { fetchImpl = fetch } = {}) {
  const config = instagramConfig(env);
  if (!config.configured) {
    throw new InstagramError(503, 'INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not available yet.');
  }
  const authCode = String(code || '').trim();
  if (!authCode || authCode.length > 2048) {
    throw new InstagramError(400, 'INSTAGRAM_CODE_INVALID', 'Instagram did not return a sign-in code.');
  }
  const url = new URL(`${GRAPH_ORIGIN}/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('client_secret', config.appSecret);
  url.searchParams.set('code', authCode);
  // Facebook Login for Business requires the exchange to repeat the exact
  // redirect_uri used by the dialog. Omitting it fails with OAuth error 100 /
  // subcode 36008 ("redirect_uri is identical to the one you used").
  url.searchParams.set('redirect_uri', config.redirectUri);
  let response;
  try {
    response = await fetchImpl(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  } catch {
    throw new InstagramError(503, 'INSTAGRAM_UNAVAILABLE', 'Instagram did not respond. Try again.');
  }
  const { payload } = await graphResponse(response);
  if (!response.ok || payload?.error || typeof payload?.access_token !== 'string') {
    throw new InstagramError(502, 'INSTAGRAM_TOKEN_EXCHANGE_FAILED', 'Instagram did not complete the sign-in.');
  }
  return { accessToken: payload.access_token, tokenType: payload.token_type || 'bearer' };
}

export function selectInstagramAccount(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  for (const row of rows) {
    const id = String(row?.id ?? '').trim();
    const username = String(row?.username ?? '').trim();
    if (INSTAGRAM_ID.test(id) && INSTAGRAM_USERNAME.test(username)) return { id, username };
  }
  return null;
}

export async function fetchInstagramIdentity(accessToken, { fetchImpl = fetch } = {}) {
  const token = String(accessToken || '').trim();
  if (!token) {
    throw new InstagramError(401, 'INSTAGRAM_TOKEN_INVALID', 'The Instagram sign-in did not return a usable token.');
  }
  const me = await graphGet('/me', { fields: 'client_business_id', access_token: token }, { fetchImpl });
  const businessId = INSTAGRAM_ID.test(String(me?.client_business_id ?? '').trim())
    ? String(me.client_business_id).trim()
    : null;
  const accounts = await graphGet(
    '/me/assigned_instagram_accounts',
    { fields: 'id,username', limit: 50, access_token: token },
    { fetchImpl },
  );
  const account = selectInstagramAccount(accounts);
  if (!account) {
    throw new InstagramError(422, 'INSTAGRAM_NO_ACCOUNT', 'No professional Instagram account was shared with Vydrivo.');
  }
  return { instagramUserId: account.id, username: account.username, businessId };
}
