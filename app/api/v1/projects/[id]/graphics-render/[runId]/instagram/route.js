import { verifiedAccess } from '../../../../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../../../../lib/auth-server.js';
import { errorResult, jsonResult } from '../../../../../../../../lib/auth-http.js';
import { decryptInstagramToken } from '../../../../../../../../lib/instagram-oauth.js';
import {
  InstagramPublishError,
  captionFromRequest,
  createReelContainer,
  fetchMediaPermalink,
  normalizeCaption,
  publishContainer,
  readContainerStatus,
} from '../../../../../../../../lib/instagram-publish.js';
import {
  getInstagramConnectionSecret,
  getInstagramPublish,
  isInstagramUnavailable,
  updateInstagramPublish,
  upsertInstagramPublish,
} from '../../../../../../../../lib/instagram-repository.js';
import { getVideoRender, isVideoStorageUnavailable } from '../../../../../../../../lib/video-renders-repository.js';
import { signVideoRenderObject } from '../../../../../../../../lib/video-storage.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error) {
  if (error instanceof InstagramPublishError) {
    return errorResult(error.status, error.code, error.message);
  }
  if (isVideoStorageUnavailable(error)) {
    return errorResult(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not set up yet.');
  }
  if (isInstagramUnavailable(error)) {
    return errorResult(503, 'INSTAGRAM_NOT_READY', 'Instagram settings are not available on this server yet.');
  }
  return errorResult(error?.status || 503, error?.code || 'INSTAGRAM_PUBLISH_FAILED', error?.message || 'Instagram could not complete this post.');
}

async function readCaption(request, fallback) {
  try {
    return captionFromRequest(await request.json(), fallback);
  } catch {
    return normalizeCaption('', fallback);
  }
}

async function finishPublish({ access, connection, row }) {
  const token = decryptInstagramToken(connection.token);
  const status = await readContainerStatus({
    containerId: row.containerId,
    accessToken: token,
  });

  if (status === 'IN_PROGRESS') {
    return { changed: false, publish: row };
  }
  if (status === 'ERROR' || status === 'EXPIRED') {
    const updated = await updateInstagramPublish(access, row.id, {
      status: 'failed',
      error_code: status === 'EXPIRED' ? 'CONTAINER_EXPIRED' : 'MEDIA_REJECTED',
    });
    return { changed: true, publish: updated };
  }
  if (status === 'PUBLISHED') {
    // The container was published earlier but the saved row did not record it.
    const updated = await updateInstagramPublish(access, row.id, { status: 'published', error_code: null });
    return { changed: true, publish: updated };
  }

  const { mediaId } = await publishContainer({
    igUserId: connection.instagramUserId,
    containerId: row.containerId,
    accessToken: token,
  });
  let permalink = null;
  try {
    permalink = await fetchMediaPermalink({ mediaId, accessToken: token });
  } catch {
    // The post exists even if Meta did not return its link; do not mark it failed.
  }
  const updated = await updateInstagramPublish(access, row.id, {
    status: 'published',
    media_id: mediaId,
    permalink,
    error_code: null,
  });
  return { changed: true, publish: updated };
}

export async function POST(request, { params }) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  const { id, runId } = await params;
  if (!UUID.test(id || '') || !UUID.test(runId || '')) {
    return errorResult(404, 'GRAPHICS_RUN_NOT_FOUND', 'Video not found.');
  }

  try {
    const video = await getVideoRender(session.access, { projectId: id, runId });
    if (!video?.videoKey) {
      return errorResult(422, 'VIDEO_NOT_DURABLE', 'Save this video to the cloud before posting it.');
    }

    const existing = await getInstagramPublish(session.access, { projectId: id, runId });
    if (existing?.status === 'published') {
      return jsonResult(200, { publish: existing });
    }
    if (existing?.status === 'processing' && existing.containerId) {
      return jsonResult(202, { publish: existing });
    }

    const connection = await getInstagramConnectionSecret(session.access, session.user.id);
    if (!connection?.instagramUserId || !connection.token?.ciphertext) {
      return errorResult(409, 'INSTAGRAM_NOT_CONNECTED', 'Connect a professional Instagram account in Settings first.');
    }

    const caption = await readCaption(request, video.title);
    const signed = await signVideoRenderObject({
      ownerId: session.user.id,
      key: video.videoKey,
      contentType: 'video/mp4',
      expiresIn: 900,
    });
    const token = decryptInstagramToken(connection.token);
    const { containerId } = await createReelContainer({
      igUserId: connection.instagramUserId,
      accessToken: token,
      videoUrl: signed.url,
      caption,
    });

    const publish = await upsertInstagramPublish(session.access, {
      project_id: id,
      run_id: runId,
      caption,
      status: 'processing',
      container_id: containerId,
      media_id: null,
      permalink: null,
      error_code: null,
    });
    return jsonResult(202, { publish, videoExpiresAt: signed.expiresAt });
  } catch (error) {
    return failure(error);
  }
}

export async function GET(request, { params }) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  const { id, runId } = await params;
  if (!UUID.test(id || '') || !UUID.test(runId || '')) {
    return errorResult(404, 'INSTAGRAM_PUBLISH_NOT_FOUND', 'Post not found.');
  }

  let row;
  try {
    row = await getInstagramPublish(session.access, { projectId: id, runId });
  } catch (error) {
    return failure(error);
  }
  if (!row) return errorResult(404, 'INSTAGRAM_PUBLISH_NOT_FOUND', 'This video has not been posted yet.');
  if (row.status !== 'processing' || !row.containerId) {
    return jsonResult(200, { publish: row });
  }

  try {
    const connection = await getInstagramConnectionSecret(session.access, session.user.id);
    if (!connection?.instagramUserId || !connection.token?.ciphertext) {
      const failed = await updateInstagramPublish(session.access, row.id, {
        status: 'failed',
        error_code: 'NOT_CONNECTED',
      });
      return jsonResult(200, { publish: failed });
    }
    const result = await finishPublish({ access: session.access, connection, row });
    return jsonResult(200, { publish: result.publish });
  } catch (error) {
    if (error instanceof InstagramPublishError) {
      if (error.code === 'INSTAGRAM_MEDIA_PROCESSING') {
        return jsonResult(200, { publish: row });
      }
      if (error.code === 'INSTAGRAM_UNAVAILABLE') {
        return errorResult(503, error.code, error.message);
      }
      try {
        const failed = await updateInstagramPublish(session.access, row.id, {
          status: 'failed',
          error_code: error.code,
        });
        return jsonResult(200, { publish: failed });
      } catch {
        return failure(error);
      }
    }
    return failure(error);
  }
}
