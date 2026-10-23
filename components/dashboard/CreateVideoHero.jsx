'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { draftFromTopic, saveDraft, TOPIC_LIMIT } from '../../lib/project-draft.js';

const MODES = [
  {
    id: 'talking-head',
    label: 'Talking Head / Explainer',
    short: 'Explainer',
    icon: 'record_voice_over',
    placeholder: 'e.g. Why modern creative teams lose the thread between a rough idea and a finished cut — and a three-step way to keep the story intact.',
  },
  {
    id: 'product-teaser',
    label: 'Product Teaser',
    short: 'Teaser',
    icon: 'auto_awesome',
    placeholder: 'e.g. Tease the one feature that turns a rough note into a reviewed, finished vertical video without rebuilding the whole project.',
  },
  {
    id: 'feature-walkthrough',
    label: 'Feature Walkthrough',
    short: 'Walkthrough',
    icon: 'view_carousel',
    placeholder: 'e.g. Walk through scene revision: change one scene card, keep the narration and captions, and render only that shot again.',
  },
  {
    id: 'social-reel',
    label: 'Social Reel (9:16)',
    short: 'Reel',
    icon: 'smartphone',
    placeholder: 'e.g. Three signs your content workflow is slowing you down, and the small change that gets a rough idea to the phone faster.',
  },
];

const TARGET_LABEL = '60–90s';
const ASPECT_LABEL = '9:16 Vertical';

export default function CreateVideoHero({ draft, onSaved }) {
  const router = useRouter();
  const [modeId, setModeId] = useState('talking-head');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const mode = MODES.find((item) => item.id === modeId) || MODES[0];

  function submit(event) {
    event.preventDefault();
    setError('');
    const result = draftFromTopic(topic, {
      format: mode.label,
      formatId: mode.id,
      targetSeconds: 90,
      targetLabel: TARGET_LABEL,
      aspect: '9:16',
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      setBusy(true);
      saveDraft(window.sessionStorage, result.draft);
      onSaved(result.draft);
      router.push('/projects/new');
    } catch {
      setBusy(false);
      setError('This browser blocked local draft storage. Check site storage permissions and try again.');
    }
  }

  return (
    <section
      aria-labelledby="create-video-heading"
      className="relative overflow-hidden rounded-[28px] border border-[#2B1035] bg-[#190821] px-4 py-8 shadow-[0_24px_70px_rgba(43,16,53,0.18)] sm:px-8 sm:py-11 lg:px-12 lg:py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(217,70,239,0.5),transparent_48%),radial-gradient(circle_at_92%_86%,rgba(124,58,237,0.3),transparent_40%),linear-gradient(145deg,#240A2D_0%,#16071D_60%,#0D0612_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.9px,transparent_0.9px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_12%,transparent_72%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-[#D946EF]/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#7C3AED]/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl text-center">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-[#F0ABFC]">Storyboard-first video studio</p>
        <h1
          id="create-video-heading"
          className="mx-auto mt-3 max-w-3xl font-headline text-[32px] font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-[46px] lg:text-[52px]"
        >
          What video are we creating today?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-[15px]">
          Turn talking points, rough notes, or topics into a structured visual storyboard. Review every scene before anything is generated.
        </p>

        <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-2 lg:flex-nowrap" role="group" aria-label="Video format">
          {MODES.map((item) => {
            const active = item.id === modeId;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setModeId(item.id);
                  setError('');
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition sm:px-4 sm:text-xs ${
                  active
                    ? 'border-white bg-white text-[#2A1728] shadow-[0_5px_18px_rgba(0,0,0,0.18)]'
                    : 'border-white/10 bg-white/[0.055] text-white/70 hover:border-white/20 hover:bg-white/[0.09] hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined text-[16px] ${active ? 'text-[#C026D3]' : 'text-white/50'}`} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={submit}
          className="mx-auto mt-7 max-w-4xl rounded-[22px] border border-white/15 bg-[#120817]/80 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl transition focus-within:border-[#E879F9]/70 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_3px_rgba(217,70,239,0.12),0_24px_60px_rgba(0,0,0,0.24)] sm:p-4"
        >
          <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
            <label htmlFor="topic-input" className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-white/50">
              Topic or pasted notes
            </label>
            <span className="font-mono text-[9px] tabular-nums text-white/30">{topic.length.toLocaleString()} / {TOPIC_LIMIT.toLocaleString()}</span>
          </div>
          <textarea
            id="topic-input"
            rows={4}
            maxLength={TOPIC_LIMIT}
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              setError('');
            }}
            placeholder={mode.placeholder}
            className="block min-h-[112px] w-full resize-none border-0 bg-transparent px-2 py-2 font-body text-[14px] leading-7 text-white outline-none placeholder:text-white/30 focus:ring-0 sm:min-h-[120px] sm:text-[15px]"
          />
          <div className="mt-2 flex flex-col gap-3 border-t border-white/10 px-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-[10px] text-white/50"
                title="V1 exports are 60–90 seconds."
              >
                <span className="material-symbols-outlined text-[14px] text-[#F0ABFC]" aria-hidden="true">timer</span>
                Target: {TARGET_LABEL}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-[10px] text-white/50"
                title="V1 exports are 1080 × 1920 vertical."
              >
                <span className="material-symbols-outlined text-[14px] text-[#F0ABFC]" aria-hidden="true">aspect_ratio</span>
                {ASPECT_LABEL}
              </span>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="group inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] via-[#C026D3] to-[#A21CAF] px-4 py-2.5 font-headline text-sm font-bold text-white shadow-[0_8px_24px_rgba(192,38,211,0.28)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#190821] active:scale-[0.99] disabled:cursor-wait disabled:opacity-75"
            >
              {busy ? 'Saving draft…' : 'Create storyboard draft'}
              <span className="material-symbols-outlined text-[17px] transition-transform group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </form>

        <div className="mt-3 flex min-h-5 items-center justify-center gap-2 px-2 text-center">
          {error ? (
            <p role="alert" className="text-xs font-medium text-rose-300">{error}</p>
          ) : (
            <p className="text-[11px] leading-5 text-white/40">
              Saves a local draft for review. Live storyboard generation stays gated until the reviewed pipeline is connected.
            </p>
          )}
        </div>

        {draft ? (
          <p className="mt-1 text-[11px] text-white/40">
            A draft is already waiting below{draft.title ? `: ${draft.title}` : ''}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
