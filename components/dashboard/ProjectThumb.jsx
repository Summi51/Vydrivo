export const MODE_THEMES = {
  'talking-head': 'from-[#DB2777] via-[#F472B6] to-[#FBBF24]',
  'product-teaser': 'from-[#7C3AED] via-[#D946EF] to-[#FB7185]',
  'feature-walkthrough': 'from-[#1D4ED8] via-[#06B6D4] to-[#34D399]',
  'social-reel': 'from-[#EA580C] via-[#F43F5E] to-[#EC4899]',
};

const TONES = {
  draft: 'bg-white/20 text-white',
  planning: 'bg-[#FBBF24] text-[#2A1728]',
  approved: 'bg-emerald-400 text-[#052E1B]',
  generating: 'bg-[#E879F9] text-[#2A0A25]',
  ready: 'bg-emerald-400 text-[#052E1B]',
  failed: 'bg-rose-500 text-white',
};

export default function ProjectThumb({
  formatId = 'talking-head',
  badge = 'DRAFT',
  tone = 'draft',
  duration = '—:—',
  className = '',
}) {
  const theme = MODE_THEMES[formatId] || MODE_THEMES['talking-head'];
  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-[18px] bg-gradient-to-br ${theme} ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:16px_16px]"
      />
      <div aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/25" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full border border-white/20" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5">
        <span className="rounded-md bg-black/35 px-1.5 py-1 font-mono text-[9px] font-semibold text-white backdrop-blur-sm">9:16</span>
        <span className={`rounded-md px-1.5 py-1 font-mono text-[9px] font-semibold backdrop-blur-sm ${TONES[tone] || TONES.draft}`}>
          {badge}
        </span>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/40 bg-white/15 text-white shadow-lg backdrop-blur-sm">
          <span className="material-symbols-outlined ml-0.5 text-[23px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">play_arrow</span>
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        <span className="rounded-md bg-black/25 px-1.5 py-1 font-mono text-[9px] font-semibold text-white/85 backdrop-blur-sm">PREVIEW</span>
        <span className="font-mono text-[9px] font-semibold text-white/80">{duration}</span>
      </div>
    </div>
  );
}
