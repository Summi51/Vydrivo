import path from 'node:path';
import { verifiedAccess } from '../../../../lib/api-session.js';
import { errorResult, jsonResult } from '../../../../lib/auth-http.js';
import { r2PrivateConfig } from '../../../../lib/r2-private.js';
import { listLocalVideos } from '../../../../lib/videos.js';
import { listInstagramPublishes } from '../../../../lib/instagram-repository.js';
import { isVideoStorageUnavailable, listVideoRenders } from '../../../../lib/video-renders-repository.js';

export const dynamic = 'force-dynamic';

const JOBS = path.join(/* turbopackIgnore: true */ process.cwd(), 'prototype/output/graphics-jobs');

function publicVideo(video) {
  if (!video) return video;
  const { videoKey, thumbnailKey, scriptKey, metadataKey, ...rest } = video;
  return rest;
}

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  let cloud = [];
  let storageAvailable = true;
  try {
    cloud = (await listVideoRenders(session.access)).map(publicVideo);
  } catch (error) {
    if (isVideoStorageUnavailable(error)) {
      storageAvailable = false;
    } else {
      return errorResult(error.status || 503, error.code || 'VIDEO_STORAGE_UNAVAILABLE', error.message || 'Cloud videos are temporarily unavailable.');
    }
  }

  const local = listLocalVideos({ jobsDir: JOBS, ownerId: session.user.id });
  const cloudRuns = new Set(cloud.map((video) => video.runId));
  const videos = [...cloud, ...local.filter((video) => !cloudRuns.has(video.runId))];
  videos.sort((left, right) => {
    const a = Date.parse(left.createdAt || '');
    const b = Date.parse(right.createdAt || '');
    return (Number.isFinite(b) ? b : 0) - (Number.isFinite(a) ? a : 0);
  });

  // Instagram badges are optional: a missing migration must not hide videos.
  let instagramAvailable = true;
  let publishes = [];
  try {
    publishes = await listInstagramPublishes(session.access);
  } catch {
    instagramAvailable = false;
  }
  const publishedRuns = new Map(
    publishes
      .filter((publish) => publish.status === 'published')
      .map((publish) => [publish.runId, { permalink: publish.permalink, updatedAt: publish.updatedAt }]),
  );
  const withInstagram = videos.map((video) => ({
    ...video,
    instagram: publishedRuns.get(video.runId) || null,
  }));

  return jsonResult(200, {
    videos: withInstagram.slice(0, 60),
    count: videos.length,
    durableCount: cloud.length,
    localCount: videos.length - cloud.length,
    storageAvailable: storageAvailable && r2PrivateConfig(process.env).configured,
    instagramAvailable,
  });
}
