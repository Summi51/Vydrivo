import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthProviderError, startGoogle } from './supabase-auth.js';

const ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable',
  SUPABASE_GOOGLE_ENABLED: 'true',
};

test('Google sign-in asks for the account chooser and keeps the PKCE challenge', () => {
  const url = new URL(startGoogle('http://127.0.0.1:3000/auth/callback', 'challenge-value', ENV));
  assert.equal(url.origin, 'https://example.supabase.co');
  assert.equal(url.pathname, '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('redirect_to'), 'http://127.0.0.1:3000/auth/callback');
  assert.equal(url.searchParams.get('code_challenge'), 'challenge-value');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.equal(url.searchParams.get('prompt'), 'select_account');
  assert.equal(url.searchParams.has('apikey'), false);
});

test('Google sign-in stays unavailable until the provider is configured', () => {
  assert.throws(
    () => startGoogle('http://127.0.0.1:3000/auth/callback', 'challenge', { ...ENV, SUPABASE_GOOGLE_ENABLED: 'false' }),
    (error) => error instanceof AuthProviderError && error.code === 'CAPABILITY_UNAVAILABLE',
  );
});
