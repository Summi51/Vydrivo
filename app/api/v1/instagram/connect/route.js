import { verifiedAccess } from '../../../../../lib/api-session.js';
import { errorResult, jsonResult } from '../../../../../lib/auth-http.js';
import { publicOrigins } from '../../../../../lib/auth-server.js';
import {
  INSTAGRAM_STATE_TTL_MS,
  buildInstagramLoginUrl,
  createOAuthState,
  defaultReturnOrigin,
  instagramConfig,
  instagramReturnOrigin,
  stateHash,
} from '../../../../../lib/instagram-oauth.js';
import { createInstagramOAuthState } from '../../../../../lib/instagram-repository.js';

export const dynamic = 'force-dynamic';

// publicOrigins deliberately treats localhost as an internal compute host, so it
// never contains the origin a developer is browsing on. The Referer of the
// Settings page restores that origin; instagramReturnOrigin still allowlists it.
function refererOrigin(request) {
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  if (!instagramConfig(process.env).configured) {
    return errorResult(503, 'INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not available yet.');
  }

  const candidates = [refererOrigin(request), ...publicOrigins(request)].filter(Boolean);
  const origin = candidates.find((item) => instagramReturnOrigin(item, process.env));
  const returnOrigin = origin || defaultReturnOrigin(process.env);
  if (!returnOrigin) {
    return errorResult(403, 'INSTAGRAM_ORIGIN_REJECTED', 'Open the studio on its usual address before connecting Instagram.');
  }

  const state = createOAuthState();
  const expiresAt = new Date(Date.now() + INSTAGRAM_STATE_TTL_MS).toISOString();
  try {
    await createInstagramOAuthState(session.access, {
      stateHash: stateHash(state),
      returnOrigin,
      expiresAt,
    });
  } catch (error) {
    return errorResult(
      error.status || 503,
      error.code || 'INSTAGRAM_UNAVAILABLE',
      error.message || 'Instagram connection is not available yet.',
    );
  }

  let url;
  try {
    url = buildInstagramLoginUrl({ state });
  } catch (error) {
    return errorResult(
      error.status || 503,
      error.code || 'INSTAGRAM_NOT_CONFIGURED',
      error.message || 'Instagram connection is not available yet.',
    );
  }

  return jsonResult(200, { url, expiresAt });
}
