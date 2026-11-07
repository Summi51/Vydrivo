import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { verifiedAccess } from '../../../../lib/api-session.js';
import { errorResult, jsonResult } from '../../../../lib/auth-http.js';
import { videoMetadata } from '../../../../lib/videos.js';

export const dynamic = 'force-dynamic';

const JOBS = path.join(process.cwd(), 'prototype/output/graphics-jobs');

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  let entries = [];
  try {
    entries = readdirSync(JOBS, { withFileTypes: true });
  } catch {
    return jsonResult(200, { videos: [], count: 0 });
  }

  const videos = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'locks') continue;
    const directory = path.join(JOBS, entry.name);
    const job = readJson(path.join(directory, 'job.json'));
    const status = readJson(path.join(directory, 'status.json'));
    const report = readJson(path.join(directory, 'report.json'));
    if (!job || !status || !report) continue;
    const video = videoMetadata({
      job,
      status,
      report,
      hasThumbnail: existsSync(path.join(directory, 'thumbnail.jpg')),
      runId: entry.name,
      ownerId: session.user.id,
    });
    if (video) videos.push(video);
  }

  videos.sort((left, right) => {
    const a = Date.parse(left.createdAt || '');
    const b = Date.parse(right.createdAt || '');
    return (Number.isFinite(b) ? b : 0) - (Number.isFinite(a) ? a : 0);
  });

  return jsonResult(200, { videos: videos.slice(0, 60), count: videos.length });
}
