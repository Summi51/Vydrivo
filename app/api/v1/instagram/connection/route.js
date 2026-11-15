import { verifiedAccess } from '../../../../../lib/api-session.js';
import { errorResult, jsonResult } from '../../../../../lib/auth-http.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import {
  deleteInstagramConnection,
  getInstagramConnection,
} from '../../../../../lib/instagram-repository.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  try {
    const connection = await getInstagramConnection(session.access, session.user.id);
    return jsonResult(200, { connected: Boolean(connection), account: connection });
  } catch (error) {
    return errorResult(
      error.status || 503,
      error.code || 'INSTAGRAM_UNAVAILABLE',
      error.message || 'Instagram settings are temporarily unavailable.',
    );
  }
}

export async function DELETE(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);

  try {
    await deleteInstagramConnection(session.access, session.user.id);
    return jsonResult(200, { disconnected: true });
  } catch (error) {
    return errorResult(
      error.status || 503,
      error.code || 'INSTAGRAM_UNAVAILABLE',
      error.message || 'Instagram settings are temporarily unavailable.',
    );
  }
}
