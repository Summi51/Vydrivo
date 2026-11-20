'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not start a secure request. Refresh and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

export default function SignOutButton({ compact = false, menu = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const token = await csrfToken();
      const response = await fetch('/api/v1/auth/sign-out', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: '{}',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.message || 'Sign-out did not complete.');
      }
      router.push('/sign-in?out=1');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (menu) {
    return (
      <div className="relative">
        <button
          type="button"
          role="menuitem"
          onClick={signOut}
          disabled={busy}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-[#C9C9D4] transition hover:bg-white/[0.04] hover:text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px] text-[#9A9AA5]" aria-hidden="true">logout</span>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
        {error ? (
          <p role="alert" className="px-4 pb-2 text-[12px] leading-4 text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#2B2B35] bg-[#0B0B0F] text-[#9A9AA5] transition hover:border-[#8B5CF6]/50 hover:text-[#C4B5FD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            logout
          </span>
        </button>
        {error ? (
          <p role="alert" className="absolute bottom-full right-0 mb-2 w-44 rounded-lg bg-[#2A0A25] px-3 py-2 text-left text-[11px] leading-4 text-rose-200 shadow-lg">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          logout
        </span>
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
