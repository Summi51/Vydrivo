'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import SignOutButton from '../SignOutButton';

const LINKS = [
  { href: '/app/settings', label: 'Settings', icon: 'settings' },
  { href: 'mailto:support@vydrivo.com', label: 'Contact support', icon: 'mail', external: true },
];

export default function AccountMenu({ user, align = 'right', placement = 'below', trigger = 'avatar' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const name = user?.displayName || 'Creator';
  const email = user?.email || '';
  const initial = user?.initial || 'V';

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        title={email || name}
        className={
          trigger === 'card'
            ? 'flex w-full items-center gap-3 rounded-xl border border-[#26262E] bg-[#141419] p-2.5 text-left transition hover:border-[#8B5CF6]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60'
            : 'grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#2DD4BF] text-xs font-bold text-[#0B0B0F] ring-2 ring-[#0B0B0F] outline outline-1 outline-[#26262E] transition hover:outline-[#8B5CF6]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/70'
        }
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#2DD4BF] text-xs font-bold text-[#0B0B0F]">
          {initial}
        </span>
        {trigger === 'card' ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#F5F5F7]">{name}</span>
            <span className="block truncate text-[12px] text-[#9A9AA5]">{email || 'Signed in'}</span>
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-50 w-full min-w-[220px] max-w-[280px] overflow-hidden rounded-2xl border border-[#2B2B35] bg-[#141419] shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${align === 'left' ? 'left-0' : 'right-0'} ${placement === 'above' ? 'bottom-full mb-2' : 'top-11'}`}
        >
          <div className="border-b border-[#26262E] px-4 py-3.5">
            <p className="truncate text-[14px] font-semibold text-[#F5F5F7]">{name}</p>
            {email ? (
              <p className="mt-0.5 break-all text-[13px] leading-5 text-[#9A9AA5]">{email}</p>
            ) : (
              <p className="mt-0.5 text-[13px] leading-5 text-[#777781]">Signed in</p>
            )}
          </div>
          <div className="py-1.5">
            {LINKS.map((item) => {
              const className = 'flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-[#C9C9D4] transition hover:bg-white/[0.04] hover:text-[#F5F5F7]';
              const icon = <span className="material-symbols-outlined text-[18px] text-[#9A9AA5]" aria-hidden="true">{item.icon}</span>;
              if (item.external) {
                return (
                  <a key={item.href} href={item.href} role="menuitem" className={className}>
                    {icon}
                    {item.label}
                  </a>
                );
              }
              return (
                <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)} className={className}>
                  {icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-[#26262E] py-1.5">
            <SignOutButton menu />
          </div>
        </div>
      ) : null}
    </div>
  );
}
