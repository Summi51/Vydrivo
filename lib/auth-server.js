import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { supabaseEnv, validateCredentials, validateEmail, validatePassword } from './auth.js';

export const CSRF_COOKIE = 'vydrivo_csrf';
export const ACCESS_COOKIE = 'vydrivo_access';
export const REFRESH_COOKIE = 'vydrivo_refresh';
export const RECOVERY_COOKIE = 'vydrivo_recovery';
export const OAUTH_COOKIE = 'vydrivo_oauth';
export const REMEMBER_COOKIE = 'vydrivo_remember';
const CSRF_TTL_SECONDS = 60 * 30;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 14;
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
const GENERIC_SIGNUP = 'Check your email to continue.';
const GENERIC_RECOVERY = 'If an account exists, check your email to continue.';
const GENERIC_INVALID = 'Email or password is incorrect.';

export function cookieBase(request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:';
  return { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge };
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('base64url');
}

export function issueCsrf() {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + CSRF_TTL_SECONDS * 1000).toISOString();
  return { token, cookieValue: `${hashToken(token)}.${Date.now() + CSRF_TTL_SECONDS * 1000}`, expiresAt };
}
export function issuePkce() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  return { verifier, challenge, cookieValue: `${verifier}.${expiresAt}` };
}


export function csrfMatches(request) {
  const presented = request.headers.get('x-csrf-token') || '';
  const stored = readCookie(request, CSRF_COOKIE);
  const [digest, expiry] = stored.split('.');
  if (!presented || !digest || Number(expiry) < Date.now()) return false;
  const actual = Buffer.from(hashToken(presented));
  const expected = Buffer.from(digest);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const presented = new URL(origin);
    const expected = new URL(request.url);
    if (presented.origin === expected.origin) return true;
    return presented.protocol === expected.protocol
      && presented.port === expected.port
      && LOCAL_HOSTS.has(presented.hostname)
      && LOCAL_HOSTS.has(expected.hostname);
  } catch {
    return false;
  }
}

export function guardMutation(request) {
  if (!originAllowed(request)) return { ok: false, status: 403, code: 'CSRF_FAILED', message: 'Request origin was rejected.' };
  if (!csrfMatches(request)) return { ok: false, status: 403, code: 'CSRF_FAILED', message: 'Refresh the page and try again.' };
  return { ok: true };
}

export function supabaseConfig(env) {
  const { url, key, google } = supabaseEnv(env);
  return {
    provider: 'supabase',
    configured: Boolean(url && key),
    googleConfigured: google,
    url,
    key,
  };
}

export function sessionCookies(request, session, recovery = false, remember = false) {
  const access = session.access_token;
  const refresh = session.refresh_token;
  const expiresIn = Number(session.expires_in) || 3600;
  const refreshTtl = remember ? REMEMBER_TTL_SECONDS : REFRESH_TTL_SECONDS;
  const cookies = [
    { name: ACCESS_COOKIE, value: access, options: cookieBase(request, expiresIn) },
    { name: REFRESH_COOKIE, value: refresh, options: cookieBase(request, refreshTtl) },
    {
      name: REMEMBER_COOKIE,
      value: remember ? '1' : '',
      options: cookieBase(request, remember ? REMEMBER_TTL_SECONDS : 0),
    },
  ];
  if (recovery) {
    cookies.push({ name: RECOVERY_COOKIE, value: '1', options: cookieBase(request, expiresIn) });
  }
  return cookies;
}

export function clearSessionCookies(request) {
  const gone = cookieBase(request, 0);
  return [ACCESS_COOKIE, REFRESH_COOKIE, RECOVERY_COOKIE, OAUTH_COOKIE, REMEMBER_COOKIE].map((name) => ({
    name,
    value: '',
    options: gone,
  }));
}

export function publicUser(user) {
  return {
    id: user?.id || null,
    emailVerified: Boolean(user?.email_confirmed_at || user?.confirmed_at),
  };
}

export { validateCredentials, validateEmail, validatePassword, GENERIC_SIGNUP, GENERIC_RECOVERY, GENERIC_INVALID };
