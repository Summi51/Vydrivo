import Link from 'next/link';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function StoryboardInspector({ project, stats, review, onApprove, approving, canApprove }) {
  const approved = review?.approved === true;
  const durationPercent = Math.min(100, Math.round((stats.totalSeconds / 90) * 100));
  const errorCount = stats.errors.length;
  const hash = String(review?.storyboardHash || '');

  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start" aria-label="Storyboard inspector">
      <section className="rounded-2xl border border-[#26262E] bg-[#141419] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#777781]">Scene health</p>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
              errorCount
                ? 'border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FCD34D]'
                : 'border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]'
            }`}
          >
            {errorCount ? `${errorCount} to fix` : 'Ready'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['Scenes', stats.sceneCount],
            ['Duration', formatDuration(stats.totalSeconds)],
            ['Footage', `${stats.footagePercent}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#26262E] bg-[#0B0B0F] px-2 py-2 text-center">
              <p className="font-landing text-sm font-bold tabular-nums text-[#F5F5F7]">{value}</p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2.5">
          <div>
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-[#5F5F6B]">
              <span>Target 60–90s</span>
              <span className="tabular-nums">{stats.totalSeconds}s</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#26262E]">
              <div
                className={`h-full rounded-full ${stats.totalSeconds >= 60 && stats.totalSeconds <= 90 ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`}
                style={{ width: `${durationPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-[#5F5F6B]">
              <span>Footage coverage</span>
              <span className="tabular-nums">{stats.footagePercent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#26262E]">
              <div
                className={`h-full rounded-full ${stats.footagePercent >= 50 ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`}
                style={{ width: `${Math.min(100, stats.footagePercent)}%` }}
              />
            </div>
          </div>
        </div>

        {errorCount ? (
          <ul className="mt-3 space-y-1.5" aria-label="Storyboard issues">
            {stats.errors.slice(0, 5).map((error) => (
              <li key={error} className="flex gap-1.5 text-[13px] leading-4 text-[#FCD34D]">
                <span className="material-symbols-outlined mt-0.5 text-[14px] text-[#FBBF24]" aria-hidden="true">info</span>
                {error}
              </li>
            ))}
            {errorCount > 5 ? <li className="text-[12px] text-[#5F5F6B]">+{errorCount - 5} more checks</li> : null}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#34D399]/25 bg-[#34D399]/10 px-3 py-2 text-[13px] leading-4 text-[#6EE7B7]">
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">check_circle</span>
            Ready for an explicit approval.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#26262E] bg-[#141419] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#777781]">Storyboard status</p>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
              approved
                ? 'border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]'
                : 'border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FCD34D]'
            }`}
          >
            {approved ? 'Approved' : 'Draft'}
          </span>
        </div>

        <p className="mt-2 text-[14px] leading-5 text-[#9A9AA5]">
          {approved
            ? 'This exact revision is approved. Editing any scene resets approval.'
            : 'Review every scene, then approve this exact revision before generation can be wired in.'}
        </p>

        <div className="mt-3 rounded-lg border border-[#26262E] bg-[#0B0B0F] px-3 py-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#5F5F6B]">Revision hash</p>
          <p className="mt-1 truncate font-mono text-[13px] text-[#C4B5FD]" title={hash || undefined}>
            {hash ? hash.slice(0, 16) : 'Not approved yet'}
          </p>
        </div>

        <button
          type="button"
          onClick={onApprove}
          disabled={!canApprove}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:bg-[#1B1B22] disabled:text-[#5F5F6B]"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{approved ? 'check_circle' : 'fact_check'}</span>
          {approved ? 'Approved' : approving ? 'Approving…' : 'Approve this revision'}
        </button>
        <p className="mt-2 text-[12px] leading-4 text-[#5F5F6B]">Editing any beat resets approval status.</p>
      </section>

      <section className="rounded-2xl border border-[#26262E] bg-[#141419] p-4">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#777781]">Project brief</p>
        <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-[14px] leading-5 text-[#9A9AA5]">{project.topic}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#26262E] bg-[#0B0B0F] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9A9AA5]">{project.format}</span>
          <span className="rounded-full border border-[#26262E] bg-[#0B0B0F] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9A9AA5]">{project.targetLabel}</span>
          <span className="rounded-full border border-[#26262E] bg-[#0B0B0F] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#9A9AA5]">{project.aspect}</span>
        </div>
        <Link
          href={`/app/projects/${project.id}/idea`}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#C4B5FD] transition hover:text-white"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">edit_note</span>
          Edit idea
        </Link>
        <p className="mt-3 border-t border-[#26262E] pt-3 text-[12px] leading-4 text-[#5F5F6B]">
          Storyboard saved. Footage generation, playback and downloads are not connected in this build.
        </p>
      </section>
    </aside>
  );
}
