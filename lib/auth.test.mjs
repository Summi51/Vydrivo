import assert from 'node:assert/strict';
import test from 'node:test';
import { authConfig, authUnavailable, validateCredentials, validateEmail } from './auth.js';

test('credentials accept a normal email and a 12 character password', () => {
  const result = validateCredentials('  Creator@Agency.Design ', 'correct-horse');
  assert.equal(result.ok, true);
  assert.equal(result.email, 'creator@agency.design');
});

test('credentials reject short, spaced, and missing passwords without trimming them', () => {
  assert.equal(validateCredentials('a@b.co', 'short-pass').ok, false);
  assert.equal(validateCredentials('a@b.co', ' correct-horse').ok, false);
  assert.equal(validateCredentials('not-an-email', 'correct-horse').ok, false);
  assert.equal(validateEmail('').ok, false);
});

test('auth stays unavailable until both Supabase values exist', () => {
  assert.equal(authConfig({}).configured, false);
  assert.equal(authConfig({ SUPABASE_URL: 'https://example.supabase.co' }).configured, false);
  const ready = authConfig({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'publishable',
    SUPABASE_GOOGLE_ENABLED: 'true',
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.googleConfigured, true);
  assert.equal(authUnavailable('Sign-in', authConfig({})).code, 'AUTH_NOT_CONFIGURED');
});
