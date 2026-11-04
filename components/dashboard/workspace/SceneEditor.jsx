'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function ScenePreview({ project, scene, index }) {
  const vertical = (project.aspect || '9:16') === '9:16';
  return (
    <div className="mx-auto w-full max-w-[190px]">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-[#26262E] bg-[#0B0B0F]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(139,92,246,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.18)_1px,transparent_1px)] [background-size:33.33%_33.33%]"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="rounded border border-[#26262E] bg-[#141419] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#9A9AA5]">
            {vertical ? '9:16 VERTICAL' : project.aspect || '9:16'}
          </span>
          <span className="rounded border border-[#26262E] bg-[#141419] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#5F5F6B]">
            SAFE ZONE
          </span>
        </div>

        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg border border-dashed border-[#8B5CF6]/45 bg-[#141419]/60 px-2 py-4 text-center">
          <span className="material-symbols-outlined text-[20px] text-[#C4B5FD]" aria-hidden="true">
            {scene.visualKind === 'motion-graphics' ? 'palette' : 'videocam'}
          </span>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9A9AA5]">Camera beat</p>
        </div>

        <div className="absolute inset-x-4 bottom-7">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-[#5F5F6B]">
            <span>Caption area</span>
            <span>Synced</span>
          </div>
          <div className="mt-1 space-y-1">
            <span className="block h-1 w-full rounded-full bg-[#2B2B35]" />
            <span className="block h-1 w-2/3 rounded-full bg-[#2B2B35]" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-[#26262E] bg-[#0B0B0F]/90 px-2 py-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">Layout guide · not rendered footage</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">
        <span>1080 × 1920</span>
        <span>{String(index + 1).padStart(2, '0')} · {scene.estimatedSeconds || 0}s</span>
      </div>
    </div>
  );
}

export default function SceneEditor({ project, scene, index, total, onAdd, onGenerate, generating, onChange, onDuplicate, onDelete, onMove }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [scene?.id]);

  if (!scene) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-[#26262E] bg-[#141419] p-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-xl border border-[#26262E] bg-[#0B0B0F] text-[#C4B5FD]">
          <span className="material-symbols-outlined text-[27px]" aria-hidden="true">dashboard_customize</span>
        </span>
        <h2 className="mt-4 font-landing text-xl font-bold tracking-[-0.03em] text-[#F5F5F7]">Start the storyboard</h2>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-[#9A9AA5]">
          Generate a candidate from your saved topic, or add a scene and write the narration and visual intent yourself.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating || !project.topic}
              title={project.topic ? 'Generate a storyboard candidate.' : 'Add a topic in the idea step first.'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
              {generating ? 'Generating…' : 'Generate storyboard'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition ${
              onGenerate
                ? 'border border-[#2B2B35] bg-[#141419] text-[#9A9AA5] hover:border-[#3B3B47] hover:text-[#F5F5F7]'
                : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
            Add first scene
          </button>
          <Link
            href={`/app/projects/${project.id}/idea`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2B2B35] bg-[#141419] px-4 py-2.5 text-[14px] font-semibold text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_note</span>
            Open idea step
          </Link>
        </div>
        <p className="mt-4 max-w-sm text-[13px] leading-5 text-[#5F5F6B]">
          Generation uses the saved topic and audience/notes. Review and edit every scene before approval.
        </p>
      </section>
    );
  }

  const seconds = Number(scene.estimatedSeconds) || 0;

  return (
    <section className="min-w-0 self-start rounded-2xl border border-[#26262E] bg-[#141419] p-4 sm:p-5" aria-labelledby="scene-editor-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#777781]">
            Scene {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}
          </p>
          <h2 id="scene-editor-heading" className="mt-1 font-landing text-xl font-bold tracking-[-0.035em] text-[#F5F5F7]">Scene canvas</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move scene up"
            title="Move scene up"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move scene down"
            title="Move scene down"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_downward</span>
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicate scene"
            title="Duplicate scene"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#3B3B47] hover:text-[#F5F5F7]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmDelete) onDelete();
              else setConfirmDelete(true);
            }}
            aria-label={confirmDelete ? 'Confirm delete scene' : 'Delete scene'}
            title={confirmDelete ? 'Confirm delete scene' : 'Delete scene'}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[13px] font-semibold transition ${
              confirmDelete
                ? 'border-[#F87171]/40 bg-[#F87171]/10 text-[#FCA5A5]'
                : 'border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#F87171]/40 hover:text-[#FCA5A5]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
            {confirmDelete ? 'Confirm' : ''}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]">
        <ScenePreview project={project} scene={scene} index={index} />

        <div className="min-w-0 space-y-3">
          <label className="block">
            <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777781]">Scene title</span>
            <input
              type="text"
              maxLength={120}
              value={scene.title || ''}
              onChange={(event) => onChange({ title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-[#26262E] bg-[#0B0B0F] px-3 py-2 font-landing text-sm font-semibold text-[#F5F5F7] outline-none transition placeholder:text-[#565662] focus:border-[#8B5CF6]"
              placeholder="Name this scene"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777781]">Narration</span>
              <span className="font-mono text-[11px] tabular-nums text-[#5F5F6B]">{(scene.narration || '').length} / 700</span>
            </span>
            <textarea
              rows={4}
              maxLength={700}
              value={scene.narration || ''}
              onChange={(event) => onChange({ narration: event.target.value })}
              className="mt-1 w-full resize-y rounded-lg border border-[#26262E] bg-[#0B0B0F] px-3 py-2 text-[14px] leading-5 text-[#F5F5F7] outline-none transition placeholder:text-[#565662] focus:border-[#8B5CF6]"
              placeholder="Write the spoken narration for this scene…"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777781]">Visual intent</span>
              <span className="font-mono text-[11px] tabular-nums text-[#5F5F6B]">{(scene.visualPrompt || '').length} / 2,000</span>
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={scene.visualPrompt || ''}
              onChange={(event) => onChange({ visualPrompt: event.target.value })}
              className="mt-1 w-full resize-y rounded-lg border border-[#26262E] bg-[#0B0B0F] px-3 py-2 text-[14px] leading-5 text-[#F5F5F7] outline-none transition placeholder:text-[#565662] focus:border-[#8B5CF6]"
              placeholder="Describe what the camera sees, the setting, and the mood…"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777781]">Visual kind</span>
              <div className="mt-1 flex gap-1.5">
                {[
                  ['ai-generated-footage', 'movie', 'AI footage'],
                  ['motion-graphics', 'palette', 'Graphics'],
                ].map(([value, icon, label]) => {
                  const active = scene.visualKind === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ visualKind: value })}
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-2 text-[13px] font-semibold transition ${
                        active
                          ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/15 text-[#F5F5F7]'
                          : 'border-[#26262E] bg-[#0B0B0F] text-[#9A9AA5] hover:border-[#3B3B47]'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[14px] ${active ? 'text-[#C4B5FD]' : 'text-[#5F5F6B]'}`} aria-hidden="true">
                        {icon}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[#777781]">Seconds</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={Math.min(30, Math.max(2, seconds || 2))}
                  onChange={(event) => onChange({ estimatedSeconds: Number(event.target.value) })}
                  className="w-16 accent-[#8B5CF6]"
                  aria-label="Scene duration in seconds"
                />
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={seconds || ''}
                  onChange={(event) => onChange({ estimatedSeconds: Number(event.target.value) })}
                  className="w-12 rounded-lg border border-[#26262E] bg-[#0B0B0F] px-1.5 py-1.5 text-center font-mono text-[14px] text-[#F5F5F7] outline-none focus:border-[#8B5CF6]"
                  aria-label="Scene duration in seconds"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-[#26262E] pt-3 text-[13px] leading-5 text-[#5F5F6B]">
        Editing a scene resets storyboard approval. The preview is a layout guide, not rendered footage.
      </p>
    </section>
  );
}
