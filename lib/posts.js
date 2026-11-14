// Published-post cards for the Posts page. Publish rows are the source of truth;
// video metadata adds the real thumbnail/title when the render still exists.
export function publishedPosts({ publishes = [], videos = [] } = {}) {
  const byRun = new Map(
    (Array.isArray(videos) ? videos : [])
      .filter((video) => video?.runId)
      .map((video) => [video.runId, video]),
  );

  return (Array.isArray(publishes) ? publishes : [])
    .filter((publish) => publish?.status === 'published')
    .map((publish) => {
      const video = byRun.get(publish.runId) || null;
      return {
        runId: publish.runId,
        projectId: publish.projectId || video?.projectId || null,
        title: video?.title || publish.caption || 'Instagram Reel',
        caption: publish.caption || '',
        permalink: publish.permalink || null,
        postedAt: publish.updatedAt || publish.createdAt || null,
        seconds: video ? Number(video.seconds) || 0 : null,
        thumbnailUrl: video?.thumbnailUrl || null,
      };
    })
    .sort((left, right) => {
      const a = Date.parse(left.postedAt || '');
      const b = Date.parse(right.postedAt || '');
      return (Number.isFinite(b) ? b : 0) - (Number.isFinite(a) ? a : 0);
    });
}
