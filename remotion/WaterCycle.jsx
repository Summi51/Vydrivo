import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

const STEPS = [
  { end: 5.32, n: "01", title: "Always moving", caption: "Water is always moving." },
  { end: 10.95, n: "02", title: "Sun warms water", caption: "The sun warms oceans, lakes, and rivers." },
  { end: 16.53, n: "03", title: "Evaporation", caption: "Liquid water becomes invisible vapor." },
  { end: 22.62, n: "04", title: "Condensation", caption: "Tiny droplets form clouds." },
  { end: 28.31, n: "05", title: "Precipitation", caption: "They fall as rain or snow." },
  { end: 33.92, n: "06", title: "Collection", caption: "Rivers and groundwater carry it back." },
  { end: 99, n: "07", title: "It never stops", caption: "It moves between oceans, the air, and land." },
];

const fade = (v) => interpolate(v, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const slideX = (enter, from) => (1 - enter) * from;

const Stage = ({ index, frame, enter }) => {
  const rise = (frame % 70) * 2.4;
  const rain = (frame % 34) * 5;
  const flow = (frame * 3.4) % 420;
  const spin = frame * 0.55;
  const pulse = 1 + Math.sin(frame / 8) * 0.04;
  const x = slideX(enter, index % 2 === 0 ? 70 : -70);
  return (
    <svg viewBox="0 0 940 900" style={{ position: "absolute", left: 70, top: 390, width: 940, height: 900, opacity: enter, transform: `translateX(${x}px) scale(${0.94 + enter * 0.06})` }}>
      {index === 0 && (
        <>
          <circle cx="470" cy="430" r={130 * pulse} fill="#e7f3ff" stroke="#7eb6de" strokeWidth="8" />
          <text x="470" y="448" textAnchor="middle" fontSize="68" fontWeight="800" fill="#1d4e74">H₂O</text>
          {["Ocean", "Air", "Land"].map((label, i) => {
            const a = (spin + i * 120) * Math.PI / 180;
            return <g key={label}><circle cx={470 + Math.cos(a) * 290} cy={430 + Math.sin(a) * 210} r="82" fill={["#8fd0f2", "#e8eef5", "#b7e7c4"][i]} /><text x={470 + Math.cos(a) * 290} y={440 + Math.sin(a) * 210} textAnchor="middle" fontSize="28" fontWeight="800" fill="#16324f">{label}</text></g>;
          })}
        </>
      )}
      {index === 1 && (
        <>
          <circle cx="220" cy="230" r={96 * pulse} fill="#ffbf1f" />
          <g transform={`rotate(${spin} 220 230)`}>{[0, 45, 90, 135].map((d) => <line key={d} x1="220" y1="100" x2="220" y2="46" stroke="#f0b429" strokeWidth="12" transform={`rotate(${d} 220 230)`} />)}</g>
          <path d="M340 210 C470 150 560 190 680 250" fill="none" stroke="#f0b429" strokeWidth="8" strokeDasharray="12 10" strokeDashoffset={-frame * 2} />
          {["Ocean", "Lake", "River"].map((name, i) => <g key={name} transform={`translate(0 ${slideX(enter, 40 + i * 16)})`}><rect x={90 + i * 270} y="560" width="210" height="150" rx="32" fill="#8fd0f2" /><text x={195 + i * 270} y="648" textAnchor="middle" fontSize="34" fontWeight="800" fill="#164e72">{name}</text></g>)}
        </>
      )}
      {index === 2 && (
        <>
          <path d="M60 700 H880 V860 H60 Z" fill="#8fd0f2" />
          <text x="470" y="790" textAnchor="middle" fontSize="36" fontWeight="800" fill="#164e72">liquid water</text>
          {Array.from({ length: 9 }).map((_, i) => <circle key={i} cx={140 + i * 80} cy={620 - ((rise + i * 22) % 340)} r={8 + (i % 3)} fill="#7aa7c9" opacity={0.45 + (i % 3) * 0.18} />)}
          <text x="470" y="180" textAnchor="middle" fontSize="46" fontWeight="800" fill="#31516d">vapor rises</text>
        </>
      )}
      {index === 3 && (
        <>
          <ellipse cx="470" cy="300" rx={200 + enter * 50} ry="96" fill="#e8eef5" stroke="#b7c6d6" strokeWidth="8" />
          <ellipse cx="340" cy="350" rx="130" ry="78" fill="#f8fbff" stroke="#b7c6d6" strokeWidth="8" />
          <ellipse cx="610" cy="360" rx="145" ry="82" fill="#f8fbff" stroke="#b7c6d6" strokeWidth="8" />
          <text x="470" y="320" textAnchor="middle" fontSize="48" fontWeight="800" fill="#31516d">cloud</text>
          {Array.from({ length: 8 }).map((_, i) => <circle key={i} cx={180 + i * 80} cy={760 - ((rise + i * 18) % 250)} r="9" fill="#7aa7c9" />)}
        </>
      )}
      {index === 4 && (
        <>
          <ellipse cx="470" cy="150" rx="230" ry="86" fill="#e8eef5" stroke="#b7c6d6" strokeWidth="8" />
          {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={210 + i * 58} y1={250 + (rain + i * 14) % 260} x2={190 + i * 58} y2={310 + (rain + i * 14) % 260} stroke="#4aa3d8" strokeWidth="8" />)}
          <path d="M40 680 C220 620 360 760 540 690 C720 620 820 740 920 680 V860 H40 Z" fill="#b7e7c4" />
          <text x="220" y="790" fontSize="40" fontWeight="800" fill="#1f6b3a">rain</text>
          <text x="640" y="790" fontSize="40" fontWeight="800" fill="#3d6f99">snow</text>
        </>
      )}
      {index === 5 && (
        <>
          <path d="M20 360 C200 290 340 470 540 400 C740 330 840 460 920 410 V560 H20 Z" fill="#b7e7c4" />
          <path d="M20 640 H920 V860 H20 Z" fill="#d7c4a3" />
          <path d={`M${40 + flow} 500 C${150 + flow} 450 ${230 + (flow % 160)} 540 ${340 + (flow % 140)} 500`} fill="none" stroke="#2f86b8" strokeWidth="14" />
          {Array.from({ length: 6 }).map((_, i) => <circle key={i} cx={140 + i * 120} cy={720 + ((frame * 2 + i * 10) % 50)} r="9" fill="#4aa3d8" />)}
          <text x="120" y="330" fontSize="36" fontWeight="800" fill="#1f6b3a">river</text>
          <text x="520" y="760" fontSize="36" fontWeight="800" fill="#6a4b2b">groundwater</text>
        </>
      )}
      {index === 6 && (
        <>
          <path d="M470 120 C780 150 850 500 640 680 C500 800 220 760 150 540 C90 360 200 100 470 120" fill="none" stroke="#67b7e8" strokeWidth="12" strokeDasharray="18 14" strokeDashoffset={-frame * 3} />
          {["Evaporation", "Condensation", "Precipitation", "Collection"].map((label, i) => <text key={label} x="470" y={250 + i * 130} textAnchor="middle" fontSize="44" fontWeight="800" fill={i === Math.floor(frame / 18) % 4 ? "#164e72" : "#8aa4b8"}>{label}</text>)}
        </>
      )}
    </svg>
  );
};

export const WaterCycle = ({ audioSrc }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const index = STEPS.findIndex((step) => t < step.end);
  const step = STEPS[index];
  const start = index === 0 ? 0 : STEPS[index - 1].end;
  const enter = fade((t - start) * 30);
  return (
    <AbsoluteFill style={{ background: "#f6faff", fontFamily: "Arial, sans-serif", color: "#16324f" }}>
      <Audio src={audioSrc} />
      <div style={{ position: "absolute", top: 78, left: 70, right: 70, display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 28, letterSpacing: 3, fontWeight: 800 }}>THE WATER CYCLE</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{step.n} / 07</div>
      </div>
      <div style={{ position: "absolute", top: 150, left: 70, right: 70, height: 8, background: "#d5e4f0", borderRadius: 8 }}>
        <div style={{ width: `${Math.min(100, (t / 42.66) * 100)}%`, height: "100%", background: "#2f86b8", borderRadius: 8 }} />
      </div>
      <div style={{ position: "absolute", top: 190, left: 70, right: 70, fontSize: 68, fontWeight: 800 }}>{step.title}</div>
      <Stage index={index} frame={frame} enter={enter} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 86, background: "#243246", color: "white", borderRadius: 28, padding: "32px 36px", fontSize: 40, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{step.caption}</div>
    </AbsoluteFill>
  );
};
