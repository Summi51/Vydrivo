const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function videoMetadata({ job, status, report, hasThumbnail, runId, ownerId }) {
  if (!job || typeof job !== 'object') return null;
  if (!ownerId || job.ownerId !== ownerId) return null;
  if (status?.state !== 'done') return null;
  if (job.testMode === true) return null;
  if (!UUID.test(job.projectId || '') || !UUID.test(runId || '')) return null;
  const seconds = Number(report?.seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  return {
    runId,
    projectId: job.projectId,
    title: typeof job.title === 'string' && job.title.trim() ? job.title.trim().slice(0, 160) : 'Untitled video',
    language: job.language === 'english' ? 'english' : 'hindi',
    voice: job.voice === 'female' ? 'female' : 'male',
    createdAt: typeof job.createdAt === 'string' ? job.createdAt : typeof status.updatedAt === 'string' ? status.updatedAt : null,
    seconds: Math.round(seconds * 10) / 10,
    width: Number(report.width) || 1080,
    height: Number(report.height) || 1920,
    thumbnailUrl: hasThumbnail ? `/api/v1/projects/${job.projectId}/graphics-render/${runId}/thumbnail` : null,
    outputUrl: `/api/v1/projects/${job.projectId}/graphics-render/${runId}/file`,
  };
}
