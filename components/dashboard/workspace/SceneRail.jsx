export default function SceneRail({ scenes, selectedId, onSelect, onAdd }) {
  return (
    <aside className="min-w-0 rounded-[22px] border border-[#E7E7EA] bg-white p-3 shadow-[0_1px_2px_rgba(16,16,20,0.035)] xl:sticky xl:top-24" aria-label="Storyboard scenes">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A8A5AD]">Storyboard</p>
          <h2 className="mt-0.5 font-headline text-sm font-bold text-[#17131A]">Scenes <span className="font-mono text-[10px] font-medium text-[#A8A5AD]">{scenes.length}</span></h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add scene"
          title="Add scene"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#17131A] text-white transition hover:bg-[#2A1728]"
        >
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
        </button>
      </div>

      {scenes.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
          {scenes.map((scene, index) => {
            const active = scene.id === selectedId;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelect(scene.id)}
                aria-current={active ? 'true' : undefined}
                className={`min-w-[176px] rounded-xl border p-2.5 text-left transition xl:min-w-0 ${
                  active
                    ? 'border-[#E9C7E2] bg-[#FFF7FB] shadow-[0_0_0_2px_rgba(217,70,239,0.08)]'
                    : 'border-[#EFEFF1] bg-[#FAFAFB] hover:border-[#E5D5E2] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-lg font-mono text-[9px] font-bold ${active ? 'bg-[#FCE7F3] text-[#C026D3]' : 'bg-white text-[#A8A5AD] ring-1 ring-[#EFEFF1]'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={`material-symbols-outlined text-[15px] ${active ? 'text-[#C026D3]' : 'text-[#B8B5BC]'}`} aria-hidden="true">
                    {scene.visualKind === 'motion-graphics' ? 'palette' : 'movie'}
                  </span>
                </div>
                <p className={`mt-2 truncate text-[11px] font-semibold ${active ? 'text-[#2A1728]' : 'text-[#5E5A64]'}`}>{scene.title || `Scene ${index + 1}`}</p>
                <p className="mt-0.5 font-mono text-[9px] text-[#A8A5AD]">{scene.estimatedSeconds || 0}s</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[#DDD9E1] bg-[#FAFAFB] px-3 py-5 text-center">
          <span className="material-symbols-outlined text-[22px] text-[#B8B5BC]" aria-hidden="true">view_carousel</span>
          <p className="mt-1.5 text-[11px] font-semibold text-[#6E6974]">No scenes yet</p>
          <p className="mt-1 text-[10px] leading-4 text-[#A8A5AD]">Add one manually or plan from the brief.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#DDD9E1] bg-[#FAFAFB] px-3 py-2 text-[10px] font-semibold text-[#6E6974] transition hover:border-[#E9C7E2] hover:bg-[#FFF9FC] hover:text-[#C026D3]"
      >
        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
        Add scene
      </button>
    </aside>
  );
}
