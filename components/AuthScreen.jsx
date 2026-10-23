'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const COPY = {
  'sign-in': {
    tab: 'sign-in',
    title: 'Sign In to Vydrivo',
    subtitle: 'Access your storyboard editor, scripts, and video generations.',
    endpoint: '/api/v1/auth/sign-in',
    submit: 'Sign In to Workspace',
    emailLabel: 'Work email',
    passwordLabel: 'Password',
    divider: 'or sign in with email',
    google: true,
  },
  'sign-up': {
    tab: 'sign-up',
    title: 'Create your account',
    subtitle: 'Start with a reviewed storyboard. Google or email both work.',
    endpoint: '/api/v1/auth/sign-up',
    submit: 'Create Account',
    emailLabel: 'Work email',
    passwordLabel: 'Create password',
    divider: 'or sign up with email',
    google: true,
  },
  recover: {
    tab: 'recover',
    title: 'Reset your password',
    subtitle: 'Enter the email on your account. The reply is the same whether or not it exists.',
    endpoint: '/api/v1/auth/recovery',
    submit: 'Send Reset Link',
    emailLabel: 'Work email',
    passwordLabel: '',
    divider: '',
    google: false,
  },
  password: {
    tab: 'recover',
    title: 'Choose a new password',
    subtitle: 'Your recovery link is active. Set a new password to finish.',
    endpoint: '/api/v1/auth/password',
    submit: 'Update Password',
    emailLabel: '',
    passwordLabel: 'New password',
    divider: '',
    google: false,
  },
};

const TABS = [
  ['sign-in', 'Sign In', '/sign-in'],
  ['sign-up', 'Create Account', '/sign-up'],
];

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Could not start a secure form. Refresh and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#160a12] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 8%, rgba(217,70,239,0.30), transparent 42%), radial-gradient(circle at 82% 64%, rgba(240,131,158,0.16), transparent 44%), radial-gradient(circle at 50% 110%, rgba(124,58,237,0.20), transparent 55%)',
        }}
      />
      <div className="relative flex items-start justify-between gap-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#D946EF] via-[#F0839E] to-[#FBBF24] shadow-[0_0_30px_rgba(217,70,239,0.45)]">
            <span className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-white" />
          </span>
          <span className="font-headline text-2xl font-extrabold tracking-tight">Vydrivo</span>
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          System Online
        </span>
      </div>

      <div className="relative max-w-xl py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D946EF]" />
          Storyboard First Workflow
        </span>
        <h2 className="mt-7 font-headline text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] xl:text-6xl">
          Turn your idea into a{' '}
          <span className="bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-[#FBBF24] bg-clip-text text-transparent">
            video you can shape.
          </span>
        </h2>
        <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">
          Review scripts and storyboards before generation, with scene-level revisions and clean vertical MP4 export.
        </p>

        <StoryboardCard />

        <ul className="mt-8 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
          {[
            'Review storyboard before render compute',
            '9:16 vertical 1080×1920 MP4 export',
            'Synchronized voiceover & kinetic captions',
            'Direct download & conditional Instagram publishing',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#F0839E]">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/40">© 2026 Vydrivo Inc. All rights reserved.</p>
    </aside>
  );
}

function StoryboardCard() {
  const bars = [6, 12, 8, 16, 10, 14, 7];
  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex gap-4">
        <div className="relative w-[132px] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#0d0a0e] p-3">
          <div className="flex items-center justify-between font-mono text-[8px] text-white/60">
            <span>9:16</span>
            <span>1080×1920</span>
          </div>
          <div className="mt-2 rounded-md bg-white/90 p-2 text-[7px] leading-tight text-neutral-800">
            <p className="font-bold">Scene 02</p>
            <p className="text-neutral-500">Core Concept</p>
            <div className="mt-1 h-1.5 rounded bg-neutral-200" />
            <div className="mt-1 h-1.5 rounded bg-neutral-200" />
            <div className="mt-1 h-1.5 w-2/3 rounded bg-neutral-200" />
          </div>
          <p className="mt-2 text-[8px] font-semibold leading-tight text-white/90">“Review script beats before compute.”</p>
          <span className="mt-1 inline-block rounded bg-emerald-400/20 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-300">Approved</span>
          <div className="mt-2 flex items-end gap-0.5">
            {bars.map((height, index) => (
              <span
                key={index}
                className="w-1 rounded-sm bg-gradient-to-t from-[#D946EF] to-[#FBBF24]"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D946EF]" />
              Storyboard Beat Review
            </span>
            <span className="font-mono">30 fps</span>
          </div>
          <p className="mt-3 font-headline text-lg font-bold text-white">Scene 02: Core Concept</p>
          <p className="mt-1 text-xs leading-5 text-white/55">Scene-level narration timing, caption styling, and shot sequencing.</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full w-1/2 rounded-full"
              style={{ background: 'linear-gradient(to right, #D946EF, #F0839E, #FBBF24)' }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-white/40">
            <span>00:14</span>
            <span>00:30</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white/70">✦ Synced Narration</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white/70">Vertical MP4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthTabs({ active }) {
  return (
    <div className="inline-flex w-full items-center gap-1 rounded-2xl bg-neutral-100 p-1 sm:p-1.5">
      {TABS.map(([id, label, href]) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 whitespace-nowrap rounded-xl px-1 py-2.5 text-center text-[10px] font-semibold transition sm:px-3 sm:text-[13px] ${
              isActive
                ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.08)]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function Field({ id, label, type = 'text', value, onChange, autoComplete, placeholder, icon, trailing, fieldTrailing }) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-sm font-medium text-neutral-800">
        {label}
        {trailing}
      </span>
      <span className="mt-2 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 transition focus-within:border-neutral-400 focus-within:ring-4 focus-within:ring-neutral-100">
        <span className="material-symbols-outlined text-[20px] text-neutral-400" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[15px] text-neutral-900 outline-none ring-0 placeholder:text-neutral-400 focus:border-0 focus:outline-none focus:ring-0"
        />
        {fieldTrailing}
      </span>
    </label>
  );
}

function Message({ tone, children }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : tone === 'ok'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-amber-200 bg-amber-50 text-amber-900';
  return (
    <p role="status" className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${styles}`}>
      {children}
    </p>
  );
}

export default function AuthScreen({ mode = 'sign-in', config = { configured: false, googleConfigured: false }, notice = '', noticeTone = 'warn' }) {
  const router = useRouter();
  const copy = COPY[mode] || COPY['sign-in'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState(notice);
  const [tone, setTone] = useState(noticeTone);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!copy.endpoint) return;
    setBusy(true);
    setMessage('');
    try {
      const token = await csrfToken();
      const body =
        mode === 'recover'
          ? { email }
          : mode === 'password'
            ? { newPassword: password }
            : mode === 'sign-up'
              ? { email, password }
              : { email, password, remember };
      const response = await fetch(copy.endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(body),
      });
      const payload = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        setTone('error');
        setMessage(payload.error?.message || 'That request did not complete.');
        return;
      }
      if (mode === 'sign-in' || (mode === 'sign-up' && payload.data?.user)) {
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next === '/projects/new' ? next : '/app');
        return;
      }
      if (mode === 'sign-up') {
        setTone('ok');
        setMessage(payload.data?.message || 'Check your email to continue.');
        setPassword('');
        return;
      }
      if (mode === 'recover') {
        setTone('ok');
        setMessage(payload.data?.message || 'If an account exists, check your email to continue.');
        return;
      }
      if (mode === 'password') {
        setTone('ok');
        setMessage('Password updated. Sign in with your new password.');
        setPassword('');
        router.push('/sign-in?reset=1');
        return;
      }
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
    <main className="min-h-screen bg-white text-[#0B0B0C]">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <BrandPanel />

        <section className="flex min-h-screen flex-col bg-white">
          <div className="flex items-center justify-between gap-4 px-6 pt-7 sm:px-10">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-900">
              <span aria-hidden="true">←</span> Back to homepage
            </Link>
            <a href="mailto:support@vydrivo.com" className="text-sm text-neutral-500 transition hover:text-neutral-900">
              Need help? <span className="font-semibold underline underline-offset-4">Support</span>
            </a>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-[560px]">
              {mode === 'sign-in' || mode === 'sign-up' ? <AuthTabs active={copy.tab} /> : null}

              <h1 className="mt-9 font-headline text-4xl font-extrabold tracking-tight sm:text-[44px]">{copy.title}</h1>
              <p className="mt-3 text-base leading-7 text-neutral-500">{copy.subtitle}</p>

              {!config.configured ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  Supabase is not configured on this server. Forms validate input, then stop.
                </div>
              ) : null}

              {copy.google ? (
                <>
                  <button
                    type="button"
                    onClick={startGoogle}
                    disabled={!config.googleConfigured || busy}
                    title={config.googleConfigured ? 'Continue with Google' : 'Add the Google OAuth client in Supabase first'}
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-3.5 text-sm font-semibold text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <GoogleMark />
                    {config.googleConfigured ? 'Continue with Google' : 'Continue with Google — setup required'}
                  </button>
                  <div className="my-6 flex items-center gap-4">
                    <span className="h-px flex-1 bg-neutral-200" />
                    <span className="text-xs text-neutral-400">{copy.divider}</span>
                    <span className="h-px flex-1 bg-neutral-200" />
                  </div>
                </>
              ) : null}

              <form onSubmit={submit} className={copy.google ? 'space-y-5' : 'mt-7 space-y-5'} noValidate>
                  {mode !== 'password' ? (
                    <Field
                      id="email"
                      label={copy.emailLabel}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="creator@agency.design"
                      icon="mail"
                    />
                  ) : null}

                  {mode !== 'recover' ? (
                    <Field
                      id="password"
                      label={copy.passwordLabel}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === 'sign-up' || mode === 'password' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'password' ? 'At least 12 characters' : '••••••••••••'}
                      icon="lock"
                      trailing={
                        mode === 'sign-in' ? (
                          <Link href="/recover" className="text-xs font-semibold text-[#C026D3] transition hover:text-[#a21caf]">
                            Forgot password?
                          </Link>
                        ) : null
                      }
                      fieldTrailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="text-neutral-400 transition hover:text-neutral-700"
                        >
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      }
                    />
                  ) : null}

                  {mode === 'sign-in' ? (
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-600">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        style={{ accentColor: '#C026D3' }}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      Remember me for 30 days
                    </label>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busy}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-neutral-950 px-6 py-4 font-headline text-base font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? 'Working…' : copy.submit}
                    <span className="material-symbols-outlined text-lg transition group-hover:translate-x-0.5" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                </form>

              {message ? <Message tone={tone}>{message}</Message> : null}

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
                {mode === 'sign-in' ? (
                  <span>
                    New here?{' '}
                    <Link href="/sign-up" className="font-semibold text-neutral-900 hover:underline">
                      Create an account
                    </Link>
                  </span>
                ) : null}
                {mode === 'sign-up' ? (
                  <span>
                    Already registered?{' '}
                    <Link href="/sign-in" className="font-semibold text-neutral-900 hover:underline">
                      Sign in
                    </Link>
                  </span>
                ) : null}
                {mode === 'recover' || mode === 'password' ? (
                  <Link href="/sign-in" className="font-semibold text-neutral-900 hover:underline">
                    Back to sign in
                  </Link>
                ) : null}
                {mode === 'sign-in' ? (
                  <Link href="/recover" className="transition hover:text-neutral-900">
                    Forgot password?
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="px-6 pb-7 text-center text-[11px] text-neutral-400 sm:px-10 sm:text-xs">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-5">
              <a href="mailto:support@vydrivo.com" className="underline underline-offset-4 transition hover:text-neutral-700">
                Help &amp; Support
              </a>
              <span aria-hidden="true">·</span>
              <span title="Not published in this local build" className="underline underline-offset-4">
                Privacy Policy
              </span>
              <span aria-hidden="true">·</span>
              <span title="Not published in this local build" className="underline underline-offset-4">
                Terms of Service
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
