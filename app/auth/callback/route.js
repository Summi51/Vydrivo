import { OAUTH_COOKIE, clearSessionCookies, cookieBase, readCookie, sessionCookies } from '../../../lib/auth-server.js';
import { redirectResult } from '../../../lib/auth-http.js';
import { exchangeCode } from '../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const next = url.searchParams.get('next') === 'recover' ? '/recover' : '/app';
  const stored = readCookie(request, OAUTH_COOKIE);
  const [verifier, expiry] = stored.split('.');
  const fail = new URL('/sign-in?error=link', request.url);
  if (!code || !verifier || Number(expiry) < Date.now()) {
    return redirectResult(fail, clearSessionCookies(request));
  }
  try {
    const session = await exchangeCode(code, verifier);
    return redirectResult(new URL(next, request.url), [
      ...sessionCookies(request, session, next === '/recover'),
      { name: OAUTH_COOKIE, value: '', options: cookieBase(request, 0) },
    ]);
  } catch {
    return redirectResult(fail, clearSessionCookies(request));
  }
}
