import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const INK = '#eef3ff';
const DIM = '#93a4c4';
const BG = '#050914';
const GOLD = '#ffd166';

const PLANETS = [
  { name: 'Mercury', color: '#a9a29b', color2: '#6f6862', fact: '88-day year' },
  { name: 'Venus', color: '#e8c07a', color2: '#a97a3f', fact: '460°C surface' },
  { name: 'Earth', color: '#4f9fe0', color2: '#1d5f9e', fact: '1 moon' },
  { name: 'Mars', color: '#d1664a', color2: '#8d3a26', fact: '2 moons' },
  { name: 'Jupiter', color: '#d9b28c', color2: '#9b6b4a', fact: 'Largest planet' },
  { name: 'Saturn', color: '#e8d3a1', color2: '#b3965f', fact: 'Rings of ice' },
  { name: 'Uranus', color: '#8fd8e0', color2: '#4f9aa6', fact: 'Tilted 98°' },
  { name: 'Neptune', color: '#5b7fe0', color2: '#2f4aa8', fact: 'Windiest world' },
];

function seeded(i, n) {
  const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: seeded(i, 1) * 1080,
  y: seeded(i, 2) * 1920,
  size: 1 + seeded(i, 3) * 2.4,
  phase: seeded(i, 4) * Math.PI * 2,
  speed: 0.5 + seeded(i, 5) * 1.5,
}));

const Starfield = ({ t }) => (
  <AbsoluteFill>
    {STARS.map((s, i) => {
      const tw = 0.22 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: i % 7 === 0 ? '#ffe9b0' : '#dbe7ff',
            opacity: tw,
            boxShadow: i % 9 === 0 ? '0 0 8px rgba(255,233,176,0.8)' : 'none',
          }}
        />
      );
    })}
  </AbsoluteFill>
);

const Sun = ({ size = 420, x = 540, y = 820, t = 0 }) => {
  const pulse = 1 + Math.sin(t * 2.1) * 0.018;
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <div
        style={{
          position: 'absolute',
          inset: -size * 0.5,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,176,46,0.40) 0%, rgba(255,107,26,0.14) 42%, transparent 70%)',
          transform: `scale(${pulse})`,
        }}
      />
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 2,
            height: size * 0.66,
            background: 'linear-gradient(to top, rgba(255,209,102,0.5), transparent)',
            transformOrigin: '50% 0%',
            transform: `rotate(${i * 15 + t * 5}deg) translateY(${size * 0.46}px)`,
            opacity: 0.3,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 36% 32%, #fff6cf 0%, #ffd166 26%, #ff9d2e 54%, #f06a18 80%, #b93b0c 100%)',
          boxShadow: '0 0 100px rgba(255,150,40,0.55), inset 0 0 60px rgba(255,240,190,0.35)',
          transform: `scale(${pulse})`,
        }}
      />
    </div>
  );
};

const Planet = ({ p, size, x, y, t = 0, ring = false, label = true, delay = 0 }) => {
  const bob = Math.sin(t * 1.6 + delay) * 5;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        transform: `translate(-50%, -50%) translateY(${bob}px)`,
        textAlign: 'center',
      }}
    >
      {ring ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 1.8,
            height: size * 0.52,
            border: `${Math.max(4, size * 0.045)}px solid ${p.color}99`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%) rotate(-17deg)',
            boxShadow: '0 0 22px rgba(255,255,255,0.10)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          margin: '0 auto',
          borderRadius: '50%',
          background: `radial-gradient(circle at 33% 28%, ${p.color} 0%, ${p.color2} 60%, #0a1020 100%)`,
          boxShadow: `inset -${size * 0.12}px -${size * 0.1}px ${size * 0.24}px rgba(0,0,0,0.55), 0 0 ${size * 0.3}px ${p.color}33`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.35), transparent 46%)',
          }}
        />
      </div>
      {label ? (
        <>
          <div style={{ marginTop: 14, fontSize: 30, fontWeight: 700, color: INK }}>{p.name}</div>
          <div style={{ marginTop: 2, fontSize: 20, color: DIM }}>{p.fact}</div>
        </>
      ) : null}
    </div>
  );
};

const ORBIT_PLANETS = [
  { p: PLANETS[0], r: 150, a: 0.2, speed: 1.9, size: 26 },
  { p: PLANETS[1], r: 205, a: 2.1, speed: 1.5, size: 32 },
  { p: PLANETS[2], r: 265, a: 4.0, speed: 1.2, size: 34 },
  { p: PLANETS[3], r: 320, a: 5.4, speed: 1.0, size: 28 },
  { p: PLANETS[4], r: 410, a: 1.0, speed: 0.7, size: 54 },
  { p: PLANETS[5], r: 490, a: 3.4, speed: 0.55, size: 46, ring: true },
  { p: PLANETS[6], r: 560, a: 5.0, speed: 0.45, size: 36 },
  { p: PLANETS[7], r: 620, a: 2.6, speed: 0.38, size: 34 },
];

const Orbits = ({ t, cx = 540, cy = 980, scale = 1, sunSize = 180 }) => (
  <>
    {ORBIT_PLANETS.map((o, i) => {
      const angle = o.a + t * o.speed * 0.25;
      const x = cx + Math.cos(angle) * o.r * scale;
      const y = cy + Math.sin(angle) * o.r * 0.38 * scale;
      return (
        <div key={i}>
          <div
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              width: o.r * 2 * scale,
              height: o.r * 0.76 * scale,
              marginLeft: -o.r * scale,
              marginTop: -o.r * 0.38 * scale,
              borderRadius: '50%',
              border: '1px solid rgba(120,160,220,0.14)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: o.size * scale,
              height: o.size * scale,
              marginLeft: (-o.size * scale) / 2,
              marginTop: (-o.size * scale) / 2,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, ${o.p.color}, ${o.p.color2})`,
              boxShadow: `0 0 ${o.size * scale * 0.5}px ${o.p.color}55`,
            }}
          />
        </div>
      );
    })}
    <Sun size={sunSize * scale} x={cx} y={cy} t={t} />
  </>
);

const Kicker = ({ children }) => (
  <div style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: 6, color: GOLD }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <div style={{ marginTop: 12, fontSize: 76, lineHeight: 1.04, fontWeight: 900, color: INK, letterSpacing: -2 }}>
    {children}
  </div>
);

const Intro = ({ t }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', top: 300, left: 90, right: 90 }}>
      <Kicker>A SHORT TOUR</Kicker>
      <div style={{ marginTop: 18, fontSize: 96, lineHeight: 1.02, fontWeight: 900, color: INK, letterSpacing: -3 }}>
        The Solar
        <br />
        System
      </div>
      <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.45, color: DIM, maxWidth: 720 }}>
        Eight planets. One star. About 4.6 billion years in the making.
      </div>
    </div>
    <Orbits t={t} cy={1450} scale={0.62} sunSize={200} />
  </AbsoluteFill>
);

const SunSection = ({ t }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', top: 230, left: 90, right: 90 }}>
      <Kicker>01 · THE SUN</Kicker>
      <SectionTitle>Our Star</SectionTitle>
    </div>
    <Sun size={520} x={540} y={900} t={t} />
    <div style={{ position: 'absolute', left: 90, right: 90, top: 1280, display: 'grid', gap: 16 }}>
      {[
        ['99.8%', "of the Solar System's mass"],
        ['4.6 billion', 'years old'],
        ['1.4 million km', 'across'],
      ].map(([big, small], i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 18,
            padding: '16px 24px',
            borderRadius: 18,
            background: 'rgba(14,24,44,0.72)',
            border: '1px solid rgba(120,160,220,0.18)',
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 800, color: GOLD, minWidth: 250 }}>{big}</div>
          <div style={{ fontSize: 24, color: DIM }}>{small}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const Rocky = ({ t }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', top: 230, left: 90, right: 90 }}>
      <Kicker>02 · INNER WORLDS</Kicker>
      <SectionTitle>Rocky Planets</SectionTitle>
    </div>
    <Planet p={PLANETS[0]} size={150} x={300} y={800} t={t} delay={0} />
    <Planet p={PLANETS[1]} size={180} x={780} y={800} t={t} delay={0.6} />
    <Planet p={PLANETS[2]} size={190} x={300} y={1230} t={t} delay={1.2} />
    <Planet p={PLANETS[3]} size={160} x={780} y={1230} t={t} delay={1.8} />
  </AbsoluteFill>
);

const Giants = ({ t }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', top: 230, left: 90, right: 90 }}>
      <Kicker>03 · OUTER WORLDS</Kicker>
      <SectionTitle>Gas &amp; Ice Giants</SectionTitle>
    </div>
    <Planet p={PLANETS[4]} size={220} x={300} y={820} t={t} delay={0} />
    <Planet p={PLANETS[5]} size={190} x={780} y={820} t={t} ring delay={0.6} />
    <Planet p={PLANETS[6]} size={170} x={300} y={1260} t={t} ring delay={1.2} />
    <Planet p={PLANETS[7]} size={160} x={780} y={1260} t={t} delay={1.8} />
  </AbsoluteFill>
);

const Finale = ({ t }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', top: 300, left: 90, right: 90 }}>
      <Kicker>THE TAKEAWAY</Kicker>
      <div style={{ marginTop: 18, fontSize: 88, lineHeight: 1.06, fontWeight: 900, color: INK, letterSpacing: -3 }}>
        One star.
        <br />
        Eight planets.
        <br />
        One home.
      </div>
    </div>
    <Orbits t={t} cy={1420} scale={0.66} sunSize={190} />
  </AbsoluteFill>
);

const Header = () => (
  <div
    style={{
      position: 'absolute',
      top: 54,
      left: 70,
      right: 70,
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'monospace',
      fontSize: 18,
      letterSpacing: 3,
      color: 'rgba(147,164,196,0.75)',
    }}
  >
    <span>GRAPHICS DIAGNOSTIC · NOT AI FOOTAGE</span>
    <span>SOLAR SYSTEM</span>
  </div>
);

const Caption = ({ text }) => (
  <div style={{ position: 'absolute', left: 70, right: 70, bottom: 150, display: 'flex', justifyContent: 'center' }}>
    <div
      style={{
        maxWidth: 940,
        padding: '20px 28px',
        borderRadius: 18,
        background: 'rgba(5,9,20,0.82)',
        border: '1px solid rgba(120,160,220,0.22)',
        color: INK,
        fontSize: 36,
        lineHeight: 1.3,
        textAlign: 'center',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}
    >
      {text}
    </div>
  </div>
);

const Progress = ({ t, total }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: `${Math.min(100, (t / total) * 100)}%`,
      height: 5,
      background: `linear-gradient(to right, ${GOLD}, #ff8a3d)`,
    }}
  />
);

export const SolarSystem = ({ audioSrc, durationInFrames, captions = [], sections = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const total = durationInFrames / fps;
  const active = sections.find((s) => t >= s.from && t < s.to) || sections[sections.length - 1] || null;
  const caption = captions.find((c) => t >= c.start && t < c.end);
  const local = active ? t - active.from : 0;
  const fadeIn = interpolate(local, [0, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = active
    ? interpolate(t, [active.to - 0.45, active.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  const opacity = fadeIn * fadeOut;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #0b1730 0%, ${BG} 62%, #02040a 100%)`,
        fontFamily: 'Helvetica, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <Starfield t={t} />
      <Header />
      <AbsoluteFill style={{ opacity }}>
        {active?.kind === 'intro' ? <Intro t={local} /> : null}
        {active?.kind === 'sun' ? <SunSection t={local} /> : null}
        {active?.kind === 'rocky' ? <Rocky t={local} /> : null}
        {active?.kind === 'giants' ? <Giants t={local} /> : null}
        {active?.kind === 'finale' ? <Finale t={local} /> : null}
      </AbsoluteFill>
      {caption ? <Caption text={caption.text} /> : null}
      <Progress t={t} total={total} />
      <Audio src={staticFile(audioSrc)} />
      <Audio src={staticFile('solar-system-ambient.mp3')} volume={0.07} />
    </AbsoluteFill>
  );
};
