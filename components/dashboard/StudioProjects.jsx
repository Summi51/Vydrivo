'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteProject,
  duplicateProject,
  listProjectSummaries,
  setCurrentProject,
} from '../../lib/project-draft.js';
import ProjectThumb from './ProjectThumb';
import StudioShell from './StudioShell';

const FILTERS = [
  { id: 'all', label: 'All projects', short: 'All' },
  { id: 'draft', label: 'Drafts', short: 'Drafts' },
  { id: 'planning', label: 'Planning / Storyboard', short: 'Planning' },
  { id: 'approved', label: 'Approved', short: 'Approved' },
  { id: 'generating', label: 'Generating', short: 'Generating' },
  { id: 'ready', label: 'Ready', short: 'Ready' },
  { id: 'failed', label: 'Failed', short: 'Failed' },
];

const STATUS = {
  draft: {
    label: 'Draft',
    badge: 'DRAFT',
    tone: 'draft',
    dot: 'bg-[#F59E0B]',
    meta: 'Storyboard not started',
    action: 'Edit brief',
  },
  planning: {
    label: 'Planning',
    badge: 'REVIEW',
    tone: 'planning',
    dot: 'bg-[#D946EF]',
    meta: 'Storyboard needs review',
    action: 'Review scenes',
  },
  approved: {
    label: 'Approved',
    badge: 'APPROVED',
    tone: 'approved',
    dot: 'bg-emerald-500',
    meta: 'Approved · generation gated',
    action: 'Review scenes',
  },
  generating: {
    label: 'Generating',
    badge: 'GENERATING',
    tone: 'generating',
    dot: 'bg-[#D946EF]',
    meta: 'Generation in progress',
    action: 'View status',
  },
  ready: {
    label: 'Ready',
    badge: 'READY',
    tone: 'ready',
    dot: 'bg-emerald-500',
    meta: 'Finished render',
    action: 'View status',
  },
  failed: {
    label: 'Failed',
    badge: 'FAILED',
    tone: 'failed',
    dot: 'bg-rose-500',
    meta: 'Render needs attention',
    action: 'View status',
  },
};

const STAT_STYLES = {
  all: 'bg-[#17131A]',
  draft: 'bg-[#F59E0B]',
  planning: 'bg-[#D946EF]',
  approved: 'bg-emerald-500',
  generating: 'bg-[#E879F9]',
  ready: 'bg-emerald-500',
  failed: 'bg-rose-500',
};

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function timeAgo(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Just now';
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

function projectMeta(project) {
  if (project.sceneCount) return `${project.sceneCount} scenes · ${formatDuration(project.seconds)}`;
  return `${project.format || 'Talking head / explainer'} · ${project.targetLabel || '60–90s'}`;
}

function ProjectMenu({ project, onOpen, onDuplicate, onDelete }) {
  const detailsRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (detailsRef.current && !detailsRef.current.contains(event.target)) {
        detailsRef.current.removeAttribute('open');
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') detailsRef.current?.removeAttribute('open');
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function closeMenu(event) {
    event.currentTarget.closest('details')?.removeAttribute('open');
  }
  return (
    <details ref={detailsRef} className="group relative">
      <summary
        aria-label={`Actions for ${project.title}`}
        className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 [&::-webkit-details-marker]:hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">more_vert</span>
      </summary>
      <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-[#E7E7EA] bg-white p-1.5 shadow-[0_16px_40px_rgba(23,19,26,0.16)]">
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onOpen(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[#4D4953] hover:bg-[#F8F5F7] hover:text-[#17131A]"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">open_in_new</span>
          Open project
        </button>
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onDuplicate(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[#4D4953] hover:bg-[#F8F5F7] hover:text-[#17131A]"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">content_copy</span>
          Duplicate
        </button>
        <div className="my-1 border-t border-[#F0EFF2]" />
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onDelete(project);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">delete</span>
          Delete project
        </button>
      </div>
    </details>
  );
}

function ProjectCard({ project, view, onOpen, onDuplicate, onDelete }) {
  const state = STATUS[project.state] || STATUS.draft;
  const title = (
    <button type="button" onClick={() => onOpen(project)} className="block max-w-full truncate text-left font-headline text-sm font-bold text-[#17131A] hover:text-[#C026D3]">
      {project.title}
    </button>
  );

  if (view === 'list') {
    return (
      <article className="flex flex-col gap-3 rounded-[22px] border border-[#E7E7EA] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:flex-row sm:items-center">
        <button type="button" onClick={() => onOpen(project)} aria-label={`Open ${project.title}`} className="relative w-full text-left sm:w-[210px] sm:shrink-0">
          <ProjectThumb
            formatId={project.formatId}
            badge={state.badge}
            tone={state.tone}
            duration={project.seconds ? formatDuration(project.seconds) : '—:—'}
          />
        </button>
        <div className="min-w-0 flex-1 px-1 sm:px-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0">{title}</div>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${state.dot}`} title={state.label} />
          </div>
          <p className="mt-1 truncate text-[11px] text-[#77747D]">{projectMeta(project)}</p>
          <p className="mt-1 text-[10px] text-[#A8A5AD]">{state.meta} · Updated {timeAgo(project.updatedAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 px-1 sm:px-0">
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#17131A] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#2A1728]"
          >
            {state.action}
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
          </button>
          <ProjectMenu project={project} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col rounded-[22px] border border-[#E7E7EA] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] transition hover:border-[#E9C7E2] hover:shadow-[0_14px_34px_rgba(43,16,53,0.08)]">
      <div className="relative">
        <button type="button" onClick={() => onOpen(project)} aria-label={`Open ${project.title}`} className="block w-full text-left">
          <ProjectThumb
            formatId={project.formatId}
            badge={state.badge}
            tone={state.tone}
            duration={project.seconds ? formatDuration(project.seconds) : '—:—'}
          />
        </button>
        <div className="absolute right-2 top-2">
          <ProjectMenu project={project} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">{title}</div>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${state.dot}`} title={state.label} />
        </div>
        <p className="mt-1 truncate text-[10px] text-[#8A8790]">{projectMeta(project)}</p>
        <p className="mt-1 text-[10px] text-[#A8A5AD]">{state.meta}</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F2F1F4] pt-2.5">
          <span className="text-[9px] text-[#A8A5AD]">Updated {timeAgo(project.updatedAt)}</span>
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C026D3] hover:text-[#A21CAF]"
          >
            {state.action}
            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[22px] border border-[#E7E7EA] bg-white p-2.5">
      <div className="aspect-[16/10] animate-pulse rounded-[18px] bg-[#F1F1F3]" />
      <div className="space-y-2 px-1 py-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#F1F1F3]" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#F7F7F8]" />
      </div>
    </div>
  );
}

function EmptyProjects({ filter, query, hasAny, onClear, onNew }) {
  const filterLabel = FILTERS.find((item) => item.id === filter)?.short || 'projects';
  const pipeline = ['generating', 'ready', 'failed'].includes(filter);
  const title = query
    ? `No projects match “${query}”`
    : hasAny
      ? `No ${filterLabel.toLowerCase()} projects`
      : 'Your first project starts here';
  const body = query
    ? 'Try a different title or topic, or clear the search to see every local project.'
    : !hasAny
      ? 'Create a brief in the studio. It appears here with an honest Draft state before any generation happens.'
      : pipeline
        ? 'This state appears only after the render pipeline is connected. No project is being generated right now.'
        : filter === 'planning'
          ? 'Request a storyboard from a draft review, then it will appear here for scene review.'
          : filter === 'approved'
            ? 'Approve an exact storyboard revision in a draft review, then it will appear here.'
            : 'Start a new project or clear the filter to see your other local projects.';
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#DDD9E1] bg-[#FAFAFB] px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#ECE8EF] bg-white text-[#A8A5AD] shadow-sm">
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{query ? 'search_off' : pipeline ? 'cloud_off' : 'video_library'}</span>
      </span>
      <h2 className="mt-3 font-headline text-base font-bold text-[#2A1728]">{title}</h2>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-[#8A8790]">{body}</p>
      {query || filter !== 'all' ? (
        <button type="button" onClick={onClear} className="mt-4 rounded-full border border-[#E5E5E8] bg-white px-4 py-2 text-[11px] font-semibold text-[#4D4953] hover:border-[#D8D5DC]">
          Clear filters
        </button>
      ) : (
        <button type="button" onClick={onNew} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#17131A] px-4 py-2 text-[11px] font-semibold text-white hover:bg-[#2A1728]">
          Start a project
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
        </button>
      )}
    </div>
  );
}

export default function StudioProjects({ user }) {
  const router = useRouter();
  const [projects, setProjects] = useState(undefined);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState('');

  function loadProjects() {
    try {
      setProjects(listProjectSummaries(window.sessionStorage));
      setError('');
    } catch {
      setProjects([]);
      setError('Could not read local project storage. Check this browser tab’s site-data permission and try again.');
    }
  }

  useEffect(() => {
    loadProjects();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProjects();
    };
    window.addEventListener('focus', loadProjects);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', loadProjects);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setVisibleCount(6);
  }, [query, filter, sort]);

  useEffect(() => {
    if (!deleteTarget) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setDeleteTarget(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteTarget]);

  const counts = useMemo(() => {
    const source = projects || [];
    return {
      all: source.length,
      draft: source.filter((project) => project.state === 'draft').length,
      planning: source.filter((project) => project.state === 'planning').length,
      approved: source.filter((project) => project.state === 'approved').length,
      generating: source.filter((project) => project.state === 'generating').length,
      ready: source.filter((project) => project.state === 'ready').length,
      failed: source.filter((project) => project.state === 'failed').length,
    };
  }, [projects]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (projects || [])
      .filter((project) => filter === 'all' || project.state === filter)
      .filter((project) => !needle || `${project.title} ${project.topic}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title);
        const first = Date.parse(a.updatedAt) || 0;
        const second = Date.parse(b.updatedAt) || 0;
        return sort === 'oldest' ? first - second : second - first;
      });
  }, [projects, filter, query, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasAny = counts.all > 0;
  const loading = projects === undefined;

  function newProject() {
    router.push('/app#create-video');
  }

  function openProject(project) {
    if (['generating', 'ready', 'failed'].includes(project.state)) {
      setNotice('Live generation, playback and retry are not connected in this local build.');
      return;
    }
    try {
      const selected = setCurrentProject(window.sessionStorage, project.id);
      if (!selected) throw new Error('Project not found');
      router.push('/projects/new');
    } catch {
      setNotice('This project could not be opened from local storage. Refresh and try again.');
    }
  }

  function duplicate(project) {
    try {
      const copy = duplicateProject(window.sessionStorage, project.id);
      loadProjects();
      setNotice(copy ? `Duplicated “${project.title}” in this browser tab.` : 'The project could not be duplicated.');
    } catch {
      setNotice('The project could not be duplicated from local storage.');
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    try {
      deleteProject(window.sessionStorage, deleteTarget.id);
      setDeleteTarget(null);
      loadProjects();
      setNotice('Project deleted from this browser tab.');
    } catch {
      setNotice('The project could not be deleted from local storage.');
    }
  }

  function clearFilters() {
    setQuery('');
    setFilter('all');
    setSort('updated');
  }

  const stats = [
    ['Total', 'all', counts.all],
    ['Drafts', 'draft', counts.draft],
    ['Planning / Review', 'planning', counts.planning],
    ['Approved', 'approved', counts.approved],
    ['Generating', 'generating', counts.generating],
    ['Ready', 'ready', counts.ready],
    ['Failed', 'failed', counts.failed],
  ];

  return (
    <StudioShell user={user} onNew={newProject} onNotice={setNotice} notice={notice}>
      <section aria-labelledby="projects-heading" className="rounded-[26px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6 lg:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 id="projects-heading" className="font-headline text-2xl font-extrabold tracking-[-0.045em] text-[#17131A] sm:text-3xl">Studio Projects</h1>
              <span className="rounded-full border border-[#F0C4E5] bg-[#FDF2F8] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#C026D3]">Production Hub</span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#77747D]">
              Generate a storyboard first. Narration and footage generation begin only after you review and approve the saved storyboard.
            </p>
          </div>
          <div className="flex w-full lg:w-auto">
            <label className="relative flex-1">
              <span className="sr-only">Search projects</span>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#A8A5AD]" aria-hidden="true">search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects by title or topic…"
                className="h-10 w-full rounded-full border border-[#E5E5E8] bg-[#FAFAFB] pl-10 pr-9 text-[11px] text-[#17131A] outline-none transition placeholder:text-[#A8A5AD] focus:border-[#E9C7E2] focus:bg-white focus:ring-2 focus:ring-[#D946EF]/15 sm:w-[285px]"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[#A8A5AD] hover:bg-[#F1F1F3] hover:text-[#4D4953]">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
                </button>
              ) : null}
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Project totals">
          {stats.map(([label, key, value]) => (
            <div key={key} className="inline-flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-3 py-1.5 text-[10px] font-medium text-[#5E5A64]">
              <span className={`h-1.5 w-1.5 rounded-full ${STAT_STYLES[key]}`} aria-hidden="true" />
              {label}
              <span className="font-mono text-[9px] font-semibold tabular-nums text-[#17131A]">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[26px] border border-[#E7E7EA] bg-white p-3 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1 xl:pb-0" role="tablist" aria-label="Project filters">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                    active ? 'border-[#17131A] bg-[#17131A] text-white' : 'border-[#E7E7EA] bg-white text-[#6E6974] hover:border-[#D8D5DC] hover:text-[#17131A]'
                  }`}
                >
                  {item.label}
                  <span className={`font-mono text-[9px] tabular-nums ${active ? 'text-white/55' : 'text-[#B8B5BC]'}`}>{counts[item.id]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-white pl-3 pr-7 py-1.5 text-[10px] text-[#6E6974]">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">sort</span>
              <span className="sr-only">Sort projects</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="max-w-[118px] appearance-none border-0 bg-transparent p-0 text-[10px] font-medium text-[#4D4953] outline-none">
                <option value="updated">Latest updated</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 text-[14px] text-[#A8A5AD]" aria-hidden="true">expand_more</span>
            </label>
            <div className="flex rounded-full border border-[#E7E7EA] bg-[#FAFAFB] p-0.5" role="group" aria-label="Project layout">
              <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`grid h-7 w-7 place-items-center rounded-full transition ${view === 'grid' ? 'bg-white text-[#17131A] shadow-sm' : 'text-[#A8A5AD] hover:text-[#17131A]'}`} title="Grid view">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">grid_view</span>
              </button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`grid h-7 w-7 place-items-center rounded-full transition ${view === 'list' ? 'bg-white text-[#17131A] shadow-sm' : 'text-[#A8A5AD] hover:text-[#17131A]'}`} title="List view">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">view_list</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#EFEFF1] bg-[#FAFAFB] px-3 py-2.5 text-[10px] leading-5 text-[#8A8790]">
          <span className="material-symbols-outlined mt-0.5 text-[15px] text-[#B8B5BC]" aria-hidden="true">database</span>
          <p>
            <span className="font-semibold text-[#4D4953]">Browser-tab projects.</span> Account persistence, live generation and downloads are not connected. Projects appear here after you create a brief in the studio.
          </p>
        </div>

        <div className="mt-4">
          {error ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-5 text-[#991B1B]">{error}</p>
              <button type="button" onClick={loadProjects} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#FCA5A5] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#991B1B]">
                Try again
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">refresh</span>
              </button>
            </div>
          ) : loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
            </div>
          ) : visible.length ? (
            <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'}>
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  view={view}
                  onOpen={openProject}
                  onDuplicate={duplicate}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid' : 'block'}>
              <EmptyProjects filter={filter} query={query} hasAny={hasAny} onClear={clearFilters} onNew={newProject} />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-[#F0EFF2] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-[#A8A5AD]">
            Showing <span className="font-semibold tabular-nums text-[#5E5A64]">{visible.length}</span> of <span className="font-semibold tabular-nums text-[#5E5A64]">{filtered.length}</span> projects
            {filter !== 'all' || query ? ' in this view' : ''} · Browser tab
          </p>
          {visible.length < filtered.length ? (
            <button type="button" onClick={() => setVisibleCount((count) => count + 6)} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E8] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#4D4953] hover:border-[#D8D5DC]">
              Load more projects
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">expand_more</span>
            </button>
          ) : null}
        </div>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#17131A]/35 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-project-title" aria-describedby="delete-project-description" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <div className="w-full max-w-md rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_24px_80px_rgba(23,19,26,0.3)] sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FEF2F2] text-[#B91C1C]">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">delete</span>
            </span>
            <h2 id="delete-project-title" className="mt-3 font-headline text-xl font-bold tracking-[-0.03em] text-[#17131A]">Delete this project?</h2>
            <p id="delete-project-description" className="mt-2 text-xs leading-5 text-[#77747D]">
              “{deleteTarget.title}” and its local storyboard will be removed from this browser tab. There is no server copy and this cannot be undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-[#E5E5E8] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#4D4953] hover:border-[#D8D5DC]" autoFocus>
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-[#B91C1C] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#991B1B]">
                Delete project
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioShell>
  );
}
