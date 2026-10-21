'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { readDraft } from '../lib/project-draft.js';

export default function AuthProjectEntry() {
  const [draft, setDraft] = useState(undefined);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'verify'
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form fields state
  const [email, setEmail] = useState('creator@agency.design');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Jane Doe');
  const [pin, setPin] = useState(['4', '8', '2', '', '', '']);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setDraft(readDraft(window.sessionStorage));
      }
    } catch {
      setDraft(null);
    }
  }, []);

  function handleSignIn(e) {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('Authenticating workspace access...');
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage('✓ Authenticated! Loading storyboard studio...');
    }, 1000);
  }

  function handleSignUp(e) {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('Creating your creator workspace...');
    setTimeout(() => {
      setIsLoading(false);
      setAuthMode('verify');
      setStatusMessage('');
    }, 1100);
  }

  function handleForgot(e) {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('Generating secure verification link...');
    setTimeout(() => {
      setIsLoading(false);
      setAuthMode('verify');
      setStatusMessage('');
    }, 900);
  }

  function handleVerify(e) {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('Verifying credentials...');
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage('✓ Verification complete! Preparing project workspace...');
    }, 1000);
  }

  function handlePinChange(index, val) {
    const updated = [...pin];
    updated[index] = val.slice(-1);
    setPin(updated);
    if (val && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row antialiased bg-white selection:bg-[#D946EF] selection:text-white font-body text-[#0B0B0C]">
      {/* ========================================================================= */}
      {/* LEFT HALF — The Creative Showcase (Obsidian Glow & Velos Aesthetic)       */}
      {/* ========================================================================= */}
      <section className="w-full lg:w-1/2 bg-[#141113] relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-14 text-white min-h-[640px] lg:min-h-screen border-b lg:border-b-0 lg:border-r border-neutral-900">
        {/* Atmospheric Ambient Lighting Effects */}
        <div className="pointer-events-none absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-[#D946EF]/25 blur-[120px] opacity-75" />
        <div className="pointer-events-none absolute top-1/3 -left-36 w-[480px] h-[480px] rounded-full bg-[#F0839E]/20 blur-[130px] opacity-70" />
        <div className="pointer-events-none absolute -bottom-36 left-1/4 w-[560px] h-[560px] rounded-full bg-[#7C3AED]/20 blur-[140px] opacity-65" />

        {/* Subtle Grid Background Overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* 1. Top Header Brand Bar */}
        <header className="relative z-10 flex items-center justify-between w-full">
          <Link className="group flex items-center gap-3 transition-transform active:scale-95" href="/">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D946EF] via-[#F0839E] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-fuchsia-500/25 p-0.5 group-hover:scale-105 transition-transform">
              <span
                className="material-symbols-outlined text-white text-lg ml-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-headline text-2xl font-bold tracking-tight text-white group-hover:text-neutral-200 transition-colors">
                Vydrivo
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-xs font-mono text-neutral-300 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Online</span>
          </div>
        </header>

        {/* 2. Middle Narrative Section & Floating Mockup */}
        <div className="relative z-10 my-8 lg:my-auto flex flex-col justify-center space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 self-start bg-white/[0.08] backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium tracking-wider text-fuchsia-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />
            <span>STORYBOARD FIRST WORKFLOW</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-white leading-[1.12]">
              Turn your idea into a{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 via-pink-300 to-amber-200 bg-clip-text text-transparent">
                video you can shape.
              </span>
            </h1>
            <p className="font-body text-neutral-300 text-sm sm:text-base leading-relaxed">
              Review scripts and storyboards before generation, with scene-level revisions and clean vertical MP4 export.
            </p>
          </div>

          {/* Active project draft badge if entered from homepage */}
          {draft && draft.topic && (
            <div className="rounded-xl border border-brand-magenta/40 bg-fuchsia-950/40 p-3 text-xs text-fuchsia-200 flex items-center justify-between">
              <div className="truncate mr-2">
                <span className="font-mono uppercase text-[10px] text-fuchsia-400 block font-bold">
                  Target Topic / Outline
                </span>
                <span className="font-medium text-white truncate block">&ldquo;{draft.topic}&rdquo;</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-magenta text-white font-bold whitespace-nowrap">
                Draft Loaded
              </span>
            </div>
          )}

          {/* Floating Mockup Card */}
          <div className="relative rounded-2xl bg-neutral-900/80 border border-white/15 p-4 sm:p-5 shadow-2xl backdrop-blur-xl overflow-hidden group">
            <div className="absolute -right-16 -bottom-16 w-44 h-44 bg-fuchsia-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row gap-5 items-center">
              {/* Phone Mockup Frame */}
              <div className="relative w-36 h-56 sm:w-40 sm:h-60 rounded-xl overflow-hidden bg-neutral-950 border border-white/20 shrink-0 shadow-lg flex flex-col justify-between p-3">
                <video
                  src="/videos/hero.mp4"
                  poster="https://lh3.googleusercontent.com/aida-public/AB6AXuDY-BHmjyzHtsMxr1BEgEnysQzqBgmMnRhcGhdUH5Pzu0JEhvnOGShR4EsyQEQrcNxk2YcIKkw5MA0Kt0P_T43q5eaiav6TTjPV3y0og4TS0n87gqpMCDlgHaqgGoBvbT2PMv-_fSqDw73IiwGKdOVhGV_E9mtbR9nawUCWRZbAPeZ6-Zar67xcwwWsp45I02-l2YX5DUQL2lhVlUfjaN0iKQ0cbeeeXmBy_1BZO9vvWeCtnN2GtyWE1aku-zU0q8NR92F0Yx13VqRs"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen scale-105"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-fuchsia-300 border border-fuchsia-500/30 font-semibold">
                    9:16 VERTICAL
                  </span>
                  <span className="text-[10px] font-mono text-white/80 bg-white/10 px-1 rounded">
                    1080×1920
                  </span>
                </div>
                <div className="relative z-10 space-y-2">
                  <p className="text-[11px] font-bold text-white leading-tight drop-shadow-md">
                    &ldquo;Review script beats before compute.&rdquo;{' '}
                    <span className="text-fuchsia-400 font-semibold">Approved</span>
                  </p>
                  <div className="flex items-end gap-1 h-5 pt-1">
                    <span className="waveform-bar w-1 bg-fuchsia-400 rounded-full" style={{ animationDelay: '0.1s' }} />
                    <span className="waveform-bar w-1 bg-pink-400 rounded-full" style={{ animationDelay: '0.3s' }} />
                    <span className="waveform-bar w-1 bg-amber-400 rounded-full" style={{ animationDelay: '0.15s' }} />
                    <span className="waveform-bar w-1 bg-fuchsia-500 rounded-full" style={{ animationDelay: '0.4s' }} />
                    <span className="waveform-bar w-1 bg-rose-400 rounded-full" style={{ animationDelay: '0.25s' }} />
                    <span className="waveform-bar w-1 bg-amber-300 rounded-full" style={{ animationDelay: '0.5s' }} />
                    <span className="waveform-bar w-1 bg-fuchsia-300 rounded-full" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>

              {/* Mockup details side */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                    <span className="text-xs font-mono font-medium text-neutral-300">Storyboard Beat Review</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">30 fps</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white font-headline">Scene 02: Core Concept</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Scene-level narration timing, caption styling, and shot sequencing.
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-amber-300 h-full w-[42%] rounded-full" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                    <span>00:14</span>
                    <span>00:30</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-xs">auto_awesome</span> Synced Narration
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-300 font-mono">
                    Vertical MP4
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Trust Badges & Footer */}
        <footer className="relative z-10 pt-6 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-5 text-xs text-neutral-300 font-medium">
            <div className="flex items-center gap-1.5 text-neutral-200">
              <span className="text-fuchsia-400 font-bold">✓</span>
              <span>Review storyboard before render compute</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-200">
              <span className="text-fuchsia-400 font-bold">✓</span>
              <span>9:16 vertical 1080×1920 MP4 export</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-200">
              <span className="text-fuchsia-400 font-bold">✓</span>
              <span>Synchronized voiceover &amp; kinetic captions</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-200">
              <span className="text-fuchsia-400 font-bold">✓</span>
              <span>Direct download &amp; conditional Instagram publishing</span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 pt-1 font-mono">© 2026 Vydrivo Inc. All rights reserved.</p>
        </footer>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT HALF — The Authentication Form (Pristine Canvas Matching Homepage)  */}
      {/* ========================================================================= */}
      <main className="w-full lg:w-1/2 bg-[#FAFAFA] lg:bg-white flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12 min-h-screen relative">
        {/* Top Utility Bar (Back to home + Support) */}
        <div className="w-full max-w-[420px] flex items-center justify-between pt-2">
          <Link
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors"
            href="/"
          >
            <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>Back to homepage</span>
          </Link>
          <span className="text-xs text-neutral-500">
            Need help?{' '}
            <a
              className="text-neutral-900 font-semibold underline hover:text-[#D946EF] transition-colors"
              href="#support"
              onClick={(e) => {
                e.preventDefault();
                alert('Support channel: support@vydrivo.com — We are here to assist with your video projects.');
              }}
            >
              Support
            </a>
          </span>
        </div>

        {/* Centered Form Container */}
        <div className="w-full max-w-[420px] py-8 my-auto space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                  Auth View Mode
                </span>
                <span className="text-[11px] font-mono text-[#D946EF] font-semibold">
                  Interactive States
                </span>
              </div>

              {/* View Switcher Tabs */}
              <div className="bg-[#F4F4F5] p-1 rounded-xl flex flex-wrap gap-1 border border-neutral-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setStatusMessage('');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    authMode === 'signin'
                      ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/70'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setStatusMessage('');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    authMode === 'signup'
                      ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/70'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setStatusMessage('');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    authMode === 'forgot'
                      ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/70'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('verify');
                    setStatusMessage('');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    authMode === 'verify'
                      ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/70'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Verification
                </button>
              </div>
            </div>

            {/* Interactive Demo Status Alerts */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px]">
              <span className="text-neutral-400 shrink-0 font-medium">Quick test state:</span>
              <button
                type="button"
                onClick={() => setShowErrorAlert(!showErrorAlert)}
                className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer shrink-0 font-mono"
              >
                Toggle Error Alert
              </button>
              <button
                type="button"
                onClick={() => setShowExpiredAlert(!showExpiredAlert)}
                className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer shrink-0 font-mono"
              >
                Toggle Expired Alert
              </button>
            </div>

            {/* Error Alert Box */}
            {showErrorAlert && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
                <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">
                  error
                </span>
                <div>
                  <p className="font-semibold">Invalid credentials</p>
                  <p className="text-rose-700 mt-0.5 leading-relaxed">
                    The email or password you entered is incorrect. Please check your spelling and try again.
                  </p>
                </div>
              </div>
            )}

            {/* Expired Alert Box */}
            {showExpiredAlert && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">
                  warning
                </span>
                <div>
                  <p className="font-semibold">Reset link expired</p>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    This password reset link has expired. Request a new password reset link below.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 1. SIGN IN VIEW */}
          {authMode === 'signin' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#0B0B0C]">
                  Sign In to Vydrivo
                </h2>
                <p className="font-body text-sm text-neutral-500">
                  Access your storyboard editor, scripts, and video generations.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-4 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setStatusMessage('Redirecting to Google Auth...');
                      setTimeout(() => {
                        setIsLoading(false);
                        setStatusMessage('✓ Connected via Google! Opening workspace...');
                      }, 1000);
                    }}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-neutral-200 hover:border-neutral-300 rounded-xl font-medium text-sm text-neutral-800 bg-white hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-neutral-200" />
                    <span className="bg-white px-3 text-xs text-neutral-400 font-medium absolute select-none">
                      or sign in with email
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 tracking-tight" htmlFor="signin-email">
                    Work email
                  </label>
                  <div className="relative flex items-center rounded-xl border border-[#ECECEA] bg-white px-3.5 py-2.5 text-sm transition-all focus-within:border-[#D946EF] focus-within:ring-4 focus-within:ring-[#D946EF]/10 hover:border-neutral-300">
                    <span className="material-symbols-outlined text-neutral-400 text-lg mr-2.5 select-none">
                      mail
                    </span>
                    <input
                      className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-body"
                      id="signin-email"
                      placeholder="you@company.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-neutral-700 tracking-tight" htmlFor="signin-password">
                      Password
                    </label>
                    <button
                      className="text-xs font-semibold text-[#D946EF] hover:text-fuchsia-700 transition-colors cursor-pointer"
                      onClick={() => setAuthMode('forgot')}
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center justify-between rounded-xl border border-[#ECECEA] bg-white px-3.5 py-2.5 text-sm transition-all focus-within:border-[#D946EF] focus-within:ring-4 focus-within:ring-[#D946EF]/10 hover:border-neutral-300">
                    <div className="flex items-center w-full mr-2">
                      <span className="material-symbols-outlined text-neutral-400 text-lg mr-2.5 select-none">
                        lock
                      </span>
                      <input
                        className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 tracking-widest focus:outline-none font-mono"
                        id="signin-password"
                        placeholder="••••••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <button
                      aria-label="Toggle password visibility"
                      className="text-neutral-400 hover:text-neutral-700 focus:outline-none flex items-center cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      defaultChecked
                      className="w-4 h-4 rounded text-[#D946EF] border-neutral-300 focus:ring-[#D946EF] focus:ring-offset-0 cursor-pointer accent-[#D946EF]"
                      type="checkbox"
                    />
                    <span className="text-xs text-neutral-600 font-medium">Remember me for 30 days</span>
                  </label>
                </div>

                <button
                  className="h-11 w-full rounded-xl bg-[#0B0B0C] hover:bg-neutral-900 text-white font-semibold text-sm shadow-md shadow-neutral-950/15 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 2. CREATE ACCOUNT VIEW */}
          {authMode === 'signup' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#0B0B0C]">
                  Create Account
                </h2>
                <p className="font-body text-sm text-neutral-500">
                  Start turning prompts and scripts into vertical videos.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-4 mb-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-neutral-200 hover:border-neutral-300 rounded-xl font-medium text-sm text-neutral-800 bg-white hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-neutral-200" />
                    <span className="bg-white px-3 text-xs text-neutral-400 font-medium absolute select-none">
                      or sign up with email
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 tracking-tight" htmlFor="signup-name">
                    Full name
                  </label>
                  <div className="relative flex items-center rounded-xl border border-[#ECECEA] bg-white px-3.5 py-2.5 text-sm transition-all focus-within:border-[#D946EF] focus-within:ring-4 focus-within:ring-[#D946EF]/10 hover:border-neutral-300">
                    <span className="material-symbols-outlined text-neutral-400 text-lg mr-2.5 select-none">
                      person
                    </span>
                    <input
                      className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-body"
                      id="signup-name"
                      placeholder="Jane Doe"
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 tracking-tight" htmlFor="signup-email">
                    Work email
                  </label>
                  <div className="relative flex items-center rounded-xl border border-[#ECECEA] bg-white px-3.5 py-2.5 text-sm transition-all focus-within:border-[#D946EF] focus-within:ring-4 focus-within:ring-[#D946EF]/10 hover:border-neutral-300">
                    <span className="material-symbols-outlined text-neutral-400 text-lg mr-2.5 select-none">
                      mail
                    </span>
                    <input
                      className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-body"
                      id="signup-email"
                      placeholder="you@company.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-neutral-700 tracking-tight" htmlFor="signup-password">
                      Create password
                    </label>
                    <span className="text-[11px] text-neutral-400 font-mono">Min. 8 characters</span>
                  </div>
                  <div className="relative flex items-center justify-between rounded-xl border border-[#ECECEA] bg-white px-3.5 py-2.5 text-sm transition-all focus-within:border-[#D946EF] focus-within:ring-4 focus-within:ring-[#D946EF]/10 hover:border-neutral-300">
                    <div className="flex items-center w-full mr-2">
                      <span className="material-symbols-outlined text-neutral-400 text-lg mr-2.5 select-none">
                        lock
                      </span>
                      <input
                        className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 tracking-widest focus:outline-none font-mono"
                        id="signup-password"
                        minLength={8}
                        placeholder="••••••••••••"
                        required
                        type="password"
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="h-11 w-full rounded-xl bg-[#0B0B0C] hover:bg-neutral-900 text-white font-semibold text-sm shadow-md shadow-neutral-950/15 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 3. FORGOT PASSWORD VIEW */}
          {authMode === 'forgot' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#0B0B0C]">
                  Reset password
                </h2>
                <p className="font-body text-sm text-neutral-500">
                  Enter your work email and we&apos;ll send you a password reset link.
                </p>
              </div>

              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 tracking-tight" htmlFor="forgot-email">
                    Work email
                  </label>
                  <div className="relative flex items-center rounded-xl border border-[#ECECEA] bg-white px-3.5 py-2.5 text-sm transition-all focus-within:border-[#D946EF] focus-within:ring-4 focus-within:ring-[#D946EF]/10 hover:border-neutral-300">
                    <span className="material-symbols-outlined text-neutral-400 text-lg mr-2.5 select-none">
                      mail
                    </span>
                    <input
                      className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-body"
                      id="forgot-email"
                      placeholder="you@company.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="h-11 w-full rounded-xl bg-[#0B0B0C] hover:bg-neutral-900 text-white font-semibold text-sm shadow-md shadow-neutral-950/15 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                        send
                      </span>
                    </>
                  )}
                </button>
                <button
                  className="w-full text-center text-xs text-neutral-600 hover:text-neutral-950 font-semibold py-1 transition-colors cursor-pointer"
                  onClick={() => setAuthMode('signin')}
                  type="button"
                >
                  Back to sign in
                </button>
              </form>
            </div>
          )}

          {/* 4. PENDING VERIFICATION VIEW */}
          {authMode === 'verify' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#0B0B0C]">
                  Check your inbox
                </h2>
                <p className="font-body text-sm text-neutral-500">
                  We sent a 6-digit verification code to{' '}
                  <span className="font-semibold text-neutral-800 font-mono">{email}</span>.
                </p>
              </div>

              <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-3.5 text-xs text-neutral-700 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#D946EF] text-base shrink-0 mt-0.5">
                  mark_email_read
                </span>
                <div>
                  <p className="font-semibold text-neutral-900">Verification code sent</p>
                  <p className="text-neutral-600 mt-0.5 leading-relaxed">
                    Enter the code below or click the magic link in your email to authenticate.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 tracking-tight">
                    6-digit code
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {pin.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`pin-${idx}`}
                        className="w-full text-center py-2.5 text-base font-mono font-bold rounded-lg border border-[#ECECEA] bg-white focus:border-[#D946EF] focus:ring-2 focus:ring-[#D946EF]/20 focus:outline-none"
                        maxLength={1}
                        value={digit}
                        placeholder="-"
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className="h-11 w-full rounded-xl bg-[#0B0B0C] hover:bg-neutral-900 text-white font-semibold text-sm shadow-md shadow-neutral-950/15 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                  ) : (
                    <span>Verify and Continue</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                  <button
                    className="hover:text-[#D946EF] underline cursor-pointer"
                    type="button"
                    onClick={() => {
                      setStatusMessage('New 6-digit code resent to ' + email);
                      setTimeout(() => setStatusMessage(''), 3000);
                    }}
                  >
                    Resend code
                  </button>
                  <button
                    className="hover:text-neutral-800 font-semibold cursor-pointer"
                    onClick={() => setAuthMode('signin')}
                    type="button"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feedback status message */}
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-fuchsia-50 border border-fuchsia-200 text-xs font-medium text-brand-magenta text-center animate-pulse">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer Legal & Support Links */}
        <div className="w-full max-w-[420px] text-center pb-2">
          <p className="text-xs text-neutral-500 leading-relaxed">
            <a
              className="hover:text-neutral-900 underline transition-colors mr-2"
              href="#help"
              onClick={(e) => {
                e.preventDefault();
                alert('Vydrivo Help Center: Documentation and tutorials are in active development.');
              }}
            >
              Help &amp; Support
            </a>{' '}
            ·{' '}
            <a
              className="hover:text-neutral-900 underline transition-colors mx-2"
              href="#privacy"
              onClick={(e) => {
                e.preventDefault();
                alert('Privacy Policy: All inputs remain strictly in your browser session. No data is stored or transferred.');
              }}
            >
              Privacy Policy
            </a>{' '}
            ·{' '}
            <a
              className="hover:text-neutral-900 underline transition-colors ml-2"
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                alert('Terms of Service: Vydrivo Prototype V1 private evaluation terms apply.');
              }}
            >
              Terms of Service
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
