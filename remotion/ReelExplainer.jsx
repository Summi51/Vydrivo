import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Audio } from '@remotion/media';
import staticData from './reel-hi-data.json';

const C = {
  navy: '#061426',
  navy2: '#081B2E',
  panel: '#0A2238',
  panel2: '#0D2B44',
  border: '#1E4560',
  teal: '#62F2D8',
  blue: '#5BC0FF',
  amber: '#F5B84B',
  red: '#FF6B7A',
  text: '#F4F8F6',
  muted: '#8FB2C6',
  dim: '#5C7D91',
};

const TONES = [C.teal, C.amber, C.red, C.amber, C.teal, C.red];
let activeAccent = C.teal;

function accent() {
  return activeAccent;
}

// One look per video, picked from the title so two videos do not look identical.
const THEMES = [
  { accent: '#62F2D8', glow: '#164862', bar: '#14344C' },
  { accent: '#A78BFA', glow: '#3B2A6E', bar: '#2A2150' },
  { accent: '#F5B84B', glow: '#5A3E12', bar: '#3A2C12' },
  { accent: '#5BC0FF', glow: '#123E62', bar: '#12344C' },
  { accent: '#F472B6', glow: '#5A2040', bar: '#3A1830' },
  { accent: '#34D399', glow: '#0E4A38', bar: '#0E3A2C' },
];

function themeFor(title) {
  const text = String(title || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return THEMES[hash % THEMES.length];
}
const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const appear = (frame, at = 0, duration = 14) => interpolate(frame, [at, at + duration], [0, 1], CLAMP);

function firstSentence(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  const match = value.match(/^(.+?[।.!?])(?:\s|$)/);
  const sentence = match ? match[1] : value;
  if (sentence.length <= 110) return sentence;
  const cut = sentence.slice(0, 110);
  return cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut;
}

function compareLabels(scene) {
  const raw = scene.labels || [];
  const states = raw.filter((label) => !/^(before|after|पहले|बाद में|बाद)$/i.test(String(label).trim()));
  return [
    states[0] || raw[0] || 'Before',
    states[1] || raw[1] || 'After',
    states[2] || scene.headline || raw[2] || 'Fewer waits',
  ];
}

function Icon({name, size = 28, color = accent(), strokeWidth = 2}) {
  const paths = {
    alert: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5" /><path d="M12 18h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.spark}
    </svg>
  );
}

function Grid({theme}) {
  const frame = useCurrentFrame();
  const glow = theme?.glow || '#164862';
  const dot = theme?.accent || accent();
  return (
    <AbsoluteFill style={{backgroundColor: C.navy, overflow: 'hidden'}}>
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: 0.55}}>
        <defs>
          <pattern id="grid" width="90" height="90" patternUnits="userSpaceOnUse">
            <path d="M 90 0 L 0 0 0 90" fill="none" stroke={C.border} strokeWidth="1" opacity="0.35" />
          </pattern>
          <radialGradient id="glow" cx="70%" cy="25%" r="70%">
            <stop offset="0%" stopColor={glow} stopOpacity="0.75" />
            <stop offset="100%" stopColor={C.navy} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#grid)" />
        <rect width="1080" height="1920" fill="url(#glow)" />
        {Array.from({length: 28}, (_, i) => (
          <circle key={i} cx={(i * 173) % 1080} cy={(i * 137 - frame * 0.25 + 2400) % 1920} r={1 + (i % 3)} fill={dot} opacity={0.14} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

function TopBar({scene, index, total, series, theme}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, scene.durationInFrames));
  const barColor = theme?.accent || accent();
  return (
    <div style={{position: 'absolute', top: 48, left: 70, right: 70, zIndex: 3}}>
      <div style={{height: 4, borderRadius: 4, background: theme?.bar || '#14344C', overflow: 'hidden'}}>
        <div style={{width: `${progress * 100}%`, height: '100%', background: barColor}} />
      </div>
      <div style={{marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 20, letterSpacing: 3, color: C.muted}}>
        <span style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{width: 15, height: 15, borderRadius: '50%', border: `3px solid ${C.blue}`, display: 'inline-block'}} />
          {series || 'SYSTEM DESIGN'}
        </span>
        <span>EP 01 · {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

function Header({scene}) {
  const tone = accent();
  const frame = useCurrentFrame();
  const p = appear(frame, 0, 12);
  return (
    <div style={{position: 'absolute', top: 160, left: 70, right: 70, zIndex: 3, opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, letterSpacing: 3, fontWeight: 800, color: tone}}>
        <span style={{width: 34, height: 3, background: tone, display: 'inline-block'}} />
        {scene.kicker}
      </div>
      <div style={{marginTop: 18, fontSize: 70, lineHeight: 1.02, letterSpacing: -3.5, fontWeight: 900, color: C.text}}>
        {scene.headline}
        {scene.highlight ? <span style={{color: tone}}> {scene.highlight}</span> : null}
      </div>
    </div>
  );
}

function Card({children, style}) {
  return (
    <div style={{
      position: 'absolute', left: 70, right: 70, top: 390, bottom: 330,
      borderRadius: 30, border: `1px solid ${C.border}`, background: `linear-gradient(160deg, ${C.panel2}, ${C.panel})`,
      boxShadow: '0 30px 90px #0008', overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  );
}



function Node({label, tone = accent(), style}) {
  return (
    <div style={{
      padding: '18px 22px', borderRadius: 14, border: `2px solid ${tone}`,
      background: `${tone}12`, color: C.text, fontSize: 24, fontWeight: 800,
      letterSpacing: 1, textAlign: 'center', boxShadow: `0 0 28px ${tone}22`, ...style,
    }}>{label}</div>
  );
}

function InterviewDiagram({scene}) {
  const frame = useCurrentFrame();
  const pulse = 0.55 + Math.sin(frame / 12) * 0.2;
  return (
    <Card>
      <div style={{position: 'absolute', left: 42, top: 48, fontSize: 20, letterSpacing: 3, color: activeAccent, fontWeight: 800}}>
        {scene.labels?.[0] || 'INTERVIEWER'}
      </div>
      <div style={{position: 'absolute', left: 54, top: 130, width: 110, height: 110, borderRadius: '50%', border: `3px solid ${activeAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${30 * pulse}px ${activeAccent}44`}}>
        <svg width="62" height="62" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke={activeAccent} strokeWidth="2" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={activeAccent} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{position: 'absolute', left: 205, right: 48, top: 120, height: 250, borderRadius: 18, border: `2px solid ${C.blue}88`, background: '#071B2B', padding: 26}}>
        <div style={{display: 'flex', gap: 8, marginBottom: 18}}>
          {[0, 1, 2].map((i) => <span key={i} style={{width: 10, height: 10, borderRadius: '50%', background: i === 0 ? C.red : i === 1 ? C.amber : activeAccent}} />)}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{height: 12, width: `${88 - i * 18}%`, borderRadius: 8, background: i === 0 ? C.blue : '#1B435C', marginTop: 16, opacity: 0.7 + i * 0.1}} />
        ))}
        <div style={{marginTop: 28, fontSize: 22, color: C.muted}}>{scene.labels?.[1] || 'Payment service live?'}</div>
      </div>
    </Card>
  );
}

function Flow3Diagram({scene}) {
  const frame = useCurrentFrame();
  const nodes = scene.labels || ['ENTERPRISE APP', 'SERVICE', 'RETRY'];
  return (
    <Card>
      <div style={{position: 'absolute', left: 0, right: 0, top: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26}}>
        {nodes.map((label, i) => (
          <React.Fragment key={label}>
            <Node label={label} tone={i === 2 ? C.red : i === 1 ? C.amber : activeAccent} style={{width: 430, opacity: appear(frame, i * 10, 12)}} />
            {i < nodes.length - 1 ? <div style={{fontSize: 34, color: C.muted, transform: `translateY(${Math.sin(frame / 10 + i) * 3}px)`}}>↓</div> : null}
          </React.Fragment>
        ))}
      </div>
      <div style={{position: 'absolute', left: 42, right: 42, bottom: 48}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 22, color: C.muted, marginBottom: 10}}><span>Retry load</span><span style={{color: C.red}}>100%</span></div>
        <div style={{height: 14, borderRadius: 8, background: '#132F44'}}><div style={{width: '100%', height: '100%', borderRadius: 8, background: C.red, boxShadow: `0 0 24px ${C.red}55`}} /></div>
      </div>
    </Card>
  );
}

function Flow5Diagram({scene}) {
  const frame = useCurrentFrame();
  const nodes = scene.labels || ['API Gateway', 'Auth', 'Cart', 'Search', 'Payment'];
  const middle = nodes.slice(1, 4);
  return (
    <Card>
      <div style={{position: 'absolute', left: 42, top: 250}}><Node label={nodes[0]} tone={activeAccent} style={{width: 230}} /></div>
      <div style={{position: 'absolute', left: 390, top: 120, display: 'flex', flexDirection: 'column', gap: 30}}>
        {middle.map((label) => <Node key={label} label={label} tone={C.amber} style={{width: 270, padding: '14px 18px', fontSize: 22}} />)}
      </div>
      <div style={{position: 'absolute', right: 42, top: 250}}><Node label={nodes[4]} tone={C.red} style={{width: 230}} /></div>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <path d="M272 300 H390" stroke={C.blue} strokeWidth="3" strokeDasharray="10 9" opacity={0.8} />
        <path d="M660 300 H790" stroke={C.red} strokeWidth="3" strokeDasharray="10 9" opacity={0.8} />
        <path d="M272 300 C330 160 340 160 390 165" stroke={C.blue} strokeWidth="2" fill="none" strokeDasharray="7 8" opacity={0.5} />
        <path d="M272 300 C330 300 340 300 390 300" stroke={C.blue} strokeWidth="2" fill="none" strokeDasharray="7 8" opacity={0.5} />
        <path d="M272 300 C330 440 340 440 390 435" stroke={C.blue} strokeWidth="2" fill="none" strokeDasharray="7 8" opacity={0.5} />
      </svg>
      <div style={{position: 'absolute', left: 42, right: 42, bottom: 48}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 22, color: C.muted, marginBottom: 10}}><span>Load (lakh req/s)</span><span style={{color: C.red}}>100%</span></div>
        <div style={{height: 14, borderRadius: 8, background: '#132F44'}}><div style={{width: `${Math.min(100, 40 + frame / 2)}%`, height: '100%', borderRadius: 8, background: C.red, boxShadow: `0 0 24px ${C.red}55`}} /></div>
      </div>
    </Card>
  );
}

function RecoveryDiagram({scene}) {
  const frame = useCurrentFrame();
  const pct = Math.min(23, Math.round((frame / 30) * 4));
  return (
    <Card>
      <div style={{position: 'absolute', left: 42, top: 80, width: 230, borderRadius: 18, border: `2px solid ${C.amber}`, padding: 20, background: '#0A1B2A'}}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{height: 44, borderRadius: 8, border: `1px solid ${C.amber}66`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px'}}>
            {[0, 1, 2].map((j) => <span key={j} style={{width: 7, height: 7, borderRadius: '50%', background: j === 0 ? accent() : C.amber}} />)}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 320, right: 42, top: 120}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 800}}>
          <span style={{width: 34, height: 34, borderRadius: '50%', border: `3px solid ${C.amber}`, display: 'inline-block', transform: `rotate(${frame * 2}deg)`, borderTopColor: 'transparent'}} />
          {scene.labels?.[0] || 'Payment recovering'}
        </div>
        <div style={{marginTop: 44, fontSize: 24, color: C.muted}}>{scene.labels?.[1] || 'Recovery'}</div>
        <div style={{marginTop: 14, height: 18, borderRadius: 10, background: '#132F44'}}>
          <div style={{width: `${pct}%`, height: '100%', borderRadius: 10, background: C.amber, boxShadow: `0 0 24px ${C.amber}66`}} />
        </div>
        <div style={{marginTop: 12, textAlign: 'right', color: C.amber, fontSize: 24, fontWeight: 800}}>{pct}%</div>
      </div>
    </Card>
  );
}

function StateDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = scene.labels || ['CLOSED', 'OPEN', 'HALF-OPEN'];
  return (
    <Card>
      <svg viewBox="0 0 900 560" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <defs><marker id="arrow2" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10" fill="none" stroke={C.muted} strokeWidth="2" /></marker></defs>
        <circle cx="220" cy="180" r="92" fill="#0B2A3D" stroke={accent()} strokeWidth="3" />
        <text x="220" y="188" textAnchor="middle" fill={accent()} fontSize="25" fontWeight="800">{labels[0]}</text>
        <circle cx="680" cy="180" r="92" fill="#2A0F1A" stroke={C.red} strokeWidth="3" />
        <text x="680" y="188" textAnchor="middle" fill={C.red} fontSize="25" fontWeight="800">{labels[1]}</text>
        <circle cx="450" cy="420" r="92" fill="#2A2410" stroke={C.amber} strokeWidth="3" />
        <text x="450" y="428" textAnchor="middle" fill={C.amber} fontSize="23" fontWeight="800">{labels[2]}</text>
        <path d="M312 170 H585" stroke={C.muted} strokeWidth="2" markerEnd="url(#arrow2)" />
        <path d="M630 260 L505 345" stroke={C.muted} strokeWidth="2" markerEnd="url(#arrow2)" />
        <path d="M395 345 L275 260" stroke={C.muted} strokeWidth="2" markerEnd="url(#arrow2)" />
        <text x="448" y="150" textAnchor="middle" fill={C.muted} fontSize="19">failures ≥ 5</text>
        <text x="600" y="320" textAnchor="middle" fill={C.muted} fontSize="19">timeout ends</text>
        <text x="300" y="320" textAnchor="middle" fill={C.muted} fontSize="19">test pass ✓</text>
      </svg>
      <div style={{position: 'absolute', left: 42, right: 42, bottom: 48}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 22, color: C.muted, marginBottom: 10}}><span>Traffic</span><span style={{color: accent()}}>{Math.min(24, Math.round(frame / 3))}%</span></div>
        <div style={{height: 14, borderRadius: 8, background: '#132F44'}}><div style={{width: `${Math.min(24, frame / 3)}%`, height: '100%', borderRadius: 8, background: accent(), boxShadow: `0 0 24px ${accent()}55`}} /></div>
      </div>
    </Card>
  );
}

function RetryDiagram({scene}) {
  const frame = useCurrentFrame();
  return (
    <Card>
      <div style={{position: 'absolute', left: '50%', top: 100, transform: 'translateX(-50%)', width: 160, height: 160, borderRadius: 38, border: `3px solid ${C.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 50px ${C.blue}33`}}>
        <svg width="82" height="82" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={C.blue} strokeWidth="2" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={C.blue} strokeWidth="2" strokeLinecap="round" /></svg>
      </div>
      <div style={{position: 'absolute', left: '50%', top: 285, transform: 'translateX(-50%)', fontSize: 22, letterSpacing: 3, color: C.muted}}>{scene.labels?.[0] || 'INTERVIEWER'}</div>
      <div style={{position: 'absolute', left: '50%', top: 350, transform: 'translateX(-50%)', padding: '20px 34px', borderRadius: 999, border: `2px solid ${C.red}`, background: '#2A0F1A', color: C.text, fontSize: 34, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: `0 0 ${28 + Math.sin(frame / 10) * 10}px ${C.red}44`}}>
        <span style={{color: C.red}}>×</span> {scene.labels?.[1] || 'Retry mechanism'}
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 470, height: 2, background: C.border}} />
      <div style={{position: 'absolute', left: 80, top: 455, fontSize: 18, letterSpacing: 2, color: C.dim}}>TIMEOUT + BACKOFF + CIRCUIT BREAKER</div>
    </Card>
  );
}

function StatementDiagram({scene}) {
  const frame = useCurrentFrame();
  const p = appear(frame, 4, 16);
  const labels = scene.labels || [];
  const statement = firstSentence(scene.displayNarration || scene.narration) || scene.headline || 'Key idea';
  const chips = labels.slice(0, 3);
  return (
    <Card>
      <div style={{position: 'absolute', left: 34, top: 40, fontSize: 300, lineHeight: 1, color: accent(), opacity: 0.05, fontWeight: 900}}>“</div>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 60px', gap: 54}}>
        <div style={{opacity: p, transform: `translateY(${(1 - p) * 16}px)`}}>
          <div style={{fontSize: 72, lineHeight: 0.8, color: accent(), fontWeight: 900}}>“</div>
          <div style={{marginTop: 22, fontSize: 44, lineHeight: 1.3, fontWeight: 800, letterSpacing: -1}}>{statement}</div>
          <div style={{marginTop: 34, height: 3, width: 110, background: accent(), borderRadius: 2}} />
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 14}}>
          {chips.map((label, i) => (
            <div key={`${label}-${i}`} style={{padding: '14px 20px', borderRadius: 999, border: `1px solid ${i === 0 ? accent() : C.border}`, background: i === 0 ? `${accent()}14` : '#071B2B', color: i === 0 ? accent() : C.text, fontSize: 23, fontWeight: 700}}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function StepsDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  const tones = [accent(), C.amber, C.blue];
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '0 60px', gap: 22}}>
        <div style={{position: 'absolute', left: 92, top: '23%', bottom: '23%', width: 2, background: C.border}} />
        {labels.map((label, i) => (
          <div key={`${label}-${i}`} style={{display: 'flex', alignItems: 'center', gap: 22, opacity: appear(frame, i * 12, 14)}}>
            <div style={{width: 64, height: 64, borderRadius: '50%', border: `2px solid ${tones[i]}`, background: '#071B2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: tones[i], flexShrink: 0}}>
              {i + 1}
            </div>
            <div style={{flex: 1, padding: '22px 24px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#071B2B', fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CompareDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = compareLabels(scene);
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 42px', gap: 48}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{flex: 1, padding: 24, borderRadius: 18, border: `2px solid ${C.red}88`, background: '#2A0F1A55'}}>
            <div style={{fontSize: 19, letterSpacing: 2, color: C.red, fontWeight: 800}}>BEFORE</div>
            <div style={{marginTop: 18, fontSize: 26, lineHeight: 1.35, fontWeight: 700}}>{labels[0]}</div>
          </div>
          <div style={{fontSize: 34, color: C.muted, flexShrink: 0}}>→</div>
          <div style={{flex: 1, padding: 24, borderRadius: 18, border: `2px solid ${accent()}88`, background: '#0B2A3D'}}>
            <div style={{fontSize: 19, letterSpacing: 2, color: accent(), fontWeight: 800}}>AFTER</div>
            <div style={{marginTop: 18, fontSize: 26, lineHeight: 1.35, fontWeight: 700}}>{labels[1]}</div>
          </div>
        </div>
        <div style={{padding: '24px 28px', borderRadius: 18, border: `1px solid ${C.amber}66`, background: '#2A241033', fontSize: 27, lineHeight: 1.35, fontWeight: 700, color: C.amber, textAlign: 'center', opacity: appear(frame, 14, 14)}}>
          {labels[2]}
        </div>
      </div>
    </Card>
  );
}

function ChecklistDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '0 60px', gap: 24}}>
        <div style={{position: 'absolute', left: 108, top: '23%', bottom: '23%', width: 2, background: C.border}} />
        {labels.map((label, i) => (
          <div key={`${label}-${i}`} style={{display: 'flex', alignItems: 'center', gap: 20, padding: '24px 26px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#071B2B', opacity: appear(frame, i * 10, 14)}}>
            <div style={{width: 44, height: 44, borderRadius: '50%', border: `2px solid ${accent()}`, background: '#071B2B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent(), fontSize: 24, fontWeight: 900, flexShrink: 0}}>✓</div>
            <div style={{fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimelineDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  const tones = [accent(), C.amber, C.blue];
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '0 60px 0 80px'}}>
        <div style={{position: 'absolute', left: 99, top: '23%', bottom: '23%', width: 3, background: C.border}} />
        {labels.map((label, i) => (
          <div key={`${label}-${i}`} style={{position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 26, opacity: appear(frame, i * 12, 14)}}>
            <div style={{width: 38, height: 38, borderRadius: '50%', border: `3px solid ${tones[i]}`, background: C.navy, zIndex: 1, flexShrink: 0, boxShadow: `0 0 18px ${tones[i]}44`}} />
            <div style={{flex: 1, padding: '22px 24px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#071B2B', fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecapDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  const tones = [accent(), C.amber, C.blue];
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '0 60px', gap: 22}}>
        <div style={{position: 'absolute', left: 108, top: '23%', bottom: '23%', width: 2, background: C.border}} />
        {labels.map((label, i) => (
          <div key={`${label}-${i}`} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '24px 26px', borderRadius: 18, border: `1px solid ${tones[i]}66`, background: `${tones[i]}0D`, opacity: appear(frame, i * 10, 14)}}>
            <div style={{fontSize: 34, fontWeight: 900, color: tones[i], width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#071B2B', flexShrink: 0}}>{i + 1}</div>
            <div style={{fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, bottom: 64, textAlign: 'center', fontSize: 22, letterSpacing: 3, color: C.dim, fontWeight: 700}}>RECAP</div>
    </Card>
  );
}

function ProblemFixDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 42px', gap: 48}}>
        <div style={{display: 'flex', alignItems: 'stretch', gap: 12}}>
          <div style={{flex: 1, padding: 28, borderRadius: 20, border: `2px solid ${C.red}88`, background: '#2A0F1A55'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{width: 48, height: 48, borderRadius: '50%', border: `2px solid ${C.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2A0F1A', flexShrink: 0}}>
                <Icon name="alert" size={26} color={C.red} />
              </div>
              <span style={{fontSize: 19, letterSpacing: 2, color: C.red, fontWeight: 800}}>PROBLEM</span>
            </div>
            <div style={{marginTop: 22, fontSize: 28, lineHeight: 1.35, fontWeight: 700}}>{labels[0]}</div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', fontSize: 34, color: C.muted, flexShrink: 0}}>→</div>
          <div style={{flex: 1, padding: 28, borderRadius: 20, border: `2px solid ${accent()}88`, background: '#0B2A3D'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{width: 48, height: 48, borderRadius: '50%', border: `2px solid ${accent()}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B2A3D', flexShrink: 0}}>
                <Icon name="check" size={26} color={accent()} />
              </div>
              <span style={{fontSize: 19, letterSpacing: 2, color: accent(), fontWeight: 800}}>FIX</span>
            </div>
            <div style={{marginTop: 22, fontSize: 28, lineHeight: 1.35, fontWeight: 700}}>{labels[1]}</div>
          </div>
        </div>
        <div style={{padding: '24px 28px', borderRadius: 18, border: `1px solid ${C.amber}66`, background: '#2A241033', fontSize: 27, lineHeight: 1.35, fontWeight: 700, color: C.amber, textAlign: 'center', opacity: appear(frame, 14, 14)}}>
          {labels[2]}
        </div>
      </div>
    </Card>
  );
}

function CauseEffectDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 70px', gap: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: appear(frame, 0, 14)}}>
          <div style={{width: 54, height: 54, borderRadius: '50%', border: `2px solid ${C.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2A2410', flexShrink: 0}}>
            <Icon name="alert" size={26} color={C.amber} />
          </div>
          <div style={{flex: 1, padding: '22px 26px', borderRadius: 16, border: `1px solid ${C.amber}66`, background: '#2A241033'}}>
            <div style={{fontSize: 18, letterSpacing: 2, color: C.amber, fontWeight: 800}}>CAUSE</div>
            <div style={{marginTop: 8, fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>{labels[0]}</div>
          </div>
        </div>
        <div style={{textAlign: 'center', fontSize: 32, color: C.muted}}>↓</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: appear(frame, 12, 14)}}>
          <div style={{width: 54, height: 54, borderRadius: '50%', border: `2px solid ${C.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1B2B', flexShrink: 0}}>
            <Icon name="target" size={26} color={C.blue} />
          </div>
          <div style={{flex: 1, padding: '22px 26px', borderRadius: 16, border: `1px solid ${C.blue}66`, background: '#0B1B2B'}}>
            <div style={{fontSize: 18, letterSpacing: 2, color: C.blue, fontWeight: 800}}>EFFECT</div>
            <div style={{marginTop: 8, fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>{labels[1]}</div>
          </div>
        </div>
        <div style={{textAlign: 'center', fontSize: 32, color: C.muted}}>↓</div>
        <div style={{padding: '22px 26px', borderRadius: 16, border: `1px solid ${accent()}66`, background: '#0B2A3D', textAlign: 'center', opacity: appear(frame, 24, 14)}}>
          <div style={{fontSize: 18, letterSpacing: 2, color: accent(), fontWeight: 800}}>RESULT</div>
          <div style={{marginTop: 8, fontSize: 27, lineHeight: 1.35, fontWeight: 700}}>{labels[2]}</div>
        </div>
      </div>
    </Card>
  );
}

function BigNumberDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  const value = labels[0] || '1';
  const size = value.length <= 6 ? 128 : value.length <= 10 ? 104 : value.length <= 16 ? 82 : 64;
  return (
    <Card>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 70px', gap: 34}}>
        <div style={{position: 'relative', width: 420, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width="420" height="420" viewBox="0 0 420 420" style={{position: 'absolute', inset: 0}}>
            <circle cx="210" cy="210" r="190" fill="none" stroke={C.border} strokeWidth="3" strokeDasharray="10 12" />
            <circle cx="210" cy="210" r="150" fill="none" stroke={`${accent()}44`} strokeWidth="2" />
          </svg>
          <div style={{position: 'relative', fontSize: size, lineHeight: 1, fontWeight: 900, letterSpacing: -4, textAlign: 'center', color: C.text, maxWidth: 380}}>{value}</div>
        </div>
        <div style={{fontSize: 28, lineHeight: 1.35, fontWeight: 700, color: C.muted, textAlign: 'center', maxWidth: 720}}>{labels[1]}</div>
        <div style={{padding: '18px 26px', borderRadius: 999, border: `1px solid ${accent()}66`, background: `${accent()}12`, color: accent(), fontSize: 24, fontWeight: 800, textAlign: 'center', opacity: appear(frame, 14, 14)}}>{labels[2]}</div>
      </div>
    </Card>
  );
}

function CycleDiagram({scene}) {
  const frame = useCurrentFrame();
  const labels = (scene.labels || []).slice(0, 3);
  const node = (label, index, style) => (
    <div style={{position: 'absolute', width: 300, minHeight: 140, padding: '20px 22px', borderRadius: 18, border: `2px solid ${[accent(), C.amber, C.blue][index]}88`, background: '#071B2B', boxShadow: `0 0 28px ${[accent(), C.amber, C.blue][index]}22`, ...style}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 40, height: 40, borderRadius: '50%', border: `2px solid ${[accent(), C.amber, C.blue][index]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: [accent(), C.amber, C.blue][index], flexShrink: 0}}>
          {index + 1}
        </div>
        <div style={{fontSize: 25, lineHeight: 1.3, fontWeight: 700}}>{label}</div>
      </div>
    </div>
  );
  return (
    <Card>
      <svg width="940" height="1200" viewBox="0 0 940 1200" style={{position: 'absolute', inset: 0}}>
        <defs>
          <marker id="cycle-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0 0L10 5L0 10" fill="none" stroke={C.muted} strokeWidth="2" />
          </marker>
        </defs>
        <path d="M470 285 C700 320 760 500 720 715" fill="none" stroke={C.muted} strokeWidth="3" strokeDasharray="9 8" markerEnd="url(#cycle-arrow)" opacity="0.8" />
        <path d="M560 825 C500 900 440 900 380 825" fill="none" stroke={C.muted} strokeWidth="3" strokeDasharray="9 8" markerEnd="url(#cycle-arrow)" opacity="0.8" />
        <path d="M220 715 C180 500 240 320 320 285" fill="none" stroke={C.muted} strokeWidth="3" strokeDasharray="9 8" markerEnd="url(#cycle-arrow)" opacity="0.8" />
        <circle cx="470" cy="600" r="78" fill="#061426" stroke={accent()} strokeWidth="3" strokeDasharray="10 10" opacity="0.9" />
      </svg>
      <div style={{position: 'absolute', left: 390, top: 550, width: 160, height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4}}>
        <Icon name="spark" size={30} color={accent()} />
        <div style={{fontSize: 18, letterSpacing: 2, color: accent(), fontWeight: 800}}>LOOP</div>
      </div>
      {node(labels[0], 0, {left: 320, top: 120, opacity: appear(frame, 0, 14)})}
      {node(labels[1], 1, {left: 570, top: 750, opacity: appear(frame, 12, 14)})}
      {node(labels[2], 2, {left: 70, top: 750, opacity: appear(frame, 24, 14)})}
    </Card>
  );
}

function CaptionText({caption}) {
  const sentence = caption.sentence || caption.text || '';
  const highlight = caption.highlight || '';
  const index = highlight ? sentence.indexOf(highlight) : -1;
  if (index < 0) return sentence;
  return (
    <>
      {sentence.slice(0, index)}
      <span style={{color: accent()}}>{highlight}</span>
      {sentence.slice(index + highlight.length)}
    </>
  );
}

const DIAGRAMS = {
  interview: InterviewDiagram,
  flow3: Flow3Diagram,
  flow5: Flow5Diagram,
  recovery: RecoveryDiagram,
  state: StateDiagram,
  retry: RetryDiagram,
  statement: StatementDiagram,
  steps: StepsDiagram,
  compare: CompareDiagram,
  checklist: ChecklistDiagram,
  timeline: TimelineDiagram,
  recap: RecapDiagram,
  'problem-fix': ProblemFixDiagram,
  'cause-effect': CauseEffectDiagram,
  'big-number': BigNumberDiagram,
  cycle: CycleDiagram,
};

function Scene({scene, index, total, series, footer, theme}) {
  activeAccent = theme?.accent || C.teal;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const caption = scene.captions.find((cue) => time >= cue.start && time < cue.end);
  const Diagram = DIAGRAMS[scene.diagram] || InterviewDiagram;
  return (
    <AbsoluteFill style={{backgroundColor: C.navy, color: C.text, fontFamily: 'Inter, "Noto Sans Devanagari", Arial, sans-serif'}}>
      {scene.audio ? (
        <Audio
          src={/^https?:\/\//.test(scene.audio) || /^(blob:|data:|\/)/.test(String(scene.audio)) ? scene.audio : staticFile(scene.audio)}
          durationInFrames={scene.durationInFrames}
        />
      ) : null}
      <Grid theme={theme} />
      <TopBar scene={scene} index={index} total={total} series={series} theme={theme} />
      <Header scene={scene} />
      <Diagram scene={scene} />
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 160, zIndex: 4}}>
        {caption ? (
          <div style={{background: '#061426ee', border: `1px solid ${C.border}`, borderRadius: 20, padding: '22px 28px', fontSize: 32, lineHeight: 1.35, textAlign: 'center', fontWeight: 600}}>
            <CaptionText caption={caption} />
          </div>
        ) : null}
      </div>
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 84, display: 'flex', justifyContent: 'space-between', fontSize: 18, letterSpacing: 2, color: C.dim, zIndex: 4}}>
        <span>{footer || 'HINDI MOTION GRAPHICS · NOT AI FOOTAGE'}</span>
        <span>{Math.round(time)}s</span>
      </div>
    </AbsoluteFill>
  );
}

export const ReelExplainer = ({data: inputData}) => {
  const reel = inputData || staticData;
  const theme = reel.theme?.accent ? reel.theme : themeFor(reel.title);
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      {reel.scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames}>
          <Scene scene={scene} index={index} total={reel.scenes.length} series={reel.series} footer={reel.footer} theme={theme} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
