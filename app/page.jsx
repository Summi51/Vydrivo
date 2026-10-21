'use client';

import { useState, useRef, useEffect } from 'react';
import IdeaForm from '../components/IdeaForm';

export default function Home() {
  // Hero Video State
  const heroVideoRef = useRef(null);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [heroMuted, setHeroMuted] = useState(true);
  const [heroProgress, setHeroProgress] = useState(32);
  const [heroCurrentTime, setHeroCurrentTime] = useState('00:24');
  const [activeHeroScene, setActiveHeroScene] = useState('02');

  const heroScenes = {
    '01': {
      title: 'Scene 01: The Hook',
      timestamp: '00:00 - 00:12',
      narration: 'Software teams move fast, yet pull requests sit untouched for an average of 36 hours.',
      video: '/videos/demo1.mp4',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYM0jmaCVTO5EB9lTs-ZTWgvL7gT8hOtmpK2A5N6WdJ33ab_7NPBT3eV_jaOQndRYFu6FtgnJXo_pcnXbT81dUhKyMjT_RLxfkcQEuDyMOt7UV3h2dGNLytu7eIl6ukjfNIP8U651ePGNRVC7-eF32UuxISb44wRqqQcY89HVgw0d-SbnnRLwOgwAZ5H0S36pl2ipW0cZ_AXFCjarexZcOWlctSSSXz_IjtJpFCW9ICVZMin3D2bJJFBfVtJOGnNsvzcSCVWgIZhk5',
    },
    '02': {
      title: 'Scene 02: Core Concept',
      timestamp: '00:12 - 00:28',
      narration: 'Code review bottlenecks occur when pull requests lack concise intent.',
      video: '/videos/hero.mp4',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIV0JoZMadF19gjijFKdr1isf8BQ1mgOOAYEugoOotR6WscEFQjWR3PLKzFoN0OBVWU9WQ9FAO-qXGDjVOxsXO68xTKcnP4gVpGgm1eegYStQVI3W9_LXbGcOmsaqDVNiWEZ3hdVOS4_hvz7oFUpGP_W4IPGwMmJmSv7y9oPMD_Bw4zI3Itq2btsoqkLdxLES2y0VwKbYP5tcYhC8bJ0phiC-RNIDsTwREdZNRu96luyyCAUSRW0q4LmnlKE68SW_RQKP5If9g91tL',
    },
    '03': {
      title: 'Scene 03: The Solution',
      timestamp: '00:28 - 00:44',
      narration: 'Principle one: Keep diffs under 200 lines. Principle two: Explicit test proof.',
      video: '/videos/demo2.mp4',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwQewnKrWVfihRzzTkE5sRXTwxlJtujsPx9-UH6b4GXS8T2Hf0nwlotvrrUWl6PUCEOxybQAem1Eb9qbYO8PS-KBtdHEKUK_2c76GyUYO3nRne4zTXr1T-TiHk-JyUeOcW9fPnC3N_7OuLLXVteZ_7_EWjcLXWrU0q0usdYSpCGOP17cpLLEl2zrJQhiEcmzgshgaAgXed53Bs4N1ThyUTxfKaP-EwHy0nKq8Mim3Sg8IAW0KJd040hOoicdlQRiMK4cyhmAh2DAwr',
    },
  };

  function toggleHeroPlay() {
    if (!heroVideoRef.current) return;
    if (heroPlaying) {
      heroVideoRef.current.pause();
      setHeroPlaying(false);
    } else {
      heroVideoRef.current.play().catch(() => {});
      setHeroPlaying(true);
    }
  }

  function handleHeroTimeUpdate() {
    if (!heroVideoRef.current) return;
    const v = heroVideoRef.current;
    if (v.duration) {
      const pct = (v.currentTime / v.duration) * 100;
      setHeroProgress(pct);
      const mins = Math.floor(v.currentTime / 60);
      const secs = Math.floor(v.currentTime % 60);
      setHeroCurrentTime(
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }
  }

  // Storyboard Studio State
  const [activeBeat, setActiveBeat] = useState(2);
  const [beatScript, setBeatScript] = useState(
    'Code review bottlenecks occur when pull requests lack concise intent.'
  );
  const [isReRendering, setIsReRendering] = useState(false);
  const [renderToast, setRenderToast] = useState('');

  function handleReRender() {
    setIsReRendering(true);
    setRenderToast('Re-rendering Beat 02...');
    setTimeout(() => {
      setIsReRendering(false);
      setRenderToast('✓ Beat 02 re-rendered with new narration!');
      setTimeout(() => setRenderToast(''), 3500);
    }, 1400);
  }

  // Concept Demos Video State
  const [activeDemoPlaying, setActiveDemoPlaying] = useState({ 1: true, 2: false, 3: false });
  const demoRefs = { 1: useRef(null), 2: useRef(null), 3: useRef(null) };

  function toggleDemo(id) {
    const v = demoRefs[id].current;
    if (!v) return;
    if (activeDemoPlaying[id]) {
      v.pause();
      setActiveDemoPlaying((p) => ({ ...p, [id]: false }));
    } else {
      v.play().catch(() => {});
      setActiveDemoPlaying((p) => ({ ...p, [id]: true }));
    }
  }

  // Pricing State
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'annual'

  // Bottom CTA
  const [ctaInput, setCtaInput] = useState('');
  const [ctaMessage, setCtaMessage] = useState('');

  function handleCtaSubmit(e) {
    e.preventDefault();
    if (!ctaInput.trim()) {
      setCtaMessage('Please enter a topic or rough notes to begin.');
      return;
    }
    setCtaMessage('Storyboard draft initialized for your topic! Review step ready.');
  }

  return (
    <>
      {/* 1. NAVIGATION BAR (V1 tag removed after brand name) */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg border-b border-neutral-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            className="flex items-center gap-2.5 font-headline text-xl font-bold tracking-tight text-neutral-900 group"
            href="#"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D946EF] via-[#F0839E] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-fuchsia-500/25 group-hover:scale-105 transition-transform">
              <span
                className="material-symbols-outlined text-white text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
            <span className="tracking-tighter-headline text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-700">
              Vydrivo
            </span>
          </a>

          {/* Centered Links */}
          <div className="hidden md:flex items-center space-x-7 font-headline text-sm font-medium tracking-tight">
            <a
              className="text-neutral-700 hover:text-brand-magenta transition-colors duration-150"
              href="#workflow"
            >
              Workflow
            </a>
            <a
              className="text-neutral-700 hover:text-brand-magenta transition-colors duration-150"
              href="#storyboard-studio"
            >
              Storyboard Studio
            </a>
            <a
              className="text-neutral-700 hover:text-brand-magenta transition-colors duration-150"
              href="#specs"
            >
              Export Specs
            </a>
            <a
              className="text-neutral-700 hover:text-brand-magenta transition-colors duration-150"
              href="#demos"
            >
              Concept Demos
            </a>
            <a
              className="text-neutral-700 hover:text-brand-magenta transition-colors duration-150"
              href="#pricing"
            >
              Pricing
            </a>
            <a
              className="text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
              href="#docs"
            >
              Docs
            </a>
          </div>

          {/* Right Trailing Action Button */}
          <div className="flex items-center">
            <a
              className="bg-gradient-to-r from-[#D946EF] via-[#F0839E] to-[#7C3AED] hover:opacity-95 text-white text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-md shadow-fuchsia-500/20 active:scale-[0.98] flex items-center gap-1.5"
              href="#start"
            >
              <span>Start a project</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </a>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12" id="start">
        <div className="relative bg-canvas-darkCard rounded-2xl overflow-hidden px-6 sm:px-10 lg:px-14 py-12 lg:py-16 text-white border border-[#2B231D] shadow-2xl">
          {/* Ambient Sunset Glow */}
          <div className="absolute inset-0 hero-sunset-glow pointer-events-none animate-pulse-glow" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Hero Left Column */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 w-fit">
                <span className="w-2 h-2 rounded-full bg-brand-magenta animate-ping" />
                <span className="text-xs font-mono font-medium tracking-wide text-white/90">
                  VYDRIVO · REVIEWABLE AI STORYBOARD PIPELINE
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-white tracking-tighter-headline leading-[1.03]">
                Turn your idea into a video{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber animate-shimmer-text">
                  you can shape.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-white/80 text-base sm:text-lg font-normal leading-relaxed max-w-xl">
                Idea → Review script and storyboard → Generate AI footage and narration → Revise
                scenes → Preview and download MP4. From topic or raw notes to an AI-directed
                vertical video with reviewable pacing, synchronized voiceover, and vertical MP4
                export.
              </p>

              {/* Topic / Rough Notes Input Container */}
              <IdeaForm />
            </div>

            {/* Hero Right Column: 9:16 Vertical Video Preview Player (Dynamic HTML5 Video) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-magenta/30 via-brand-coral/20 to-brand-violet/35 blur-3xl rounded-full opacity-60 animate-pulse-glow" />

              {/* Phone Frame Container */}
              <div className="relative w-[285px] sm:w-[315px] bg-[#120E13] border-4 border-white/20 rounded-[36px] p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-md transition-transform hover:scale-[1.01]">
                {/* Top Notch */}
                <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                </div>

                {/* 9:16 Canvas with Dynamic Video */}
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-950 border border-white/10 group">
                  {/* Dynamic HTML5 Video Player */}
                  <video
                    ref={heroVideoRef}
                    key={activeHeroScene}
                    src={heroScenes[activeHeroScene].video}
                    poster={heroScenes[activeHeroScene].poster}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted={heroMuted}
                    loop
                    autoPlay
                    onTimeUpdate={handleHeroTimeUpdate}
                    onClick={toggleHeroPlay}
                  />

                  {/* Gradient Vignette Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/60 pointer-events-none" />

                  {/* Top Overlay Badge with Scene Tabs */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 text-[9px] font-mono">
                    <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md p-0.5 rounded-lg border border-white/15">
                      {['01', '02', '03'].map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => {
                            setActiveHeroScene(sc);
                            setHeroPlaying(true);
                          }}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            activeHeroScene === sc
                              ? 'bg-brand-magenta text-white shadow-sm'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          S{sc}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded-md border border-white/15">
                      <button
                        type="button"
                        onClick={() => setHeroMuted(!heroMuted)}
                        className="text-white/80 hover:text-white"
                        title={heroMuted ? 'Unmute' : 'Mute'}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {heroMuted ? 'volume_off' : 'volume_up'}
                        </span>
                      </button>
                      <span className="text-brand-coral font-bold">9:16 · 30fps</span>
                    </div>
                  </div>

                  {/* Center Interactive Play Pulse (clickable) */}
                  <div
                    onClick={toggleHeroPlay}
                    className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity duration-200 ${
                      heroPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-transform">
                      <span
                        className="material-symbols-outlined text-3xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {heroPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </div>
                  </div>

                  {/* Storyboard Beat Tag */}
                  <div className="absolute bottom-28 left-3 z-10">
                    <span className="px-2 py-1 rounded-md bg-brand-violet/90 text-white font-mono text-[9px] font-bold flex items-center gap-1 border border-purple-400/30 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[11px]">edit_note</span>{' '}
                      Beat {parseInt(activeHeroScene)} of 5 · Live Preview
                    </span>
                  </div>

                  {/* Lower-Third Synced Voiceover Box */}
                  <div className="absolute bottom-3 inset-x-3 bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl p-3 z-10">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-brand-magenta text-white font-mono uppercase tracking-wider">
                          Studio Narration
                        </span>
                        {/* Waveform Bars */}
                        <div className="flex items-center gap-0.5 h-3">
                          <span
                            className={`w-0.5 bg-brand-coral rounded-full ${
                              heroPlaying ? 'waveform-bar' : 'h-2'
                            }`}
                            style={{ animationDelay: '0.1s' }}
                          />
                          <span
                            className={`w-0.5 bg-brand-coral rounded-full ${
                              heroPlaying ? 'waveform-bar' : 'h-3'
                            }`}
                            style={{ animationDelay: '0.3s' }}
                          />
                          <span
                            className={`w-0.5 bg-brand-coral rounded-full ${
                              heroPlaying ? 'waveform-bar' : 'h-1.5'
                            }`}
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span
                            className={`w-0.5 bg-brand-coral rounded-full ${
                              heroPlaying ? 'waveform-bar' : 'h-2.5'
                            }`}
                            style={{ animationDelay: '0.4s' }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-white/50">
                        {heroScenes[activeHeroScene].timestamp}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white tracking-tight leading-snug line-clamp-2">
                      &ldquo;{heroScenes[activeHeroScene].narration}&rdquo;
                    </p>

                    {/* Scrub Progress Bar */}
                    <div className="mt-2 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-magenta to-brand-coral transition-all duration-150 rounded-full"
                        style={{ width: `${heroProgress}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-white/50 pt-0.5">
                      <span>{heroCurrentTime} / 01:14</span>
                      <span className="text-white/80">1080×1920 · H.264</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mockup Footnote */}
              <div className="mt-3 text-center text-xs font-mono text-white/60">
                Live interactive footage preview · Click to play/pause
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURE BADGES STRIP */}
      <section className="max-w-7xl mx-auto px-6 py-4 border-b border-canvas-border">
        <div className="flex flex-wrap items-center justify-center lg:justify-between gap-3 text-xs font-mono text-neutral-700">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-soft border border-canvas-border hover:border-brand-magenta/40 transition-colors">
            <span className="material-symbols-outlined text-brand-magenta text-base">timer</span>
            <span>AI-Selected 60–90s Runtime (No duration selector)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-soft border border-canvas-border hover:border-brand-coral/40 transition-colors">
            <span className="material-symbols-outlined text-brand-coral text-base">smartphone</span>
            <span>1080×1920 Vertical 9:16 @ 30 fps</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-soft border border-canvas-border hover:border-brand-violet/40 transition-colors">
            <span className="material-symbols-outlined text-brand-violet text-base">graphic_eq</span>
            <span>Studio Narration &amp; Synced Captions</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-soft border border-canvas-border hover:border-brand-amber/40 transition-colors">
            <span className="material-symbols-outlined text-brand-amber text-base">download</span>
            <span>Direct Manual MP4 Download</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas-soft border border-canvas-border hover:border-brand-emerald/40 transition-colors">
            <span className="material-symbols-outlined text-brand-emerald text-base">verified</span>
            <span>Conditional Instagram Publishing</span>
          </div>
        </div>
      </section>

      {/* 4. SECTION 2: THE PRODUCTION PIPELINE (ANIMATED) */}
      <section className="max-w-7xl mx-auto px-6 py-20" id="workflow">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-magenta bg-fuchsia-50 px-3 py-1 rounded-full border border-fuchsia-200">
            Architecture
          </span>
          {/* Animated Header */}
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight-heading text-neutral-900 mt-4 mb-3">
            The{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber animate-shimmer-text">
              Production Pipeline
            </span>
          </h2>
          <p className="text-neutral-600 text-base sm:text-lg">
            A structured, human-guided generation workflow designed to avoid black-box video mistakes.
          </p>
        </div>

        {/* Animated Connecting Track */}
        <div className="relative">
          <div className="hidden lg:block absolute top-10 left-12 right-12 h-1 bg-gradient-to-r from-neutral-200 via-fuchsia-200 to-emerald-200 rounded-full overflow-hidden pointer-events-none">
            <div className="w-1/3 h-full bg-gradient-to-r from-brand-magenta to-brand-coral rounded-full animate-pipeline-beam" />
          </div>

          {/* 4-Step Pipeline Sequence Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {/* Step 1 */}
            <div className="bg-canvas-soft rounded-2xl p-6 border border-canvas-border flex flex-col justify-between hover:border-brand-magenta/40 hover:-translate-y-1.5 transition-all duration-300 shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm font-bold text-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-200/70">
                    01
                  </span>
                  <span className="material-symbols-outlined text-neutral-400">subject</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Topic or Notes</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Freeform text, thesis points, or rough outline. The engine parses core claims,
                  pacing structure, and logical progression automatically.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
                Input: Unstructured thoughts
              </div>
            </div>

            {/* Step 2 (Gatekeeper Stage - Featured with glow) */}
            <div className="bg-canvas-soft rounded-2xl p-6 border-2 border-brand-magenta relative flex flex-col justify-between shadow-lg shadow-fuchsia-500/10 hover:-translate-y-1.5 transition-all duration-300">
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-brand-magenta text-white font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse">
                Gatekeeper Stage
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm font-bold text-brand-magenta px-2.5 py-1 rounded-lg bg-fuchsia-100">
                    02
                  </span>
                  <span className="material-symbols-outlined text-brand-magenta">rate_review</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  Review Script &amp; Storyboard
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Inspect scene beats, adjust narration phrasing, swap visuals, and approve camera
                  direction before rendering commences.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-fuchsia-200 text-[11px] font-mono text-brand-magenta font-semibold">
                Early direction &amp; review before rendering
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-canvas-soft rounded-2xl p-6 border border-canvas-border flex flex-col justify-between hover:border-brand-violet/40 hover:-translate-y-1.5 transition-all duration-300 shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm font-bold text-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-200/70">
                    03
                  </span>
                  <span className="material-symbols-outlined text-brand-violet">movie_filter</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  Generate AI Clips &amp; Narration
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Automated generation with synchronized studio narration, ambient sound bed, and
                  kinetic typography aligned with exact timestamps.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
                Audio &amp; visual sync
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-canvas-soft rounded-2xl p-6 border border-canvas-border flex flex-col justify-between hover:border-brand-emerald/40 hover:-translate-y-1.5 transition-all duration-300 shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm font-bold text-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-200/70">
                    04
                  </span>
                  <span className="material-symbols-outlined text-brand-emerald">download</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  Scene Revisions &amp; MP4 Export
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Fine-tune individual scenes if needed by reusing unaffected clips, then recomposing
                  the finished vertical 9:16 MP4 (1080p export; source footage quality varies).
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
                Export: 1080p MP4 (source quality varies)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 3: STORYBOARD STUDIO GATEKEEPER DEEP-DIVE (ANIMATED & DYNAMIC) */}
      <section
        className="max-w-7xl mx-auto px-6 py-20 border-t border-canvas-border"
        id="storyboard-studio"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Storyboard Rationale & Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-violet bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                Storyboard Studio
              </span>
              {/* Animated Heading */}
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight-heading text-neutral-900 mt-4 leading-tight">
                Review every scene beat{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-violet via-brand-magenta to-brand-coral animate-shimmer-text">
                  before committing compute.
                </span>
              </h2>
              <p className="text-neutral-600 mt-4 text-sm sm:text-base leading-relaxed">
                Reviewing your script and storyboard allows early creative direction and
                scene-by-scene adjustments before compute begins. Vydrivo breaks the generated
                narrative into distinct, editable cards so you can guide the pacing, imagery, and
                copy.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-canvas-soft border border-canvas-border hover:border-neutral-300 transition-colors">
                <div className="flex items-center gap-2.5 font-bold text-neutral-900 text-sm mb-1">
                  <span className="material-symbols-outlined text-brand-magenta text-lg">tune</span>
                  <span>Scene-level prompt overrides</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Change lighting, subject orientation, or visual metaphor for an individual shot
                  without rewriting your whole project.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-canvas-soft border border-canvas-border hover:border-neutral-300 transition-colors">
                <div className="flex items-center gap-2.5 font-bold text-neutral-900 text-sm mb-1">
                  <span className="material-symbols-outlined text-brand-coral text-lg">edit</span>
                  <span>Editable voiceover script</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Tweak voiceover sentences line-by-line; kinetic captions and timing synchronize
                  automatically to maintain exact pacing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-canvas-soft border border-canvas-border hover:border-neutral-300 transition-colors">
                <div className="flex items-center gap-2.5 font-bold text-neutral-900 text-sm mb-1">
                  <span className="material-symbols-outlined text-brand-amber text-lg">replay</span>
                  <span>Granular single-scene re-renders</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Regenerating a scene reuses unaffected clips and then recomposes the finished video,
                  allowing targeted shot revisions without rewriting the entire project.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Storyboard Inspector Widget (Dynamic Beat Selection & Video) */}
          <div className="lg:col-span-7 bg-canvas-darkSection rounded-2xl border border-neutral-800 p-6 text-white shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-magenta text-lg">
                  view_carousel
                </span>
                <span className="font-mono text-xs text-neutral-300 font-semibold">
                  Storyboard Inspector · 5 Beats (Total: 72s)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-brand-emerald border border-emerald-500/30">
                Script Ready for Review
              </span>
            </div>

            {/* 3 Storyboard Beat Cards Stack */}
            <div className="space-y-3.5">
              {/* Scene 01 Card */}
              <div
                onClick={() => setActiveBeat(1)}
                className={`rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col sm:flex-row gap-3 ${
                  activeBeat === 1
                    ? 'bg-neutral-900 border-2 border-brand-magenta shadow-lg shadow-fuchsia-500/10'
                    : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden bg-neutral-950 flex-shrink-0 relative">
                  <video
                    src="/videos/demo1.mp4"
                    poster="https://lh3.googleusercontent.com/aida-public/AB6AXuCYM0jmaCVTO5EB9lTs-ZTWgvL7gT8hOtmpK2A5N6WdJ33ab_7NPBT3eV_jaOQndRYFu6FtgnJXo_pcnXbT81dUhKyMjT_RLxfkcQEuDyMOt7UV3h2dGNLytu7eIl6ukjfNIP8U651ePGNRVC7-eF32UuxISb44wRqqQcY89HVgw0d-SbnnRLwOgwAZ5H0S36pl2ipW0cZ_AXFCjarexZcOWlctSSSXz_IjtJpFCW9ICVZMin3D2bJJFBfVtJOGnNsvzcSCVWgIZhk5"
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/80 px-1 rounded text-white">
                    00:00 - 00:12
                  </span>
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                    <span className="font-bold text-white">BEAT 01 · THE HOOK</span>
                    <span className="text-brand-emerald flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" /> Approved
                    </span>
                  </div>
                  <p className="text-white/90 font-medium">
                    &ldquo;Software teams move fast, yet pull requests sit untouched for an average
                    of 36 hours.&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800">
                      Visual: Overhead dark code diff
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800">Cut: Fast snap</span>
                  </div>
                </div>
              </div>

              {/* Scene 02 Card (Editable Narration) */}
              <div
                onClick={() => setActiveBeat(2)}
                className={`rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col sm:flex-row gap-3 ${
                  activeBeat === 2
                    ? 'bg-neutral-900 border-2 border-brand-magenta shadow-lg shadow-fuchsia-500/15'
                    : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden bg-neutral-950 flex-shrink-0 relative">
                  <video
                    src="/videos/hero.mp4"
                    poster="https://lh3.googleusercontent.com/aida-public/AB6AXuCbVc2v1AScK5rgccOUQcVT4pRjSifBXQDSdfqZLmsM5aMMYZJHMbU-BcI6tAiFWwEnWbMBtJT_7cmue_7p2NhgTLhU0drTCvSnxV0xjwpTgvxYYa-oKfdR8xHcF_j6SJMKN8Pb7STqZ-xhZLZ-lgMWmpqhgUaqoQqycTzyqdq91Tj9NJkL4YcZwXBdSXTIumzmMT3sHCquTzwSsrDZMmy5_H4nxW6p8D1HJ9dMcl0DVg4BIpy-D_ddOz9O8XqwXTVkk_2hep5BvkYC"
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/80 px-1 rounded text-white">
                    00:12 - 00:28
                  </span>
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="font-bold text-brand-magenta">
                      BEAT 02 · CORE FRICTION (EDITING)
                    </span>
                    <span className="text-brand-amber font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
                      Live narration
                    </span>
                  </div>

                  {activeBeat === 2 ? (
                    <div className="mb-2">
                      <textarea
                        value={beatScript}
                        onChange={(e) => setBeatScript(e.target.value)}
                        className="w-full bg-black/60 rounded p-1.5 border border-brand-magenta/40 text-white font-medium text-xs focus:ring-1 focus:ring-brand-magenta focus:outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div className="bg-black/60 rounded p-1.5 border border-white/10 text-white font-medium mb-1.5">
                      &ldquo;{beatScript}&rdquo;
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBeatScript(
                          'Code review bottlenecks occur when pull requests lack concise intent and clear test criteria.'
                        );
                      }}
                      className="px-2 py-0.5 rounded bg-brand-magenta/20 text-brand-magenta border border-brand-magenta/40 hover:bg-brand-magenta/30 cursor-pointer"
                    >
                      Refine phrasing
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReRender();
                      }}
                      disabled={isReRendering}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isReRendering && (
                        <span className="material-symbols-outlined text-[11px] animate-spin">
                          autorenew
                        </span>
                      )}
                      Single-Scene Re-render
                    </button>
                    {renderToast && (
                      <span className="text-brand-emerald font-semibold animate-pulse">
                        {renderToast}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scene 03 Card */}
              <div
                onClick={() => setActiveBeat(3)}
                className={`rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col sm:flex-row gap-3 ${
                  activeBeat === 3
                    ? 'bg-neutral-900 border-2 border-brand-magenta shadow-lg shadow-fuchsia-500/10'
                    : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden bg-neutral-950 flex-shrink-0 relative">
                  <video
                    src="/videos/demo3.mp4"
                    poster="https://lh3.googleusercontent.com/aida-public/AB6AXuCwQewnKrWVfihRzzTkE5sRXTwxlJtujsPx9-UH6b4GXS8T2Hf0nwlotvrrUWl6PUCEOxybQAem1Eb9qbYO8PS-KBtdHEKUK_2c76GyUYO3nRne4zTXr1T-TiHk-JyUeOcW9fPnC3N_7OuLLXVteZ_7_EWjcLXWrU0q0usdYSpCGOP17cpLLEl2zrJQhiEcmzgshgaAgXed53Bs4N1ThyUTxfKaP-EwHy0nKq8Mim3Sg8IAW0KJd040hOoicdlQRiMK4cyhmAh2DAwr"
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/80 px-1 rounded text-white">
                    00:28 - 00:44
                  </span>
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                    <span className="font-bold text-white">BEAT 03 · THE THREE PRINCIPLES</span>
                    <span className="text-neutral-400">Pending review</span>
                  </div>
                  <p className="text-white/80 font-medium">
                    &ldquo;Principle one: Keep diffs under 200 lines. Principle two: Explicit test
                    proof.&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800">
                      Visual: Holographic checklist
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800">Camera: Slow push</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">Ready to commit compute?</span>
              <a
                href="#start"
                className="px-4 py-1.5 rounded-lg bg-white text-neutral-950 font-bold hover:bg-neutral-200 transition-colors inline-flex items-center gap-1 shadow-md hover:shadow-lg"
              >
                <span>Approve Storyboard &amp; Generate Video</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 4: OUTPUT STANDARDS */}
      <section
        className="max-w-7xl mx-auto px-6 py-20 bg-canvas-soft/60 border-t border-canvas-border"
        id="specs"
      >
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-emerald bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Output Standards
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight-heading text-neutral-900 mt-4 mb-3">
            Designed specifically for vertical video.
          </h2>
          <p className="text-neutral-600 text-base">
            Every parameter is calibrated for vertical consumption on modern mobile feeds—no awkward
            letterboxing or repurposed desktop widescreen crops.
          </p>
        </div>

        {/* 6 Explicit Standards Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-canvas-border shadow-xs hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-fuchsia-50 border border-fuchsia-100 text-brand-magenta flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">timer</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                60–90 Seconds Runtime
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                The engine calculates optimal pacing based on outline complexity. No arbitrary
                duration sliders required.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
              Target: High-retention mobile range
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-canvas-border shadow-xs hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-brand-coral flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">smartphone</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                9:16 Vertical (1080×1920)
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Rendered at 30 fps with high-bitrate H.264 encoding for clean mobile display. 1080p
                export; source footage quality varies depending on generation model and prompt
                assets.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
              Resolution: 1080p export; source footage quality varies
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-canvas-border shadow-xs hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-brand-violet flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">subtitles</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                Synced VO &amp; Kinetic Styling
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Clear studio narration matched with sentence-level kinetic captions styled for
                immediate mobile readability.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
              Subtitles: Sentence-aligned pacing and audio sync
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-6 border border-canvas-border shadow-xs hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-brand-amber flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">refresh</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                Scene-Level Adjustments
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Regenerating a scene reuses unaffected clips, then recomposes the finished video for
                targeted adjustments without rebuilding your entire storyboard.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
              Targeted compute efficiency
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-2xl p-6 border border-canvas-border shadow-xs hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-brand-emerald flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">download_for_offline</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                Direct Manual MP4 Download
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Download your master MP4 file directly for manual upload to YouTube Shorts,
                LinkedIn, TikTok, or Instagram Reels. Manual MP4 download is always readily
                available.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
              Container: Standard .mp4 (Direct manual download)
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-white rounded-2xl p-6 border border-canvas-border shadow-xs hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">share</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                Conditional Instagram Publish
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Direct publishing is strictly conditional upon connected Instagram
                Professional/Creator account access and Meta API authorization. Manual MP4 export is
                always available regardless.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-canvas-border text-[11px] font-mono text-neutral-500">
              Meta Graph API token requirement
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 5: CONCEPT DEMOS (REPLACED WITH DYNAMIC PLAYABLE VIDEOS) */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-canvas-border pb-12" id="demos">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-coral bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Interactive Video Demos
          </span>
          {/* Animated Heading */}
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight-heading text-neutral-900 mt-4 mb-3">
            Sample outputs{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-coral via-brand-magenta to-brand-amber animate-shimmer-text">
              from topic briefs.
            </span>
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
            Click on any demo to play or pause the generated video. These previews demonstrate the
            real vertical format (1080p export, 30 fps) produced by the Vydrivo storyboard pipeline.
          </p>
        </div>

        {/* 3 Dynamic Vertical 9:16 Video Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Demo Video Card 1 */}
          <div className="bg-canvas-soft rounded-2xl p-4 border border-canvas-border shadow-xs flex flex-col justify-between group hover:border-brand-magenta/40 hover:-translate-y-1.5 transition-all duration-300">
            <div>
              <div
                onClick={() => toggleDemo(1)}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-950 mb-4 cursor-pointer"
              >
                {/* Real Dynamic Video */}
                <video
                  ref={demoRefs[1]}
                  src="/videos/demo1.mp4"
                  poster="https://lh3.googleusercontent.com/aida-public/AB6AXuA1ek-cts4901MihcfprX_ywqyJqZ0qu4r2TUHVVXhdVE0-swu5Lgh9YehNak5Te2m7LRNEQwQOZybf8i-FEGINMXpXUKvksq5rwlfcRIh43LjrxOiERKgT9egUOCIf15E42sezDUjep8EqEC-MFT3gZMZYwdqMSbdj_vo-0hMEit4c8I4E8pI9x2qIU-lIncJz-Ot4w5lVp64Nt6he29ly_hqh1rxY1O8AG9WYR2NNCBUkxljIbG8FnBrfqgobnOEyPW8RtcCpFkdk"
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  loop
                  autoPlay
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                  68s · 9:16
                </div>

                {/* Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200">
                  <div
                    className={`w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 transition-transform ${
                      activeDemoPlaying[1] ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {activeDemoPlaying[1] ? 'pause' : 'play_arrow'}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-2.5 inset-x-2.5 text-center bg-black/70 backdrop-blur-md rounded-lg py-1 px-2 text-[10px] font-mono text-white/90">
                  &ldquo;When does a monolith actually make sense?&rdquo;
                </div>
              </div>

              <span className="text-xs font-mono font-medium text-brand-magenta uppercase">
                Product Narrative Demo
              </span>
              <h3 className="text-base font-bold text-neutral-900 mt-1 mb-1 font-headline">
                Software Architecture: Microservices vs Monolith
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Generated from a 4-bullet outline arguing against premature microservice decomposition.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-canvas-border flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">1080×1920 · 30fps</span>
              <a
                className="text-xs font-mono font-bold text-brand-magenta hover:underline flex items-center gap-1"
                href="#storyboard-studio"
                onClick={() => setActiveBeat(1)}
              >
                <span>Inspect Storyboard</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </a>
            </div>
          </div>

          {/* Demo Video Card 2 */}
          <div className="bg-canvas-soft rounded-2xl p-4 border border-canvas-border shadow-xs flex flex-col justify-between group hover:border-brand-coral/40 hover:-translate-y-1.5 transition-all duration-300">
            <div>
              <div
                onClick={() => toggleDemo(2)}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-950 mb-4 cursor-pointer"
              >
                {/* Real Dynamic Video */}
                <video
                  ref={demoRefs[2]}
                  src="/videos/demo2.mp4"
                  poster="https://lh3.googleusercontent.com/aida-public/AB6AXuACQ1lJciHy3I1JrxRFObCEn7p7p-5bi9sPdzF1XRqUqP7roU3txQhvCaY7iqr13cMgTxFJbLC7vaFBPGNiZOVbaxq7_sBBykvCu3gz2iwpLZLKfdZKroGbFu8plceZV5ByqGeQYpf58RBUlGUuzmxTK2dyksjmI9Elpyo9J0ekAvyd4uhS9vbB83yDto0q0IhTkcLVMiiJfDq1f6qqx3VRi8rAO5Of7r2fzZSMpBjGtBVF07sEGVX4RQlaLo9yD4bDjodPb3Skjc2X"
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  loop
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                  74s · 9:16
                </div>

                {/* Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200">
                  <div
                    className={`w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 transition-transform ${
                      activeDemoPlaying[2] ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {activeDemoPlaying[2] ? 'pause' : 'play_arrow'}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-2.5 inset-x-2.5 text-center bg-black/70 backdrop-blur-md rounded-lg py-1 px-2 text-[10px] font-mono text-white/90">
                  &ldquo;Replicating writes globally in under 40ms.&rdquo;
                </div>
              </div>

              <span className="text-xs font-mono font-medium text-brand-coral uppercase">
                Explainer Breakdown
              </span>
              <h3 className="text-base font-bold text-neutral-900 mt-1 mb-1 font-headline">
                Database Edge Replicas Explained
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Constructed from documentation snippets on multi-region PostgreSQL read caching.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-canvas-border flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">1080×1920 · 30fps</span>
              <a
                className="text-xs font-mono font-bold text-brand-coral hover:underline flex items-center gap-1"
                href="#storyboard-studio"
                onClick={() => setActiveBeat(2)}
              >
                <span>Inspect Storyboard</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </a>
            </div>
          </div>

          {/* Demo Video Card 3 */}
          <div className="bg-canvas-soft rounded-2xl p-4 border border-canvas-border shadow-xs flex flex-col justify-between group hover:border-brand-amber/40 hover:-translate-y-1.5 transition-all duration-300">
            <div>
              <div
                onClick={() => toggleDemo(3)}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-950 mb-4 cursor-pointer"
              >
                {/* Real Dynamic Video */}
                <video
                  ref={demoRefs[3]}
                  src="/videos/demo3.mp4"
                  poster="https://lh3.googleusercontent.com/aida-public/AB6AXuCkw_TL7Tx3c8s9MQBmEXLBw2Y28HSIsIVkYB1goIxHNtR8D-2UF5NOwRE6PUGTis5axiebIKdTDOnyqZxfqUeNkJB8ho7WnbmObEHTb99icQEo04nn1oMm-j8cZCFgqBtoudIgEYp6KvnJlmeMMdoaNAz_SVj24JPbsxMxDhd4G9Ug9qfvPl0J4N8TZQV8Vly9ZfJyAUCADJDoCJj_aTnzRD6udZQcyB8EPGvVF3Mr4AtAD9-gJ1dIXK4J9DQWI5P7ulWUjDM04s3-"
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  loop
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                  82s · 9:16
                </div>

                {/* Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200">
                  <div
                    className={`w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 transition-transform ${
                      activeDemoPlaying[3] ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {activeDemoPlaying[3] ? 'pause' : 'play_arrow'}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-2.5 inset-x-2.5 text-center bg-black/70 backdrop-blur-md rounded-lg py-1 px-2 text-[10px] font-mono text-white/90">
                  &ldquo;Three guardrails to kill Slack fatigue.&rdquo;
                </div>
              </div>

              <span className="text-xs font-mono font-medium text-brand-amber uppercase">
                Educational Short
              </span>
              <h3 className="text-base font-bold text-neutral-900 mt-1 mb-1 font-headline">
                Async Team Norms: 3 Guardrails
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Direct conversion of a founder&apos;s internal engineering handbook note into a punchy short.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-canvas-border flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">1080×1920 · 30fps</span>
              <a
                className="text-xs font-mono font-bold text-brand-amber hover:underline flex items-center gap-1"
                href="#storyboard-studio"
                onClick={() => setActiveBeat(3)}
              >
                <span>Inspect Storyboard</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SECTION 6: TRANSPARENT PRICING (ANIMATED & DYNAMIC BILLING TOGGLE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 border-t border-canvas-border" id="pricing">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-magenta bg-fuchsia-50 px-3.5 py-1 rounded-full border border-fuchsia-200 inline-block mb-4">
            TRANSPARENT PRICING
          </span>
          {/* Animated Heading */}
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 mb-4">
            Start free.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber animate-shimmer-text">
              Pay for what you make.
            </span>
          </h2>
          <p className="text-neutral-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
            No complicated seat licenses. Scale credits up or down depending on your publishing cadence.
          </p>

          {/* Dynamic Billing Period Toggle */}
          <div className="inline-flex items-center p-1 rounded-full bg-neutral-100 border border-neutral-200 shadow-inner">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold font-headline transition-all cursor-pointer ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('annual')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold font-headline transition-all flex items-center gap-1.5 cursor-pointer ${
                billingPeriod === 'annual'
                  ? 'bg-gradient-to-r from-brand-magenta to-brand-coral text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-mono">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* Card 1: Free */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/70 shadow-xs flex flex-col justify-between hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
                TASTER
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3 font-headline">Free</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-neutral-900 font-headline">₹0</span>
                <span className="text-xs text-neutral-400 font-mono">/ forever</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                Test the engine and produce your very first launch video with watermark.
              </p>
              <ul className="space-y-3.5 text-xs text-neutral-700">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>20 render credits</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>720p HD exports</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>Standard AI Voiceovers</span>
                </li>
                <li className="flex items-center gap-2.5 text-neutral-400">
                  <span className="material-symbols-outlined text-neutral-300 text-sm">close</span>
                  <span>No Social Autopilot</span>
                </li>
              </ul>
            </div>
            <div className="pt-5 mt-auto">
              <a
                href="#start"
                className="block text-center w-full py-2.5 px-4 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Card 2: Growth */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/70 shadow-xs flex flex-col justify-between hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-coral mb-2">
                FOUNDERS
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3 font-headline">Growth</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-neutral-900 font-headline">
                  {billingPeriod === 'annual' ? '₹800' : '₹1,000'}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  {billingPeriod === 'annual' ? '/ mo (billed yearly)' : '/ month'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                Ideal for early-stage builders shipping weekly product updates.
              </p>
              <ul className="space-y-3.5 text-xs text-neutral-700">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>120 render credits / mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>1080p Full HD exports</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>No watermark</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>1 Connected Social Channel</span>
                </li>
              </ul>
            </div>
            <div className="pt-5 mt-auto">
              <a
                href="#start"
                className="block text-center w-full py-2.5 px-4 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all"
              >
                Subscribe Growth
              </a>
            </div>
          </div>

          {/* Card 3: Pro (Featured / Most Popular) */}
          <div className="relative bg-[#121216] rounded-2xl p-6 text-white border border-neutral-800 shadow-2xl flex flex-col justify-between shadow-fuchsia-500/20 hover:-translate-y-1.5 transition-all duration-300">
            {/* Most Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-magenta to-brand-coral text-white font-mono text-[9px] font-bold uppercase tracking-wider shadow-md shadow-fuchsia-500/25 whitespace-nowrap animate-pulse">
              MOST POPULAR
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-magenta mb-2">
                CREATORS &amp; TEAMS
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 font-headline">Pro</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-white font-headline">
                  {billingPeriod === 'annual' ? '₹1,440' : '₹1,800'}
                </span>
                <span className="text-xs text-white/50 font-mono">
                  {billingPeriod === 'annual' ? '/ mo (billed yearly)' : '/ month'}
                </span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-5">
                Full-throttle creative engine with 4K renders and multi-channel autopilot.
              </p>
              {/* Credits progress block */}
              <div className="bg-white/10 rounded-xl p-3 mb-6 border border-white/10">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                  <span className="text-white/80">Unlimited Drafts</span>
                  <span className="text-brand-magenta font-bold">450 Credits</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber rounded-full w-full" />
                </div>
              </div>
              <ul className="space-y-3.5 text-xs text-white/90">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-magenta text-sm">
                    check_circle
                  </span>
                  <span>450 render credits / mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-magenta text-sm">
                    check_circle
                  </span>
                  <span>Ultra 4K 60fps export quality</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-magenta text-sm">
                    check_circle
                  </span>
                  <span>All 3 aspect ratios automatically</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-magenta text-sm">
                    check_circle
                  </span>
                  <span>Autopilot publishing to 5 accounts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-magenta text-sm">
                    check_circle
                  </span>
                  <span>Studio voice cloning</span>
                </li>
              </ul>
            </div>
            <div className="pt-8 mt-auto">
              <a
                href="#start"
                className="block text-center w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber hover:opacity-95 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.98]"
              >
                START 7-DAY PRO TRIAL
              </a>
            </div>
          </div>

          {/* Card 4: Business Plus */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200/70 shadow-xs flex flex-col justify-between hover:border-neutral-300 hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-violet mb-2">
                SCALE &amp; AGENCY
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3 font-headline">Business Plus</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-neutral-900 font-headline">Custom</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                Dedicated GPU clusters, API webhooks, and unlimited brand kits.
              </p>
              <ul className="space-y-3.5 text-xs text-neutral-700">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>Unlimited render pipeline</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>REST API &amp; Webhooks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>Custom Brand Font &amp; 3D Kits</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-brand-emerald text-sm">check</span>
                  <span>Dedicated Slack Engineer</span>
                </li>
              </ul>
            </div>
            <div className="pt-5 mt-auto">
              <a
                href="#start"
                className="block text-center w-full py-2.5 px-4 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all"
              >
                Talk to Team
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. BOTTOM CALL-TO-ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-canvas-darkCard rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden border border-[#2B231D] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/25 via-brand-magenta/25 to-brand-coral/25 opacity-70 pointer-events-none animate-pulse-glow" />
          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter-headline text-white leading-tight font-headline">
              Turn your idea into a video you can shape.
            </h2>
            <p className="text-neutral-300 text-sm">
              Start with your topic or rough outline. Review the storyboard and script before
              generating your vertical 9:16 video.
            </p>
            <div className="pt-1 max-w-xl mx-auto">
              <form
                onSubmit={handleCtaSubmit}
                className="bg-black/50 backdrop-blur-xl border border-white/20 rounded-2xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xl"
              >
                <input
                  className="bg-transparent border-none text-white placeholder-white/50 text-sm focus:ring-0 focus:outline-none w-full px-3 py-1.5 font-body"
                  placeholder="Paste your topic, thesis, or rough notes..."
                  type="text"
                  value={ctaInput}
                  onChange={(e) => {
                    setCtaInput(e.target.value);
                    setCtaMessage('');
                  }}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-magenta via-brand-coral to-brand-amber text-neutral-950 px-5 py-2.5 rounded-xl font-headline font-bold text-sm transition-transform active:scale-[0.98] whitespace-nowrap shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95"
                >
                  <span>Start a project</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </form>
              <div className="mt-2.5 text-xs font-mono text-white/60">
                {ctaMessage ||
                  'Manual MP4 download included. Review script and storyboard before generation.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="w-full bg-white border-t border-neutral-100 pt-16 pb-12 relative border-b-4 border-brand-violet">
        <div className="max-w-7xl mx-auto px-6">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-16">
            {/* Left Column: Brand & Description & Social Icons */}
            <div className="md:col-span-5 space-y-5">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D946EF] via-[#F0839E] to-[#7C3AED] flex items-center justify-center text-white shadow-sm">
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </div>
                <span className="font-headline text-2xl font-bold tracking-tight text-neutral-900">
                  Vydrivo
                </span>
              </div>
              {/* Description */}
              <p className="font-body text-sm text-neutral-500 max-w-sm leading-relaxed">
                The Velos-powered autonomous video studio. Paste any link or script and receive
                instant studio-grade launch films, creator ads, and dynamic social teasers.
              </p>
              {/* Social / Platform Icons */}
              <div className="flex items-center gap-4 text-neutral-400 pt-2">
                <a
                  href="#"
                  className="hover:text-neutral-700 transition-colors"
                  aria-label="Website"
                >
                  <span className="material-symbols-outlined text-[18px]">public</span>
                </a>
                <a
                  href="https://github.com/Summi51/Vydrivo/tree/dev"
                  className="hover:text-neutral-700 transition-colors font-mono text-sm flex items-center justify-center font-bold tracking-tighter"
                  aria-label="Code"
                >
                  &lt; &gt;
                </a>
                <a
                  href="#demos"
                  className="hover:text-neutral-700 transition-colors"
                  aria-label="Video"
                >
                  <span className="material-symbols-outlined text-[18px]">smart_display</span>
                </a>
              </div>
            </div>

            {/* Right Columns: Product, Ecosystem, Company */}
            <div className="md:col-span-7 grid grid-cols-3 gap-6">
              {/* Product */}
              <div className="space-y-4">
                <h4 className="font-headline font-bold text-neutral-900 text-sm">Product</h4>
                <ul className="space-y-3 text-sm font-body text-neutral-500">
                  <li>
                    <a href="#start" className="hover:text-neutral-900 transition-colors">
                      Generator
                    </a>
                  </li>
                  <li>
                    <a href="#storyboard-studio" className="hover:text-neutral-900 transition-colors">
                      Canvas
                    </a>
                  </li>
                  <li>
                    <a href="#demos" className="hover:text-neutral-900 transition-colors">
                      Templates
                    </a>
                  </li>
                  <li>
                    <a href="#specs" className="hover:text-neutral-900 transition-colors">
                      API
                    </a>
                  </li>
                </ul>
              </div>

              {/* Ecosystem */}
              <div className="space-y-4">
                <h4 className="font-headline font-bold text-neutral-900 text-sm">Ecosystem</h4>
                <ul className="space-y-3 text-sm font-body text-neutral-500">
                  <li>
                    <a href="#demos" className="hover:text-neutral-900 transition-colors">
                      Showcase
                    </a>
                  </li>
                  <li>
                    <a href="#workflow" className="hover:text-neutral-900 transition-colors">
                      Community
                    </a>
                  </li>
                  <li>
                    <a href="#workflow" className="hover:text-neutral-900 transition-colors">
                      Docs
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-neutral-900 transition-colors">
                      Pricing
                    </a>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div className="space-y-4">
                <h4 className="font-headline font-bold text-neutral-900 text-sm">Company</h4>
                <ul className="space-y-3 text-sm font-body text-neutral-500">
                  <li>
                    <a href="#" className="hover:text-neutral-900 transition-colors">
                      Company
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-neutral-900 transition-colors">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-neutral-900 transition-colors">
                      Contact
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-neutral-900 transition-colors">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-neutral-900 transition-colors">
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Sub-Footer Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 font-body gap-4">
            <div>© 2025 Vydrivo Inc. Powered by Velos Engine. All rights reserved.</div>
            <div className="flex items-center gap-6 text-neutral-500">
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Security
              </a>
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Status
              </a>
              <a href="#" className="hover:text-neutral-900 transition-colors">
                System Performance
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
