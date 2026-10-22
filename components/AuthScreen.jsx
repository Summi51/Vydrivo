'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const COPY = {
  'sign-in': ['Sign in', 'Use Google, or the email on your Vydrivo account.', '/api/v1/auth/sign-in'],
  'sign-up': ['Create an account', 'Google creates the account too. Email asks you to confirm before signing in.', '/api/v1/auth/sign-up'],
  recover: ['Reset password', 'The reply is the same whether or not the email exists.', '/api/v1/auth/recovery'],
};

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not start a secure form. Refresh and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

export default function AuthScreen({ mode, config, notice = '' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(notice);
  const [tone, setTone] = useState(notice ? 'warn' : 'error');
  const [busy, setBusy] = useState(false);
  const needsPassword = mode !== 'recover';
  const [title, subtitle, endpoint] = COPY[mode];

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const token = await csrfToken();
      const body = needsPassword ? { email, password } : { email };
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(body),
      });
      const payload = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        setTone('error');
        setMessage(payload.error?.message || 'Sign-in did not complete.');
        return;
      }
      if (mode === 'sign-in' || (mode === 'sign-up' && payload.data?.user)) {
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next === '/projects/new' ? next : '/app');
        return;
      }
      setTone('ok');
      setMessage(`${payload.data?.message || 'Check your email to continue.'} If nothing arrives, Supabase email limits or Confirm email may be blocking it.`);
      setPassword('');
    } catch (error) {
      setTone('error');
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function startGoogle() {
    setBusy(true);
    setMessage('');
    try {
      const token = await csrfToken();
      const response = await fetch('/api/v1/auth/google', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: '{}',
      });
      const payload = await response.json();
      if (!response.ok) {
        setTone('error');
        setMessage(payload.error?.message || 'Google sign-in is not connected.');
        setBusy(false);
        return;
      }
      const target = new URL(payload.data.authorizationUrl);
      if (target.protocol !== 'https:') throw new Error('Google sign-in URL was rejected.');
      window.location.assign(target.toString());
    } catch (error) {
      setTone('error');
      setMessage(error.message);
      setBusy(false);
    }
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
            {mode !== 'recover' ? (
              <button
                type="button"
                disabled={!config.googleConfigured || busy}
                title={config.googleConfigured ? 'Continue with Google' : 'Add the Google OAuth client in Supabase first'}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 disabled:bg-white/10 disabled:text-white/45"
                onClick={startGoogle}
              >
                <span aria-hidden="true" className="text-base font-bold text-[#4285F4]">G</span>
                {config.googleConfigured ? 'Continue with Google' : 'Continue with Google — setup required'}
              </button>
            ) : null}
            {mode !== 'recover' ? <p className="mt-4 text-center text-xs uppercase tracking-[0.16em] text-white/40">or</p> : null}
            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
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
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-[#FBBF24] px-4 py-3 font-headline font-bold text-neutral-950 disabled:opacity-60">{busy ? 'Working…' : title}</button>
            </form>
            {message ? <p role="status" className={`mt-4 text-sm ${tone === 'error' ? 'text-rose-200' : tone === 'ok' ? 'text-emerald-200' : 'text-amber-100'}`}>{message}</p> : null}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/60">
              {mode === 'sign-in' ? <span>New here? <Link href="/sign-up" className="text-[#F0839E]">Create an account</Link></span> : null}
              {mode === 'sign-up' ? <span>Already registered? <Link href="/sign-in" className="text-[#F0839E]">Sign in</Link></span> : null}
              {mode === 'recover' ? <Link href="/sign-in" className="text-[#F0839E]">Back to sign in</Link> : null}
              {mode !== 'recover' ? <Link href="/recover" className="text-[#F0839E]">Forgot password</Link> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
