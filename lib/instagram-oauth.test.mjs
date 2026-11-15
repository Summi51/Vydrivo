import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInstagramLoginUrl,
  createOAuthState,
  decryptInstagramToken,
  defaultReturnOrigin,
  encryptInstagramToken,
  exchangeInstagramCode,
  fetchInstagramIdentity,
  instagramConfig,
  instagramReturnOrigin,
  selectInstagramAccount,
  stateHash,
  validOAuthState,
} from './instagram-oauth.js';

const ENV = {
  META_APP_ID: '1209037248361026',
  META_APP_SECRET: 'a'.repeat(32),
  INSTAGRAM_CONFIG_ID: '2126762977963475',
  INSTAGRAM_REDIRECT_URI: 'https://dev.d35b51hio740im.amplifyapp.com/api/v1/instagram/callback',
};

test('Instagram config requires the app id, secret, config id and HTTPS redirect', () => {
  assert.equal(instagramConfig(ENV).configured, true);
  assert.equal(instagramConfig({ ...ENV, META_APP_SECRET: '' }).configured, false);
  assert.equal(instagramConfig({ ...ENV, INSTAGRAM_REDIRECT_URI: 'http://example.com/cb' }).configured, false);
  assert.equal(
    instagramConfig({ ...ENV, INSTAGRAM_REDIRECT_URI: 'http://localhost:3000/api/v1/instagram/callback' }).configured,
    true,
  );
});

test('login URL uses the configuration and never includes the app secret', () => {
  const state = createOAuthState();
  const url = new URL(buildInstagramLoginUrl({ state, env: ENV }));
  assert.equal(url.origin, 'https://www.facebook.com');
  assert.equal(url.pathname, '/dialog/oauth');
  assert.equal(url.searchParams.get('client_id'), ENV.META_APP_ID);
  assert.equal(url.searchParams.get('config_id'), ENV.INSTAGRAM_CONFIG_ID);
  assert.equal(url.searchParams.get('redirect_uri'), ENV.INSTAGRAM_REDIRECT_URI);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('state'), state);
  assert.equal(url.searchParams.get('prompt'), 'login');
  assert.equal(url.searchParams.has('client_secret'), false);
  assert.equal(url.toString().includes(ENV.META_APP_SECRET), false);
});

test('login URL refuses an unconfigured server', () => {
  assert.throws(
    () => buildInstagramLoginUrl({ state: createOAuthState(), env: { ...ENV, META_APP_SECRET: '' } }),
    (error) => error.code === 'INSTAGRAM_NOT_CONFIGURED',
  );
});

test('OAuth state is 256-bit base64url and hashes deterministically', () => {
  const first = createOAuthState();
  const second = createOAuthState();
  assert.equal(validOAuthState(first), true);
  assert.equal(first.length, 43);
  assert.notEqual(first, second);
  assert.match(stateHash(first), /^[0-9a-f]{64}$/);
  assert.equal(stateHash(first), stateHash(first));
  assert.notEqual(stateHash(first), stateHash(second));
  assert.equal(validOAuthState('short'), false);
  assert.equal(validOAuthState(`${first}!`), false);
});

test('return origins allow the deployed callback, localhost and explicit extras only', () => {
  assert.equal(instagramReturnOrigin('https://dev.d35b51hio740im.amplifyapp.com', ENV), 'https://dev.d35b51hio740im.amplifyapp.com');
  assert.equal(instagramReturnOrigin('http://localhost:3000', ENV), 'http://localhost:3000');
  assert.equal(instagramReturnOrigin('http://127.0.0.1:3001', ENV), 'http://127.0.0.1:3001');
  assert.equal(instagramReturnOrigin('http://dev.d35b51hio740im.amplifyapp.com', ENV), null);
  assert.equal(instagramReturnOrigin('https://evil.example.com', ENV), null);
  assert.equal(instagramReturnOrigin('https://dev.d35b51hio740im.amplifyapp.com/app/settings', ENV), null);
  assert.equal(
    instagramReturnOrigin('https://vydrivo.com', { ...ENV, INSTAGRAM_RETURN_ORIGINS: 'https://vydrivo.com' }),
    'https://vydrivo.com',
  );
  assert.equal(defaultReturnOrigin(ENV), 'https://dev.d35b51hio740im.amplifyapp.com');
});

test('access tokens round-trip through AES-256-GCM and tampering is rejected', () => {
  const token = `EAAG${'x'.repeat(60)}`;
  const first = encryptInstagramToken(token, ENV);
  const second = encryptInstagramToken(token, ENV);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
  assert.equal(decryptInstagramToken(first, ENV), token);
  assert.throws(
    () => decryptInstagramToken({ ...first, tag: Buffer.alloc(16).toString('base64') }, ENV),
    (error) => error.code === 'INSTAGRAM_TOKEN_UNREADABLE',
  );
  assert.equal(first.ciphertext.includes(token), false);
});

test('account selection keeps only a valid professional account', () => {
  assert.deepEqual(
    selectInstagramAccount({ data: [{ id: 'not-an-id', username: '@bad' }, { id: '17841461157104363', username: 'vydrivo' }] }),
    { id: '17841461157104363', username: 'vydrivo' },
  );
  assert.equal(selectInstagramAccount({ data: [] }), null);
  assert.equal(selectInstagramAccount({}), null);
});

test('code exchange posts no secret to the browser and requests the token server-side', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(new URL(url));
    return new Response(JSON.stringify({ access_token: `EAAG${'y'.repeat(60)}`, token_type: 'bearer' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const result = await exchangeInstagramCode('auth-code', ENV, { fetchImpl });
  assert.equal(result.accessToken.startsWith('EAAG'), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].origin, 'https://graph.facebook.com');
  assert.equal(calls[0].pathname, '/v27.0/oauth/access_token');
  assert.equal(calls[0].searchParams.get('client_id'), ENV.META_APP_ID);
  assert.equal(calls[0].searchParams.get('client_secret'), ENV.META_APP_SECRET);
  assert.equal(calls[0].searchParams.get('code'), 'auth-code');
  // Meta rejects the exchange unless redirect_uri repeats the dialog value.
  assert.equal(calls[0].searchParams.get('redirect_uri'), ENV.INSTAGRAM_REDIRECT_URI);
});

test('identity lookup reads the business id and the assigned Instagram account', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    if (parsed.pathname.endsWith('/me')) {
      return new Response(JSON.stringify({ client_business_id: '1181198131832188', id: 'app-scoped' }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: [{ id: '17841461157104363', username: 'vydrivo' }] }), { status: 200 });
  };
  const identity = await fetchInstagramIdentity(`EAAG${'z'.repeat(60)}`, { fetchImpl });
  assert.deepEqual(identity, {
    instagramUserId: '17841461157104363',
    username: 'vydrivo',
    businessId: '1181198131832188',
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].searchParams.get('fields'), 'client_business_id');
  assert.equal(calls[1].pathname, '/v27.0/me/assigned_instagram_accounts');
  assert.equal(calls[1].searchParams.get('fields'), 'id,username');
});

test('identity lookup reports a missing professional account', async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/me')) {
      return new Response(JSON.stringify({ client_business_id: '1181198131832188' }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  await assert.rejects(
    fetchInstagramIdentity(`EAAG${'q'.repeat(60)}`, { fetchImpl }),
    (error) => error.code === 'INSTAGRAM_NO_ACCOUNT' && error.status === 422,
  );
});
