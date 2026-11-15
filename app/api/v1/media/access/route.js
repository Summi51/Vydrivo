import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { createPrivateAccessUrl, MediaStorageError } from '../../../../../lib/r2-private.js';

export const dynamic = 'force-dynamic';

function failure(error) {
  if (error instanceof MediaStorageError) {
    return errorResult(error.status, error.code, error.message);
  }
  return errorResult(503, 'MEDIA_STORAGE_UNAVAILABLE', 'Private media storage is temporarily unavailable.');
}

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['key']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  if (typeof parsed.body.key !== 'string' || !parsed.body.key.trim()) {
    return errorResult(422, 'INVALID_MEDIA_KEY', 'Choose a valid media object.');
  }

  try {
    return jsonResult(200, await createPrivateAccessUrl({
      ownerId: session.user.id,
      key: parsed.body.key.trim(),
    }));
  } catch (error) {
    return failure(error);
  }
}
