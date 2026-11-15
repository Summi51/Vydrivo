import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import dataEn from './vydrivo-data-en.json';
import dataHi from './vydrivo-data-hi.json';

const C = {
  navy: '#071629',
  navy2: '#0b2032',
  panel: '#0e2a3d',
  panel2: '#102f44',
  line: '#21465c',
  teal: '#62f2d8',
  tealDeep: '#2bdabc',
  cream: '#f4f8f6',
  muted: '#8fb2c6',
  dim: '#5c7d91',
  white: '#ffffff',
};

const FONT_EN = 'Inter, "Helvetica Neue", Arial, sans-serif';
const FONT_HI = '"Noto Sans Devanagari", "Kohinoor Devanagari", "Devanagari Sangam MN", Arial, sans-serif';
const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const fontFor = (language) => (language === 'hi' ? FONT_HI : FONT_EN);

const LABELS = {
  en: {
    system: {
      browser: 'Browser',
      browserSub: 'Your idea',
      api: 'API',
      apiSub: 'Receives the request',
      database: 'Database',
      databaseSub: 'Stores the project',
      worker: 'Worker',
      workerSub: 'Renders the scene',
      save: 'save',
      idea: 'idea',
      job: 'job',
      note: 'Saved before generation',
      flow: 'ONE REQUEST, ONE PROJECT',
    },
    review: {
      cards: ['Hook', 'Story', 'End'],
      approved: 'APPROVED',
      sceneCards: 'SCENE CARDS',
    },
    render: {
      worker: 'WORKER · SCENE 04',
      rendering: 'Rendering scene',
      complete: 'Render complete',
      narration: 'Narration locked',
      captions: 'Captions locked',
      only: 'Only this scene',
      rest: 'Rest of video: locked',
    },
    export: {
      dimensions: '1080 × 1920',
      ready: 'READY',
      mp4: 'MP4',
      playing: 'PLAYING',
    },
    revise: {
      cards: ['Hook', 'Story', 'Proof', 'End'],
      changed: 'New take',
      change: 'ONE CARD',
      only: 'Only this scene re-renders',
      rest: 'Rest of video stays locked',
      final: 'ONE IDEA → ONE MP4',
      finalSub: 'One scene changed. The rest stayed.',
    },
  },
  hi: {
    system: {
      browser: 'ब्राउज़र',
      browserSub: 'आपका आइडिया',
      api: 'API',
      apiSub: 'रिक्वेस्ट मिलती है',
      database: 'डेटाबेस',
      databaseSub: 'प्रोजेक्ट सेव होता है',
      worker: 'वर्कर',
      workerSub: 'सीन रेंडर करता है',
      save: 'सेव',
      idea: 'आइडिया',
      job: 'काम',
      note: 'जनरेशन से पहले सेव',
      flow: 'एक रिक्वेस्ट, एक प्रोजेक्ट',
    },
    review: {
      cards: ['हुक', 'कहानी', 'अंत'],
      approved: 'मंज़ूर',
      sceneCards: 'सीन कार्ड्स',
    },
    render: {
      worker: 'वर्कर · सीन 04',
      rendering: 'सीन रेंडर हो रहा है',
      complete: 'रेंडर पूरा',
      narration: 'नैरेशन लॉक',
      captions: 'कैप्शन लॉक',
      only: 'सिर्फ़ यही सीन',
      rest: 'बाकी वीडियो: लॉक',
    },
    export: {
      dimensions: '1080 × 1920',
      ready: 'तैयार',
      mp4: 'MP4',
      playing: 'चल रहा है',
    },
    revise: {
      cards: ['हुक', 'कहानी', 'प्रूफ़', 'अंत'],
      changed: 'नया टेक',
      change: 'एक कार्ड',
      only: 'सिर्फ़ यही सीन दोबारा रेंडर',
      rest: 'बाकी वीडियो लॉक रहता है',
      final: 'एक आइडिया → एक MP4',
      finalSub: 'एक सीन बदला। बाकी वैसा ही रहा।',
    },
  },
};

const fadeScene = (frame, duration, fadeIn = 10, fadeOut = 12) =>
  Math.min(
    interpolate(frame, [0, fadeIn], [0, 1], CLAMP),
    interpolate(frame, [duration - fadeOut, duration], [1, 0], CLAMP),
  );

const appear = (frame, at, dur = 16) => interpolate(frame, [at, at + dur], [0, 1], CLAMP);

const slide = (frame, at, dur = 18, distance = 24) => {
  const p = appear(frame, at, dur);
  return {opacity: p, transform: `translateY(${(1 - p) * distance}px)`};
};

const CheckIcon = ({color = C.teal, size = 18}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5l5 5L20 6.5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = ({color = C.muted, size = 18}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="10" width="16" height="11" rx="2.5" stroke={color} strokeWidth="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" />
  </svg>
);

const PlayIcon = ({color = C.teal, size = 18}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 5.5v13l10.5-6.5z" fill={color} />
  </svg>
);

const Spinner = ({size = 22}) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{transform: `rotate(${(frame / 30) * 360}deg)`}}>
      <circle cx="14" cy="14" r="10" fill="none" stroke={C.teal} strokeWidth="3" strokeDasharray="42 20" strokeLinecap="round" />
    </svg>
  );
};

const BrowserIcon = ({color = C.teal}) => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
    <rect x="3" y="5" width="28" height="24" rx="4" stroke={color} strokeWidth="2" />
    <path d="M3 12h28" stroke={color} strokeWidth="2" />
    <circle cx="8" cy="8.5" r="1.2" fill={color} />
    <circle cx="12" cy="8.5" r="1.2" fill={color} />
    <circle cx="16" cy="8.5" r="1.2" fill={color} />
  </svg>
);

const ApiIcon = ({color = C.teal}) => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
    <path d="M17 3l12 7v14l-12 7-12-7V10z" stroke={color} strokeWidth="2" />
    <path d="M12 17h10M18 13l4 4-4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DatabaseIcon = ({color = C.teal}) => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
    <ellipse cx="17" cy="8" rx="11" ry="4" stroke={color} strokeWidth="2" />
    <path d="M6 8v18c0 2.2 4.9 4 11 4s11-1.8 11-4V8" stroke={color} strokeWidth="2" />
    <path d="M6 17c0 2.2 4.9 4 11 4s11-1.8 11-4" stroke={color} strokeWidth="2" />
  </svg>
);

const WorkerIcon = ({color = C.teal}) => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
    <rect x="3" y="5" width="28" height="24" rx="5" stroke={color} strokeWidth="2" />
    <path d="M14 12l9 5-9 5z" fill={color} />
  </svg>
);

const CheckBox = ({checked}) => (
  <div
    style={{
      width: 26,
      height: 26,
      borderRadius: 7,
      border: `2px solid ${checked ? C.teal : C.dim}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? C.teal : 'transparent',
    }}
  >
    {checked ? <CheckIcon color={C.navy} size={16} /> : null}
  </div>
);

const LockChip = ({label, at, frame, language}) => {
  const p = appear(frame, at * 30, 16);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 999,
        border: `1px solid ${C.teal}55`,
        background: `${C.teal}12`,
        color: C.cream,
        fontFamily: fontFor(language),
        fontSize: 17,
        whiteSpace: 'nowrap',
      }}
    >
      <CheckIcon color={C.teal} size={16} /> {label}
    </div>
  );
};

const GlobalChrome = ({durationInFrames, language}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / durationInFrames);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 100}}>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#10293b'}}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${C.tealDeep}, ${C.teal})`,
            boxShadow: `0 0 18px ${C.teal}66`,
          }}
        />
      </div>
      <div style={{position: 'absolute', top: 42, left: 64, display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{width: 12, height: 12, borderRadius: 3, background: C.teal, boxShadow: `0 0 16px ${C.teal}`}} />
        <div style={{fontFamily: FONT_EN, fontSize: 24, fontWeight: 800, letterSpacing: 7, color: C.cream}}>VYDRIVO</div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 48,
          right: 64,
          fontFamily: fontFor(language),
          fontSize: 17,
          letterSpacing: 3,
          color: C.muted,
        }}
      >
        {language === 'hi' ? 'सिस्टम एक्सप्लेनर' : 'SYSTEM EXPLAINER'}
      </div>
    </AbsoluteFill>
  );
};

const TopTitle = ({scene, language, delay = 0}) => {
  const frame = useCurrentFrame();
  const p = appear(frame, delay, 18);
  return (
    <div
      style={{
        position: 'absolute',
        top: 126,
        left: 64,
        right: 64,
        opacity: p,
        transform: `translateY(${(1 - p) * 18}px)`,
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontFamily: fontFor(language),
          fontSize: 19,
          letterSpacing: 4,
          color: C.teal,
          fontWeight: 800,
          textTransform: 'uppercase',
        }}
      >
        {scene.kicker}
      </div>
      <div
        style={{
          fontFamily: fontFor(language),
          fontSize: language === 'hi' ? 52 : 62,
          lineHeight: 1.06,
          fontWeight: 800,
          color: C.cream,
          marginTop: 10,
          maxWidth: 920,
          textShadow: '0 2px 24px #00000099',
        }}
      >
        {scene.title}
      </div>
    </div>
  );
};

const Caption = ({scene, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = scene.captions.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const cueStart = Math.round(cue.start * fps);
  const cueEnd = Math.round(cue.end * fps);
  const cueFrames = Math.max(1, cueEnd - cueStart);
  const local = frame - cueStart;
  const opacity = Math.min(
    interpolate(local, [0, 7], [0, 1], CLAMP),
    interpolate(local, [cueFrames - 7, cueFrames], [1, 0], CLAMP),
  );
  const y = interpolate(local, [0, 7], [16, 0], CLAMP);
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 96,
        opacity,
        transform: `translateY(${y}px)`,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 940,
          padding: '24px 32px',
          borderRadius: 24,
          background: '#06131fee',
          border: `1px solid ${C.line}`,
          boxShadow: '0 18px 60px #00000066',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            width: 54,
            height: 5,
            borderRadius: 5,
            background: C.teal,
            marginBottom: 15,
            boxShadow: `0 0 16px ${C.teal}88`,
          }}
        />
        <div
          style={{
            fontFamily: fontFor(language),
            fontSize: language === 'hi' ? 38 : 44,
            lineHeight: 1.28,
            color: C.cream,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {cue.text}
        </div>
      </div>
    </div>
  );
};

const FootageGradient = () => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, #06131fdd 0%, #06131f66 18%, transparent 40%, transparent 60%, #06131fcc 82%, #06131fee 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 45%, #06131f88 100%)',
        opacity: 0.55,
      }}
    />
  </>
);

const SceneOne = ({scene, language}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, scene.durationInFrames], [1, 1.045], CLAMP);
  return (
    <AbsoluteFill
      style={{
        opacity: fadeScene(frame, scene.durationInFrames, 10, 12),
        background: C.navy,
        overflow: 'hidden',
      }}
    >
      <OffthreadVideo
        src={staticFile(scene.video)}
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom})`,
        }}
      />
      <FootageGradient />
      <TopTitle scene={scene} language={language} />
      <Caption scene={scene} language={language} />
    </AbsoluteFill>
  );
};

const DiagramNode = ({x, y, w, h, icon, label, sub, appearAt, active, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = Math.round(appearAt * fps);
  const local = Math.max(0, frame - start);
  const p = spring({frame: local, fps, config: {damping: 18, stiffness: 120}});
  const opacity = interpolate(frame, [start, start + 12], [0, 1], CLAMP);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        transform: `translateY(${(1 - p) * 30}px) scale(${0.96 + 0.04 * p})`,
        borderRadius: 26,
        border: `2px solid ${active ? C.teal : C.line}`,
        background: active
          ? 'linear-gradient(145deg,#123f4e,#0b2637)'
          : 'linear-gradient(145deg,#0e2a3d,#0a1f2f)',
        boxShadow: active ? `0 0 40px ${C.teal}22` : '0 12px 40px #00000033',
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '0 24px',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: '#06131f',
          border: `1px solid ${active ? C.teal : C.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{fontFamily: fontFor(language), fontSize: 34, fontWeight: 800, color: C.cream}}>{label}</div>
        <div style={{fontFamily: fontFor(language), fontSize: 20, color: active ? C.teal : C.muted, marginTop: 4}}>
          {sub}
        </div>
      </div>
      {active ? (
        <div
          style={{
            marginLeft: 'auto',
            width: 10,
            height: 10,
            borderRadius: 50,
            background: C.teal,
            boxShadow: `0 0 16px ${C.teal}`,
          }}
        />
      ) : null}
    </div>
  );
};

const SceneTwo = ({scene, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const L = LABELS[language].system;
  const browserActive = time >= 0.2 && time < 1.8;
  const apiActive = time >= 1.2 && time < 5.6;
  const dbActive = time >= 2.2 && time < 5.0;
  const workerActive = time >= 3.6;
  const line1 = appear(frame, 0.8 * fps, 20);
  const line2 = appear(frame, 2.2 * fps, 20);
  const line3 = appear(frame, 3.6 * fps, 24);
  const pulse1 = interpolate(frame, [0.8 * fps, 1.8 * fps], [0, 1], CLAMP);
  const pulse2 = interpolate(frame, [2.2 * fps, 3.2 * fps], [0, 1], CLAMP);
  const pulse3 = interpolate(frame, [3.6 * fps, 5.0 * fps], [0, 1], CLAMP);
  const showPulse1 = time >= 0.8 && time < 1.9;
  const showPulse2 = time >= 2.2 && time < 3.3;
  const showPulse3 = time >= 3.6 && time < 5.1;
  const pulse1Y = 570 + (760 - 570) * pulse1;
  const pulse2X = 520 + (580 - 520) * pulse2;
  const pulse3Y = 910 + (1240 - 910) * pulse3;

  return (
    <AbsoluteFill
      style={{
        opacity: fadeScene(frame, scene.durationInFrames, 10, 12),
        background: 'radial-gradient(ellipse at 70% 20%, #164862, #071629 75%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 100,
          width: 880,
          height: 1200,
          background: 'radial-gradient(ellipse at center, #0f4a5c55, transparent 65%)',
          filter: 'blur(20px)',
        }}
      />
      <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <defs>
          <pattern id="vydrivo-grid" width="54" height="54" patternUnits="userSpaceOnUse">
            <path d="M54 0H0V54" fill="none" stroke="#123246" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="url(#vydrivo-grid)" opacity="0.55" />
        <line x1="310" y1="570" x2="310" y2="760" stroke={C.teal} strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - line1} />
        <line x1="520" y1="835" x2="580" y2="835" stroke={C.teal} strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - line2} />
        <line x1="310" y1="910" x2="310" y2="1240" stroke={C.teal} strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - line3} />
        <polygon points="310,760 300,744 320,744" fill={C.teal} opacity={line1} />
        <polygon points="580,835 564,825 564,845" fill={C.teal} opacity={line2} />
        <polygon points="310,1240 300,1224 320,1224" fill={C.teal} opacity={line3} />
        <circle cx="310" cy={pulse1Y} r="16" fill={C.teal} opacity={showPulse1 ? 0.18 : 0} />
        <circle cx="310" cy={pulse1Y} r="7" fill={C.teal} opacity={showPulse1 ? 1 : 0} />
        <circle cx={pulse2X} cy="835" r="16" fill={C.teal} opacity={showPulse2 ? 0.18 : 0} />
        <circle cx={pulse2X} cy="835" r="7" fill={C.teal} opacity={showPulse2 ? 1 : 0} />
        <circle cx="310" cy={pulse3Y} r="16" fill={C.teal} opacity={showPulse3 ? 0.18 : 0} />
        <circle cx="310" cy={pulse3Y} r="7" fill={C.teal} opacity={showPulse3 ? 1 : 0} />
        <text x="330" y="660" fill={C.teal} fontFamily={fontFor(language)} fontSize="18" letterSpacing="2" opacity={line1}>
          {L.idea}
        </text>
        <text x="550" y="810" fill={C.teal} fontFamily={fontFor(language)} fontSize="18" letterSpacing="2" textAnchor="middle" opacity={line2}>
          {L.save}
        </text>
        <text x="330" y="1080" fill={C.teal} fontFamily={fontFor(language)} fontSize="18" letterSpacing="2" opacity={line3}>
          {L.job}
        </text>
      </svg>

      <TopTitle scene={scene} language={language} />

      <div
        style={{
          position: 'absolute',
          top: 340,
          left: 100,
          right: 100,
          textAlign: 'center',
          fontFamily: fontFor(language),
          fontSize: 18,
          letterSpacing: 4,
          color: C.muted,
        }}
      >
        {L.flow}
      </div>

      <DiagramNode x={100} y={420} w={420} h={150} icon={<BrowserIcon color={browserActive ? C.teal : C.muted} />} label={L.browser} sub={L.browserSub} appearAt={0.2} active={browserActive} language={language} />
      <DiagramNode x={100} y={760} w={420} h={150} icon={<ApiIcon color={apiActive ? C.teal : C.muted} />} label={L.api} sub={L.apiSub} appearAt={1.0} active={apiActive} language={language} />
      <DiagramNode x={580} y={760} w={420} h={150} icon={<DatabaseIcon color={dbActive ? C.teal : C.muted} />} label={L.database} sub={L.databaseSub} appearAt={2.2} active={dbActive} language={language} />
      <DiagramNode x={100} y={1240} w={420} h={150} icon={<WorkerIcon color={workerActive ? C.teal : C.muted} />} label={L.worker} sub={L.workerSub} appearAt={3.4} active={workerActive} language={language} />

      <div style={{position: 'absolute', top: 1450, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...slide(frame, 5.4 * fps, 18)}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 999,
            border: `1px solid ${C.line}`,
            background: '#071a28cc',
            color: C.muted,
            fontFamily: fontFor(language),
            fontSize: 19,
          }}
        >
          <CheckIcon color={C.teal} size={18} /> {L.note}
        </div>
      </div>

      <Caption scene={scene} language={language} />
    </AbsoluteFill>
  );
};

const SceneThree = ({scene, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const L = LABELS[language].review;
  const cardW = 280;
  const gap = 18;
  const total = 3 * cardW + 2 * gap;
  const startX = (1080 - total) / 2;
  const cardAppear = [1.0, 1.7, 2.4];
  const checkAt = [5.0, 5.8, 6.6];
  const zoom = interpolate(frame, [0, scene.durationInFrames], [1, 1.04], CLAMP);

  return (
    <AbsoluteFill
      style={{
        opacity: fadeScene(frame, scene.durationInFrames, 10, 12),
        background: C.navy,
        overflow: 'hidden',
      }}
    >
      <OffthreadVideo
        src={staticFile(scene.video)}
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom})`,
        }}
      />
      <FootageGradient />
      <TopTitle scene={scene} language={language} />

      <div style={{position: 'absolute', top: 1168, left: startX, ...slide(frame, 0.8 * fps, 16)}}>
        <div style={{fontFamily: fontFor(language), fontSize: 17, letterSpacing: 3, color: C.teal, fontWeight: 800}}>
          {L.sceneCards}
        </div>
      </div>

      <div style={{position: 'absolute', top: 1118, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...slide(frame, 10.6 * fps, 16)}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 999,
            background: C.teal,
            color: C.navy,
            fontFamily: fontFor(language),
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 2,
            boxShadow: `0 0 30px ${C.teal}55`,
          }}
        >
          <CheckIcon color={C.navy} size={18} /> {L.approved}
        </div>
      </div>

      {L.cards.map((label, i) => {
        const p = appear(frame, cardAppear[i] * fps, 16);
        const checked = time >= checkAt[i];
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: startX + i * (cardW + gap),
              top: 1220,
              width: cardW,
              height: 120,
              opacity: p,
              transform: `translateY(${(1 - p) * 18}px)`,
              borderRadius: 20,
              border: `2px solid ${checked ? C.teal : C.line}`,
              background: '#071a28ee',
              padding: '18px 20px',
              boxShadow: checked ? `0 0 28px ${C.teal}22` : 'none',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{fontFamily: FONT_EN, fontSize: 16, color: C.teal, letterSpacing: 2}}>{`0${i + 1}`}</div>
              <CheckBox checked={checked} />
            </div>
            <div style={{fontFamily: fontFor(language), fontSize: 30, fontWeight: 800, color: C.cream, marginTop: 10}}>
              {label}
            </div>
          </div>
        );
      })}

      <Caption scene={scene} language={language} />
    </AbsoluteFill>
  );
};

const SceneFour = ({scene, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const L = LABELS[language].render;
  const zoom = interpolate(frame, [0, scene.durationInFrames], [1.0, 1.12], CLAMP);
  const progress = interpolate(frame, [0.5 * fps, 8 * fps], [0, 1], CLAMP);
  const complete = time >= 8;

  return (
    <AbsoluteFill
      style={{
        opacity: fadeScene(frame, scene.durationInFrames, 10, 12),
        background: C.navy,
        overflow: 'hidden',
      }}
    >
      <OffthreadVideo
        src={staticFile(scene.video)}
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(42px) brightness(0.32) saturate(1.15)',
          transform: 'scale(1.18)',
        }}
      />
      <div style={{position: 'absolute', inset: 0, background: '#06131fcc'}} />

      <TopTitle scene={scene} language={language} />

      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: 500,
          height: 562,
          borderRadius: 28,
          overflow: 'hidden',
          border: `2px solid ${C.line}`,
          boxShadow: '0 24px 80px #00000088',
          background: C.navy2,
        }}
      >
        <OffthreadVideo
          src={staticFile(scene.video)}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(1.3) contrast(1.06) saturate(1.12)',
            transform: `scale(${zoom})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #06131f33 0%, transparent 24%, transparent 52%, #06131fe6 82%, #06131f 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 24,
            padding: '9px 14px',
            borderRadius: 999,
            background: '#06131fcc',
            border: `1px solid ${C.line}`,
            fontFamily: fontFor(language),
            fontSize: 16,
            letterSpacing: 2,
            color: C.teal,
          }}
        >
          {L.worker}
        </div>
        <div style={{position: 'absolute', left: 28, right: 28, bottom: 42}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
            <div style={{fontFamily: fontFor(language), fontSize: 16, letterSpacing: 2, color: complete ? C.teal : C.muted}}>
              {complete ? L.complete : L.rendering}
            </div>
            <div style={{fontFamily: FONT_EN, fontSize: 16, color: C.teal}}>{Math.round(progress * 100)}%</div>
          </div>
          <div style={{height: 7, borderRadius: 7, background: '#ffffff22', overflow: 'hidden'}}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${C.tealDeep}, ${C.teal})`,
                boxShadow: `0 0 18px ${C.teal}88`,
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: 1100,
          padding: '24px 26px',
          borderRadius: 26,
          background: '#071a28ee',
          border: `1px solid ${C.line}`,
          boxShadow: '0 18px 60px #00000055',
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontFamily: fontFor(language), fontSize: 18, letterSpacing: 3, color: C.teal}}>{L.worker}</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            {complete ? <CheckIcon color={C.teal} size={22} /> : <Spinner size={22} />}
            <div style={{fontFamily: fontFor(language), fontSize: 16, color: complete ? C.teal : C.muted}}>
              {complete ? L.complete : L.rendering}
            </div>
          </div>
        </div>
        <div style={{display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap'}}>
          <LockChip label={L.narration} at={4.8} frame={frame} language={language} />
          <LockChip label={L.captions} at={6.2} frame={frame} language={language} />
        </div>
        <div style={{marginTop: 18, fontFamily: fontFor(language), fontSize: 17, color: C.muted, ...slide(frame, 8.0 * fps, 16)}}>
          <span style={{color: C.teal}}>✓</span> {L.only} · {L.rest}
        </div>
      </div>

      <Caption scene={scene} language={language} />
    </AbsoluteFill>
  );
};

const SceneFive = ({scene, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const L = LABELS[language].export;
  const progress = interpolate(frame, [0, scene.durationInFrames], [0, 1], CLAMP);
  const zoom = interpolate(frame, [0, scene.durationInFrames], [1, 1.04], CLAMP);
  const ready = time >= 11.5;

  return (
    <AbsoluteFill
      style={{
        opacity: fadeScene(frame, scene.durationInFrames, 10, 12),
        background: C.navy,
        overflow: 'hidden',
      }}
    >
      <OffthreadVideo
        src={staticFile(scene.video)}
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom})`,
        }}
      />
      <FootageGradient />
      <TopTitle scene={scene} language={language} />

      <div style={{position: 'absolute', top: 120, right: 64, ...slide(frame, 0.8 * fps, 16)}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 14,
            background: '#06131fcc',
            border: `1px solid ${C.line}`,
            fontFamily: FONT_EN,
            fontSize: 17,
            color: C.cream,
            letterSpacing: 1,
          }}
        >
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
            <rect x="1" y="1" width="12" height="20" rx="2" stroke={C.teal} strokeWidth="1.5" />
          </svg>
          {L.dimensions}
        </div>
      </div>

      <div style={{position: 'absolute', left: 90, right: 90, top: 1470, ...slide(frame, 0.5 * fps, 16)}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: fontFor(language), fontSize: 16, letterSpacing: 2, color: C.teal}}>
            <PlayIcon color={C.teal} size={16} /> {L.playing}
          </div>
          <div style={{fontFamily: FONT_EN, fontSize: 16, color: C.muted}}>00:15</div>
        </div>
        <div style={{height: 7, borderRadius: 7, background: '#ffffff22', overflow: 'hidden'}}>
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${C.tealDeep}, ${C.teal})`,
              boxShadow: `0 0 18px ${C.teal}88`,
            }}
          />
        </div>
      </div>

      <div style={{position: 'absolute', top: 1350, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...slide(frame, 11.5 * fps, 16)}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderRadius: 999,
            background: C.teal,
            color: C.navy,
            fontFamily: fontFor(language),
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 2,
            boxShadow: `0 0 40px ${C.teal}66`,
            opacity: ready ? 1 : 0,
          }}
        >
          <CheckIcon color={C.navy} size={18} /> {L.ready} <span style={{opacity: 0.7}}>·</span> {L.mp4}
        </div>
      </div>

      <Caption scene={scene} language={language} />
    </AbsoluteFill>
  );
};

const RevisionCard = ({
  i,
  label,
  frame,
  language,
  isTarget,
  changed,
  rendering,
  done,
  locked,
  renderProgress,
  changedLabel,
}) => {
  const top = 400 + i * 172;
  const p = appear(frame, (0.4 + i * 0.15) * 30, 16);
  const oldOpacity = isTarget ? interpolate(frame, [4.3 * 30, 4.6 * 30], [1, 0], CLAMP) : 1;
  const newOpacity = isTarget ? interpolate(frame, [4.5 * 30, 4.8 * 30], [0, 1], CLAMP) : 0;
  const border = isTarget ? C.teal : C.line;
  const glow = isTarget ? `0 0 30px ${C.teal}22` : 'none';

  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        top,
        width: 840,
        height: 150,
        opacity: p,
        transform: `translateY(${(1 - p) * 18}px)`,
        borderRadius: 22,
        border: `2px solid ${border}`,
        background: isTarget ? 'linear-gradient(145deg,#0f3b4a,#0a2434)' : '#0b2233',
        boxShadow: glow,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div style={{fontFamily: FONT_EN, fontSize: 18, color: isTarget ? C.teal : C.dim, letterSpacing: 2, width: 32}}>
        {`0${i + 1}`}
      </div>
      <div style={{position: 'relative', width: 470, height: 54}}>
        <div style={{position: 'absolute', inset: 0, opacity: oldOpacity, fontFamily: fontFor(language), fontSize: 30, fontWeight: 800, color: C.cream}}>
          {label}
        </div>
        {isTarget ? (
          <div style={{position: 'absolute', inset: 0, opacity: newOpacity, fontFamily: fontFor(language), fontSize: 30, fontWeight: 800, color: C.teal}}>
            {changedLabel}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'relative',
          width: 130,
          height: 86,
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${C.line}`,
          background: isTarget && changed ? 'linear-gradient(135deg,#1d6d78,#b06a3a)' : 'linear-gradient(135deg,#173b52,#2b5a72)',
          flexShrink: 0,
        }}
      >
        <div style={{position: 'absolute', inset: 0, opacity: 0.35, background: 'repeating-linear-gradient(90deg, transparent 0 10px, #ffffff22 10px 11px)'}} />
        <div style={{position: 'absolute', left: 10, bottom: 8}}>
          <PlayIcon color={C.cream} size={16} />
        </div>
        {isTarget && changed ? (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              padding: '3px 7px',
              borderRadius: 6,
              background: C.teal,
              color: C.navy,
              fontFamily: FONT_EN,
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            NEW
          </div>
        ) : null}
      </div>
      <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10}}>
        {isTarget ? (
          rendering ? <Spinner size={24} /> : done ? <CheckIcon color={C.teal} size={24} /> : <div style={{width: 10, height: 10, borderRadius: 50, background: C.teal, boxShadow: `0 0 16px ${C.teal}`}} />
        ) : locked ? (
          <>
            <LockIcon color={C.muted} size={20} />
            <div style={{fontFamily: fontFor(language), fontSize: 13, letterSpacing: 2, color: C.muted}}>
              {language === 'hi' ? 'लॉक' : 'LOCKED'}
            </div>
          </>
        ) : null}
      </div>
      {isTarget ? (
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 0, height: 4, background: '#ffffff11'}}>
          <div style={{width: `${renderProgress * 100}%`, height: '100%', background: C.teal}} />
        </div>
      ) : null}
    </div>
  );
};

const SceneSix = ({scene, language}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const L = LABELS[language].revise;
  const changed = time >= 4.5;
  const rendering = time >= 5.0 && time < 7.5;
  const done = time >= 7.5;
  const locked = time >= 5.5;
  const renderProgress = interpolate(frame, [5.0 * fps, 7.5 * fps], [0, 1], CLAMP);

  return (
    <AbsoluteFill
      style={{
        opacity: fadeScene(frame, scene.durationInFrames, 10, 12),
        background: 'radial-gradient(ellipse at 60% 20%, #164862, #071629 75%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 100,
          width: 880,
          height: 1100,
          background: 'radial-gradient(ellipse at center, #0f4a5c44, transparent 65%)',
          filter: 'blur(24px)',
        }}
      />
      <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <defs>
          <pattern id="vydrivo-grid-6" width="54" height="54" patternUnits="userSpaceOnUse">
            <path d="M54 0H0V54" fill="none" stroke="#123246" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="url(#vydrivo-grid-6)" opacity="0.5" />
      </svg>

      <TopTitle scene={scene} language={language} />

      <div style={{position: 'absolute', top: 340, right: 120, ...slide(frame, 2.2 * fps, 16)}}>
        <div
          style={{
            padding: '9px 14px',
            borderRadius: 999,
            border: `1px solid ${C.teal}55`,
            background: `${C.teal}10`,
            color: C.teal,
            fontFamily: fontFor(language),
            fontSize: 16,
            letterSpacing: 3,
          }}
        >
          {L.change}
        </div>
      </div>

      {L.cards.map((label, i) => {
        const isTarget = i === 2;
        return (
          <RevisionCard
            key={label}
            i={i}
            label={label}
            frame={frame}
            language={language}
            isTarget={isTarget}
            changed={changed}
            rendering={rendering}
            done={done}
            locked={!isTarget && locked}
            renderProgress={isTarget ? renderProgress : 0}
            changedLabel={L.changed}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 1120,
          width: 840,
          padding: '22px 24px',
          borderRadius: 24,
          border: `1px solid ${C.line}`,
          background: '#071a28ee',
          ...slide(frame, 7.2 * fps, 16),
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: fontFor(language), fontSize: 20, color: C.cream}}>
          <CheckIcon color={C.teal} size={20} /> {L.only}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: fontFor(language), fontSize: 20, color: C.muted, marginTop: 14}}>
          <LockIcon color={C.muted} size={20} /> {L.rest}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 1320,
          width: 840,
          padding: '28px 30px',
          borderRadius: 28,
          border: `2px solid ${C.teal}66`,
          background: 'linear-gradient(135deg,#0f4b58,#0a2638)',
          boxShadow: `0 0 60px ${C.teal}22`,
          ...slide(frame, 9.4 * fps, 18),
        }}
      >
        <div style={{fontFamily: fontFor(language), fontSize: language === 'hi' ? 34 : 38, fontWeight: 800, color: C.cream, textAlign: 'center'}}>
          {L.final}
        </div>
        <div style={{fontFamily: fontFor(language), fontSize: 19, color: C.muted, textAlign: 'center', marginTop: 10}}>
          {L.finalSub}
        </div>
      </div>

      <Caption scene={scene} language={language} />
    </AbsoluteFill>
  );
};

const SceneVisual = ({scene, language}) => {
  if (scene.kind === 'footage') {
    if (scene.id === 'scene-1') return <SceneOne scene={scene} language={language} />;
    if (scene.id === 'scene-3') return <SceneThree scene={scene} language={language} />;
    if (scene.id === 'scene-4') return <SceneFour scene={scene} language={language} />;
    if (scene.id === 'scene-5') return <SceneFive scene={scene} language={language} />;
  }
  if (scene.kind === 'system') return <SceneTwo scene={scene} language={language} />;
  if (scene.kind === 'revise') return <SceneSix scene={scene} language={language} />;
  throw new Error(`Unsupported Vydrivo scene: ${scene.id}/${scene.kind}`);
};

const Scene = ({scene, language}) => (
  <AbsoluteFill>
    <Audio src={staticFile(scene.audio)} />
    <SceneVisual scene={scene} language={language} />
  </AbsoluteFill>
);

const Explainer = ({data}) => {
  if (!data?.scenes?.length) throw new Error('Missing Vydrivo explainer data.');
  if (data.durationInFrames !== 2250) throw new Error('The Vydrivo explainer must be exactly 2250 frames (75 seconds).');
  if (!LABELS[data.language]) throw new Error('Unsupported Vydrivo explainer language.');
  return (
    <AbsoluteFill style={{background: C.navy, overflow: 'hidden'}}>
      {data.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames} name={scene.title}>
          <Scene scene={scene} language={data.language} />
        </Sequence>
      ))}
      <GlobalChrome durationInFrames={data.durationInFrames} language={data.language} />
    </AbsoluteFill>
  );
};

export const VydrivoExplainerEN = () => <Explainer data={dataEn} />;
export const VydrivoExplainerHI = () => <Explainer data={dataHi} />;
