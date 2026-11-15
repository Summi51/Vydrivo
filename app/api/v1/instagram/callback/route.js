import { NextResponse } from 'next/server';
import { errorResult } from '../../../../../lib/auth-http.js';
import { publicOrigins } from '../../../../../lib/auth-server.js';
import {
  defaultReturnOrigin,
  encryptInstagramToken,
  exchangeInstagramCode,
  fetchInstagramIdentity,
  instagramConfig,
  instagramReturnOrigin,
  stateHash,
  validOAuthState,
} from '../../../../../lib/instagram-oauth.js';
import {
  completeInstagramConnection,
  peekInstagramOAuthState,
} from '../../../../../lib/instagram-repository.js';

export const dynamic = 'force-dynamic';

function fallbackOrigin(request) {
  const configured = defaultReturnOrigin(process.env);
  if (configured) return configured;
  const candidates = publicOrigins(request);
  const allowed = candidates.find((item) => instagramReturnOrigin(item, process.env));
  return allowed || candidates[0] || '';
}

function settingsRedirect(origin, params) {
  const url = new URL('/app/settings', origin);
  for (const [key, item] of Object.entries(params)) url.searchParams.set(key, item);
  const response = NextResponse.redirect(url, 302);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function errorReason(error) {
  const code = String(error?.code || '');
  if (code === 'INSTAGRAM_NO_ACCOUNT') return 'no_account';
  if (code === 'INSTAGRAM_TOKEN_EXCHANGE_FAILED' || code === 'INSTAGRAM_CODE_INVALID' || code === 'INSTAGRAM_TOKEN_INVALID') {
    return 'token';
  }
  if (code === 'INSTAGRAM_NOT_CONFIGURED' || code === 'INSTAGRAM_NOT_READY') return 'setup';
  return 'failed';
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get('state') || '';
  const providerError = requestUrl.searchParams.get('error');
  const originFallback = fallbackOrigin(request);
  if (!originFallback) {
    return errorResult(503, 'INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not available yet.');
  }

  if (!validOAuthState(state)) {
    return settingsRedirect(originFallback, {
      instagram: 'error',
      reason: providerError ? 'denied' : 'state',
    });
  }

  let returnOrigin;
  try {
    returnOrigin = await peekInstagramOAuthState(stateHash(state));
  } catch (error) {
    return settingsRedirect(originFallback, {
      instagram: 'error',
      reason: error?.code === 'INSTAGRAM_NOT_READY' ? 'setup' : 'failed',
    });
  }

  const origin = instagramReturnOrigin(returnOrigin, process.env) || originFallback;
  if (!returnOrigin) {
    return settingsRedirect(origin, { instagram: 'error', reason: 'expired' });
  }
  if (providerError) {
    return settingsRedirect(origin, {
      instagram: 'error',
      reason: providerError === 'access_denied' ? 'denied' : 'failed',
    });
  }

  const code = requestUrl.searchParams.get('code') || '';
  if (!code) {
    return settingsRedirect(origin, { instagram: 'error', reason: 'token' });
  }

  const config = instagramConfig(process.env);
  if (!config.configured) {
    return settingsRedirect(origin, { instagram: 'error', reason: 'setup' });
  }

  try {
    const { accessToken } = await exchangeInstagramCode(code);
    const identity = await fetchInstagramIdentity(accessToken);
    const encrypted = encryptInstagramToken(accessToken);
    const saved = await completeInstagramConnection({
      stateHash: stateHash(state),
      instagramUserId: identity.instagramUserId,
      username: identity.username,
      businessId: identity.businessId,
      configId: config.configId,
      tokenCiphertext: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
    });
    if (!saved) {
      return settingsRedirect(origin, { instagram: 'error', reason: 'expired' });
    }
    return settingsRedirect(origin, { instagram: 'connected' });
  } catch (error) {
    // Never log the code, token or provider payload. The row remains unconsumed
    // when the exchange fails, so the user can start again until it expires.
    // The reason carries the internal code so a failed connection can be diagnosed
    // from the redirect alone. It is a fixed code, never a token or provider payload.
    const code = String(error?.code || 'unknown').replace(/[^A-Z0-9_]/g, '').slice(0, 48) || 'unknown';
    console.error('Instagram callback failed:', code);
    return settingsRedirect(origin, { instagram: 'error', reason: `${errorReason(error)}:${code}` });
  }
}
