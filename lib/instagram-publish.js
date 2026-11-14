import { GRAPH_ORIGIN, GRAPH_VERSION } from './instagram-oauth.js';

// Instagram content publishing: one Reels container per render, then publish it
// once Meta finishes processing. The token is always used server-side only.
export const MAX_CAPTION_LENGTH = 2200;
export const CONTAINER_STATUSES = new Set(['EXPIRED', 'ERROR', 'FINISHED', 'IN_PROGRESS', 'PUBLISHED']);

const ID_PATTERN = /^\d{1,64}$/;
const HTTPS_URL = /^https:\/\/[^\s]+$/i;
const PERMALINK = /^https:\/\/(www\.)?instagram\.com\/[^\s]+$/i;

export class InstagramPublishError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'InstagramPublishError';
    this.status = status;
    this.code = code;
  }
}

// Captions are plain text: drop control characters, keep paragraph breaks and
// cap the length at Instagram's limit instead of failing after the upload.
export function normalizeCaption(value, fallback = '') {
  const clean = (input) => String(input ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return (clean(value) || clean(fallback)).slice(0, MAX_CAPTION_LENGTH);
}

// An explicit caption from the dialog always wins, including when the user
// clears it on purpose; the render title is only a fallback for a request that
// carries no caption field at all.
export function captionFromRequest(body, fallback = '') {
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'caption')) {
    return normalizeCaption(body.caption, '');
  }
  return normalizeCaption('', fallback);
}

export function containerParams({ videoUrl, caption } = {}) {
  const url = String(videoUrl || '').trim();
  if (!HTTPS_URL.test(url)) {
    throw new InstagramPublishError(422, 'INSTAGRAM_VIDEO_URL_INVALID', 'This video has no public link to publish.');
  }
  const text = normalizeCaption(caption);
  return {
    media_type: 'REELS',
    video_url: url,
    share_to_feed: 'true',
    ...(text ? { caption: text } : {}),
  };
}

function graphError(status, payload) {
  const error = payload?.error || {};
  const code = Number(error.code);
  const subcode = Number(error.error_subcode);
  if (code === 190) {
    return new InstagramPublishError(401, 'INSTAGRAM_TOKEN_INVALID', 'Reconnect Instagram in Settings before posting again.');
  }
  if (code === 4 || code === 32 || code === 613) {
    return new InstagramPublishError(429, 'INSTAGRAM_RATE_LIMIT', 'Instagram is limiting posts right now. Try again later.');
  }
  if (code === 9007) {
    return new InstagramPublishError(409, 'INSTAGRAM_MEDIA_PROCESSING', 'Instagram is still processing this video.');
  }
  if (code === 36003 || code === 352 || subcode === 2207026) {
    return new InstagramPublishError(422, 'INSTAGRAM_MEDIA_REJECTED', 'Instagram rejected this video. Use a 9:16 MP4 under 1 GB.');
  }
  if (code === 100) {
    return new InstagramPublishError(422, 'INSTAGRAM_REQUEST_REJECTED', 'Instagram could not accept this post.');
  }
  return new InstagramPublishError(
    status === 401 ? 401 : 502,
    'INSTAGRAM_PUBLISH_FAILED',
    'Instagram could not complete this post. Try again.',
  );
}

async function graphRequest(path, { method = 'GET', accessToken, body, fetchImpl = fetch } = {}) {
  const token = String(accessToken || '').trim();
  if (!token) {
    throw new InstagramPublishError(401, 'INSTAGRAM_TOKEN_INVALID', 'Reconnect Instagram in Settings before posting again.');
  }
  const url = new URL(`${GRAPH_ORIGIN}/${GRAPH_VERSION}/${path.replace(/^\//, '')}`);
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new InstagramPublishError(503, 'INSTAGRAM_UNAVAILABLE', 'Instagram did not respond. Try again.');
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!response.ok || payload?.error) throw graphError(response.status, payload);
  return payload;
}

function requireId(value, code = 'INSTAGRAM_REQUEST_REJECTED') {
  const id = String(value ?? '').trim();
  if (!ID_PATTERN.test(id)) {
    throw new InstagramPublishError(422, code, 'Instagram did not return a usable post reference.');
  }
  return id;
}

export async function createReelContainer({ igUserId, accessToken, videoUrl, caption, fetchImpl = fetch } = {}) {
  const id = requireId(igUserId, 'INSTAGRAM_ACCOUNT_INVALID');
  const payload = await graphRequest(`${id}/media`, {
    method: 'POST',
    accessToken,
    body: containerParams({ videoUrl, caption }),
    fetchImpl,
  });
  return { containerId: requireId(payload?.id) };
}

export async function readContainerStatus({ containerId, accessToken, fetchImpl = fetch } = {}) {
  const id = requireId(containerId);
  const payload = await graphRequest(`${id}?fields=status_code`, { accessToken, fetchImpl });
  const status = String(payload?.status_code || '').trim().toUpperCase();
  if (!CONTAINER_STATUSES.has(status)) {
    throw new InstagramPublishError(502, 'INSTAGRAM_PUBLISH_FAILED', 'Instagram returned an unknown processing state.');
  }
  return status;
}

export async function publishContainer({ igUserId, containerId, accessToken, fetchImpl = fetch } = {}) {
  const id = requireId(igUserId, 'INSTAGRAM_ACCOUNT_INVALID');
  const creationId = requireId(containerId);
  const payload = await graphRequest(`${id}/media_publish`, {
    method: 'POST',
    accessToken,
    body: { creation_id: creationId },
    fetchImpl,
  });
  return { mediaId: requireId(payload?.id, 'INSTAGRAM_MEDIA_REJECTED') };
}

export async function fetchMediaPermalink({ mediaId, accessToken, fetchImpl = fetch } = {}) {
  const id = requireId(mediaId);
  const payload = await graphRequest(`${id}?fields=permalink`, { accessToken, fetchImpl });
  const permalink = String(payload?.permalink || '').trim();
  if (!PERMALINK.test(permalink)) {
    throw new InstagramPublishError(502, 'INSTAGRAM_PUBLISH_FAILED', 'Instagram did not return the post link.');
  }
  return permalink;
}

// Meta sometimes needs a moment before a just-published media object exposes its
// permalink. Retry only the transient failures; a token or rejection error is
// final, and the post itself must never be marked failed because its link is
// briefly unavailable.
const PERMALINK_RETRY_CODES = new Set(['INSTAGRAM_UNAVAILABLE', 'INSTAGRAM_PUBLISH_FAILED']);

export async function fetchMediaPermalinkWithRetry({
  mediaId,
  accessToken,
  fetchImpl = fetch,
  attempts = 3,
  delayMs = 1200,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const total = Math.max(1, Math.min(5, Number(attempts) || 1));
  let lastError = null;
  for (let attempt = 0; attempt < total; attempt += 1) {
    try {
      return await fetchMediaPermalink({ mediaId, accessToken, fetchImpl });
    } catch (error) {
      lastError = error;
      if (!PERMALINK_RETRY_CODES.has(error?.code) || attempt === total - 1) break;
      await wait(delayMs);
    }
  }
  throw lastError;
}
