import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedPosts } from './posts.js';

const RUN = '7f0410f2-e158-4f15-baad-93849136c2ba';
const PROJECT = '8b5ac7d7-1895-45ca-86ce-20a1f52dddd6';

test('only published rows become posts, with video title, duration and thumbnail', () => {
  const posts = publishedPosts({
    publishes: [
      { runId: RUN, projectId: PROJECT, caption: 'Caption text', status: 'published', permalink: 'https://www.instagram.com/reel/x/', updatedAt: '2026-11-14T12:42:08Z' },
      { runId: 'processing', projectId: PROJECT, status: 'processing' },
      { runId: 'failed', projectId: PROJECT, status: 'failed' },
    ],
    videos: [
      { runId: RUN, title: 'Why teams lose the thread', seconds: 70.4, thumbnailUrl: '/thumb.jpg' },
    ],
  });
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0], {
    runId: RUN,
    projectId: PROJECT,
    title: 'Why teams lose the thread',
    caption: 'Caption text',
    permalink: 'https://www.instagram.com/reel/x/',
    postedAt: '2026-11-14T12:42:08Z',
    seconds: 70.4,
    thumbnailUrl: '/thumb.jpg',
  });
});

test('a missing render falls back to the caption and keeps the post link', () => {
  const posts = publishedPosts({
    publishes: [
      { runId: 'gone', projectId: PROJECT, caption: 'Kept caption', status: 'published', permalink: 'https://www.instagram.com/reel/y/' },
    ],
    videos: [],
  });
  assert.equal(posts.length, 1);
  assert.equal(posts[0].title, 'Kept caption');
  assert.equal(posts[0].seconds, null);
  assert.equal(posts[0].thumbnailUrl, null);
  assert.equal(posts[0].projectId, PROJECT);
});

test('posts are sorted newest first and empty input is safe', () => {
  const posts = publishedPosts({
    publishes: [
      { runId: 'old', status: 'published', updatedAt: '2026-11-10T10:00:00Z' },
      { runId: 'new', status: 'published', updatedAt: '2026-11-14T10:00:00Z' },
    ],
  });
  assert.deepEqual(posts.map((post) => post.runId), ['new', 'old']);
  assert.deepEqual(publishedPosts(), []);
  assert.deepEqual(publishedPosts({ publishes: null, videos: null }), []);
});
