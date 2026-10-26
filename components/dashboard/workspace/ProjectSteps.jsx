'use client';

import Link from 'next/link';

const STEPS = [
  { id: 'idea', label: 'Idea', icon: 'lightbulb', available: true },
  { id: 'storyboard', label: 'Storyboard', icon: 'dashboard_customize', available: true },
  { id: 'video', label: 'Video', icon: 'movie', available: false },
  { id: 'publish', label: 'Publish', icon: 'publish', available: false },
];

export default function ProjectSteps({ projectId, active }) {
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.id === active));

  return (
    <nav aria-label="Project steps" className="mb-4 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 rounded-2xl border border-[#E7E7EA] bg-white p-1.5 shadow-[0_1px_2px_rgba(16,16,20,0.03)]">
        {STEPS.map((step, index) => {
          const current = step.id === active;
          const done = index < activeIndex;
          const href = step.id === 'idea'
            ? `/app/projects/${projectId}/idea`
            : step.id === 'storyboard'
              ? `/app/projects/${projectId}`
              : null;
          const className = `group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
            current
              ? 'bg-[#17131A] text-white shadow-[0_4px_14px_rgba(23,19,26,0.16)]'
              : step.available
                ? 'text-[#5E5A64] hover:bg-[#F8F5F7] hover:text-[#17131A]'
                : 'cursor-not-allowed text-[#B8B5BC]'
          }`;
          const content = (
            <>
              <span
                className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[9px] ${
                  current
                    ? 'bg-white/15 text-white'
                    : done
                      ? 'bg-[#FCE7F3] text-[#C026D3]'
                      : 'bg-[#F4F4F6] text-[#A8A5AD]'
                }`}
              >
                {done ? <span className="material-symbols-outlined text-[12px]" aria-hidden="true">check</span> : String(index + 1).padStart(2, '0')}
              </span>
              <span>{step.label}</span>
              {!step.available ? (
                <span className="hidden rounded-full border border-[#EFEFF1] bg-[#FAFAFB] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B8B5BC] sm:inline">
                  Next
                </span>
              ) : null}
            </>
          );

          return (
            <li key={step.id}>
              {href && step.available ? (
                <Link href={href} className={className} aria-current={current ? 'step' : undefined}>
                  {content}
                </Link>
              ) : (
                <span
                  className={className}
                  aria-current={current ? 'step' : undefined}
                  aria-disabled={!step.available}
                  title={step.available ? step.label : `${step.label} is the next feature.`}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
