import os from 'node:os';
import path from 'node:path';
import { verifiedAccess } from '../../../../../lib/api-session.js';
import { guardMutation } from '../../../../../lib/auth-server.js';
import { errorResult, jsonResult } from '../../../../../lib/auth-http.js';
import { backupVideos } from '../../../../../lib/video-backup.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  const guard = guardMutation(request);
  if (!guard.ok) return errorResult(guard.status, guard.code, guard.message);
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  try {
    const result = backupVideos({
      jobsDir: path.join(/* turbopackIgnore: true */ process.cwd(), 'prototype/output/graphics-jobs'),
      backupRoot: path.join(/* turbopackIgnore: true */ os.homedir(), 'Vydrivo-Backups'),
      ownerId: session.user.id,
    });
    return jsonResult(200, {
      directory: `~/Vydrivo-Backups/${path.basename(result.directory)}`,
      count: result.count,
      bytes: result.bytes,
    });
  } catch {
    return errorResult(503, 'VIDEO_BACKUP_UNAVAILABLE', 'Video backup could not be created.');
  }
}
