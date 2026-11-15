'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMonthDayYear } from '../../lib/date-format.js';
import { apiRequest } from '../../lib/session-fetch.js';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function StudioPosts({ user }) {
  const router = useRouter();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setPosts(null);
    setError('');
    (async () => {
      try {
        const response = await apiRequest('/api/v1/posts');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Could not load posts.');
        if (alive) setPosts(Array.isArray(payload.data?.posts) ? payload.data.posts : []);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError.message || 'Could not load posts.');
        setPosts([]);
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const count = posts?.length ?? 0;

  return (
    <StudioShell
      user={user}
      onNew={() => router.push('/app#create-video')}
      notice=""
      sectionLabel="Posts"
      showStages={false}
      purpleAmbient
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9A9AA5]">Your studio</p>
          <h1 className="mt-1 font-landing text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-[#F5F5F7] sm:text-[36px]">Posts</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Public Reels posted from your projects. Nothing is posted automatically.
          </p>
        </div>
        {posts && !error ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#26262E] bg-[#141419] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9A9AA5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" aria-hidden="true" />
            {count} published
          </span>
        ) : null}
      </section>

      <p className="mt-4 rounded-xl border border-[#26262E] bg-[#0F0F14] px-3 py-2 text-[12px] leading-5 text-[#777781]">
        Scheduling is not available yet. This page lists posts that are already live.
      </p>

      {posts === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
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
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Posts could not load</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Try again
          </button>
        </section>
      ) : posts.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-[#2B2B35] bg-[#0F0F14] px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#26262E] bg-[#141419] text-[#777781]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">photo_camera</span>
          </span>
          <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">No posts yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#9A9AA5]">
            Publish a finished video as a public Reel from a project&apos;s Publish step or from the Videos page.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/app/videos"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">movie</span>
              Open Videos
            </Link>
            <Link
              href="/app/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">settings</span>
              Check connection
            </Link>
          </div>
        </section>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const posted = post.permalink ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${post.title} on Instagram`}
                className="relative block overflow-hidden bg-[#0B0B0F]"
              >
                <div className="aspect-[9/16] w-full">
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" loading="lazy" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-[#5F5F6B]">
                      <span className="material-symbols-outlined text-[30px]" aria-hidden="true">photo_camera</span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Instagram Reel</span>
                    </div>
                  )}
                </div>
                {post.seconds ? (
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-[#F5F5F7]">
                    {formatDuration(post.seconds)}
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-[12px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  View on Instagram
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_new</span>
                </span>
              </a>
            ) : (
              <div className="relative block overflow-hidden bg-[#0B0B0F]">
                <div className="aspect-[9/16] w-full">
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-[#5F5F6B]">
                      <span className="material-symbols-outlined text-[30px]" aria-hidden="true">photo_camera</span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Instagram Reel</span>
                    </div>
                  )}
                </div>
                {post.seconds ? (
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-[#F5F5F7]">
                    {formatDuration(post.seconds)}
                  </span>
                ) : null}
              </div>
            );

            return (
              <article key={post.runId} className="group overflow-hidden rounded-2xl border border-[#26262E] bg-[#141419] transition hover:border-[#8B5CF6]/40">
                {posted}
                <div className="p-4">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-[#F5F5F7]" title={post.caption || post.title}>
                    {post.title}
                  </p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#777781]">
                    Published {formatMonthDayYear(post.postedAt) || 'recently'}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#26262E] pt-3">
                    {post.projectId ? (
                      <Link
                        href={`/app/projects/${post.projectId}/publish`}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#9A9AA5] transition hover:text-[#F5F5F7]"
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">folder_open</span>
                        Project
                      </Link>
                    ) : <span />}
                    {post.permalink ? (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white"
                      >
                        View post
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_new</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </StudioShell>
  );
}
