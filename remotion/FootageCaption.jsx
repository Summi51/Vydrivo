import { AbsoluteFill, Audio, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";

const DURATION = 5.1;

export const FootageCaption = ({ audioSrc, videoSrc = staticFile("lake-sun.mp4") }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const caption = t < 1.65 ? "The sun warms the lake." : "Thin mist rises.";
  return (
    <AbsoluteFill style={{ background: "#16324f", fontFamily: "Arial, sans-serif", color: "#16324f" }}>
      <Audio src={audioSrc} />
      <OffthreadVideo
        src={videoSrc}
        muted
        style={{ position: "absolute", left: 0, top: 210, width: 1080, height: 1500, objectFit: "cover" }}
      />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 210, background: "#f6faff", opacity: enter }}>
        <div style={{ position: "absolute", top: 54, left: 70, right: 70, display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 28, letterSpacing: 3, fontWeight: 800 }}>AI FOOTAGE</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>01 / 01</div>
        </div>
        <div style={{ position: "absolute", top: 118, left: 70, right: 70, height: 8, background: "#d5e4f0", borderRadius: 8 }}>
          <div style={{ width: `${Math.min(100, (t / DURATION) * 100)}%`, height: "100%", background: "#2f86b8", borderRadius: 8 }} />
        </div>
        <div style={{ position: "absolute", top: 146, left: 70, right: 70, fontSize: 42, fontWeight: 800 }}>Sun over the lake</div>
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 70, background: "#243246", color: "white", borderRadius: 28, padding: "28px 36px", fontSize: 40, fontWeight: 700, textAlign: "center", lineHeight: 1.25, opacity: enter }}>
        {caption}
      </div>
    </AbsoluteFill>
  );
};
