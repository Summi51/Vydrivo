import { GENERIC_RECOVERY, guardMutation, validateEmail } from '../../../../../lib/auth-server.js';
import { allowKeys, errorResult, jsonResult, readJson } from '../../../../../lib/auth-http.js';
import { AuthProviderError, recoverPassword } from '../../../../../lib/supabase-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const parsed = await readJson(request);
  if (!parsed.ok) return errorResult(parsed.status, parsed.code, parsed.message);
  const keys = allowKeys(parsed.body, ['email']);
  if (!keys.ok) return errorResult(keys.status, keys.code, keys.message);
  const email = validateEmail(parsed.body.email);
  if (!email.ok) return errorResult(422, 'VALIDATION_FAILED', email.error);
  try {
    const redirectTo = new URL('/auth/callback?next=recover', request.url).toString();
    await recoverPassword(email.email, redirectTo);
  } catch (error) {
    if (error instanceof AuthProviderError && error.status === 503) {
      return errorResult(503, error.code, error.message);
    }
  }
  return jsonResult(202, { message: GENERIC_RECOVERY });
}
