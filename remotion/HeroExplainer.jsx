import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

const C = {
  navy: '#061426',
  panel: '#0A2238',
  border: '#1E4560',
  teal: '#62F2D8',
  blue: '#5BC0FF',
  amber: '#F5B84B',
  red: '#FF6B7A',
  text: '#F4F8F6',
  muted: '#8FB2C6',
  dim: '#5C7D91',
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const appear = (frame, at = 0, duration = 18) => interpolate(frame, [at, at + duration], [0, 1], CLAMP);

function Grid() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.navy, overflow: 'hidden' }}>
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
        <defs>
          <pattern id="hero-grid" width="90" height="90" patternUnits="userSpaceOnUse">
            <path d="M 90 0 L 0 0 0 90" fill="none" stroke={C.border} strokeWidth="1" opacity="0.35" />
          </pattern>
          <radialGradient id="hero-glow" cx="65%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#164862" stopOpacity="0.75" />
            <stop offset="100%" stopColor={C.navy} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#hero-grid)" />
        <rect width="1080" height="1920" fill="url(#hero-glow)" />
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={(i * 191) % 1080} cy={(i * 149 - frame * 0.2 + 2400) % 1920} r={1 + (i % 3)} fill={C.teal} opacity={0.12} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

function Node({ x, y, w, h, sub, label, tone, children }) {
  return (
    <div style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h,
      borderRadius: 24, border: `2px solid ${tone}88`, background: `linear-gradient(160deg, ${tone}18, #071B2B 70%)`,
      boxShadow: `0 0 40px ${tone}22`, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 18, letterSpacing: 2, color: tone, fontWeight: 800 }}>{sub}</div>
      <div style={{ marginTop: 8, fontSize: 32, lineHeight: 1.15, fontWeight: 900, color: C.text }}>{label}</div>
      {children}
    </div>
  );
}

export const HeroExplainer = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const intro = appear(frame, 4, 18);
  const fadeIn = interpolate(frame, [0, 12], [1, 0], CLAMP);
  const fadeOut = interpolate(frame, [durationInFrames - 14, durationInFrames], [0, 1], CLAMP);
  const overlay = Math.max(fadeIn, fadeOut);

  const dots = Array.from({ length: 6 }, (_, index) => {
    const t = ((frame + index * 35) % durationInFrames) / durationInFrames;
    const serverX = [180, 470, 760][index % 3];
    if (t < 0.45) {
      const p = t / 0.45;
      return { x: 470, y: 260 + 165 * p, color: [C.teal, C.blue, C.amber][index % 3] };
    }
    const p = (t - 0.45) / 0.55;
    return { x: 470 + (serverX - 470) * p, y: 575 + 230 * p, color: [C.teal, C.blue, C.amber][index % 3] };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.navy, color: C.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <Grid />

      <div style={{ position: 'absolute', left: 70, right: 70, top: 130, opacity: intro, transform: `translateY(${(1 - intro) * 16}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, letterSpacing: 3, fontWeight: 800, color: C.teal }}>
          <span style={{ width: 34, height: 3, background: C.teal, display: 'inline-block' }} />
          SYSTEM DESIGN · 101
        </div>
        <div style={{ marginTop: 20, fontSize: 82, lineHeight: 1.02, letterSpacing: -4, fontWeight: 900 }}>Load Balancing</div>
        <div style={{ marginTop: 14, fontSize: 30, lineHeight: 1.35, color: C.muted }}>Spread traffic across servers.</div>
      </div>

      <div style={{ position: 'absolute', left: 70, right: 70, top: 500, height: 1200 }}>
        <svg width="940" height="1200" viewBox="0 0 940 1200" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <marker id="hero-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0 0L10 5L0 10" fill="none" stroke={C.muted} strokeWidth="2" />
            </marker>
          </defs>
          <path d="M470 260 V410" fill="none" stroke={C.blue} strokeWidth="3" strokeDasharray="10 9" markerEnd="url(#hero-arrow)" opacity="0.8" />
          <path d="M470 575 C470 690 180 690 180 805" fill="none" stroke={C.teal} strokeWidth="3" strokeDasharray="10 9" markerEnd="url(#hero-arrow)" opacity="0.75" />
          <path d="M470 575 V805" fill="none" stroke={C.amber} strokeWidth="3" strokeDasharray="10 9" markerEnd="url(#hero-arrow)" opacity="0.75" />
          <path d="M470 575 C470 690 760 690 760 805" fill="none" stroke={C.red} strokeWidth="3" strokeDasharray="10 9" markerEnd="url(#hero-arrow)" opacity="0.75" />
          {dots.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r={8} fill={dot.color} opacity={0.95} style={{ filter: `drop-shadow(0 0 10px ${dot.color})` }} />
          ))}
        </svg>

        <Node x={470} y={200} w={360} h={120} sub="CLIENTS" label="Incoming traffic" tone={C.blue} />
        <Node x={470} y={500} w={420} h={150} sub="LOAD BALANCER" label="Even split" tone={C.teal}>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            {[0, 1, 2].map((index) => (
              <span key={index} style={{ flex: 1, height: 8, borderRadius: 4, background: `${C.teal}55` }} />
            ))}
          </div>
        </Node>
        {[
          { x: 180, tone: C.teal, label: 'SERVER 1' },
          { x: 470, tone: C.amber, label: 'SERVER 2' },
          { x: 760, tone: C.blue, label: 'SERVER 3' },
        ].map((server) => (
          <Node key={server.label} x={server.x} y={880} w={260} h={150} sub={server.label} label="33% load" tone={server.tone}>
            <div style={{ marginTop: 14, height: 10, borderRadius: 5, background: '#132F44', overflow: 'hidden' }}>
              <div style={{ width: '33%', height: '100%', borderRadius: 5, background: server.tone, boxShadow: `0 0 18px ${server.tone}66` }} />
            </div>
          </Node>
        ))}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderRadius: 999, border: `1px solid ${C.teal}55`, background: `${C.teal}10`, color: C.teal, fontSize: 24, fontWeight: 800 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.teal, boxShadow: `0 0 14px ${C.teal}` }} />
            EVEN LOAD · 33% EACH
          </div>
        </div>
      </div>

      <AbsoluteFill style={{ backgroundColor: C.navy, opacity: overlay, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
