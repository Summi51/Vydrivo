'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMonthDayYear } from '../../lib/date-format.js';
import { CURRENT_PROJECT_KEY, getProject } from '../../lib/projects-client.js';
import { latestProjectVideo, publishReadiness } from '../../lib/publish-step.js';
import { apiRequest } from '../../lib/session-fetch.js';
import InstagramPublishDialog from './InstagramPublishDialog';
import ProjectSteps from './workspace/ProjectSteps';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function PublishWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [videos, setVideos] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [current, response] = await Promise.all([
          getProject(projectId),
          apiRequest('/api/v1/videos'),
        ]);
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) throw new Error(payload.error?.message || 'Could not load your videos.');
        setProject(current);
        setVideos(Array.isArray(payload.data?.videos) ? payload.data.videos : []);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || 'Could not load this project.');
        setProject(null);
        setVideos([]);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function markPublished(runId, permalink) {
    setVideos((current) => current.map((video) => (
      video.runId === runId ? { ...video, instagram: { permalink } } : video
    )));
    setDialogOpen(false);
    setNotice('Posted to Instagram.');
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={3} storyboardApproved={false} sectionLabel="Publish" purpleAmbient>
        <div className="h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419] sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={3} storyboardApproved={false} sectionLabel="Publish" purpleAmbient>
        <section className="rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">folder_off</span>
          </span>
          <h1 className="mt-4 font-landing text-2xl font-bold tracking-[-0.04em] text-[#F5F5F7]">Project not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">
            {loadError || 'This project was not found, or your account does not have access to it.'}
          </p>
          <Link
            href="/app/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[13px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/50"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to Studio Projects
          </Link>
        </section>
      </StudioShell>
    );
  }

  const approved = project.review?.approved === true;
  const video = latestProjectVideo(videos, project.id);
  const readiness = publishReadiness(video);
  const permalink = video?.instagram?.permalink || '';

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={3} storyboardApproved={approved} sectionLabel="Publish" purpleAmbient>
      <ProjectSteps projectId={project.id} active="publish" storyboardApproved={approved} videoReady={readiness !== 'missing'} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-2xl font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] text-balance sm:text-[36px]">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className={`inline-flex items-center gap-1.5 ${readiness === 'missing' ? 'text-[#FCD34D]' : 'text-[#6EE7B7]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${readiness === 'missing' ? 'bg-[#FBBF24]' : 'bg-[#34D399]'}`} aria-hidden="true" />
              {readiness === 'missing' ? 'No finished video yet' : 'Latest video ready'}
            </span>
            {video ? (
              <>
                <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
                <span className="text-[#5F5F6B]">{formatDuration(video.seconds)}</span>
                <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
                <span className="text-[#5F5F6B]">{video.voice === 'female' ? 'Female' : 'Male'} voice</span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-[12px] text-[#5F5F6B]">
            Share the finished video. Nothing posts automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${project.id}/video`}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
            Back to video
          </Link>
        </div>
      </div>

      {readiness === 'missing' ? (
        <section className="mt-5 rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">movie</span>
          </span>
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Nothing to publish yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">
            Render a video in the Video step first. The latest finished video appears here, ready to share.
          </p>
          <Link
            href={`/app/projects/${project.id}/video`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">movie</span>
            Go to Video step
          </Link>
        </section>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-full max-w-[300px] lg:mx-0">
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-[#2B2B35] bg-[#0B0B0F]">
              <video
                key={video.outputUrl}
                controls
                playsInline
                preload="auto"
                src={video.outputUrl}
                poster={video.thumbnailUrl || undefined}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="mt-3 rounded-2xl border border-[#26262E] bg-[#141419] px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-[#F5F5F7]">{video.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#777781]">
                {formatDuration(video.seconds)} · {video.language === 'english' ? 'English' : 'Hindi'} · {video.voice === 'female' ? 'Female' : 'Male'} voice
              </p>
              {video.createdAt ? (
                <p className="mt-1 text-[11px] text-[#5F5F6B]">Rendered {formatMonthDayYear(video.createdAt)}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#26262E] pt-3">
                <a
                  href={video.downloadUrl || video.outputUrl}
                  download
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
                  Download MP4
                </a>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#6EE7B7]">
                  <span className="h-1 w-1 rounded-full bg-[#34D399]" aria-hidden="true" />
                  {video.storage === 'cloud' ? 'Saved' : 'Local only'}
                </span>
              </div>
            </div>
          </div>

          <section className="studio-surface rounded-2xl border border-[#26262E] p-5 sm:p-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A9AA5]">Instagram</p>

            {readiness === 'posted' ? (
              <>
                <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Posted to Instagram</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#9A9AA5]">
                  This video is live as a public Reel on your connected account.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {permalink ? (
                    <a
                      href={permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
                    >
                      View post
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
                    </a>
                  ) : null}
                  {video.instagram?.updatedAt ? (
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">
                      {formatMonthDayYear(video.instagram.updatedAt)}
                    </span>
                  ) : null}
                </div>
                {permalink ? (
                  <p className="mt-3 break-all rounded-xl border border-[#26262E] bg-[#0F0F14] px-3 py-2 font-mono text-[11px] leading-5 text-[#777781]">
                    {permalink}
                  </p>
                ) : null}
              </>
            ) : readiness === 'local' ? (
              <>
                <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Save this video first</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#9A9AA5]">
                  Local-only videos need to be saved to the cloud before they can be posted to Instagram.
                </p>
                <Link
                  href="/app/videos"
                  className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cloud_upload</span>
                  Open Videos
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Post this Reel</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#9A9AA5]">
                  One public Reel from this finished video. You choose the caption and confirm before it goes live.
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">photo_camera</span>
                  Publish to Instagram
                </button>
              </>
            )}

            <p className="mt-5 border-t border-[#26262E] pt-4 text-[11px] leading-5 text-[#5F5F6B]">
              Reels only · one video at a time · nothing posts automatically. You can remove the post on Instagram at any time.
            </p>
          </section>
        </div>
      )}

      {dialogOpen && video ? (
        <InstagramPublishDialog
          video={video}
          onClose={() => setDialogOpen(false)}
          onPublished={markPublished}
        />
      ) : null}
    </StudioShell>
  );
}
