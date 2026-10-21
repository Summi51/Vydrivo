import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

const STEPS = [
  { end: 5.25, n: "01", title: "Two numbers", caption: "Compare RAM and storage." },
  { end: 10.22, n: "02", title: "Fast workspace", caption: "Open apps sit in RAM." },
  { end: 17.66, n: "03", title: "RAM forgets", caption: "Power off, and RAM clears." },
  { end: 22.42, n: "04", title: "Lasting cabinet", caption: "Files stay in storage." },
  { end: 27.30, n: "05", title: "Opening an app", caption: "Storage copies into RAM." },
  { end: 32.42, n: "06", title: "More of each", caption: "RAM holds apps. Storage holds files." },
  { end: 99, n: "07", title: "You need both", caption: "A fast computer needs both." },
];

const fade = (v) => interpolate(v, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const slideX = (enter, from) => (1 - enter) * from;

const Card = ({ x, y, w, h, fill, label, sub }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="36" fill={fill} />
    <text x={x + w / 2} y={y + h / 2 - (sub ? 8 : -8)} textAnchor="middle" fontSize="42" fontWeight="800" fill="#16324f">{label}</text>
    {sub ? <text x={x + w / 2} y={y + h / 2 + 42} textAnchor="middle" fontSize="26" fontWeight="700" fill="#31516d">{sub}</text> : null}
  </g>
);

const Stage = ({ index, frame, enter }) => {
  const pulse = 1 + Math.sin(frame / 8) * 0.04;
  const dash = -frame * 3;
  const x = slideX(enter, index % 2 === 0 ? 70 : -70);
  const flow = (frame * 4) % 280;
  return (
    <svg viewBox="0 0 940 900" style={{ position: "absolute", left: 70, top: 390, width: 940, height: 900, opacity: enter, transform: `translateX(${x}px) scale(${0.94 + enter * 0.06})` }}>
      {index === 0 && (
        <>
          <Card x={40} y={250} w={380} h={280} fill="#e7f3ff" label="RAM" sub="fast workspace" />
          <Card x={520} y={250} w={380} h={280} fill="#d7efe0" label="Storage" sub="lasting cabinet" />
          <text x="470" y="400" textAnchor="middle" fontSize="54" fontWeight="800" fill="#2f86b8">vs</text>
        </>
      )}
      {index === 1 && (
        <>
          <rect x="170" y="180" width="600" height="420" rx="48" fill="#e7f3ff" stroke="#7eb6de" strokeWidth="8" transform={`scale(${pulse})`} style={{ transformOrigin: "470px 390px" }} />
          <text x="470" y="300" textAnchor="middle" fontSize="64" fontWeight="800" fill="#1d4e74">RAM</text>
          {["Browser", "Notes", "Photo"].map((name, i) => <rect key={name} x={230 + i * 160} y={390 + Math.sin((frame + i * 12) / 8) * 8} width="130" height="90" rx="22" fill="#8fd0f2" />)}
          {["Browser", "Notes", "Photo"].map((name, i) => <text key={name} x={295 + i * 160} y="444" textAnchor="middle" fontSize="22" fontWeight="800" fill="#164e72">{name}</text>)}
        </>
      )}
      {index === 2 && (
        <>
          <rect x="220" y="160" width="500" height="360" rx="40" fill="#243246" />
          <circle cx="470" cy="300" r={70 * pulse} fill="#ffbf1f" />
          <text x="470" y="470" textAnchor="middle" fontSize="36" fontWeight="800" fill="white">power off</text>
          {Array.from({ length: 6 }).map((_, i) => <circle key={i} cx={250 + i * 90} cy={620 - ((frame * 3 + i * 20) % 180)} r="8" fill="#7aa7c9" opacity={0.3 + (i % 3) * 0.2} />)}
        </>
      )}
      {index === 3 && (
        <>
          <rect x="250" y="150" width="440" height="520" rx="36" fill="#d7c4a3" />
          <rect x="290" y="210" width="360" height="70" rx="16" fill="#f6faff" />
          <rect x="290" y="310" width="360" height="70" rx="16" fill="#e7f3ff" />
          <rect x="290" y="410" width="360" height="70" rx="16" fill="#d7efe0" />
          {["Photos", "Apps", "Documents"].map((name, i) => <text key={name} x="470" y={256 + i * 100} textAnchor="middle" fontSize="30" fontWeight="800" fill="#16324f">{name}</text>)}
        </>
      )}
      {index === 4 && (
        <>
          <Card x={30} y={330} w={230} h={160} fill="#d7efe0" label="Storage" />
          <Card x={355} y={330} w={230} h={160} fill="#e7f3ff" label="RAM" />
          <Card x={680} y={330} w={230} h={160} fill="#fff4cc" label="Screen" />
          <path d="M260 410 H355" stroke="#2f86b8" strokeWidth="10" strokeDasharray="14 10" strokeDashoffset={dash} />
          <path d="M585 410 H680" stroke="#2f86b8" strokeWidth="10" strokeDasharray="14 10" strokeDashoffset={dash} />
          <circle cx={260 + flow * 0.34} cy="410" r="12" fill="#164e72" />
        </>
      )}
      {index === 5 && (
        <>
          <text x="230" y="180" textAnchor="middle" fontSize="36" fontWeight="800" fill="#164e72">More RAM</text>
          <text x="700" y="180" textAnchor="middle" fontSize="36" fontWeight="800" fill="#1f6b3a">More storage</text>
          {Array.from({ length: 4 }).map((_, i) => <rect key={i} x={80 + (i % 2) * 150} y={240 + Math.floor(i / 2) * 150} width="130" height="110" rx="24" fill="#8fd0f2" opacity={i < 2 + (frame % 40 > 20 ? 1 : 0) ? 1 : 0.35} />)}
          {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={560 + (i % 3) * 110} y={240 + Math.floor(i / 3) * 150} width="90" height="110" rx="20" fill="#b7e7c4" />)}
        </>
      )}
      {index === 6 && (
        <>
          <path d="M470 140 C760 180 820 520 620 680 C470 790 180 740 140 500 C110 300 220 110 470 140" fill="none" stroke="#67b7e8" strokeWidth="12" strokeDasharray="18 14" strokeDashoffset={dash} />
          {["RAM", "Storage"].map((label, i) => <text key={label} x="470" y={360 + i * 140} textAnchor="middle" fontSize="72" fontWeight="800" fill={i === Math.floor(frame / 18) % 2 ? "#164e72" : "#8aa4b8"}>{label}</text>)}
        </>
      )}
    </svg>
  );
};

export const RamStorage = ({ audioSrc }) => {
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
        <div style={{ fontSize: 28, letterSpacing: 3, fontWeight: 800 }}>RAM AND STORAGE</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{step.n} / 07</div>
      </div>
      <div style={{ position: "absolute", top: 150, left: 70, right: 70, height: 8, background: "#d5e4f0", borderRadius: 8 }}>
        <div style={{ width: `${Math.min(100, (t / 33.46) * 100)}%`, height: "100%", background: "#2f86b8", borderRadius: 8 }} />
      </div>
      <div style={{ position: "absolute", top: 190, left: 70, right: 70, fontSize: 68, fontWeight: 800 }}>{step.title}</div>
      <Stage index={index} frame={frame} enter={enter} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 86, background: "#243246", color: "white", borderRadius: 28, padding: "32px 36px", fontSize: 40, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{step.caption}</div>
    </AbsoluteFill>
  );
};
