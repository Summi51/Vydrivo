import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { backupVideos } from './video-backup.js';

function makeJob(root, id, { ownerId = 'user-1', testMode = false, done = true } = {}) {
  const directory = path.join(root, id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'job.json'), JSON.stringify({ ownerId, projectId: 'project-1', title: `Video ${id}`, language: 'hindi', voice: 'male', testMode, createdAt: '2026-11-07T00:00:00.000Z' }));
  writeFileSync(path.join(directory, 'status.json'), JSON.stringify({ state: done ? 'done' : 'rendering', updatedAt: '2026-11-07T00:01:00.000Z' }));
  writeFileSync(path.join(directory, 'report.json'), JSON.stringify({ seconds: 84.5, width: 1080, height: 1920 }));
  writeFileSync(path.join(directory, 'output.mp4'), Buffer.from('fake-mp4'));
  writeFileSync(path.join(directory, 'thumbnail.jpg'), Buffer.from('fake-jpeg'));
}

test('backs up only the owner completed non-test videos', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vydrivo-backup-'));
  const jobs = path.join(root, 'jobs');
  const backups = path.join(root, 'backups');
  try {
    makeJob(jobs, 'run-1');
    makeJob(jobs, 'run-2', { testMode: true });
    makeJob(jobs, 'run-3', { ownerId: 'user-2' });
    makeJob(jobs, 'run-4', { done: false });

    const result = backupVideos({
      jobsDir: jobs,
      backupRoot: backups,
      ownerId: 'user-1',
      now: new Date('2026-11-07T10:00:00.000Z'),
    });

    assert.equal(result.count, 1);
    assert.equal(result.videos[0].runId, 'run-1');
    assert.equal(result.bytes, 8);
    assert.equal(existsSync(path.join(result.directory, 'run-1', 'video.mp4')), true);
    assert.equal(existsSync(path.join(result.directory, 'run-1', 'thumbnail.jpg')), true);
    assert.equal(existsSync(path.join(result.directory, 'run-2')), false);
    const manifest = JSON.parse(readFileSync(path.join(result.directory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.videos.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('creates an empty manifest when the owner has no completed videos', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vydrivo-backup-empty-'));
  try {
    const result = backupVideos({
      jobsDir: path.join(root, 'missing-jobs'),
      backupRoot: path.join(root, 'backups'),
      ownerId: 'user-1',
      now: new Date('2026-11-07T10:00:00.000Z'),
    });
    assert.equal(result.count, 0);
    assert.equal(existsSync(path.join(result.directory, 'manifest.json')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
