'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/session-fetch.js';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function timeAgo(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recently';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString();
}

function VideoModal({ video, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div className="relative w-full max-w-[360px]" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -right-2 -top-11 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#141419] text-[#F5F5F7] transition hover:border-white/30 hover:bg-[#1B1B22]"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
        <video
          controls
          autoPlay
          playsInline
          src={video.outputUrl}
          className="max-h-[70vh] w-full rounded-2xl border border-[#2B2B35] bg-black object-contain"
        />
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#26262E] bg-[#141419] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#F5F5F7]">{video.title}</p>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#777781]">
              {formatDuration(video.seconds)} · {video.voice === 'female' ? 'Female' : 'Male'} voice
            </p>
          </div>
          <a
            href={video.outputUrl}
            download
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl border border-[#2B2B35] bg-[#1B1B22] px-3 py-2 text-[12px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StudioVideos({ user }) {
  const router = useRouter();
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    let alive = true;
    setVideos(null);
    setError('');
    (async () => {
      try {
        const response = await apiRequest('/api/v1/videos');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Could not load videos.');
        if (alive) setVideos(Array.isArray(payload.data?.videos) ? payload.data.videos : []);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError.message || 'Could not load videos.');
        setVideos([]);
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const count = videos?.length ?? 0;

  return (
    <StudioShell
      user={user}
      onNew={() => router.push('/app#create-video')}
      notice=""
      stage={2}
      sectionLabel="Videos"
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#777781]">Your studio</p>
          <h1 className="mt-1 font-landing text-[28px] font-bold leading-[1.05] tracking-[-0.05em] text-[#F5F5F7] sm:text-[34px]">Videos</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Finished renders from your projects. Only videos you generate appear here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#26262E] bg-[#141419] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-[#9A9AA5]">
            {videos === null ? 'Loading' : `${count} ${count === 1 ? 'video' : 'videos'}`}
          </span>
          <Link
            href="/app/projects"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">video_library</span>
            Projects
          </Link>
        </div>
      </section>

      {videos === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419]">
              <div className="aspect-[9/16] animate-pulse bg-[#1B1B22]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-4/5 animate-pulse rounded bg-[#26262E]" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-[#26262E]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <section className="mt-6 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/5 px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 text-[#FCA5A5]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">cloud_off</span>
          </span>
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Videos could not load</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Try again
          </button>
        </section>
      ) : videos.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">movie</span>
          </span>
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">No videos yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">
            Render an approved storyboard in the Video step. Your finished videos will appear here.
          </p>
          <Link
            href="/app/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Go to projects
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videos.map((video) => (
            <article key={video.runId} className="group overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419] transition hover:border-[#8B5CF6]/40">
              <button
                type="button"
                onClick={() => setActiveVideo(video)}
                aria-label={`Play ${video.title}`}
                className="relative block w-full overflow-hidden bg-[#0B0B0F] text-left"
              >
                <div className="aspect-[9/16] w-full">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#1B1B2A,#0B0B0F)]">
                      <span className="material-symbols-outlined text-[36px] text-[#5F5F6B]" aria-hidden="true">movie</span>
                    </div>
                  )}
                </div>
                <span className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#0B0B0F]">
                    <span className="material-symbols-outlined text-[26px]" aria-hidden="true">play_arrow</span>
                  </span>
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11px] font-semibold text-white backdrop-blur">
                  {formatDuration(video.seconds)}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C4B5FD] backdrop-blur">
                  {video.language === 'hindi' ? 'Hindi' : 'English'}
                </span>
              </button>
              <div className="p-4">
                <h2 className="truncate font-landing text-[15px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">{video.title}</h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">
                  {video.voice === 'female' ? 'Female voice' : 'Male voice'} · {timeAgo(video.createdAt)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveVideo(video)}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#2B2B35] bg-[#1B1B22] px-2.5 py-1.5 text-[12px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40"
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">play_arrow</span>
                    Play
                  </button>
                  <a
                    href={video.outputUrl}
                    download
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#2B2B35] bg-[#1B1B22] px-2.5 py-1.5 text-[12px] font-semibold text-[#F5F5F7] transition hover:border-[#8B5CF6]/40"
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
                    Download
                  </a>
                  <Link
                    href={`/app/projects/${video.projectId}/video`}
                    className="ml-auto inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white"
                  >
                    Project
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeVideo ? <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
    </StudioShell>
  );
}
