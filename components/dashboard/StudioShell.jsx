'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '../SignOutButton';

function Wordmark({ small = false, showName = true }) {
  return (
    <Link href="/app" className="group inline-flex items-center gap-2.5" aria-label="Vydrivo Creator Studio home">
      <span
        className={`relative grid place-items-center rounded-[13px] bg-gradient-to-br from-[#D946EF] via-[#F0839E] to-[#7C3AED] text-white shadow-[0_8px_24px_rgba(217,70,239,0.25)] transition-transform group-hover:scale-[1.04] ${
          small ? 'h-9 w-9' : 'h-10 w-10'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
          play_arrow
        </span>
      </span>
      {showName ? (
        <span className={`font-headline font-extrabold tracking-[-0.04em] text-[#17131A] ${small ? 'text-lg' : 'text-xl'}`}>
          Vydrivo
        </span>
      ) : null}
    </Link>
  );
}

function SidebarItem({ icon, label, active = false, href, onClick, disabled = false, title }) {
  const base =
    'group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D946EF]/40';
  const tone = active
    ? 'bg-[#FCE7F3] text-[#C026D3]'
    : 'text-[#77747D] hover:bg-[#F8F5F7] hover:text-[#2A1728]';
  const disabledTone = 'cursor-not-allowed text-[#B8B5BC]';
  const className = `${base} ${disabled ? disabledTone : tone}`;
  const iconNode = (
    <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }} aria-hidden="true">
      {icon}
    </span>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
        {iconNode}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title || (disabled ? `${label} is not connected in this local build` : label)}
      aria-label={title || label}
    >
      {iconNode}
      <span>{label}</span>
    </button>
  );
}

export default function StudioShell({ user, onNew, onNotice, notice, children }) {
  const pathname = usePathname();
  const activeSection = pathname?.startsWith('/app/projects') ? 'videos' : pathname === '/app' ? 'home' : '';
  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#17131A]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[92px] flex-col items-center border-r border-[#E7E7EA] bg-white px-2 py-4 lg:flex">
        <span className="grid h-8 w-8 place-items-center rounded-full text-[#B8B5BC]" aria-hidden="true" title="Pinned studio navigation">
          <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
        </span>

        <div className="mt-1">
          <Wordmark small showName={false} />
        </div>

        <div className="mt-6 flex flex-col items-center gap-1">
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#F9A8D4] to-[#D946EF] text-sm font-bold text-white shadow-sm" title={user.displayName}>
            {user.initial}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <span className="mt-1 max-w-[70px] truncate text-[10px] font-semibold text-[#77747D]">{user.displayName}</span>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="mt-5 flex flex-col items-center gap-1.5 rounded-2xl px-2 py-1.5 text-[10px] font-semibold text-[#77747D] transition hover:text-[#17131A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D946EF]/40"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#17131A] text-white shadow-[0_6px_18px_rgba(23,19,26,0.22)] transition hover:bg-[#2A1728]">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
          </span>
          <span>New</span>
        </button>

        <nav aria-label="Studio navigation" className="mt-4 flex w-full flex-1 flex-col gap-1 overflow-y-auto pb-3">
          <SidebarItem icon="home" label="Home" href="/app" active={activeSection === 'home'} />
          <SidebarItem icon="video_library" label="Videos" href="/app/projects" active={activeSection === 'videos'} />
          <SidebarItem icon="image" label="Media" disabled />
          <SidebarItem icon="calendar_month" label="Posts" disabled />
          <SidebarItem icon="dashboard_customize" label="Storyboard" href="/app#drafts" />
          <SidebarItem icon="upload" label="Export" href="/app#active-job" />
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3 border-t border-[#EFEFF1] pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[#E5E5E8] bg-[#FAFAFB] text-[10px] font-bold tracking-wide text-[#77747D]" title="Private local build">
            V1
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FCE7F3] text-[11px] font-bold text-[#C026D3]" title={user.displayName}>
              {user.initial}
            </span>
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[92px]">
        <header className="sticky top-0 z-30 border-b border-[#E7E7EA]/80 bg-[#F7F7F8]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="md:hidden">
                <Wordmark small />
              </div>
              <div className="hidden min-w-0 md:block">
                <div className="flex items-center gap-3">
                  <p className="truncate font-headline text-[15px] font-bold tracking-[-0.02em] text-[#17131A]">Vydrivo Creator Studio</p>
                  <span className="rounded-full border border-[#F0C4E5] bg-[#FDF2F8] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C026D3]">
                    v0.1 Local
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#96919B]">Private drafting workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[#E5E5E8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5E5A64] sm:flex" title="The UI is ready. Live generation is not connected in this local build.">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Studio ready
              </div>
              <button
                type="button"
                onClick={() => onNotice('Feedback is collected manually during the private pilot. No feedback channel is connected yet.')}
                className="hidden rounded-full border border-[#E5E5E8] bg-white px-3.5 py-2 text-[11px] font-semibold text-[#5E5A64] transition hover:border-[#D8D5DC] hover:text-[#17131A] sm:inline-flex"
              >
                Feedback
              </button>
              <button
                type="button"
                onClick={onNew}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#17131A] px-3.5 py-2 text-[11px] font-semibold text-white shadow-[0_4px_14px_rgba(23,19,26,0.16)] transition hover:bg-[#2A1728] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D946EF]/50"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </button>
              <div className="sm:hidden">
                <SignOutButton compact />
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-[#EFEFF1] px-4 py-2 lg:hidden">
            {[
              ['Home', '/app'],
              ['Videos', '/app/projects'],
              ['Drafts', '/app#drafts'],
              ['New', '/app#create-video'],
            ].map(([label, href]) => {
              const active = (href === '/app' && activeSection === 'home') || (href === '/app/projects' && activeSection === 'videos');
              return (
                <Link
                  key={label}
                  href={href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition ${
                    active
                      ? 'bg-[#FCE7F3] text-[#C026D3] ring-[#F5D0E8]'
                      : 'bg-white text-[#5E5A64] ring-[#E7E7EA]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-7">{children}</main>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {notice ? (
          <div className="pointer-events-auto max-w-md rounded-2xl border border-[#3B1A37] bg-[#241021] px-4 py-3 text-center text-xs font-medium text-[#FBE8F6] shadow-[0_18px_50px_rgba(23,19,26,0.25)]">
            {notice}
          </div>
        ) : null}
      </div>
    </div>
  );
}
