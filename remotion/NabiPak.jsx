import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

const STEPS = [
  { end: 2.22, n: "01", title: "Nabi Pak", caption: "Muhammad, peace be upon him." },
  { end: 4.97, n: "02", title: "The last prophet", caption: "He is the last prophet." },
  { end: 7.58, n: "03", title: "A mercy", caption: "Sent as a mercy to the worlds." },
  { end: 11.15, n: "04", title: "What he taught", caption: "Honesty, kindness, and prayer." },
  { end: 13.4, n: "05", title: "The Quran", caption: "The message he delivered." },
  { end: 16.22, n: "06", title: "The seal", caption: "No new prophet will come." },
  { end: 99, n: "07", title: "With respect", caption: "Follow his example with love." },
];

const fade = (v) => interpolate(v, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const Star = ({ cx, cy, r, fill, spin }) => {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = ((i * 45 + spin) * Math.PI) / 180;
    const rad = i % 2 === 0 ? r : r * 0.42;
    return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
};

const Stage = ({ index, frame, enter }) => {
  const spin = frame * 0.45;
  const pulse = 1 + Math.sin(frame / 10) * 0.04;
  const ring = (frame % 90) * 4;
  const x = (1 - enter) * (index % 2 === 0 ? 70 : -70);
  return (
    <svg viewBox="0 0 940 900" style={{ position: "absolute", left: 70, top: 390, width: 940, height: 900, opacity: enter, transform: `translateX(${x}px) scale(${0.94 + enter * 0.06})` }}>
      <circle cx="470" cy="430" r={300 + ring * 0.15} fill="none" stroke="#d4b483" strokeWidth="2" opacity={0.35} />
      {index === 0 && (
        <>
          <circle cx="470" cy="390" r={150 * pulse} fill="#0f3d34" />
          <path d="M430 300 A150 150 0 1 0 430 500 A118 118 0 1 1 430 300" fill="#f6e7c1" />
          <Star cx="560" cy="300" r="34" fill="#f6e7c1" spin={spin} />
          <text x="470" y="700" textAnchor="middle" fontSize="42" fontWeight="800" fill="#f6e7c1">peace be upon him</text>
        </>
      )}
      {index === 1 && ["Adam", "Nuh", "Musa", "Isa", "Muhammad"].map((name, i) => (
        <g key={name} transform={`translate(${90 + i * 175} ${360 + Math.sin((frame + i * 12) / 8) * 8})`}>
          <circle cx="40" cy="40" r={i === 4 ? 52 : 34} fill={i === 4 ? "#f6e7c1" : "#1f6b5a"} stroke="#d4b483" strokeWidth="4" />
          {i < 4 && <line x1="78" y1="40" x2="130" y2="40" stroke="#d4b483" strokeWidth="4" />}
          <text x="40" y="130" textAnchor="middle" fontSize="22" fontWeight="800" fill="#f6e7c1">{name}</text>
        </g>
      ))}
      {index === 2 && (
        <>
          {[0, 1, 2, 3].map((i) => <circle key={i} cx="470" cy="420" r={40 + ((ring + i * 40) % 220)} fill="none" stroke="#f6e7c1" strokeWidth="3" opacity={1 - ((ring + i * 40) % 220) / 240} />)}
          <text x="470" y="436" textAnchor="middle" fontSize="48" fontWeight="800" fill="#f6e7c1">mercy</text>
        </>
      )}
      {index === 3 && ["Honesty", "Kindness", "Prayer"].map((label, i) => (
        <g key={label} opacity={interpolate(frame, [i * 8, i * 8 + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
          <rect x={80 + i * 280} y="250" width="230" height="280" rx="36" fill="#0f3d34" stroke="#d4b483" strokeWidth="4" />
          <text x={195 + i * 280} y="410" textAnchor="middle" fontSize="32" fontWeight="800" fill="#f6e7c1">{label}</text>
        </g>
      ))}
      {index === 4 && (
        <>
          <rect x="250" y="180" width="440" height="520" rx="28" fill="#f6e7c1" />
          <rect x="290" y="230" width="360" height="40" rx="8" fill="#0f3d34" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="290" y={300 + i * 64} width={360 - (i % 2) * 80} height="18" rx="8" fill="#1f6b5a" opacity={0.7 + (frame % 20 > 10 ? 0.2 : 0)} />)}
          <text x="470" y="760" textAnchor="middle" fontSize="40" fontWeight="800" fill="#f6e7c1">Quran</text>
        </>
      )}
      {index === 5 && (
        <>
          <circle cx="470" cy="400" r={120 * pulse} fill="none" stroke="#f6e7c1" strokeWidth="14" />
          <Star cx="470" cy="400" r="70" fill="#f6e7c1" spin={0} />
          <text x="470" y="680" textAnchor="middle" fontSize="40" fontWeight="800" fill="#f6e7c1">the seal</text>
        </>
      )}
      {index === 6 && (
        <>
          <Star cx="470" cy="360" r={90 + enter * 20} fill="#f6e7c1" spin={spin * 0.3} />
          <path d="M470 520 C430 470 340 490 360 560 C380 630 470 650 470 650 C470 650 560 630 580 560 C600 490 510 470 470 520" fill="#1f6b5a" stroke="#f6e7c1" strokeWidth="6" />
          <text x="470" y="760" textAnchor="middle" fontSize="40" fontWeight="800" fill="#f6e7c1">respect and love</text>
        </>
      )}
    </svg>
  );
};

export const NabiPak = ({ audioSrc }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const index = Math.max(0, STEPS.findIndex((step) => t < step.end));
  const step = STEPS[index];
  const start = index === 0 ? 0 : STEPS[index - 1].end;
  const enter = fade((t - start) * 30);
  return (
    <AbsoluteFill style={{ background: "#071f1b", fontFamily: "Arial, sans-serif", color: "#f6e7c1" }}>
      <Audio src={audioSrc} />
      <div style={{ position: "absolute", top: 78, left: 70, right: 70, display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 28, letterSpacing: 3, fontWeight: 800 }}>NABI PAK</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{step.n} / 07</div>
      </div>
      <div style={{ position: "absolute", top: 150, left: 70, right: 70, height: 8, background: "#1a3f36", borderRadius: 8 }}>
        <div style={{ width: `${Math.min(100, (t / 18.99) * 100)}%`, height: "100%", background: "#d4b483", borderRadius: 8 }} />
      </div>
      <div style={{ position: "absolute", top: 190, left: 70, right: 70, fontSize: 68, fontWeight: 800 }}>{step.title}</div>
      <Stage index={index} frame={frame} enter={enter} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 86, background: "#0f3d34", color: "#f6e7c1", borderRadius: 28, padding: "32px 36px", fontSize: 40, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{step.caption}</div>
    </AbsoluteFill>
  );
};
