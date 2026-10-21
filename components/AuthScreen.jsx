'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authUnavailable, validateCredentials, validateEmail } from '../lib/auth.js';

const COPY = {
  'sign-in': ['Sign in', 'Use the email on your Vydrivo account.'],
  'sign-up': ['Create an account', 'We will ask you to confirm the email before a pilot invite.'],
  recover: ['Reset password', 'We reply the same way whether or not the email exists.'],
};

export default function AuthScreen({ mode, config }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('error');
  const needsPassword = mode !== 'recover';
  const [title, subtitle] = COPY[mode];

  function submit(event) {
    event.preventDefault();
    const result = needsPassword ? validateCredentials(email, password) : validateEmail(email);
    if (!result.ok) {
      setTone('error');
      setMessage(result.error);
      return;
    }
    const blocked = authUnavailable(title, config);
    setTone('warn');
    setMessage(blocked.error);
  }

  return (
    <main className="min-h-screen bg-[#0D0A0E] text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden px-12 py-10 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#D946EF]/30 blur-3xl" />
          <Link href="/" className="relative font-headline text-2xl font-bold">Vydrivo</Link>
          <div className="relative max-w-md">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#F0839E]">Account</p>
            <h1 className="mt-3 font-headline text-5xl font-extrabold tracking-tight">Review the story before the video.</h1>
            <p className="mt-4 text-white/70">Sign-in protects your projects. It does not start generation, billing, or posting.</p>
          </div>
          <p className="relative text-sm text-white/50">Private local build. Search engines are not invited.</p>
        </section>
        <section className="flex items-center px-6 py-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141113] p-6 sm:p-8">
            <Link href="/" className="font-mono text-xs text-white/50 lg:hidden">← Vydrivo</Link>
            <h2 className="mt-6 font-headline text-3xl font-extrabold tracking-tight lg:mt-0">{title}</h2>
            <p className="mt-2 text-sm text-white/60">{subtitle}</p>
            {!config.configured ? (
              <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                Supabase is not configured on this server. Forms check input, then stop.
              </p>
            ) : null}
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <label className="block text-sm" htmlFor="email">
                Email
                <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 outline-none focus:border-[#D946EF]" />
              </label>
              {needsPassword ? (
                <label className="block text-sm" htmlFor="password">
                  Password
                  <span className="mt-1.5 flex rounded-xl border border-white/15 bg-black/30 focus-within:border-[#D946EF]">
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent px-3 py-3 outline-none" />
                    <button type="button" className="px-3 text-xs text-white/60" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
                  </span>
                </label>
              ) : null}
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-[#FBBF24] px-4 py-3 font-headline font-bold text-neutral-950">{title}</button>
            </form>
            {message ? <p role="alert" className={`mt-4 text-sm ${tone === 'error' ? 'text-rose-200' : 'text-amber-100'}`}>{message}</p> : null}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/60">
              {mode !== 'sign-in' ? <Link href="/sign-in" className="text-[#F0839E]">Sign in</Link> : null}
              {mode !== 'sign-up' ? <Link href="/sign-up" className="text-[#F0839E]">Create account</Link> : null}
              {mode !== 'recover' ? <Link href="/recover" className="text-[#F0839E]">Forgot password</Link> : null}
            </div>
            <button type="button" disabled className="mt-6 w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-white/45">
              {config.googleConfigured ? 'Google is configured, callback not connected' : 'Continue with Google — setup required'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
