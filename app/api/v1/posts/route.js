import { verifiedAccess } from '../../../../lib/api-session.js';
import { errorResult, jsonResult } from '../../../../lib/auth-http.js';
import { isInstagramUnavailable, listInstagramPublishes } from '../../../../lib/instagram-repository.js';
import { publishedPosts } from '../../../../lib/posts.js';
import { listVideoRenders } from '../../../../lib/video-renders-repository.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await verifiedAccess(request);
  if (!session.ok) return errorResult(session.status, session.code, session.message);

  let publishes;
  try {
    publishes = await listInstagramPublishes(session.access);
  } catch (error) {
    if (isInstagramUnavailable(error)) {
      return errorResult(503, 'POSTS_UNAVAILABLE', 'Posts are not available on this server yet.');
    }
    return errorResult(502, 'POSTS_FAILED', 'Could not load your posts. Try again.');
  }

  // Video metadata is optional: a post still lists if its render row is gone.
  let videos = [];
  try {
    videos = await listVideoRenders(session.access);
  } catch {
    videos = [];
  }

  const posts = publishedPosts({ publishes, videos });
  return jsonResult(200, {
    posts,
    count: posts.length,
    schedulingAvailable: false,
  });
}
