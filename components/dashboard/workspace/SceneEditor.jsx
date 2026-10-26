'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MODE_THEMES } from '../ProjectThumb';

function ScenePreview({ project, scene, index }) {
  const theme = MODE_THEMES[project.formatId] || MODE_THEMES['talking-head'];
  return (
    <div className={`relative mx-auto aspect-[9/16] w-full max-w-[170px] overflow-hidden rounded-2xl bg-gradient-to-br sm:max-w-none ${theme}`} aria-label="Selected scene storyboard preview">
      <div aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:16px_16px]" />
      <div aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/25" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full border border-white/20" />
      <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
        <span className="rounded-md bg-black/35 px-1.5 py-1 font-mono text-[8px] font-semibold text-white backdrop-blur-sm">9:16</span>
        <span className="rounded-md bg-white/20 px-1.5 py-1 font-mono text-[8px] font-semibold text-white backdrop-blur-sm">PREVIEW</span>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/40 bg-white/15 text-white shadow-lg backdrop-blur-sm">
          <span className="material-symbols-outlined text-[23px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            {scene.visualKind === 'motion-graphics' ? 'palette' : 'movie'}
          </span>
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-3 pt-10">
        <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-white/65">
          {String(index + 1).padStart(2, '0')} · {scene.visualKind === 'motion-graphics' ? 'Motion graphics' : 'AI footage'}
        </p>
        <p className="mt-1 truncate font-headline text-sm font-bold text-white">{scene.title || 'Untitled scene'}</p>
        <p className="mt-1 max-h-12 overflow-hidden text-[9px] leading-4 text-white/75">{scene.narration || 'Narration will appear here.'}</p>
        <p className="mt-2 font-mono text-[8px] text-white/60">{scene.estimatedSeconds || 0}s · storyboard preview</p>
      </div>
    </div>
  );
}

export default function SceneEditor({ project, scene, index, total, onAdd, onChange, onDuplicate, onDelete, onMove }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [scene?.id]);

  if (!scene) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center rounded-[22px] border border-[#E7E7EA] bg-white p-6 text-center shadow-[0_1px_2px_rgba(16,16,20,0.035)]">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FCE7F3] text-[#C026D3]">
          <span className="material-symbols-outlined text-[27px]" aria-hidden="true">dashboard_customize</span>
        </span>
        <h2 className="mt-4 font-headline text-xl font-bold tracking-[-0.03em] text-[#17131A]">Start the storyboard</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-[#77747D]">
          Add a scene and write the narration and visual intent, or open the idea step to review the brief before drafting.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-full bg-[#17131A] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2A1728]">
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
            Add first scene
          </button>
          <Link
            href={`/app/projects/${project.id}/idea`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E8] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#4D4953] transition hover:border-[#D8D5DC] hover:text-[#17131A]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">auto_awesome</span>
            Open idea step
          </Link>
        </div>
      </section>
    );
  }

  const seconds = Number(scene.estimatedSeconds) || 0;

  return (
    <section className="min-w-0 rounded-[22px] border border-[#E7E7EA] bg-white p-4 shadow-[0_1px_2px_rgba(16,16,20,0.035)] sm:p-5" aria-labelledby="scene-editor-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A8A5AD]">Scene {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}</p>
          <h2 id="scene-editor-heading" className="mt-1 font-headline text-xl font-bold tracking-[-0.035em] text-[#17131A]">Scene canvas</h2>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move scene up" title="Move scene up" className="grid h-8 w-8 place-items-center rounded-lg border border-[#E7E7EA] bg-white text-[#6E6974] transition hover:border-[#D8D5DC] hover:text-[#17131A] disabled:cursor-not-allowed disabled:opacity-35">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_upward</span>
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move scene down" title="Move scene down" className="grid h-8 w-8 place-items-center rounded-lg border border-[#E7E7EA] bg-white text-[#6E6974] transition hover:border-[#D8D5DC] hover:text-[#17131A] disabled:cursor-not-allowed disabled:opacity-35">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_downward</span>
          </button>
          <button type="button" onClick={onDuplicate} aria-label="Duplicate scene" title="Duplicate scene" className="grid h-8 w-8 place-items-center rounded-lg border border-[#E7E7EA] bg-white text-[#6E6974] transition hover:border-[#D8D5DC] hover:text-[#17131A]">
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
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition ${
              confirmDelete
                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                : 'border-[#E7E7EA] bg-white text-[#6E6974] hover:border-[#FECACA] hover:text-[#B91C1C]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
            {confirmDelete ? 'Confirm' : ''}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <ScenePreview project={project} scene={scene} index={index} />

        <div className="min-w-0 space-y-3">
          <label className="block">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Scene title</span>
            <input
              type="text"
              maxLength={120}
              value={scene.title || ''}
              onChange={(event) => onChange({ title: event.target.value })}
              className="mt-1 w-full rounded-xl border border-[#E7E7EA] bg-[#FAFAFB] px-3 py-2 font-headline text-sm font-bold text-[#17131A] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E9C7E2] focus:bg-white focus:ring-2 focus:ring-[#D946EF]/10"
              placeholder="Name this scene"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Narration</span>
              <span className="font-mono text-[8px] tabular-nums text-[#B8B5BC]">{(scene.narration || '').length} / 700</span>
            </span>
            <textarea
              rows={4}
              maxLength={700}
              value={scene.narration || ''}
              onChange={(event) => onChange({ narration: event.target.value })}
              className="mt-1 w-full resize-y rounded-xl border border-[#E7E7EA] bg-[#FAFAFB] px-3 py-2 text-[12px] leading-5 text-[#4D4953] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E9C7E2] focus:bg-white focus:ring-2 focus:ring-[#D946EF]/10"
              placeholder="Write the spoken narration for this scene…"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Visual intent</span>
              <span className="font-mono text-[8px] tabular-nums text-[#B8B5BC]">{(scene.visualPrompt || '').length} / 2,000</span>
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={scene.visualPrompt || ''}
              onChange={(event) => onChange({ visualPrompt: event.target.value })}
              className="mt-1 w-full resize-y rounded-xl border border-[#E7E7EA] bg-[#FAFAFB] px-3 py-2 text-[12px] leading-5 text-[#4D4953] outline-none transition placeholder:text-[#B8B5BC] focus:border-[#E9C7E2] focus:bg-white focus:ring-2 focus:ring-[#D946EF]/10"
              placeholder="Describe what the camera sees, the setting, and the mood…"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Visual kind</span>
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
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition ${
                        active
                          ? 'border-[#E9C7E2] bg-[#FFF7FB] text-[#C026D3]'
                          : 'border-[#E7E7EA] bg-white text-[#6E6974] hover:border-[#D8D5DC]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{icon}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A5AD]">Seconds</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={Math.min(30, Math.max(2, seconds || 2))}
                  onChange={(event) => onChange({ estimatedSeconds: Number(event.target.value) })}
                  className="w-24 accent-[#D946EF]"
                  aria-label="Scene duration in seconds"
                />
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={seconds || ''}
                  onChange={(event) => onChange({ estimatedSeconds: Number(event.target.value) })}
                  className="w-14 rounded-lg border border-[#E7E7EA] bg-[#FAFAFB] px-2 py-1.5 text-center font-mono text-[11px] text-[#17131A] outline-none focus:border-[#E9C7E2] focus:bg-white"
                  aria-label="Scene duration in seconds"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-[#F2F1F4] pt-3 text-[9px] leading-4 text-[#A8A5AD]">
        Editing a scene resets storyboard approval. The preview is a layout guide, not rendered footage.
      </p>
    </section>
  );
}
