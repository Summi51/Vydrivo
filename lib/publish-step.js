// Small shared helpers for the project Publish step. The Videos API already
// returns the owner's videos newest first, so the latest completed render is the
// first matching project entry. A local-only render cannot be published until it
// is saved to cloud storage.
export function latestProjectVideo(videos, projectId) {
  if (!Array.isArray(videos) || !projectId) return null;
  return videos.find((video) => video?.projectId === projectId) || null;
}

export function publishReadiness(video) {
  if (!video) return 'missing';
  if (video.instagram) return 'posted';
  if (video.storage !== 'cloud') return 'local';
  return 'ready';
}
