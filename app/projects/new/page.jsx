'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readDraft } from '../../../lib/project-draft.js';

export default function NewProject() {
  const [draft, setDraft] = useState(undefined);

  useEffect(() => {
    try {
      setDraft(readDraft(window.sessionStorage));
    } catch {
      setDraft(null);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#0D0A0E] px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-mono text-xs tracking-wider text-white/60">← VYDRIVO</Link>
          <Link href="/sign-in" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Sign in</Link>
        </div>
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-[#F0839E]">Project draft</p>
        <h1 className="mt-3 font-headline text-4xl tracking-tight">Review before generation.</h1>
        {draft === undefined ? <p className="mt-8 text-white/70">Loading this browser draft…</p> : null}
        {draft === null ? (
          <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6">
            <p>No draft is saved in this browser tab.</p>
            <Link href="/#start" className="mt-4 inline-block text-[#D946EF]">Start from the landing page</Link>
          </div>
        ) : null}
        {draft ? (
          <section className="mt-8 rounded-2xl border border-white/15 bg-[#141113] p-6">
            <h2 className="font-headline text-2xl">{draft.title}</h2>
            <p className="mt-4 whitespace-pre-wrap text-white/80">{draft.topic}</p>
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>Saved only in this browser tab. Reload keeps it. A new tab does not.</li>
              <li>Sign-in is a separate screen. This draft is not an account.</li>
              <li>Generate stays unavailable until a reviewed storyboard exists.</li>
            </ul>
            <button type="button" disabled className="mt-6 rounded-xl bg-white/10 px-5 py-3 text-sm text-white/50">
              Generate video — not connected
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
