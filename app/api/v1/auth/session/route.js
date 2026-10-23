import { ACCESS_COOKIE, readCookie } from '../../../../../lib/auth-server.js';
import { jsonResult } from '../../../../../lib/auth-http.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return jsonResult(200, { signedIn: Boolean(readCookie(request, ACCESS_COOKIE)) });
}
