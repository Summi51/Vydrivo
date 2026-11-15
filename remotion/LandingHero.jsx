import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

function StoryboardCard({ side, accent, offset, portrait }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const float = Math.sin(t * Math.PI * 2 + offset) * 10;
  const tilt = Math.sin(t * Math.PI * 2 + offset) * 2.4;
  const rotateY = side === 'left' ? 12 : -12;

  return (
    <div
      style={{
        position: 'absolute',
        left: portrait ? (side === 'left' ? '-52px' : 'calc(100% - 208px)') : side === 'left' ? '16%' : '84%',
        top: portrait ? (side === 'left' ? '26%' : '72%') : '50%',
        width: portrait ? 260 : 250,
        height: portrait ? 330 : 300,
        transform: `translate(-50%, -50%) translateY(${float}px) perspective(900px) rotateY(${rotateY}deg) rotateZ(${tilt}deg)`,
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.09)',
        background: 'linear-gradient(180deg, rgba(28,28,35,0.96), rgba(14,14,18,0.98))',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: portrait ? 168 : 148,
          borderRadius: 14,
          background: accent,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 42%), linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.38))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            width: 34,
            height: 5,
            borderRadius: 99,
            background: 'rgba(255,255,255,0.55)',
          }}
        />
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: '72%', height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.7)' }} />
        <div style={{ width: '92%', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.22)' }} />
        <div style={{ width: '84%', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.16)' }} />
        <div style={{ width: '58%', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
      </div>
      <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 18, height: 3, borderRadius: 99, background: i === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.14)' }} />
        ))}
      </div>
    </div>
  );
}

function CenterFrame({ portrait }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const float = Math.sin(t * Math.PI * 2) * 7;
  const glow = 0.72 + Math.sin(t * Math.PI * 4) * 0.12;
  const progress = 0.28 + Math.sin(t * Math.PI * 2) * 0.16;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: portrait ? 420 : 340,
        height: portrait ? 746 : 604,
        transform: `translate(-50%, -50%) translateY(${float}px) perspective(1100px) rotateY(-2deg)`,
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'linear-gradient(180deg, rgba(20,20,26,0.98), rgba(9,9,13,0.99))',
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 90px rgba(139,92,246,${glow * 0.22}), inset 0 1px 0 rgba(255,255,255,0.08)`,
        padding: 12,
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          borderRadius: 20,
          overflow: 'hidden',
          background: '#0B0B0F',
        }}
      >
        <Img
          src={staticFile('videos/hero-card-frame.jpg')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 28%, rgba(255,255,255,0.12), transparent 38%), linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.8px, transparent 0.8px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 72,
            height: 72,
            marginLeft: -36,
            marginTop: -36,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.45)',
            background: 'rgba(8,8,12,0.28)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 50px rgba(139,92,246,${glow * 0.5})`,
          }}
        >
          <svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true">
            <polygon points="2,2 22,14 2,26" fill="white" />
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 18 }}>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 99, background: 'white' }} />
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
            {Array.from({ length: 34 }, (_, i) => {
              const height = 4 + Math.abs(Math.sin(t * Math.PI * 2 + i * 0.7)) * 18;
              return <div key={i} style={{ flex: 1, height, borderRadius: 99, background: 'rgba(255,255,255,0.55)' }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const portrait = height > width;
  const t = frame / durationInFrames;
  const driftX = Math.sin(t * Math.PI * 2) * 12;
  const driftY = Math.cos(t * Math.PI * 2) * 8;
  const scale = 1.02 + Math.sin(t * Math.PI * 2) * 0.012;
  const playhead = 0.5 + Math.sin(t * Math.PI * 2) * 0.3;

  return (
    <AbsoluteFill style={{ background: '#0B0B0F', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 24% 22%, rgba(139,92,246,0.22), transparent 34%), radial-gradient(circle at 78% 74%, rgba(45,212,191,0.12), transparent 34%), radial-gradient(circle at 58% 16%, rgba(245,158,11,0.06), transparent 30%), #0B0B0F',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -80,
          opacity: 0.16,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 0.8px, transparent 0.8px)',
          backgroundSize: '22px 22px',
          transform: `translate(${driftX}px, ${driftY}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: portrait ? 760 : 820,
          height: portrait ? 980 : 620,
          transform: `translate(-50%, -50%) scale(${scale})`,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(139,92,246,0.16), transparent 64%)',
          filter: 'blur(30px)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})` }}>
        <StoryboardCard side="left" accent="linear-gradient(135deg, #1E1B4B, #4C1D95 52%, #2DD4BF)" offset={0.6} portrait={portrait} />
        <StoryboardCard side="right" accent="linear-gradient(135deg, #3B1D0B, #7C2D12 50%, #F59E0B)" offset={2.1} portrait={portrait} />
        <CenterFrame portrait={portrait} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: portrait ? '18%' : '28%',
          right: portrait ? '18%' : '28%',
          bottom: portrait ? '8%' : '10%',
          height: 1,
          background: 'rgba(255,255,255,0.12)',
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / 5) * 100}%`,
              top: -2,
              width: 5,
              height: 5,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: `${playhead * 100}%`,
            top: -5,
            width: 13,
            height: 13,
            borderRadius: 99,
            background: '#C4B5FD',
            boxShadow: '0 0 18px rgba(139,92,246,0.9)',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(11,11,15,0.72) 0%, rgba(11,11,15,0.16) 42%, rgba(11,11,15,0.2) 62%, rgba(11,11,15,0.78) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(11,11,15,0.62) 0%, transparent 26%, transparent 70%, rgba(11,11,15,0.72) 100%)',
        }}
      />
    </AbsoluteFill>
  );
}
