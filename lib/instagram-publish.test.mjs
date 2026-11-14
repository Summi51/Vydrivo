import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CAPTION_LENGTH,
  captionFromRequest,
  containerParams,
  createReelContainer,
  fetchMediaPermalink,
  normalizeCaption,
  publishContainer,
  readContainerStatus,
} from './instagram-publish.js';

const TOKEN = `EAAG${'z'.repeat(60)}`;
const IG_ID = '17841461157104363';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('captions keep plain text, strip control characters and stop at the limit', () => {
  assert.equal(normalizeCaption('  Load balancing\n\n\nready  '), 'Load balancing\n\nready');
  assert.equal(normalizeCaption('\u0000hello\u0007'), 'hello');
  assert.equal(normalizeCaption('', 'Fallback title'), 'Fallback title');
  assert.equal(normalizeCaption('x'.repeat(3000)).length, MAX_CAPTION_LENGTH);
});

test('an explicit caption wins over the title fallback, even when cleared', () => {
  assert.equal(captionFromRequest({ caption: 'Custom caption' }, 'Title'), 'Custom caption');
  assert.equal(captionFromRequest({ caption: '   ' }, 'Title'), '');
  assert.equal(captionFromRequest({ caption: null }, 'Title'), '');
  assert.equal(captionFromRequest({}, 'Title'), 'Title');
  assert.equal(captionFromRequest(null, 'Title'), 'Title');
  assert.equal(containerParams({ videoUrl: 'https://cdn.example.com/video.mp4', caption: '' }).caption, undefined);
});

test('a Reels container always uses the public video URL and share_to_feed', () => {
  const params = containerParams({ videoUrl: 'https://cdn.example.com/video.mp4', caption: 'Hello' });
  assert.deepEqual(params, {
    media_type: 'REELS',
    video_url: 'https://cdn.example.com/video.mp4',
    share_to_feed: 'true',
    caption: 'Hello',
  });
  assert.equal('caption' in containerParams({ videoUrl: 'https://cdn.example.com/video.mp4', caption: '  ' }), false);
  assert.throws(() => containerParams({ videoUrl: 'http://cdn.example.com/video.mp4' }), /public link/);
  assert.throws(() => containerParams({ videoUrl: '' }), /public link/);
});

test('container creation posts the Reels payload with a bearer token', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: new URL(url), init });
    return jsonResponse({ id: '17890000000000001' });
  };
  const result = await createReelContainer({
    igUserId: IG_ID,
    accessToken: TOKEN,
    videoUrl: 'https://cdn.example.com/video.mp4',
    caption: 'Load balancing',
    fetchImpl,
  });
  assert.equal(result.containerId, '17890000000000001');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, 'https://graph.facebook.com');
  assert.equal(calls[0].url.pathname, `/v27.0/${IG_ID}/media`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    media_type: 'REELS',
    video_url: 'https://cdn.example.com/video.mp4',
    share_to_feed: 'true',
    caption: 'Load balancing',
  });
  assert.equal(calls[0].init.body.includes(TOKEN), false);
});

test('container status reads status_code and rejects unknown values', async () => {
  let seen;
  const ok = await readContainerStatus({
    containerId: '17890000000000001',
    accessToken: TOKEN,
    fetchImpl: async (url) => {
      seen = new URL(url);
      return jsonResponse({ status_code: 'FINISHED' });
    },
  });
  assert.equal(ok, 'FINISHED');
  assert.equal(seen.pathname, '/v27.0/17890000000000001');
  assert.equal(seen.searchParams.get('fields'), 'status_code');

  await assert.rejects(
    readContainerStatus({
      containerId: '17890000000000001',
      accessToken: TOKEN,
      fetchImpl: async () => jsonResponse({ status_code: 'SOMETHING_ELSE' }),
    }),
    /unknown processing state/,
  );
});

test('publishing sends creation_id and returns the media id', async () => {
  const calls = [];
  const result = await publishContainer({
    igUserId: IG_ID,
    containerId: '17890000000000001',
    accessToken: TOKEN,
    fetchImpl: async (url, init) => {
      calls.push({ url: new URL(url), init });
      return jsonResponse({ id: '17900000000000001' });
    },
  });
  assert.equal(result.mediaId, '17900000000000001');
  assert.equal(calls[0].url.pathname, `/v27.0/${IG_ID}/media_publish`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { creation_id: '17890000000000001' });
});

test('permalink must be an Instagram URL', async () => {
  const permalink = await fetchMediaPermalink({
    mediaId: '17900000000000001',
    accessToken: TOKEN,
    fetchImpl: async () => jsonResponse({ permalink: 'https://www.instagram.com/reel/ABC123/' }),
  });
  assert.equal(permalink, 'https://www.instagram.com/reel/ABC123/');

  await assert.rejects(
    fetchMediaPermalink({
      mediaId: '17900000000000001',
      accessToken: TOKEN,
      fetchImpl: async () => jsonResponse({ permalink: 'https://evil.example.com/reel/ABC123/' }),
    }),
    /post link/,
  );
});

test('Graph errors map to safe codes without leaking the payload or token', async () => {
  const cases = [
    { error: { code: 190, message: 'Invalid OAuth access token' }, code: 'INSTAGRAM_TOKEN_INVALID', status: 401 },
    { error: { code: 4, message: 'Application request limit reached' }, code: 'INSTAGRAM_RATE_LIMIT', status: 429 },
    { error: { code: 9007, message: 'Media not ready' }, code: 'INSTAGRAM_MEDIA_PROCESSING', status: 409 },
    { error: { code: 36003, message: 'Aspect ratio not supported' }, code: 'INSTAGRAM_MEDIA_REJECTED', status: 422 },
  ];
  for (const item of cases) {
    await assert.rejects(
      createReelContainer({
        igUserId: IG_ID,
        accessToken: TOKEN,
        videoUrl: 'https://cdn.example.com/video.mp4',
        fetchImpl: async () => jsonResponse(item, 400),
        caption: 'Hello',
      }),
      (error) => {
        assert.equal(error.code, item.code);
        assert.equal(error.status, item.status);
        assert.equal(error.message.includes(TOKEN), false);
        assert.equal(error.message.includes(item.error.message), false);
        return true;
      },
    );
  }
});

test('a missing token is rejected before any network call', async () => {
  let called = false;
  await assert.rejects(
    readContainerStatus({
      containerId: '17890000000000001',
      accessToken: '',
      fetchImpl: async () => {
        called = true;
        return jsonResponse({ status_code: 'FINISHED' });
      },
    }),
    /Reconnect Instagram/,
  );
  assert.equal(called, false);
});
