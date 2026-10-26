
import Link from 'next/link';

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function StoryboardInspector({ project, stats, review }) {
  const approved = review?.approved === true;
  const durationPercent = Math.min(100, Math.round((stats.totalSeconds / 90) * 100));
  const errorCount = stats.errors.length;

  return (
    <aside className="space-y-4" aria-label="Storyboard inspector">
      <section className="rounded-[22px] border border-[#E7E7EA] bg-white p-4 shadow-[0_1px_2px_rgba(16,16,20,0.035)]">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A8A5AD]">Brief</p>
        <h2 className="mt-1 font-headline text-sm font-bold tracking-[-0.02em] text-[#17131A]">Project intent</h2>
        <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[#6E6974]">{project.topic}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-2 py-1 font-mono text-[9px] text-[#6E6974]">{project.format}</span>
          <span className="rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-2 py-1 font-mono text-[9px] text-[#6E6974]">{project.targetLabel}</span>
          <span className="rounded-full border border-[#E7E7EA] bg-[#FAFAFB] px-2 py-1 font-mono text-[9px] text-[#6E6974]">{project.aspect}</span>
        </div>
        <Link href={`/app/projects/${project.id}/idea`} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#C026D3] hover:text-[#A21CAF]">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">edit_note</span>
          Edit idea
        </Link>
      </section>

      <section className="rounded-[22px] border border-[#E7E7EA] bg-white p-4 shadow-[0_1px_2px_rgba(16,16,20,0.035)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A8A5AD]">Health</p>
            <h2 className="mt-1 font-headline text-sm font-bold tracking-[-0.02em] text-[#17131A]">Storyboard check</h2>
          </div>
          <span className={`rounded-full px-2 py-1 font-mono text-[9px] font-semibold ${errorCount ? 'bg-[#FFFBEB] text-[#B45309] ring-1 ring-[#FDE68A]' : 'bg-[#F0FDF4] text-[#166534] ring-1 ring-[#BBF7D0]'}`}>
            {errorCount ? `${errorCount} to fix` : 'Ready'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['Scenes', stats.sceneCount],
            ['Duration', formatDuration(stats.totalSeconds)],
            ['Footage', `${stats.footagePercent}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#EFEFF1] bg-[#FAFAFB] px-2 py-2 text-center">
              <p className="font-headline text-sm font-bold tabular-nums text-[#17131A]">{value}</p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A8A5AD]">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <div>
            <div className="flex items-center justify-between text-[9px] text-[#A8A5AD]">
              <span>Target 60–90s</span>
              <span className="font-mono tabular-nums">{stats.totalSeconds}s</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F1F1F3]">
              <div className={`h-full rounded-full ${stats.totalSeconds >= 60 && stats.totalSeconds <= 90 ? 'bg-emerald-500' : 'bg-[#F59E0B]'}`} style={{ width: `${durationPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[9px] text-[#A8A5AD]">
              <span>Footage coverage</span>
              <span className="font-mono tabular-nums">{stats.footagePercent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F1F1F3]">
              <div className={`h-full rounded-full ${stats.footagePercent >= 50 ? 'bg-emerald-500' : 'bg-[#F59E0B]'}`} style={{ width: `${Math.min(100, stats.footagePercent)}%` }} />
            </div>
          </div>
        </div>

        {errorCount ? (
          <ul className="mt-3 space-y-1.5" aria-label="Storyboard issues">
            {stats.errors.slice(0, 5).map((error) => (
              <li key={error} className="flex gap-1.5 text-[10px] leading-4 text-[#8A6A2F]">
                <span className="material-symbols-outlined mt-0.5 text-[13px] text-[#D97706]" aria-hidden="true">info</span>
                {error}
              </li>
            ))}
            {errorCount > 5 ? <li className="text-[9px] text-[#A8A5AD]">+{errorCount - 5} more checks</li> : null}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#F0FDF4] px-3 py-2 text-[10px] leading-4 text-[#166534]">
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">check_circle</span>
            Ready for an explicit approval.
          </p>
        )}

        <div className={`mt-3 rounded-xl px-3 py-2 text-[10px] leading-4 ${approved ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FAFAFB] text-[#8A8790]'}`}>
          <span className="font-semibold">{approved ? 'Approved in Supabase' : 'Not approved'}</span>
          <span className="block mt-0.5">{approved ? 'This exact revision is approved. Editing resets approval.' : 'Approve the exact revision before any generation is wired in.'}</span>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#E7E7EA] bg-[#17131A] p-4 text-white shadow-[0_1px_2px_rgba(16,16,20,0.035)]">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">Supabase checkpoint</p>
        <p className="mt-1.5 text-[11px] leading-5 text-white/75">
          The storyboard is saved in Supabase Postgres. Footage generation, playback and downloads are not connected in this build.
        </p>
        <Link href={`/app/projects/${project.id}/idea`} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#F0ABFC] hover:text-[#F5D0FE]">
          Edit idea
          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </section>
    </aside>
  );
}
