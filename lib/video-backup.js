import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function backupVideos({ jobsDir, backupRoot, ownerId, now = new Date() }) {
  if (!ownerId) throw new Error('Owner is required.');
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const directory = path.join(backupRoot, `videos-${stamp}`);
  mkdirSync(directory, { recursive: true });

  let entries = [];
  try {
    entries = readdirSync(jobsDir, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const videos = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'locks') continue;
    const source = path.join(jobsDir, entry.name);
    const job = readJson(path.join(source, 'job.json'));
    const status = readJson(path.join(source, 'status.json'));
    const report = readJson(path.join(source, 'report.json'));
    const videoFile = path.join(source, 'output.mp4');
    if (!job || !status || !report || !existsSync(videoFile)) continue;
    if (status.state !== 'done' || job.testMode === true || job.ownerId !== ownerId) continue;

    const target = path.join(directory, entry.name);
    mkdirSync(target, { recursive: true });
    copyFileSync(videoFile, path.join(target, 'video.mp4'));
    if (existsSync(path.join(source, 'thumbnail.jpg'))) copyFileSync(path.join(source, 'thumbnail.jpg'), path.join(target, 'thumbnail.jpg'));
    if (existsSync(path.join(source, 'data.json'))) copyFileSync(path.join(source, 'data.json'), path.join(target, 'scene-text.json'));
    copyFileSync(path.join(source, 'job.json'), path.join(target, 'job.json'));
    copyFileSync(path.join(source, 'status.json'), path.join(target, 'status.json'));
    copyFileSync(path.join(source, 'report.json'), path.join(target, 'report.json'));

    videos.push({
      runId: entry.name,
      projectId: job.projectId,
      title: job.title,
      language: job.language,
      voice: job.voice,
      createdAt: job.createdAt,
      seconds: report.seconds,
      bytes: statSync(videoFile).size,
    });
  }

  writeFileSync(
    path.join(directory, 'manifest.json'),
    JSON.stringify({ createdAt: now.toISOString(), ownerId, videos }, null, 2),
  );

  return {
    directory,
    count: videos.length,
    bytes: videos.reduce((total, video) => total + video.bytes, 0),
    videos,
  };
}
