import assert from 'node:assert/strict';
import test from 'node:test';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  consumeRateLimit,
  failIdempotentRequest,
  requestHash,
  requestSafetyKey,
  validClientKey,
} from './request-safety.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
};
const clientKey = 'client-key-1234567890';
const body = { topic: 'Explain RAM versus storage' };

function jsonResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? {} : { 'content-type': 'application/json' },
  });
}

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('validates client keys and derives stable owner-scoped keys', () => {
  assert.equal(validClientKey(clientKey), true);
  assert.equal(validClientKey('short'), false);
  assert.equal(validClientKey(null), false);
  assert.equal(requestSafetyKey('owner-1', 'ideas:p1', clientKey), requestSafetyKey('owner-1', 'ideas:p1', clientKey));
  assert.notEqual(requestSafetyKey('owner-1', 'ideas:p1', clientKey), requestSafetyKey('owner-1', 'ideas:p2', clientKey));
  assert.match(requestHash(body), /^[a-f0-9]{64}$/);
});

test('inserts a new in-progress idempotency row', async () => {
  let request;
  const result = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse([], 201);
  }, () => beginIdempotentRequest('access-token', {
    ownerId: 'owner-1',
    scope: 'ideas:p1',
    clientKey,
    body,
    env,
  }));

  assert.equal(result.state, 'new');
  assert.match(result.key, /^[a-f0-9]{64}$/);
  assert.match(request.url, /\/rest\/v1\/request_idempotency/);
  assert.equal(request.options.method, 'POST');
  const posted = JSON.parse(request.options.body);
  assert.equal(posted.scope, 'ideas:p1');
  assert.equal(posted.status, 'in_progress');
  assert.equal(posted.request_hash, requestHash(body));
});

test('replays a completed response for the same key and payload', async () => {
  const key = requestSafetyKey('owner-1', 'ideas:p1', clientKey);
  const calls = [];
  const result = await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST') return jsonResponse({ code: '23505' }, 409);
    return jsonResponse([{
      status: 'completed',
      request_hash: requestHash(body),
      response_status: 200,
      response_body: { suggestions: [{ title: 'Saved' }] },
    }]);
  }, () => beginIdempotentRequest('access-token', {
    ownerId: 'owner-1',
    scope: 'ideas:p1',
    clientKey,
    body,
    env,
  }));

  assert.equal(result.state, 'replay');
  assert.equal(result.response.status, 200);
  assert.equal(result.response.body.suggestions[0].title, 'Saved');
  assert.match(calls[1].url, new RegExp(`key=eq\\.${key}`));
});

test('distinguishes in-progress, mismatched and failed keys', async () => {
  const run = (row) => withFetch(async (url, options) => {
    if (options.method === 'POST') return jsonResponse({ code: '23505' }, 409);
    return jsonResponse([row]);
  }, () => beginIdempotentRequest('access-token', {
    ownerId: 'owner-1',
    scope: 'ideas:p1',
    clientKey,
    body,
    env,
  }));

  assert.equal((await run({ status: 'in_progress', request_hash: requestHash(body) })).state, 'in_progress');
  assert.equal((await run({ status: 'in_progress', request_hash: 'different' })).state, 'mismatch');
  assert.equal((await run({ status: 'failed', request_hash: requestHash(body) })).state, 'failed');
});

test('treats a missing safety table as unavailable and keeps generation working', async () => {
  const result = await withFetch(async () => jsonResponse({ code: '42P01' }, 404), () => beginIdempotentRequest('access-token', {
    ownerId: 'owner-1',
    scope: 'ideas:p1',
    clientKey,
    body,
    env,
  }));

  assert.equal(result.state, 'unavailable');
});

test('completes and fails a request row', async () => {
  const calls = [];
  await withFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(null, { status: 204 });
  }, async () => {
    assert.equal(await completeIdempotentRequest('access-token', 'a'.repeat(64), {
      status: 200,
      body: { suggestions: [] },
      env,
    }), true);
    assert.equal(await failIdempotentRequest('access-token', 'a'.repeat(64), {
      status: 422,
      body: { message: 'failed' },
      env,
    }), true);
  });

  assert.equal(JSON.parse(calls[0].options.body).status, 'completed');
  assert.equal(JSON.parse(calls[1].options.body).status, 'failed');
});

test('consumes the rate limit and fails open when the function is missing', async () => {
  const allowed = await withFetch(async () => jsonResponse({ allowed: false, count: 21, limit: 20, remaining: 0, resetAt: '2026-11-05T11:00:00.000Z' }), () => consumeRateLimit('access-token', {
    bucket: 'ideas',
    limit: 20,
    windowSeconds: 3600,
    env,
  }));
  assert.equal(allowed.available, true);
  assert.equal(allowed.allowed, false);
  assert.equal(allowed.remaining, 0);

  const missing = await withFetch(async () => jsonResponse({ code: 'PGRST202' }, 404), () => consumeRateLimit('access-token', {
    bucket: 'ideas',
    limit: 20,
    windowSeconds: 3600,
    env,
  }));
  assert.deepEqual(missing, { available: false, allowed: true });
});

test('treats an expired completed row as a new request', async () => {
  const result = await withFetch(async (url, options) => {
    if (options.method === 'POST') return jsonResponse({ code: '23505' }, 409);
    return jsonResponse([{
      status: 'completed',
      request_hash: requestHash(body),
      response_status: 200,
      response_body: { suggestions: [] },
      expires_at: '2020-01-01T00:00:00.000Z',
    }]);
  }, () => beginIdempotentRequest('access-token', {
    ownerId: 'owner-1',
    scope: 'ideas:p1',
    clientKey,
    body,
    env,
  }));

  assert.equal(result.state, 'new');
});
