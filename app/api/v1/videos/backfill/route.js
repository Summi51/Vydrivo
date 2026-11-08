import path from 'node:path';
import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { errorResult, jsonResult } from '../../../../../lib/auth-http.js';
import { r2PrivateConfig } from '../../../../../lib/r2-private.js';
import { listLocalVideos } from '../../../../../lib/videos.js';
import { isVideoStorageUnavailable, listVideoRenders } from '../../../../../lib/video-renders-repository.js';
import { persistLocalVideoRender } from '../../../../../lib/video-persist.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const JOBS = path.join(process.cwd(), 'prototype/output/graphics-jobs');

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  if (!r2PrivateConfig(process.env).configured) {
    return errorResult(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not configured on this server.');
  }
  try {
    await listVideoRenders(session.access, { limit: 1 });
  } catch (error) {
    if (isVideoStorageUnavailable(error)) {
      return errorResult(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not set up yet. Apply migration 0008 and check the private storage settings.');
    }
    return errorResult(error.status || 503, error.code || 'VIDEO_STORAGE_UNAVAILABLE', error.message || 'Cloud video storage is temporarily unavailable.');
  }

  const local = listLocalVideos({ jobsDir: JOBS, ownerId: session.user.id });
  if (!local.length) {
    return jsonResult(200, { saved: 0, skipped: 0, failed: 0, total: 0, bytes: 0 });
  }

  let saved = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;
  let unavailable = false;

  for (const video of local) {
    try {
      const result = await persistLocalVideoRender({
        access: session.access,
        ownerId: session.user.id,
        projectId: video.projectId,
        runId: video.runId,
        jobsDir: JOBS,
      });
      if (result.skipped) {
        skipped += 1;
      } else {
        saved += 1;
        bytes += result.video.bytes;
      }
    } catch (error) {
      if (isVideoStorageUnavailable(error)) unavailable = true;
      failed += 1;
    }
  }

  if (unavailable && saved === 0 && skipped === 0) {
    return errorResult(503, 'VIDEO_STORAGE_UNAVAILABLE', 'Cloud video storage is not set up yet. Apply migration 0008 and check the private storage settings.');
  }

  return jsonResult(200, {
    saved,
    skipped,
    failed,
    total: local.length,
    bytes,
  });
}
