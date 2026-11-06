'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CURRENT_PROJECT_KEY, getProject } from '../../lib/projects-client.js';
import { apiRequest } from '../../lib/session-fetch.js';
import ProjectSteps from './workspace/ProjectSteps';
import StudioShell from './StudioShell';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function graphicsStateLabel(state) {
  if (state === 'queued') return 'Queued…';
  if (state === 'translating') return 'Translating the approved storyboard…';
  if (state === 'generating-narration') return 'Generating narration…';
  if (state === 'rendering') return 'Rendering diagrams and video…';
  if (state === 'done') return 'Video ready';
  if (state === 'error') return 'Render failed';
  return 'Starting…';
}

export default function VideoWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [graphicsLanguage, setGraphicsLanguage] = useState('hindi');
  const [graphicsVoice, setGraphicsVoice] = useState('male');
  const [graphicsJob, setGraphicsJob] = useState(null);
  const [graphicsError, setGraphicsError] = useState('');
  const [graphicsStarting, setGraphicsStarting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await getProject(projectId);
        if (!active) return;
        setProject(current);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
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

  useEffect(() => {
    if (!project?.id) return undefined;
    let active = true;
    (async () => {
      try {
        const response = await apiRequest(`/api/v1/projects/${project.id}/graphics-render`);
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload?.data?.runId) setGraphicsJob(payload.data);
      } catch {
        // No previous graphics render; the start action remains available.
      }
    })();
    return () => { active = false; };
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id || !graphicsJob?.runId || ['done', 'error'].includes(graphicsJob.state)) return undefined;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await apiRequest(`/api/v1/projects/${project.id}/graphics-render?runId=${encodeURIComponent(graphicsJob.runId)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload?.data) setGraphicsJob(payload.data);
      } catch {
        // Keep the last status; the next poll retries.
      }
    }, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [project?.id, graphicsJob?.runId, graphicsJob?.state]);

  async function startGraphicsRender() {
    if (!project || graphicsStarting) return;
    setGraphicsStarting(true);
    setGraphicsError('');
    try {
      const response = await apiRequest(`/api/v1/projects/${project.id}/graphics-render`, {
        method: 'POST',
        body: { language: graphicsLanguage, voice: graphicsVoice },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not start the graphics render.');
      setGraphicsJob({ ...payload.data, state: 'queued', progress: 0 });
      window.sessionStorage.setItem(`vydrivo.graphics-run.${project.id}`, payload.data.runId);
    } catch (error) {
      setGraphicsError(error.message || 'Could not start the graphics render.');
    } finally {
      setGraphicsStarting(false);
    }
  }

  if (project === undefined) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} storyboardApproved={false} sectionLabel="Video">
        <div className="h-72 animate-pulse rounded-2xl border border-[#26262E] bg-[#141419] sm:h-96" />
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} storyboardApproved={false} sectionLabel="Video">
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

  const scenes = Array.isArray(project.storyboard?.scenes) ? project.storyboard.scenes : [];
  const seconds = scenes.reduce((total, scene) => total + (Number(scene.estimatedSeconds) || 0), 0);
  const approved = project.review?.approved === true;

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} notice={notice} stage={2} storyboardApproved={approved} sectionLabel="Video">
      <ProjectSteps projectId={project.id} active="video" storyboardApproved={approved} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-2xl font-landing text-[26px] font-bold leading-[1.05] tracking-[-0.05em] text-[#F5F5F7] sm:text-[32px]">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className={`inline-flex items-center gap-1.5 ${approved ? 'text-[#6EE7B7]' : 'text-[#FCD34D]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`} aria-hidden="true" />
              {approved ? 'Storyboard approved' : 'Approval required'}
            </span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{scenes.length} scenes</span>
            <span className="text-[#3F3F4A]" aria-hidden="true">·</span>
            <span className="text-[#5F5F6B]">{formatDuration(seconds)}</span>
          </div>
          <p className="mt-1 text-[12px] text-[#5F5F6B]">
            {project.format} · {project.targetLabel} · {project.aspect}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${project.id}`}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-3.5 py-2 text-[13px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">dashboard_customize</span>
            Back to storyboard
          </Link>
          <button
            type="button"
            disabled
            title="Connect a text-to-video provider before generating footage."
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#1B1B22] px-3.5 py-2 text-[13px] font-semibold text-[#5F5F6B]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">movie</span>
            Generate footage
          </button>
        </div>
      </div>

      {!approved ? (
        <section className="mt-5 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5 sm:p-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCD34D]">Approval required</p>
          <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Approve the storyboard before footage work.</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
            Generation is gated on the exact approved revision. Review every scene, fix the validation warnings, then approve the storyboard.
          </p>
          <Link
            href={`/app/projects/${project.id}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED]"
          >
            Review storyboard
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Free graphics video</p>
                <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Render the approved storyboard with diagrams.</h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
                  Uses the approved scenes, Hindi/English narration and Remotion diagrams. This is motion graphics, not AI footage, and it uses the free voice allowance instead of a paid video provider.
                </p>
              </div>
              <span className="rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#C4B5FD]">
                No provider cost
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[150px_150px_auto] sm:items-end">
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Language</span>
                <select
                  value={graphicsLanguage}
                  onChange={(event) => setGraphicsLanguage(event.target.value)}
                  disabled={graphicsStarting || ['queued', 'translating', 'generating-narration', 'rendering'].includes(graphicsJob?.state)}
                  className="mt-1 w-full rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2 text-[13px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6] disabled:opacity-50"
                >
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Voice</span>
                <select
                  value={graphicsVoice}
                  onChange={(event) => setGraphicsVoice(event.target.value)}
                  disabled={graphicsStarting || ['queued', 'translating', 'generating-narration', 'rendering'].includes(graphicsJob?.state)}
                  className="mt-1 w-full rounded-lg border border-[#2B2B35] bg-[#0B0B0F] px-3 py-2 text-[13px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6] disabled:opacity-50"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <button
                type="button"
                onClick={startGraphicsRender}
                disabled={graphicsStarting || ['queued', 'translating', 'generating-narration', 'rendering'].includes(graphicsJob?.state)}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
                {graphicsStarting || ['queued', 'translating', 'generating-narration', 'rendering'].includes(graphicsJob?.state) ? 'Rendering…' : 'Render free graphics video'}
              </button>
            </div>

            {graphicsError ? (
              <p role="alert" className="mt-3 rounded-lg border border-[#F87171]/35 bg-[#F87171]/10 px-3 py-2 text-[13px] leading-5 text-[#FCA5A5]">{graphicsError}</p>
            ) : null}

            {graphicsJob ? (
              <div className="mt-4 rounded-xl border border-[#2B2B35] bg-[#0B0B0F] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className={graphicsJob.state === 'error' ? 'text-[#FCA5A5]' : graphicsJob.state === 'done' ? 'text-[#6EE7B7]' : 'text-[#C4B5FD]'}>
                    {graphicsStateLabel(graphicsJob.state)}
                  </span>
                  <span className="font-mono text-[12px] text-[#777781]">{graphicsJob.progress || 0}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#26262E]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={graphicsJob.progress || 0}>
                  <div className="h-full rounded-full bg-[#8B5CF6] transition-all" style={{ width: `${graphicsJob.progress || 0}%` }} />
                </div>
                {graphicsJob.state === 'error' && graphicsJob.message ? (
                  <p className="mt-2 text-[13px] leading-5 text-[#FCA5A5]">{graphicsJob.message}</p>
                ) : null}
                {graphicsJob.state === 'done' && graphicsJob.outputUrl ? (
                  <div className="mt-3">
                    <video controls src={graphicsJob.outputUrl} className="w-full rounded-lg border border-[#2B2B35] bg-black" />
                    <a href={graphicsJob.outputUrl} download className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] hover:text-white">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                      Download MP4
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="mt-5 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5 sm:p-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCD34D]">AI footage · provider required</p>
            <h2 className="mt-1 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Actual AI footage is a separate V1 path.</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9A9AA5]">
              The free graphics video above uses diagrams and narration. Actual AI footage still needs one text-to-video provider and an approved budget; no stock footage or animation is substituted for that gate.
            </p>
          </section>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              {scenes.map((scene, index) => (
                <article key={scene.id} className="rounded-2xl border border-[#26262E] bg-[#141419] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-md border border-[#26262E] bg-[#0B0B0F] font-mono text-[11px] font-bold text-[#C4B5FD]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="font-landing text-[15px] font-semibold text-[#F5F5F7]">{scene.title || `Scene ${index + 1}`}</p>
                        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">
                          {scene.visualKind === 'motion-graphics' ? 'Motion graphic' : 'AI footage'} · {scene.estimatedSeconds || 0}s
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[#26262E] bg-[#0B0B0F] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#9A9AA5]">
                      Footage not generated
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Narration</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#9A9AA5]">{scene.narration || 'No narration yet.'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#777781]">Visual prompt</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#9A9AA5]">{scene.visualPrompt || 'No visual prompt yet.'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[#26262E] bg-[#141419] p-5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777781]">Before generation</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    ['Storyboard approved', true],
                    ['Narration voice selected', Boolean(project.voicePreset)],
                    ['Text-to-video provider', false],
                    ['Approved spending budget', false],
                  ].map(([label, done]) => (
                    <li key={label} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="text-[#9A9AA5]">{label}</span>
                      <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${done ? 'text-[#6EE7B7]' : 'text-[#FCD34D]'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`} aria-hidden="true" />
                        {done ? 'Ready' : 'Missing'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-[#26262E] bg-[#141419] p-5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777781]">Next step</p>
                <h2 className="mt-2 font-landing text-base font-semibold tracking-[-0.02em] text-[#F5F5F7]">Connect a video provider</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#9A9AA5]">
                  Add one text-to-video provider key on the server and confirm a numeric budget. Provider keys never go in the browser or Git.
                </p>
                <Link href={`/app/projects/${project.id}`} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#C4B5FD] transition hover:text-white">
                  Review approved scenes
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                </Link>
              </section>
            </aside>
          </div>
        </>
      )}
    </StudioShell>
  );
}
