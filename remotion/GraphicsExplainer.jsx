import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import data from './vydrivo-data-en.json';
import {ProcessGraphic} from './ProcessGraphic.jsx';

const C = {
  bg: '#0B0B0F',
  panel: '#141419',
  border: '#2B2B35',
  violet: '#8B5CF6',
  teal: '#62F2D8',
  text: '#F5F5F7',
  muted: '#9A9AA5',
  dim: '#5F5F6B',
};

const STEP_LABELS = {
  'scene-1': ['One idea', 'Saved as a project', 'Ready to review'],
  'scene-2': ['Idea', 'Storyboard', 'Video', 'Publish'],
  'scene-3': ['Every scene visible', 'Narration reviewed', 'Approve the revision'],
  'scene-4': ['Scene prompt', 'Narration', 'Captions', 'One MP4'],
  'scene-5': ['1080 × 1920', 'H.264 + AAC', 'Ready to export'],
  'scene-6': ['Change one card', 'Re-render one scene', 'Rest stays locked'],
};

function sceneSteps(scene) {
  const labels = STEP_LABELS[scene.id] || [scene.title, 'Review', 'Ready'];
  const seconds = scene.durationInFrames / 30;
  return labels.map((label, index) => ({
    label,
    at: Math.min(seconds - 0.2, index * (seconds * 0.55 / Math.max(1, labels.length))),
  }));
}

function Scene({scene, index, total}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const caption = scene.captions.find((cue) => time >= cue.start && time < cue.end);
  const progress = Math.min(100, (time / (scene.durationInFrames / fps)) * 100);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg, color: C.text, fontFamily: 'Inter, Arial, sans-serif'}}>
      <Audio src={staticFile(scene.audio)} />
      <ProcessGraphic steps={sceneSteps(scene)} />

      <div style={{position: 'absolute', top: 64, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2}}>
        <span style={{fontSize: 20, letterSpacing: 4, fontWeight: 800, color: C.teal}}>MOTION GRAPHICS · NOT AI FOOTAGE</span>
        <span style={{fontSize: 22, fontWeight: 800, color: C.muted}}>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </div>

      <div style={{position: 'absolute', top: 108, left: 70, right: 70, height: 6, borderRadius: 8, backgroundColor: C.panel, zIndex: 2}}>
        <div style={{width: `${progress}%`, height: '100%', borderRadius: 8, backgroundColor: C.violet}} />
      </div>

      <div style={{position: 'absolute', top: 158, left: 90, right: 90, zIndex: 2}}>
        <div style={{fontSize: 64, lineHeight: 1.05, letterSpacing: -2, fontWeight: 800}}>{scene.title}</div>
      </div>

      <div style={{position: 'absolute', left: 70, right: 70, bottom: 150, zIndex: 3}}>
        {caption ? (
          <div style={{background: '#071629ee', border: `1px solid ${C.border}`, borderRadius: 24, padding: '26px 32px', fontSize: 36, lineHeight: 1.3, textAlign: 'center', fontWeight: 600}}>
            {caption.text}
          </div>
        ) : null}
      </div>

      <div style={{position: 'absolute', left: 70, right: 70, bottom: 86, display: 'flex', justifyContent: 'space-between', fontSize: 18, letterSpacing: 2, color: C.dim, zIndex: 2}}>
        <span>FREE GRAPHICS EXPLAINER</span>
        <span>{Math.round(time)}s</span>
      </div>
    </AbsoluteFill>
  );
}

export const GraphicsExplainer = () => (
  <AbsoluteFill style={{backgroundColor: C.bg}}>
    {data.scenes.map((scene, index) => (
      <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames}>
        <Scene scene={scene} index={index} total={data.scenes.length} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
