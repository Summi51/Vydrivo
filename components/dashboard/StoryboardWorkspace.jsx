'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createScene, duplicateScene, validateStoryboardDraft } from '../../lib/storyboard-editor.js';
import { createSerialQueue } from '../../lib/serial-queue.js';
import { CURRENT_PROJECT_KEY, getProject, saveProjectStoryboard } from '../../lib/projects-client.js';
import ProjectSteps from './workspace/ProjectSteps';
import SceneEditor from './workspace/SceneEditor';
import SceneRail from './workspace/SceneRail';
import StoryboardInspector from './workspace/StoryboardInspector';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function StoryboardWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState([]);
  const [review, setReview] = useState({ approved: false, storyboardHash: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const hydrated = useRef(false);
  const saveSeq = useRef(0);
  const skipNextSave = useRef(true);
  const writeQueue = useRef(null);
  if (!writeQueue.current) writeQueue.current = createSerialQueue();

  function resetReview() {
    setReview({ approved: false, storyboardHash: '' });
    setSaveStatus('saving');
  }

  useEffect(() => {
    skipNextSave.current = true;
    let active = true;
    (async () => {
      try {
        const current = await getProject(projectId);
        if (!active) return;
        setProject(current);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
        const savedScenes = Array.isArray(current.storyboard?.scenes) ? current.storyboard.scenes : [];
        setTitle(current.storyboard?.title || current.title);
        setScenes(savedScenes);
        setReview(current.review || { approved: false, storyboardHash: '' });
        setSelectedId(savedScenes[0]?.id || null);
        setSaveStatus(savedScenes.length ? 'saved' : 'idle');
        hydrated.current = true;
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || 'Could not load this project.');
        setProject(null);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => validateStoryboardDraft({ title, scenes }), [title, scenes]);
  const approved = review?.approved === true;
  const selectedIndex = Math.max(0, scenes.findIndex((scene) => scene.id === selectedId));
  const selectedScene = scenes.find((scene) => scene.id === selectedId) || scenes[0] || null;

  useEffect(() => {
    if (scenes.length && !scenes.some((scene) => scene.id === selectedId)) {
      setSelectedId(scenes[0].id);
    }
    if (!scenes.length && selectedId) setSelectedId(null);
  }, [scenes, selectedId]);

  function storyboardPayload() {
    return scenes.length
      ? { schemaVersion: 1, title: (title || project?.title || 'Untitled storyboard').trim(), scenes }
      : null;
  }

  useEffect(() => {
    if (!hydrated.current || !project) return undefined;
    if (review.approved) {
      skipNextSave.current = false;
      return undefined;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      const sequence = ++saveSeq.current;
      const payload = storyboardPayload();
      setSaveStatus('saving');
      try {
        const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
          storyboard: payload,
          approved: false,
        }));
        if (sequence !== saveSeq.current) return;
        setProject(saved);
        setSaveStatus('saved');
      } catch (error) {
        if (sequence !== saveSeq.current) return;
        setSaveStatus('error');
        setNotice(error.message || 'Could not save this storyboard.');
      }
    }, 500);
    return () => window.clearTimeout(timer);
    // storyboardPayload is derived from title/scenes/project; the dependency list is the autosave input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, title, scenes, review.approved]);

  async function saveNow() {
    if (!project) return;
    const sequence = ++saveSeq.current;
    const payload = storyboardPayload();
    const approved = review.approved === true;
    setSaveStatus('saving');
    try {
      const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
        storyboard: payload,
        approved,
      }));
      if (sequence !== saveSeq.current) return;
      setProject(saved);
      setReview(saved.review);
      setSaveStatus('saved');
      setNotice('Storyboard saved.');
    } catch (error) {
      if (sequence !== saveSeq.current) return;
      setSaveStatus('error');
      setNotice(error.message || 'Could not save this storyboard.');
    }
  }

  function updateScene(patch) {
    if (!selectedScene) return;
    setScenes((current) => current.map((scene) => (scene.id === selectedScene.id ? { ...scene, ...patch } : scene)));
    resetReview();
  }

  function addScene() {
    const scene = createScene(scenes);
    setScenes((current) => [...current, scene]);
    setSelectedId(scene.id);
    resetReview();
  }

  function duplicateSelected() {
    if (!selectedScene) return;
    const copy = duplicateScene(selectedScene, scenes);
    if (!copy) return;
    const index = scenes.findIndex((scene) => scene.id === selectedScene.id);
    setScenes((current) => [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]);
    setSelectedId(copy.id);
    resetReview();
  }

  function deleteSelected() {
    if (!selectedScene) return;
    const index = scenes.findIndex((scene) => scene.id === selectedScene.id);
    const next = scenes.filter((scene) => scene.id !== selectedScene.id);
    setScenes(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id || null);
    resetReview();
  }

  function moveSelected(direction) {
    if (!selectedScene) return;
    const index = scenes.findIndex((scene) => scene.id === selectedScene.id);
    const target = index + direction;
    if (target < 0 || target >= scenes.length) return;
    const next = [...scenes];
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
    resetReview();
  }

  async function approve() {
    if (!project) return;
    if (!stats.ok) {
      setNotice(stats.errors[0] || 'Fix the storyboard checks before approval.');
      return;
    }
    setApproving(true);
    setNotice('');
    saveSeq.current += 1;
    const payload = storyboardPayload();
    try {
      const saved = await writeQueue.current(() => saveProjectStoryboard(project.id, {
        storyboard: payload,
        approved: true,
      }));
      setProject(saved);
      setReview(saved.review);
      setSaveStatus('saved');
      setNotice('This exact storyboard revision is approved. Generation is still gated.');
    } catch (error) {
      setNotice(error.message || 'Storyboard approval failed.');
    } finally {
      setApproving(false);
    }
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice}>
        <div className="h-72 animate-pulse rounded-[26px] border border-[#E7E7EA] bg-white sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice}>
        <section className="rounded-[26px] border border-dashed border-[#DDD9E1] bg-white px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FCE7F3] text-[#C026D3]">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">folder_off</span>
          </span>
          <h1 className="mt-4 font-headline text-2xl font-extrabold tracking-[-0.04em] text-[#17131A]">Project not found</h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#77747D]">
            {loadError || 'This project was not found, or your account does not have access to it.'}
          </p>
          <Link href="/app/projects" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#17131A] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2A1728]">
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_back</span>
            Back to Studio Projects
          </Link>
        </section>
      </StudioShell>
    );
  }

  const statusLabel = !scenes.length ? 'Draft' : approved ? 'Approved' : stats.ok ? 'Needs approval' : 'Draft';
  const statusClass = approved
    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
    : scenes.length
      ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]'
      : 'border-[#E7E7EA] bg-[#FAFAFB] text-[#8A8790]';
  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Autosaved' : saveStatus === 'error' ? 'Save failed' : 'Not saved';

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice}>
      <ProjectSteps projectId={project.id} active="storyboard" />
      <div className="flex flex-col justify-between gap-4 border-b border-[#E7E7EA] pb-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <Link href="/app/projects" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8A8790] transition hover:text-[#C026D3]">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_back</span>
            Studio Projects
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="max-w-3xl font-headline text-2xl font-extrabold leading-[1.05] tracking-[-0.045em] text-[#17131A] sm:text-3xl">{project.title}</h1>
            <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${statusClass}`}>{statusLabel}</span>
            <span className="rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 font-mono text-[9px] text-[#8A8790]">{scenes.length} scenes</span>
            <span className="rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 font-mono text-[9px] text-[#8A8790]">{formatDuration(stats.totalSeconds)}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#8A8790]">{project.format} · {project.targetLabel} · {project.aspect} · Supabase project</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-1 text-[10px] text-[#A8A5AD]" aria-live="polite">
            <span className={`h-1.5 w-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : saveStatus === 'error' ? 'bg-rose-500' : 'bg-[#F59E0B]'}`} />
            {saveLabel}
          </span>
          <Link
            href={`/app/projects/${project.id}/idea`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit_note</span>
            Edit idea
          </Link>
          <button
            type="button"
            onClick={saveNow}
            disabled={!scenes.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">save</span>
            Save draft
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={!stats.ok || approved || approving}
            title={!stats.ok ? (stats.errors[0] || 'Fix the storyboard checks first.') : approved ? 'This revision is approved.' : 'Approve this exact revision.'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#17131A] px-3.5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#2A1728] disabled:cursor-not-allowed disabled:bg-[#E9E6EC] disabled:text-[#A8A5AD]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{approved ? 'check_circle' : 'fact_check'}</span>
            {approved ? 'Approved' : approving ? 'Approving…' : 'Approve storyboard'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)_300px]">
        <SceneRail scenes={scenes} selectedId={selectedScene?.id || null} onSelect={setSelectedId} onAdd={addScene} />
        <SceneEditor
          project={project}
          scene={selectedScene}
          index={selectedIndex}
          total={scenes.length}
          onAdd={addScene}
          onChange={updateScene}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onMove={moveSelected}
        />
        <StoryboardInspector project={project} stats={stats} review={review} />
      </div>
    </StudioShell>
  );
}
