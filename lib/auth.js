export const EMAIL_LIMIT = 254;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || '').trim();
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  return {
    provider: 'supabase',
    configured: Boolean(url && publishableKey),
    googleConfigured: String(env.SUPABASE_GOOGLE_ENABLED || '').trim() === 'true',
  };
}

export function validateEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > EMAIL_LIMIT || !EMAIL_SHAPE.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  return { ok: true, email };
}

export function validatePassword(value) {
  const password = String(value ?? '');
  if (password !== password.trim() || /\s/.test(password)) {
    return { ok: false, error: 'Password cannot start, end, or contain spaces.' };
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return { ok: false, error: `Use ${PASSWORD_MIN}–${PASSWORD_MAX} characters.` };
  }
  return { ok: true, password };
}

export function validateCredentials(email, password) {
  const emailResult = validateEmail(email);
  if (!emailResult.ok) return emailResult;
  const passwordResult = validatePassword(password);
  if (!passwordResult.ok) return passwordResult;
  return { ok: true, email: emailResult.email, password: passwordResult.password };
}

export const EMAIL_UNCONFIRMED = 'email_not_confirmed';
export const EMAIL_RATE_LIMITED = 'over_email_send_rate_limit';

export function providerFailure(code) {
  if (code === EMAIL_UNCONFIRMED) {
    return {
      status: 403,
      code: 'EMAIL_VERIFICATION_REQUIRED',
      error: 'Confirm your email before signing in. Open the link in the email from Supabase, then try again.',
    };
  }
  if (code === EMAIL_RATE_LIMITED) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      error: 'Supabase email limit reached. Wait about an hour, or turn off Confirm email in Supabase for local testing.',
    };
  }
  return null;
}

export function authUnavailable(action, config = authConfig()) {
  return {
    ok: false,
    code: 'AUTH_NOT_CONFIGURED',
    error: config.configured
      ? `${action} is not connected yet.`
      : 'Sign-in is not connected. Add the Supabase project URL and publishable key on the server, then restart.',
  };
}
