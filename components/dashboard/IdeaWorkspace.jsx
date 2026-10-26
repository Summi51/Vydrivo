'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CURRENT_PROJECT_KEY, getProject, suggestIdeas, updateProject } from '../../lib/projects-client.js';
import { createSerialQueue } from '../../lib/serial-queue.js';
import { DEFAULT_VOICE_PRESET, VOICE_OPTIONS, voiceOption } from '../../lib/voice-options.js';
import StudioShell from './StudioShell';
import ProjectSteps from './workspace/ProjectSteps';

const TOPIC_LIMIT = 2000;
const AUDIENCE_LIMIT = 500;
const NOTES_LIMIT = 20000;
const FEEDBACK_LIMIT = 1000;

function CharacterCount({ value, max }) {
  return (
    <span className="font-mono text-[9px] tabular-nums text-[#A8A5AD]">
      {value.length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

function SuggestionCard({ suggestion, index, expanded, onToggle, onUse }) {
  return (
    <article className="rounded-2xl border border-[#EFEFF1] bg-[#FAFAFB] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#C026D3]">
            Idea {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-1 font-headline text-sm font-bold leading-5 tracking-[-0.02em] text-[#17131A]">{suggestion.title}</h3>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#6E6974] transition hover:border-[#D8D5DC] hover:text-[#17131A]"
        >
          {expanded ? 'Hide idea' : 'Read idea'}
        </button>
      </div>

      <p className="mt-2 text-[11px] leading-5 text-[#5E5A64]">{suggestion.hook}</p>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-[#EFEFF1] pt-3">
          <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Angle</p>
            <p className="mt-1 text-[11px] leading-5 text-[#5E5A64]">{suggestion.angle}</p>
          </div>
          <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Outline</p>
            <ol className="mt-1 space-y-1.5">
              {suggestion.outline.map((line, lineIndex) => (
                <li key={`${suggestion.title}-${lineIndex}`} className="flex gap-2 text-[11px] leading-5 text-[#5E5A64]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#D946EF]" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Visual direction</p>
            <p className="mt-1 text-[11px] leading-5 text-[#5E5A64]">{suggestion.visualDirection}</p>
          </div>
          <div className="rounded-xl border border-[#F5D0E8] bg-[#FFF7FB] p-3">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#C026D3]">Sample 5s scene prompt</p>
            <p className="mt-1 text-[10px] leading-5 text-[#6E4A63]">{suggestion.sampleScenePrompt}</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onUse}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#17131A] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#2A1728]"
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">north_east</span>
        Use this idea
      </button>
    </article>
  );
}

export default function IdeaWorkspace({ user, projectId }) {
  const router = useRouter();
  const [project, setProject] = useState(undefined);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [notes, setNotes] = useState('');
  const [voicePreset, setVoicePreset] = useState(DEFAULT_VOICE_PRESET);
  const [showContext, setShowContext] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [continuing, setContinuing] = useState(false);
  const hydrated = useRef(false);
  const saveSeq = useRef(0);
  const skipNextSave = useRef(true);
  const writeQueue = useRef(null);
  if (!writeQueue.current) writeQueue.current = createSerialQueue();

  useEffect(() => {
    skipNextSave.current = true;
    let active = true;
    (async () => {
      try {
        const current = await getProject(projectId);
        if (!active) return;
        setProject(current);
        window.sessionStorage.setItem(CURRENT_PROJECT_KEY, current.id);
        setTopic(current.topic || '');
        setAudience(current.audience || '');
        setNotes(current.notes || '');
        setVoicePreset(current.voicePreset || DEFAULT_VOICE_PRESET);
        setShowContext(Boolean(current.audience || current.notes));
        setSaveStatus('saved');
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

  useEffect(() => {
    if (!hydrated.current || !project) return undefined;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    if (!topic.trim()) {
      setSaveStatus('idle');
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      const sequence = ++saveSeq.current;
      const payload = { topic: topic.trim(), audience, notes, voicePreset };
      setSaveStatus('saving');
      try {
        const saved = await writeQueue.current(() => updateProject(project.id, payload));
        if (sequence !== saveSeq.current) return;
        setProject(saved);
        setSaveStatus('saved');
      } catch (error) {
        if (sequence !== saveSeq.current) return;
        setSaveStatus('error');
        setNotice(error.message || 'Could not save this idea.');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [project?.id, topic, audience, notes, voicePreset]);

  async function persist({ announce = false } = {}) {
    if (!project) return null;
    if (!topic.trim()) {
      setNotice('Add a topic before saving.');
      return null;
    }
    const sequence = ++saveSeq.current;
    const payload = { topic: topic.trim(), audience, notes, voicePreset };
    setSaveStatus('saving');
    try {
      const saved = await writeQueue.current(() => updateProject(project.id, payload));
      if (sequence === saveSeq.current) {
        setProject(saved);
        setSaveStatus('saved');
        if (announce) setNotice('Idea saved.');
      }
      return saved;
    } catch (error) {
      setSaveStatus('error');
      setNotice(error.message || 'Could not save this idea.');
      return null;
    }
  }

  async function continueToStoryboard() {
    if (continuing) return;
    setContinuing(true);
    const saved = await persist();
    setContinuing(false);
    if (saved) router.push(`/app/projects/${project.id}`);
  }

  async function generateIdeas({ refine = false } = {}) {
    if (!project || suggestBusy) return;
    if (!topic.trim()) {
      setSuggestError('Add a topic first so the model has something to work with.');
      return;
    }
    setSuggestBusy(true);
    setSuggestError('');
    try {
      const data = await suggestIdeas(project.id, {
        topic: topic.trim(),
        audience,
        notes,
        feedback: refine ? feedback.trim() : '',
        previousSuggestions: refine ? suggestions : [],
      });
      setSuggestions(data.suggestions || []);
      setExpanded(new Set());
      if (refine) setFeedback('');
      setNotice(refine ? 'Suggestions refined. Review the new directions.' : 'Ideas ready. Choose one or ask for a change.');
    } catch (error) {
      setSuggestError(error.message || 'Idea suggestions failed.');
    } finally {
      setSuggestBusy(false);
    }
  }

  function useIdea(suggestion) {
    const title = suggestion.title.replace(/[.!?]+$/, '').trim();
    const nextTopic = `${title}. ${suggestion.angle}`.slice(0, TOPIC_LIMIT);
    setTopic(nextTopic);
    setNotice('Idea applied. Review it, then continue to storyboard.');
    window.setTimeout(() => {
      document.getElementById('idea-topic')?.focus({ preventScroll: true });
    }, 50);
  }

  function toggleSuggestion(index) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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

  const selectedVoice = voiceOption(voicePreset);
  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : 'Not saved';

  return (
    <StudioShell user={user} onNew={() => router.push('/app#create-video')} onNotice={setNotice} notice={notice}>
      <ProjectSteps projectId={project.id} active="idea" />

      <div className="flex flex-col justify-between gap-4 border-b border-[#E7E7EA] pb-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <Link href="/app/projects" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8A8790] transition hover:text-[#C026D3]">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_back</span>
            Studio Projects
          </Link>
          <h1 className="mt-2 font-headline text-3xl font-extrabold leading-[1.04] tracking-[-0.05em] text-[#17131A] sm:text-4xl">What&apos;s your idea?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77747D]">
            Start with a concept. Give it a little context. Make it yours.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-1 text-[10px] text-[#A8A5AD]" aria-live="polite">
            <span className={`h-1.5 w-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : saveStatus === 'error' ? 'bg-rose-500' : 'bg-[#F59E0B]'}`} />
            {saveLabel}
          </span>
          <button
            type="button"
            onClick={() => persist({ announce: true })}
            disabled={!topic.trim() || saveStatus === 'saving'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">save</span>
            Save now
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A8A5AD]">The idea</p>
                <h2 className="mt-1 font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">What would you like to explain?</h2>
              </div>
              <CharacterCount value={topic} max={TOPIC_LIMIT} />
            </div>
            <label htmlFor="idea-topic" className="sr-only">Topic</label>
            <textarea
              id="idea-topic"
              rows={6}
              maxLength={TOPIC_LIMIT}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setSuggestError('');
              }}
              placeholder="Explain RAM versus storage to beginners using a desk and filing cabinet analogy."
              className="mt-4 block w-full resize-y rounded-2xl border border-[#E7E7EA] bg-[#FAFAFB] px-4 py-3 text-[13px] leading-7 text-[#2A1728] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E879F9] focus:bg-white focus:ring-4 focus:ring-[#FCE7F3]"
            />
            <p className="mt-2 text-[10px] leading-5 text-[#A8A5AD]">
              A specific topic, a rough note or a question all work. The model will suggest directions; you decide what becomes the story.
            </p>

            <button
              type="button"
              onClick={() => setShowContext((current) => !current)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#6E6974] transition hover:border-[#D8D5DC] hover:text-[#17131A]"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{showContext ? 'remove' : 'add'}</span>
              {showContext ? 'Hide audience & notes' : 'Add audience & notes'}
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#B8B5BC]">Optional</span>
            </button>

            {showContext ? (
              <div className="mt-3 grid gap-3 rounded-2xl border border-[#EFEFF1] bg-[#FAFAFB] p-3 sm:p-4">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="idea-audience" className="text-[11px] font-semibold text-[#4D4953]">Audience</label>
                    <CharacterCount value={audience} max={AUDIENCE_LIMIT} />
                  </div>
                  <input
                    id="idea-audience"
                    type="text"
                    maxLength={AUDIENCE_LIMIT}
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    placeholder="e.g. beginner computer users"
                    className="mt-1.5 block w-full rounded-xl border border-[#E7E7EA] bg-white px-3 py-2 text-[12px] text-[#2A1728] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E879F9] focus:ring-4 focus:ring-[#FCE7F3]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="idea-notes" className="text-[11px] font-semibold text-[#4D4953]">Notes</label>
                    <CharacterCount value={notes} max={NOTES_LIMIT} />
                  </div>
                  <textarea
                    id="idea-notes"
                    rows={4}
                    maxLength={NOTES_LIMIT}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Paste reference notes, facts you want included, or a point of view to keep."
                    className="mt-1.5 block w-full resize-y rounded-xl border border-[#E7E7EA] bg-white px-3 py-2 text-[12px] leading-6 text-[#2A1728] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E879F9] focus:ring-4 focus:ring-[#FCE7F3]"
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A8A5AD]">The voice</p>
                <h2 className="mt-1 font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">A narrator for your story.</h2>
              </div>
              <span className="rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8A8790]">
                {selectedVoice.status === 'test' ? 'Test voice' : 'Unverified'}
              </span>
            </div>
            <label htmlFor="idea-voice" className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8790]">Narrator</label>
            <select
              id="idea-voice"
              value={voicePreset}
              onChange={(event) => setVoicePreset(event.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-[#E7E7EA] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#2A1728] outline-none transition focus:border-[#E879F9] focus:ring-4 focus:ring-[#FCE7F3]"
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice.id} value={voice.id}>{voice.label}</option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                title="Voice preview is not connected until narration is enabled."
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-3 py-1.5 text-[10px] font-semibold text-[#B8B5BC]"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">play_circle</span>
                Preview voice
              </button>
              <span className="text-[10px] leading-5 text-[#A8A5AD]">{selectedVoice.detail}</span>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-[#A8A5AD]">
              Selecting a voice saves your choice. It does not generate speech or guarantee synthesis access.
            </p>
          </section>

          <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A8A5AD]">Next step</p>
                <h2 className="mt-1 font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">Ready to see the story?</h2>
                <p className="mt-1 text-[11px] leading-5 text-[#8A8790]">Your script and visual plan come together in the storyboard step.</p>
              </div>
              <button
                type="button"
                onClick={continueToStoryboard}
                disabled={!topic.trim() || continuing}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#17131A] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#2A1728] disabled:cursor-not-allowed disabled:bg-[#E9E6EC] disabled:text-[#A8A5AD]"
              >
                {continuing ? 'Saving…' : 'Continue to storyboard'}
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-[#A8A5AD]">
              Changes save automatically. Keep this tab open until your changes are saved.
            </p>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[24px] border border-[#E7E7EA] bg-white p-5 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A8A5AD]">A little inspiration</p>
                <h2 className="mt-1 font-headline text-lg font-bold tracking-[-0.03em] text-[#17131A]">Explore an idea</h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FCE7F3] text-[#C026D3]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">auto_awesome</span>
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#77747D]">
              Ask for a few ways to explain your topic. You choose what becomes your draft.
            </p>
            <button
              type="button"
              onClick={() => generateIdeas()}
              disabled={!topic.trim() || suggestBusy}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D946EF] via-[#C026D3] to-[#A21CAF] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-[0_6px_18px_rgba(192,38,211,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">auto_awesome</span>
              {suggestBusy ? 'Thinking…' : suggestions.length ? 'Suggest again' : 'Suggest ideas'}
            </button>

            {suggestError ? (
              <p role="alert" className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[10px] leading-5 text-[#B91C1C]">{suggestError}</p>
            ) : null}

            {suggestBusy ? (
              <div className="mt-4 space-y-2" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-2xl border border-[#EFEFF1] bg-[#FAFAFB]" />
                ))}
              </div>
            ) : null}

            {!suggestBusy && suggestions.length ? (
              <div className="mt-4 space-y-3">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={`${suggestion.title}-${index}`}
                    suggestion={suggestion}
                    index={index}
                    expanded={expanded.has(index)}
                    onToggle={() => toggleSuggestion(index)}
                    onUse={() => useIdea(suggestion)}
                  />
                ))}
                <div className="rounded-2xl border border-[#EFEFF1] bg-[#FAFAFB] p-3">
                  <label htmlFor="idea-feedback" className="text-[10px] font-semibold text-[#4D4953]">Not quite right?</label>
                  <textarea
                    id="idea-feedback"
                    rows={2}
                    maxLength={FEEDBACK_LIMIT}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="e.g. Make it more beginner-friendly and use a kitchen analogy."
                    className="mt-1.5 block w-full resize-y rounded-xl border border-[#E7E7EA] bg-white px-3 py-2 text-[11px] leading-5 text-[#2A1728] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E879F9] focus:ring-4 focus:ring-[#FCE7F3]"
                  />
                  <button
                    type="button"
                    onClick={() => generateIdeas({ refine: true })}
                    disabled={!feedback.trim() || suggestBusy}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E5E8] bg-white px-3 py-2 text-[10px] font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                    Refine suggestions
                  </button>
                </div>
              </div>
            ) : null}

            {!suggestBusy && !suggestions.length ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#DDD9E1] bg-[#FAFAFB] px-4 py-6 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-[#C026D3] ring-1 ring-[#F5D0E8]">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">lightbulb</span>
                </span>
                <p className="mt-2 text-[11px] font-semibold text-[#5E5A64]">No suggestions yet</p>
                <p className="mt-1 text-[10px] leading-5 text-[#A8A5AD]">Add a topic, then ask for a few directions.</p>
              </div>
            ) : null}

            <p className="mt-3 text-[9px] leading-5 text-[#A8A5AD]">
              AI suggestions may be inaccurate. Review the facts, wording and visual direction before continuing.
            </p>
          </section>
        </aside>
      </div>
    </StudioShell>
  );
}
