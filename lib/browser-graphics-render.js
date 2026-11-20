import { canRenderMediaOnWeb, renderMediaOnWeb, renderStillOnWeb } from '@remotion/web-renderer';
import { ReelExplainer } from '../remotion/ReelExplainer.jsx';
import { apiRequest } from './session-fetch.js';
import { listMediaAssets } from './media-client.js';
import { isTheme, referencePhotos, referencePreviewPath, themeFromImageUrl } from './reference-theme.js';
import { fitAudioBlob, measureAudioSeconds, padAudioBlob } from './browser-audio.js';
import {
  GRAPHICS_FPS,
  alignmentCues,
  captionSentences,
  displayCues,
  estimatedAlignment,
  planGraphicsTimeline,
  sceneDurationSeconds,
} from './graphics-timeline.js';

const DIAGRAMS = new Set([
  'statement', 'steps', 'compare', 'checklist', 'timeline', 'recap',
  'problem-fix', 'cause-effect', 'big-number', 'cycle',
]);

async function loadReference(projectId) {
  const listed = await listMediaAssets(projectId);
  const photos = referencePhotos(listed.assets);
  const newest = photos[0];
  if (!newest) return null;
  try {
    const theme = await themeFromImageUrl(referencePreviewPath(newest.id));
    return isTheme(theme) ? theme : null;
  } catch {
    return null;
  }
}

export function browserCanRenderGraphics() {
  if (typeof window === 'undefined') return false;
  return typeof window.VideoEncoder === 'function' && typeof window.AudioEncoder === 'function';
}

async function speakScene(projectId, scene, voice) {
  const response = await apiRequest(`/api/v1/projects/${projectId}/graphics-voice`, {
    method: 'POST',
    body: { sceneId: scene.id, voice },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Could not generate the voice.');
  const audio = payload.data?.audio;
  if (!audio?.wavBase64 || !Number.isFinite(Number(audio.seconds)) || Number(audio.seconds) <= 0) {
    throw new Error('The voice response was incomplete.');
  }
  const binary = atob(audio.wavBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const blob = new Blob([bytes], { type: 'audio/wav' });
  const seconds = await measureAudioSeconds(blob).catch(() => Number(audio.seconds));
  return { blob, seconds, objectUrl: URL.createObjectURL(blob) };
}

function scenePlan(scene, index, total, blobUrl, seconds) {
  const speech = Number(seconds);
  const held = sceneDurationSeconds(speech, scene.estimatedSeconds);
  const alignment = estimatedAlignment(scene.narration, speech);
  const cues = captionSentences(displayCues(alignmentCues(alignment), scene.displayNarration || scene.narration), scene.displayNarration || scene.narration);
  const diagram = DIAGRAMS.has(scene.diagram) ? scene.diagram : (index === 0 ? 'statement' : index === total - 1 ? 'recap' : 'steps');
  return {
    id: scene.id,
    kicker: `SCENE ${String(index + 1).padStart(2, '0')}`,
    headline: String(scene.headline || scene.title || 'Scene').slice(0, 44),
    highlight: '',
    diagram,
    labels: Array.isArray(scene.labels) ? scene.labels.slice(0, 4) : [],
    narration: scene.narration,
    displayNarration: scene.displayNarration || scene.narration,
    audio: blobUrl,
    captions: cues,
    durationInFrames: Math.max(1, Math.ceil(held * GRAPHICS_FPS)),
    speechSeconds: speech,
    heldSeconds: held,
  };
}

export async function renderGraphicsInBrowser({ projectId, title, language, voice, scenes, onProgress, signal } = {}) {
  if (!browserCanRenderGraphics()) {
    throw new Error('This browser cannot render video. Use desktop Chrome and keep this tab open.');
  }
  const capability = await canRenderMediaOnWeb({
    width: 1080,
    height: 1920,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
  });
  if (!capability.canRender) {
    throw new Error('This browser cannot render video. Use desktop Chrome and keep this tab open.');
  }
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('Scene text is not ready.');
  const theme = await loadReference(projectId).catch(() => null);
  const spoken = [];
  const urls = [];
  try {
    for (let index = 0; index < scenes.length; index += 1) {
      if (signal?.aborted) throw new Error('Render cancelled.');
      onProgress?.({ state: 'generating-narration', progress: Math.round((index / scenes.length) * 35) });
      const audio = await speakScene(projectId, scenes[index], voice);
      urls.push(audio.objectUrl);
      spoken.push(scenePlan(scenes[index], index, scenes.length, audio.objectUrl, audio.seconds));
    }
    const plan = planGraphicsTimeline(spoken.map((scene) => ({
      speechSeconds: scene.speechSeconds,
      estimatedSeconds: scene.heldSeconds,
    })));
    const tempo = plan[0]?.tempo || 1;
    if (plan[0]?.fitted) {
      onProgress?.({ state: 'generating-narration', progress: 38 });
      for (let index = 0; index < spoken.length; index += 1) {
        const fitted = await fitAudioBlob(await fetch(spoken[index].audio).then((response) => response.blob()), tempo);
        const url = URL.createObjectURL(fitted);
        urls.push(url);
        spoken[index].audio = url;
        spoken[index].captions = spoken[index].captions.map((cue) => ({
          ...cue,
          start: cue.start / tempo,
          end: cue.end / tempo,
        }));
      }
    }
    for (let index = 0; index < spoken.length; index += 1) {
      spoken[index].speechSeconds = plan[index].speechSeconds;
      spoken[index].durationInFrames = plan[index].durationInFrames;
      const held = spoken[index].durationInFrames / GRAPHICS_FPS;
      if (held > spoken[index].speechSeconds + 0.05) {
        const padded = await padAudioBlob(await fetch(spoken[index].audio).then((response) => response.blob()), held);
        const url = URL.createObjectURL(padded);
        urls.push(url);
        spoken[index].audio = url;
      }
    }
    let cursor = 0;
    const planned = spoken.map((scene) => {
      const next = { ...scene, from: cursor };
      cursor += scene.durationInFrames;
      return next;
    });
    const data = {
      schemaVersion: 1,
      title: title || 'Graphics video',
      fps: GRAPHICS_FPS,
      width: 1080,
      height: 1920,
      durationInFrames: cursor,
      scenes: planned,
      series: language === 'english' ? 'EXPLAINER · ENGLISH' : 'EXPLAINER · HINDI',
      footer: 'MOTION GRAPHICS · NOT AI FOOTAGE',
      theme,
    };
    onProgress?.({ state: 'rendering', progress: 42 });
    const result = await renderMediaOnWeb({
      composition: {
        component: ReelExplainer,
        id: 'ReelExplainer',
        fps: GRAPHICS_FPS,
        width: 1080,
        height: 1920,
        durationInFrames: cursor,
        defaultProps: { data },
      },
      inputProps: { data },
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      muted: false,
      licenseKey: 'free-license',
      signal: signal || null,
      onProgress: (update) => {
        const percent = 42 + Math.round((Number(update.progress) || 0) * 48);
        onProgress?.({ state: 'rendering', progress: Math.min(90, percent) });
      },
    });
    const blob = await result.getBlob();
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.length = 0;
    onProgress?.({ state: 'rendering', progress: 92 });
    const thumbnail = await graphicsThumbnailBlob({
      ...data,
      scenes: planned.map((scene) => ({ ...scene, audio: '' })),
    }).catch(() => null);
    const saved = {
      ...data,
      scenes: planned.map((scene) => {
        const { audio, speechSeconds, heldSeconds, ...rest } = scene;
        return rest;
      }),
    };
    return { blob, thumbnail, saved, seconds: cursor / GRAPHICS_FPS };
  } finally {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }
}

export async function graphicsThumbnailBlob(data) {
  const still = await renderStillOnWeb({
    composition: {
      component: ReelExplainer,
      id: 'ReelExplainer',
      fps: GRAPHICS_FPS,
      width: 1080,
      height: 1920,
      durationInFrames: data.durationInFrames,
      defaultProps: { data },
    },
    inputProps: { data },
    frame: Math.min(30, Math.max(0, data.durationInFrames - 1)),
    licenseKey: 'free-license',
  });
  return still.blob({ format: 'jpeg', quality: 0.7 });
}
