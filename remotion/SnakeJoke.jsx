import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

const STEPS = [
  { end: 2.08, n: "01", title: "One finger", caption: "One finger. Strong opinion." },
  { end: 4.77, n: "02", title: "Is AI coming?", caption: "Humans keep asking." },
  { end: 10.30, n: "03", title: "No legs", caption: "No legs. Still showed up." },
  { end: 13.69, n: "04", title: "Computer class", caption: "I wanted to learn Python." },
  { end: 16.06, n: "05", title: "Long password", caption: "The password was longer than me." },
  { end: 19.08, n: "06", title: "Point and leave", caption: "Hissed, pointed, and left." },
  { end: 99, n: "07", title: "Python lesson", caption: "A snake can learn Python." },
];

const fade = (v) => interpolate(v, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const slideX = (enter, from) => (1 - enter) * from;

const Snake = ({ x, y, frame, brow = 0, finger = false, coil = 1 }) => {
  const bob = Math.sin(frame / 7) * 8;
  const blink = frame % 70 < 4 ? 4 : 22;
  return (
    <g transform={`translate(${x} ${y + bob})`}>
      <ellipse cx="0" cy={210 * coil} rx={92 * coil} ry={36 * coil} fill="#7dbe4a" />
      <ellipse cx="0" cy={150 * coil} rx={78 * coil} ry={34 * coil} fill="#8fd05a" />
      <rect x="-58" y="-20" width="116" height="190" rx="58" fill="#b7e36a" />
      <rect x="-42" y="-8" width="84" height="160" rx="42" fill="#f3e2a8" />
      <ellipse cx="0" cy="-78" rx="92" ry="78" fill="#8fd05a" />
      <ellipse cx="0" cy="-62" rx="48" ry="36" fill="#d8f08a" />
      <path d={`M-48 -92 Q-30 ${-118 + brow} -8 -90`} fill="none" stroke="#245018" strokeWidth="8" strokeLinecap="round" />
      <path d={`M8 -90 Q30 ${-118 + brow} 48 -92`} fill="none" stroke="#245018" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="-28" cy="-58" rx="16" ry={blink} fill="#16324f" />
      <ellipse cx="30" cy="-58" rx="16" ry={blink} fill="#16324f" />
      <path d="M-34 -18 Q0 18 34 -18 Q0 8 -34 -18" fill="#f6faff" />
      <path d="M-18 -8 L-8 8 M8 8 L18 -8" stroke="#16324f" strokeWidth="4" />
      {finger ? <g transform="translate(78 -10) rotate(-18)"><rect x="0" y="0" width="22" height="70" rx="11" fill="#8fd05a" /><rect x="4" y="-28" width="14" height="36" rx="7" fill="#b7e36a" /></g> : null}
    </g>
  );
};

const Stage = ({ index, frame, enter }) => {
  const x = slideX(enter, index % 2 === 0 ? 70 : -70);
  const dash = -frame * 3;
  return (
    <svg viewBox="0 0 940 900" style={{ position: "absolute", left: 70, top: 390, width: 940, height: 900, opacity: enter, transform: `translateX(${x}px) scale(${0.94 + enter * 0.06})` }}>
      {index === 0 && <Snake x={470} y={300} frame={frame} finger brow={8} />}
      {index === 1 && (
        <>
          <rect x="150" y="180" width="640" height="220" rx="40" fill="#e7f3ff" />
          <text x="470" y="310" textAnchor="middle" fontSize="64" fontWeight="800" fill="#164e72">AI?</text>
          <Snake x={470} y={430} frame={frame} coil={0.72} />
        </>
      )}
      {index === 2 && (
        <>
          <Snake x={300} y={280} frame={frame} />
          <text x="690" y="360" textAnchor="middle" fontSize="54" fontWeight="800" fill="#1f6b3a">still here</text>
          <path d="M180 700 H760" stroke="#d5e4f0" strokeWidth="16" strokeDasharray="18 14" strokeDashoffset={dash} />
        </>
      )}
      {index === 3 && (
        <>
          <rect x="250" y="170" width="440" height="300" rx="36" fill="#243246" />
          <text x="470" y="340" textAnchor="middle" fontSize="64" fontWeight="800" fill="#b7e36a">Python</text>
          <Snake x={470} y={500} frame={frame} coil={0.62} finger />
        </>
      )}
      {index === 4 && (
        <>
          <rect x="90" y="250" width="760" height="120" rx="28" fill="#fff4cc" />
          <text x="470" y="325" textAnchor="middle" fontSize="34" fontWeight="800" fill="#16324f">••••••••••••••••••••</text>
          <Snake x={180} y={430} frame={frame} coil={0.55} />
          <path d="M280 560 H820" stroke="#2f86b8" strokeWidth="12" strokeDasharray="14 10" strokeDashoffset={dash} />
        </>
      )}
      {index === 5 && (
        <>
          <Snake x={250} y={300} frame={frame} finger brow={16} />
          <path d="M430 390 H760" stroke="#2f86b8" strokeWidth="12" strokeDasharray="14 10" strokeDashoffset={dash} />
          <polygon points="760,390 724,368 724,412" fill="#2f86b8" />
          <text x="680" y="330" textAnchor="middle" fontSize="42" fontWeight="800" fill="#164e72">exit</text>
        </>
      )}
      {index === 6 && (
        <>
          <text x="470" y="250" textAnchor="middle" fontSize="64" fontWeight="800" fill={Math.floor(frame / 18) % 2 ? "#164e72" : "#8aa4b8"}>Python</text>
          <text x="470" y="360" textAnchor="middle" fontSize="42" fontWeight="800" fill="#1f6b3a">password: forgotten</text>
          <Snake x={470} y={470} frame={frame} coil={0.7} finger />
        </>
      )}
    </svg>
  );
};

export const SnakeJoke = ({ audioSrc }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const index = Math.max(0, STEPS.findIndex((step) => t < step.end));
  const step = STEPS[index];
  const start = index === 0 ? 0 : STEPS[index - 1].end;
  const enter = fade((t - start) * 30);
  return (
    <AbsoluteFill style={{ background: "#f6faff", fontFamily: "Arial, sans-serif", color: "#16324f" }}>
      <Audio src={audioSrc} />
      <div style={{ position: "absolute", top: 78, left: 70, right: 70, display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 28, letterSpacing: 3, fontWeight: 800 }}>SNAKE JOKE</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{step.n} / 07</div>
      </div>
      <div style={{ position: "absolute", top: 150, left: 70, right: 70, height: 8, background: "#d5e4f0", borderRadius: 8 }}>
        <div style={{ width: `${Math.min(100, (t / 22.8) * 100)}%`, height: "100%", background: "#2f86b8", borderRadius: 8 }} />
      </div>
      <div style={{ position: "absolute", top: 190, left: 70, right: 70, fontSize: 68, fontWeight: 800 }}>{step.title}</div>
      <Stage index={index} frame={frame} enter={enter} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 86, background: "#243246", color: "white", borderRadius: 28, padding: "32px 36px", fontSize: 40, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{step.caption}</div>
    </AbsoluteFill>
  );
};
