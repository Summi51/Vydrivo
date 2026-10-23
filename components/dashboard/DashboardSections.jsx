'use client';

import Link from 'next/link';
import { useState } from 'react';

const MODE_THEMES = {
  'talking-head': 'from-[#DB2777] via-[#F472B6] to-[#FBBF24]',
  'product-teaser': 'from-[#7C3AED] via-[#D946EF] to-[#FB7185]',
  'feature-walkthrough': 'from-[#1D4ED8] via-[#06B6D4] to-[#34D399]',
  'social-reel': 'from-[#EA580C] via-[#F43F5E] to-[#EC4899]',
};

const STEPS = [
  { label: 'Script draft', icon: 'edit_note' },
  { label: 'Storyboard review', icon: 'dashboard_customize' },
  { label: 'Footage generation', icon: 'movie' },
  { label: 'MP4 export', icon: 'upload' },
];

function StepStrip({ hasDraft, hasStoryboard, reviewed }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((step, index) => {
        const state = index === 0
          ? hasDraft || hasStoryboard
            ? 'done'
            : 'next'
          : index === 1
            ? hasStoryboard && reviewed
              ? 'done'
              : hasDraft || hasStoryboard
                ? 'next'
                : 'idle'
            : hasDraft || hasStoryboard
              ? 'gated'
              : 'idle';
        const done = state === 'done';
        const next = state === 'next';
        const gated = state === 'gated';
        const label = index === 1 && done ? 'Approved' : done ? 'Saved' : next ? 'Next' : gated ? 'Gated' : 'Waiting';
        return (
          <div
            key={step.label}
            className={`rounded-xl border px-2.5 py-2.5 ${
              done
                ? 'border-[#BBF7D0] bg-[#F0FDF4]'
                : next
                  ? 'border-[#F5D0E8] bg-[#FFF7FB]'
                  : 'border-[#ECECEF] bg-[#FAFAFB]'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={`material-symbols-outlined text-[15px] ${done ? 'text-emerald-600' : next ? 'text-[#C026D3]' : 'text-[#B8B5BC]'}`} aria-hidden="true">
                {gated ? 'lock' : done ? 'check_circle' : step.icon}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-500' : next ? 'bg-[#D946EF]' : 'bg-[#D8D5DC]'}`} aria-hidden="true" />
            </div>
            <p className={`mt-1.5 text-[10px] font-semibold leading-4 ${gated ? 'text-[#A8A5AD]' : 'text-[#4D4953]'}`}>{step.label}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-[#A8A5AD]">{label}</p>
          </div>
        );
      })}
    </div>
  );
}

function ProjectThumb({ draft, reviewed = false }) {
  const theme = MODE_THEMES[draft.formatId] || MODE_THEMES['talking-head'];
  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-[18px] bg-gradient-to-br ${theme}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:16px_16px]"
      />
      <div aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/25" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full border border-white/20" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5">
        <span className="rounded-md bg-black/35 px-1.5 py-1 font-mono text-[9px] font-semibold text-white backdrop-blur-sm">9:16</span>
        <span className="rounded-md bg-white/20 px-1.5 py-1 font-mono text-[9px] font-semibold text-white backdrop-blur-sm">{reviewed ? 'REVIEWED' : 'DRAFT'}</span>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/40 bg-white/15 text-white shadow-lg backdrop-blur-sm">
          <span className="material-symbols-outlined ml-0.5 text-[23px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">play_arrow</span>
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <span className="rounded-md bg-black/25 px-1.5 py-1 font-mono text-[9px] font-semibold text-white/85 backdrop-blur-sm">LOCAL</span>
        <span className="font-mono text-[9px] font-semibold text-white/80">—:—</span>
      </div>
    </div>
  );
}

function EmptyProjects({ tab, onNew, onReset }) {
  const completed = tab === 'completed';
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#DDD9E1] bg-[#FAFAFB] px-6 py-11 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#ECE8EF] bg-white text-[#A8A5AD] shadow-sm">
        <span className="material-symbols-outlined text-[23px]" aria-hidden="true">{completed ? 'movie' : 'video_library'}</span>
      </span>
      <h3 className="mt-3 font-headline text-base font-bold text-[#2A1728]">
        {completed ? 'No completed videos yet' : 'Your first project starts above'}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#8A8790]">
        {completed
          ? 'Finished exports will appear here after a reviewed storyboard goes through the render pipeline.'
          : 'Create a storyboard draft to see it here. Nothing is generated or published automatically.'}
      </p>
      {completed ? (
        <button type="button" onClick={onReset} className="mt-4 text-xs font-semibold text-[#C026D3] hover:text-[#A21CAF]">
          Back to all projects
        </button>
      ) : (
        <button
          type="button"
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#17131A] px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2A1728]"
        >
          Start a project
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
        </button>
      )}
    </div>
  );
}

export default function DashboardSections({ draft, storyboard, onNew }) {
  const [tab, setTab] = useState('all');
  const loading = draft === undefined || storyboard === undefined;
  const hasDraft = Boolean(draft);
  const hasStoryboard = Boolean(storyboard?.storyboard?.scenes?.length);
  const reviewed = hasStoryboard && storyboard?.review?.approved === true;
  const hasWork = hasDraft || hasStoryboard;
  const sceneCount = Number(storyboard?.sceneCount || storyboard?.storyboard?.scenes?.length || 0);
  const seconds = Number(storyboard?.seconds || 0);
  const project = hasWork
    ? {
        title: draft?.title || storyboard?.storyboard?.title || 'Storyboard draft',
        format: draft?.format || 'Storyboard draft',
        formatId: draft?.formatId || 'talking-head',
        targetLabel: draft?.targetLabel || '60–90s',
        aspect: draft?.aspect || '9:16',
        createdAt: draft?.createdAt || 'storyboard',
        sceneCount,
        seconds,
        reviewed,
      }
    : null;
  const drafts = project ? [project] : [];
  const visible = tab === 'completed' ? [] : drafts;
  const counts = { all: drafts.length, completed: 0, drafts: drafts.length };
  const progress = hasStoryboard ? 'w-1/2' : hasDraft ? 'w-1/4' : 'w-0';
  const progressLabel = hasStoryboard ? '2 / 4' : hasDraft ? '1 / 4' : '0 / 4';
  const statusLabel = reviewed ? 'Reviewed' : hasStoryboard ? 'Storyboard' : hasDraft ? 'Brief' : 'Idle';
  const statusDetail = reviewed
    ? 'Storyboard approved · generation gated'
    : hasStoryboard
      ? 'Storyboard draft · review is next'
      : hasDraft
        ? 'Brief saved · storyboard is next'
        : 'No render in progress';

  return (
    <>
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]" aria-label="Workspace status">
        <article id="active-job" className="scroll-mt-24 rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#FCE7F3] to-[#F5D0FE] text-[#C026D3]">
                <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">bolt</span>
              </span>
              <div>
                <p className="font-headline text-[15px] font-bold tracking-[-0.02em] text-[#17131A]">Active job</p>
                <p className="mt-0.5 text-[11px] text-[#8A8790]">{statusDetail}</p>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${reviewed ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' : hasWork ? 'border-[#F5D0E8] bg-[#FFF7FB] text-[#C026D3]' : 'border-[#E7E7EA] bg-[#FAFAFB] text-[#8A8790]'}`}>
              {statusLabel}
            </span>
          </div>

          <p className="mt-4 max-w-xl text-xs leading-5 text-[#77747D]">
            {reviewed
              ? 'This exact storyboard revision is approved in this browser tab. Footage generation is still gated until the reviewed pipeline is connected.'
              : hasStoryboard
                ? 'A storyboard draft is ready. Review every scene, then approve the exact revision before generation can be wired in.'
                : hasDraft
                  ? 'Your topic is saved in this browser tab. Request a storyboard, then review every scene before generation.'
                  : 'The studio is ready for a topic. Nothing is generated until you review a storyboard and explicitly start the pipeline.'}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F1F3]" aria-hidden="true">
              <div className={`h-full rounded-full bg-gradient-to-r from-[#D946EF] to-[#F0839E] transition-all ${progress}`} />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-[#A8A5AD]">{progressLabel}</span>
          </div>

          <StepStrip hasDraft={hasDraft} hasStoryboard={hasStoryboard} reviewed={reviewed} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[#8A8790]">
              {reviewed
                ? 'Next: generation is gated until the footage pipeline is connected.'
                : hasStoryboard
                  ? 'Next: review and approve the storyboard.'
                  : hasDraft
                    ? 'Next: request a storyboard from the review page.'
                    : 'Next: start with a topic above.'}
            </p>
            {hasWork ? (
              <Link href="/projects/new" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C026D3] hover:text-[#A21CAF]">
                {hasStoryboard ? 'Review scenes' : 'Review brief'}
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
              </Link>
            ) : (
              <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C026D3] hover:text-[#A21CAF]">
                Start a project
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
              </button>
            )}
          </div>
        </article>

        <article id="drafts" className="scroll-mt-24 rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FEF3C7] text-[#B45309]">
                <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">edit_note</span>
              </span>
              <div>
                <p className="font-headline text-[15px] font-bold tracking-[-0.02em] text-[#17131A]">{reviewed ? 'Approved draft' : 'Drafts needing review'}</p>
                <p className="mt-0.5 text-[11px] text-[#8A8790]">{reviewed ? 'Approved locally · generation is still gated.' : 'A draft is not an account project yet.'}</p>
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${reviewed ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' : 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]'}`}>
              {loading ? '…' : reviewed ? 'Approved' : hasWork ? '1 pending' : '0 pending'}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 h-[136px] animate-pulse rounded-2xl bg-[#F7F7F8]" />
          ) : hasWork ? (
            <Link
              href="/projects/new"
              className={`group mt-4 block rounded-2xl border p-4 transition ${reviewed ? 'border-[#BBF7D0] bg-[#F7FEF9] hover:border-[#86EFAC]' : 'border-[#F5E3B8] bg-[#FFFCF4] hover:border-[#EBCB7A] hover:bg-[#FFF9EB]'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-full px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${reviewed ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
                  {reviewed ? 'Reviewed' : hasStoryboard ? 'Needs scene review' : 'Needs brief review'}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#B8A88B]">Local</span>
              </div>
              <p className="mt-2 truncate font-headline text-sm font-bold text-[#2A1728]">{project.title}</p>
              <p className="mt-1 text-[11px] text-[#8A7858]">
                {hasStoryboard
                  ? `${sceneCount} scenes · ${seconds}s · ${reviewed ? 'Reviewed' : 'Needs review'}`
                  : `${project.format} · ${project.targetLabel} · ${project.aspect}`}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#A69576]">Saved in this browser tab</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${reviewed ? 'text-[#166534] group-hover:text-[#14532D]' : 'text-[#B45309] group-hover:text-[#92400E]'}`}>
                  {hasStoryboard ? 'Review scenes' : 'Review brief'}
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                </span>
              </div>
            </Link>
          ) : (
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-[#E7E1D2] bg-[#FFFDF8] px-4 py-7 text-center">
              <span className="material-symbols-outlined text-[27px] text-[#D7C7A8]" aria-hidden="true">draft</span>
              <p className="mt-2 text-xs font-semibold text-[#6C5B3D]">No drafts waiting</p>
              <p className="mt-1 max-w-xs text-[11px] leading-5 text-[#A69576]">Start with a topic above. The draft will appear here for review before generation.</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#A8A5AD]">
            <span>Browser-only · no account project</span>
            <span className="font-mono uppercase tracking-[0.1em]">Local</span>
          </div>
        </article>
      </section>

      <section id="recent-projects" className="mt-5 scroll-mt-24 rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-headline text-xl font-bold tracking-[-0.035em] text-[#17131A]">Recent projects & completed videos</h2>
            <p className="mt-1 text-xs text-[#8A8790]">Your drafts and finished renders, all in one place. Nothing is published automatically.</p>
          </div>
          <div className="flex w-full gap-1 rounded-full border border-[#E7E7EA] bg-[#FAFAFB] p-1 sm:w-auto" role="tablist" aria-label="Project filters">
            {[
              ['all', 'All projects'],
              ['completed', 'Completed'],
              ['drafts', 'Drafts'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[10px] font-semibold transition sm:flex-none ${
                  tab === id ? 'bg-[#17131A] text-white shadow-sm' : 'text-[#77747D] hover:text-[#17131A]'
                }`}
              >
                {label}
                <span className={`ml-1.5 tabular-nums ${tab === id ? 'text-white/55' : 'text-[#B8B5BC]'}`}>{counts[id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="tabpanel">
          {loading ? (
            <div className="col-span-full h-40 animate-pulse rounded-[22px] bg-[#F7F7F8]" />
          ) : visible.length ? (
            <>
              {visible.map((project) => (
                <Link
                  key={project.createdAt}
                  href="/projects/new"
                  className="group rounded-[22px] border border-[#E7E7EA] bg-white p-2.5 transition hover:border-[#E9C7E2] hover:shadow-[0_12px_30px_rgba(43,16,53,0.08)]"
                >
                  <ProjectThumb draft={project} reviewed={project.reviewed} />
                  <div className="px-1 pb-1 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-headline text-sm font-bold text-[#17131A]">{project.title}</p>
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${project.reviewed ? 'bg-emerald-500' : 'bg-[#F59E0B]'}`} title={project.reviewed ? 'Reviewed storyboard' : 'Draft'} />
                    </div>
                    <p className="mt-1 text-[10px] text-[#8A8790]">
                      {hasStoryboard
                        ? `${sceneCount} scenes · ${seconds}s · ${project.reviewed ? 'Reviewed' : 'Draft'}`
                        : `${project.format || 'Talking head / explainer'} · ${project.targetLabel || '60–90s'} · Draft`}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#B8B5BC]">Browser tab</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C026D3] opacity-0 transition group-hover:opacity-100">
                        Open
                        <span className="material-symbols-outlined text-[13px]" aria-hidden="true">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              <button
                type="button"
                onClick={onNew}
                className="group flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#DDD9E1] bg-[#FAFAFB] p-5 text-center transition hover:border-[#E9C7E2] hover:bg-[#FFF9FC]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[#E7E7EA] bg-white text-[#8A8790] group-hover:text-[#C026D3]">
                  <span className="material-symbols-outlined text-[21px]" aria-hidden="true">add</span>
                </span>
                <span className="mt-3 text-xs font-semibold text-[#5E5A64]">Start another project</span>
                <span className="mt-1 text-[10px] text-[#A8A5AD]">Topic → reviewed storyboard → render</span>
              </button>
            </>
          ) : (
            <EmptyProjects tab={tab} onNew={onNew} onReset={() => setTab('all')} />
          )}
        </div>
      </section>
    </>
  );
}
