import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteMediaAsset,
  finalizeMediaAsset,
  getMediaAsset,
  listMediaAssets,
  MediaAssetError,
  mediaQuotaUsage,
  reserveMediaAsset,
} from './media-assets-repository.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
};

const projectId = '22222222-2222-4222-8222-222222222222';
const assetId = '44444444-4444-4444-8444-444444444444';
const key = `users/11111111-1111-4111-8111-111111111111/projects/${projectId}/reference/55555555-5555-4555-8555-555555555555.png`;

const row = {
  id: assetId,
  project_id: projectId,
  kind: 'reference',
  status: 'pending',
  storage_backend: 's3',
  object_key: key,
  filename: 'frame.png',
  declared_bytes: 70,
  bytes: null,
  mime: 'image/png',
  sha256: null,
  rejected_reason: null,
  created_at: '2026-11-06T10:00:00.000Z',
  validated_at: null,
  expires_at: '2026-11-06T11:00:00.000Z',
  deleted_at: null,
};

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('reserves a pending asset through the quota RPC', async () => {
  let request;
  const result = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse({
      allowed: true,
      asset: row,
      usedBytes: 70,
      limitBytes: 500 * 1024 * 1024,
      remainingBytes: 500 * 1024 * 1024 - 70,
    });
  }, () => reserveMediaAsset('access-token', {
    projectId,
    kind: 'reference',
    key,
    mime: 'image/png',
    bytes: 70,
    filename: 'frame.png',
    env,
  }));

  assert.match(request.url, /\/rest\/v1\/rpc\/reserve_media_asset$/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.p_project_id, projectId);
  assert.equal(body.p_object_key, key);
  assert.equal(body.p_filename, 'frame.png');
  assert.equal(result.asset.status, 'pending');
  assert.equal(result.quota.usedBytes, 70);
});

test('rejects an upload that would exceed the quota', async () => {
  await withFetch(async () => jsonResponse({
    allowed: false,
    usedBytes: 500 * 1024 * 1024,
    limitBytes: 500 * 1024 * 1024,
    remainingBytes: 0,
  }), async () => {
    await assert.rejects(
      () => reserveMediaAsset('access-token', {
        projectId, kind: 'reference', key, mime: 'image/png', bytes: 70, env,
      }),
      (error) => error instanceof MediaAssetError
        && error.status === 413
        && error.code === 'MEDIA_QUOTA_EXCEEDED'
        && error.details?.remainingBytes === 0,
    );
  });
});

test('reports a missing media library function as unavailable', async () => {
  await withFetch(async () => jsonResponse({ code: 'PGRST202', message: 'Could not find the function' }, 404), async () => {
    await assert.rejects(
      () => reserveMediaAsset('access-token', {
        projectId, kind: 'reference', key, mime: 'image/png', bytes: 70, env,
      }),
      (error) => error instanceof MediaAssetError
        && error.status === 503
        && error.code === 'MEDIA_LIBRARY_UNAVAILABLE',
    );
  });
});

test('finalizes a pending asset with the checked bytes and type', async () => {
  let request;
  const validated = { ...row, status: 'validated', bytes: 70, validated_at: '2026-11-06T10:05:00.000Z' };
  const result = await withFetch(async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse([validated]);
  }, () => finalizeMediaAsset('access-token', assetId, { bytes: 70, mime: 'image/png', env }));

  assert.match(request.url, /\/rest\/v1\/media_assets\?/);
  assert.match(request.url, /status=eq\.pending/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.status, 'validated');
  assert.equal(body.bytes, 70);
  assert.equal(result.status, 'validated');
});

test('finalize is idempotent for the same checked details', async () => {
  const validated = { ...row, status: 'validated', bytes: 70, validated_at: '2026-11-06T10:05:00.000Z' };
  const result = await withFetch(async (url, options) => {
    if (options.method === 'PATCH') return jsonResponse([]);
    return jsonResponse([validated]);
  }, () => finalizeMediaAsset('access-token', assetId, { bytes: 70, mime: 'image/png', env }));
  assert.equal(result.id, assetId);
  assert.equal(result.status, 'validated');
});

test('lists project assets with quota usage', async () => {
  const calls = [];
  const listed = { ...row, status: 'validated', bytes: 70, validated_at: '2026-11-06T10:05:00.000Z' };
  const result = await withFetch(async (url) => {
    calls.push(String(url));
    if (String(url).includes('rpc/media_quota_usage')) {
      return jsonResponse({ usedBytes: 70, limitBytes: 500 * 1024 * 1024, remainingBytes: 500 * 1024 * 1024 - 70 });
    }
    return jsonResponse([listed]);
  }, () => listMediaAssets('access-token', { projectId, env }));

  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].filename, 'frame.png');
  assert.equal(result.quota.usedBytes, 70);
  assert.ok(calls.some((url) => url.includes('project_id=eq.')));
});

test('gets and deletes an owned asset', async () => {
  const calls = [];
  const deleted = { ...row, status: 'deleted', deleted_at: '2026-11-06T10:10:00.000Z' };
  const result = await withFetch(async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    if (options.method === 'PATCH') return jsonResponse([deleted]);
    return jsonResponse([row]);
  }, async () => {
    const asset = await getMediaAsset('access-token', assetId, { env });
    assert.equal(asset.id, assetId);
    return deleteMediaAsset('access-token', assetId, { env });
  });

  assert.equal(result.status, 'deleted');
  assert.ok(calls.some((call) => call.method === 'PATCH' && call.url.includes('status=in.%28pending%2Cvalidated%29')));
});

test('reads quota usage through the RPC', async () => {
  const result = await withFetch(async () => jsonResponse({
    usedBytes: 10,
    limitBytes: 100,
    remainingBytes: 90,
  }), () => mediaQuotaUsage('access-token', { limitBytes: 100, env }));
  assert.deepEqual(result, { usedBytes: 10, limitBytes: 100, remainingBytes: 90 });
});
