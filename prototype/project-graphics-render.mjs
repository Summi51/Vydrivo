// Background job: approved project storyboard -> Hindi/English narration -> Remotion graphics reel.
// No AI video provider calls. ElevenLabs free allowance only.
import {existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {translateStoryboardToHindi} from '../lib/graphics-translate.js';
import {alignmentCues, requireFreeAllowance} from './voice-policy.mjs';
import {assertExport, binaries, probe} from './media.mjs';

// The Next server may have inherited empty/different provider variables.
// Load the ignored local env explicitly so the child uses the configured keys.
function loadLocalEnv() {
  const file = path.resolve('.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value) process.env[match[1]] = value;
  }
}
loadLocalEnv();

const jobPath = process.argv[2];
if (!jobPath) throw new Error('Usage: node prototype/project-graphics-render.mjs <job.json>');
const job = JSON.parse(readFileSync(jobPath, 'utf8'));
const apiKey = process.env.ELEVENLABS_API_KEY_NEW || process.env.ELEVENLABS_API_KEY;
const jobDir = path.dirname(jobPath);
const statusPath = path.join(jobDir, 'status.json');
const lockPath = path.resolve('prototype/output/graphics-jobs/locks', `${job.projectId}.lock`);
const audioDir = path.resolve('remotion/public/media/project-graphics', job.runId);
const browser = process.env.BROWSER_EXECUTABLE
  ? path.resolve(process.env.BROWSER_EXECUTABLE)
  : path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');

function status(state, progress, extra = {}) {
  const payload = {state, progress: Math.max(0, Math.min(100, Math.round(progress))), updatedAt: new Date().toISOString(), ...extra};
  writeFileSync(`${statusPath}.tmp`, JSON.stringify(payload, null, 2));
  renameSync(`${statusPath}.tmp`, statusPath);
}

function fail(error) {
  const message = error instanceof Error ? error.message : 'Graphics render failed.';
  status('error', 100, {message: message.slice(0, 500)});
  console.error(message);
  process.exitCode = 1;
}

const DIAGRAMS = new Set([
  'statement', 'steps', 'compare', 'checklist', 'timeline', 'recap',
  'problem-fix', 'cause-effect', 'big-number', 'cycle',
]);

function headlineFor(title) {
  const text = String(title || 'Scene').trim().replace(/\s+/g, ' ');
  if (text.length <= 44) return text;
  const cut = text.slice(0, 44);
  return cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut;
}

function shortChunks(text, count = 3, max = 30) {
  const words = String(text || '').replace(/[।|]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const per = Math.ceil(words.length / count);
  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    let chunk = words.slice(index * per, (index + 1) * per).join(' ');
    if (chunk.length > max) {
      chunk = chunk.slice(0, max);
      if (chunk.includes(' ')) chunk = chunk.slice(0, chunk.lastIndexOf(' '));
    }
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

function diagramFor(scene, index, total) {
  if (index === 0) return 'statement';
  if (index === total - 1) return 'recap';
  const text = `${scene.title || ''} ${scene.displayNarration || ''} ${scene.narration || ''}`;
  if (/problem|fix|solve|solution|issue|blocker|समस्या|हल|फिक्स/i.test(text)) return 'problem-fix';
  if (/because|cause|effect|leads to|result|इसलिए|कारण|नतीजा/i.test(text)) return 'cause-effect';
  if (/(\d+|one|two|three|ek|do|teen)[\s-]*(wait|waits|tap|taps|step|steps|second|seconds|setup|इंतज़ार|टैप|कदम|सेकंड)/i.test(text)) return 'big-number';
  if (/loop|cycle|routine|repeat|daily|रोज़|लूप|दोहरा/i.test(text)) return 'cycle';
  if (/setting|option|choose|decide|check|config|list|सेटिंग|विकल्प|चुन|तय|जाँच|जांच|सूची/i.test(text)) return 'checklist';
  if (/wait|delay|gap|slow|block|late|रुक|देर|इंतज़ार|इंतजार|रुकावट|धीम|समय/i.test(text)) return 'timeline';
  if (/shortcut|fast|quick|save|hack|before|after|शॉर्टकट|तेज़|तेज|बचा|पहले|बाद/i.test(text)) return 'compare';
  if (/capture|idea|step|process|workflow|कदम|प्रक्रिया|आइडिया|पहले|फिर|अगला/i.test(text)) return 'steps';
  return ['steps', 'checklist', 'compare', 'timeline'][index % 4];
}

function labelsFor(diagram, scene) {
  const title = String(scene.title || 'Key idea').trim().slice(0, 44);
  const chunks = shortChunks(scene.displayNarration || scene.narration, 3, 30);
  const labels = [...chunks];
  while (labels.length < 3) labels.push(title);
  if (diagram === 'statement') return [title, ...labels.slice(0, 2)];
  if (diagram === 'compare') return [labels[0], labels[1], labels[2]];
  return labels.slice(0, 3);
}

function displayCues(cues, displayText) {
  const display = String(displayText || '').trim().replace(/\s+/g, ' ');
  if (!display || !cues.length) return cues;
  const total = cues.reduce((sum, cue) => sum + cue.text.replace(/\s/g, '').length, 0) || cues.length;
  let cursor = 0;
  const out = [];
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const last = index === cues.length - 1;
    const share = total ? cue.text.replace(/\s/g, '').length / total : 1 / cues.length;
    let target = last ? display.length : Math.min(display.length, cursor + Math.max(1, Math.round(display.length * share)));
    if (!last && target < display.length) {
      const nextSpace = display.indexOf(' ', target);
      const prevSpace = display.lastIndexOf(' ', target);
      if (nextSpace !== -1 && (prevSpace === -1 || nextSpace - target <= target - prevSpace)) target = nextSpace;
      else if (prevSpace !== -1) target = prevSpace;
    }
    let text = display.slice(cursor, target).trim();
    if (!text) text = display.slice(cursor).trim().split(/\s+/)[0] || '';
    cursor = Math.max(cursor, target);
    out.push({ ...cue, text });
  }
  if (cursor < display.length && out.length) {
    out[out.length - 1].text = `${out[out.length - 1].text} ${display.slice(cursor).trim()}`.trim();
  }
  return out;
}

function captionSentences(cues, displayText) {
  const display = String(displayText || '').trim().replace(/\s+/g, ' ');
  if (!display || !cues.length) return cues;
  let searchFrom = 0;
  return cues.map((cue) => {
    let index = display.indexOf(cue.text, searchFrom);
    if (index < 0) index = display.indexOf(cue.text);
    if (index < 0) return { ...cue, sentence: cue.text, highlight: '' };
    const before = display.slice(0, index);
    const sentenceStart = Math.max(
      before.lastIndexOf('.'),
      before.lastIndexOf('!'),
      before.lastIndexOf('?'),
      before.lastIndexOf('।'),
    ) + 1;
    const after = display.slice(index + cue.text.length);
    const ends = ['.', '!', '?', '।'].map((mark) => after.indexOf(mark)).filter((value) => value >= 0);
    const sentenceEnd = ends.length ? index + cue.text.length + Math.min(...ends) + 1 : display.length;
    const sentence = display.slice(sentenceStart, sentenceEnd).trim();
    searchFrom = Math.max(searchFrom, index + cue.text.length);
    return { ...cue, sentence, highlight: cue.text };
  });
}

async function subscription() {
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: {'xi-api-key': apiKey},
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Speech service subscription HTTP ${response.status}`);
  return response.json();
}

async function speech(text, voiceId) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {'xi-api-key': apiKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'}),
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok) throw new Error(`Speech service HTTP ${response.status}; no automatic retry or paid fallback.`);
  return response.json();
}

try {
  if (!apiKey) throw new Error('Speech service is not configured on this server.');
  if (!existsSync(browser)) throw new Error('Installed headless browser not found.');
  const voiceKey = `ELEVENLABS_${String(job.voice || 'male').toUpperCase()}_VOICE_ID`;
  const voiceId = process.env[`${voiceKey}_NEW`] || process.env[voiceKey];
  if (!/^[A-Za-z0-9]{20}$/.test(voiceId || '')) throw new Error('Saved Hindi voice ID is missing.');

  const testMode = job.testMode === true;
  const savedScript = !testMode && job.script && Array.isArray(job.script.scenes) ? job.script : null;
  const fromScript = Boolean(savedScript);
  let storyboard;
  if (testMode) {
    const testScenes = {
      hindi: {
        title: 'UI test video',
        narration: 'यह पाँच सेकंड का परीक्षण है। वीडियो अब बन रही है। थोड़ा इंतज़ार करें।',
        displayNarration: 'Yeh paanch second ka test hai. Video ab ban rahi hai. Thoda intezaar karein.',
        labels: ['5 seconds', 'UI test', 'Video ready'],
      },
      english: {
        title: 'UI test video',
        narration: 'This is a five second test. The video is rendering now. Please wait for the result.',
        displayNarration: 'This is a five second test. The video is rendering now. Please wait for the result.',
        labels: ['5 seconds', 'UI test', 'Video ready'],
      },
    };
    const test = testScenes[job.language] || testScenes.hindi;
    storyboard = {
      ...job.storyboard,
      scenes: [{ id: 'ui-test', ...test, diagram: 'big-number' }],
    };
    status('generating-narration', 15);
  } else if (savedScript) {
    const sourceById = new Map((job.storyboard?.scenes || []).map((scene) => [scene.id, scene]));
    storyboard = {
      ...job.storyboard,
      scenes: savedScript.scenes.map((scene) => {
        const source = sourceById.get(scene.id);
        if (!source) throw new Error(`Saved scene text is missing storyboard scene ${scene.id}.`);
        return { ...source, ...scene, title: scene.headline };
      }),
    };
    status('generating-narration', 15);
  } else {
    status('translating', 5);
    storyboard = job.language === 'hindi'
      ? await translateStoryboardToHindi(job.storyboard)
      : job.storyboard;
    status('generating-narration', 15);
  }

  mkdirSync(audioDir, {recursive: true});
  const scenes = [];
  let cursor = 0;
  for (let index = 0; index < storyboard.scenes.length; index += 1) {
    const scene = storyboard.scenes[index];
    const current = await subscription();
    requireFreeAllowance(current, scene.narration);
    const data = await speech(scene.narration, voiceId);
    if (typeof data.audio_base64 !== 'string' || !data.audio_base64.length) {
      throw new Error(`Speech response has no audio for ${scene.id}.`);
    }
    const audioFile = path.join(audioDir, `${scene.id}.mp3`);
    writeFileSync(audioFile, Buffer.from(data.audio_base64, 'base64'));
    const captions = alignmentCues(data.alignment || data.normalized_alignment, scene.narration);
    const displayCaptions = displayCues(captions, scene.displayNarration || scene.narration);
    const captionCues = captionSentences(displayCaptions, scene.displayNarration || scene.narration);
    const audioSeconds = Number(probe(audioFile).format.duration);
    if (!Number.isFinite(audioSeconds) || audioSeconds <= 0) throw new Error(`Invalid audio duration for ${scene.id}.`);
    const durationInFrames = Math.ceil(audioSeconds * 30);
    const heuristic = diagramFor(scene, index, storyboard.scenes.length);
    const useAiDiagram = DIAGRAMS.has(scene.diagram)
      && scene.diagram !== 'statement'
      && (scene.diagram !== 'recap' || index === storyboard.scenes.length - 1);
    const diagram = fromScript && DIAGRAMS.has(scene.diagram)
      ? scene.diagram
      : useAiDiagram ? scene.diagram : heuristic;
    const headline = fromScript
      ? String(scene.headline || scene.title || 'Scene').slice(0, 44)
      : headlineFor(scene.title);
    const labels = Array.isArray(scene.labels) && scene.labels.length >= 2
      ? scene.labels.slice(0, 4)
      : labelsFor(diagram, scene);
    scenes.push({
      id: scene.id,
      kicker: `SCENE ${String(index + 1).padStart(2, '0')}`,
      headline,
      highlight: '',
      diagram,
      labels,
      narration: scene.narration,
      displayNarration: scene.displayNarration || scene.narration,
      audio: `media/project-graphics/${job.runId}/${scene.id}.mp3`,
      captions: captionCues,
      from: cursor,
      durationInFrames,
    });
    cursor += durationInFrames;
    status('generating-narration', 15 + ((index + 1) / storyboard.scenes.length) * 40);
  }

  const minFrames = testMode ? 90 : 1800;
  const maxFrames = testMode ? 240 : 2700;
  if (cursor < minFrames || cursor > maxFrames) {
    throw new Error(`Narration is ${(cursor / 30).toFixed(1)}s; ${testMode ? 'the test video must be 3–8 seconds' : 'the graphics video must be 60–90 seconds'}.`);
  }

  const data = {
    schemaVersion: 1,
    title: job.title,
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: cursor,
    scenes,
    source: testMode ? 'UI test scene' : fromScript ? 'saved scene text' : 'approved project storyboard',
    series: testMode
      ? `UI TEST · ${job.language === 'english' ? 'ENGLISH' : 'HINDI'}`
      : job.language === 'hindi' ? 'EXPLAINER · HINDI' : 'EXPLAINER · ENGLISH',
    footer: testMode
      ? 'UI TEST · NOT A FINAL EXPORT'
      : `${String(job.language || 'hindi').toUpperCase()} MOTION GRAPHICS · NOT AI FOOTAGE`,
    testMode,
    language: job.language,
    voice: job.voice,
  };
  writeFileSync(path.join(jobDir, 'data.json'), JSON.stringify(data, null, 2));
  status('rendering', 60);

  const outDir = jobDir;
  const serveUrl = await bundle({
    entryPoint: path.resolve('remotion/index.jsx'),
    outDir: path.join(outDir, 'bundle'),
    publicDir: path.resolve('remotion/public'),
  });
  const composition = await selectComposition({
    serveUrl,
    id: 'ReelExplainer',
    inputProps: {data, durationInFrames: cursor},
    browserExecutable: browser,
  });
  const output = path.join(outDir, 'output.mp4');
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    outputLocation: output,
    inputProps: {data, durationInFrames: cursor},
    browserExecutable: browser,
    concurrency: 1,
    overwrite: true,
    timeoutInMilliseconds: 300000,
    onProgress: ({progress}) => {
      status('rendering', 60 + progress * 35);
    },
  });
  const exportReport = assertExport(output, {durationSeconds: cursor / 30, tolerance: 0.25});
  const thumbnail = path.join(jobDir, 'thumbnail.jpg');
  const thumbnailResult = spawnSync(
    binaries.ffmpeg,
    ['-hide_banner', '-loglevel', 'error', '-y', '-ss', testMode ? '0.5' : '1', '-i', output, '-frames:v', '1', '-q:v', '2', thumbnail],
    {encoding: 'utf8', timeout: 30000},
  );
  if (thumbnailResult.status !== 0) console.warn('Thumbnail generation skipped.');
  writeFileSync(path.join(jobDir, 'report.json'), JSON.stringify({
    kind: testMode
      ? `${job.language}-motion-graphics-ui-test-not-final-export`
      : `${job.language}-motion-graphics-project-not-ai-footage`,
    testMode,
    seconds: exportReport.duration,
    width: exportReport.width,
    height: exportReport.height,
    videoCodec: exportReport.videoCodec,
    audioCodec: exportReport.audioCodec,
    fullDecodePassed: exportReport.fullDecodePassed,
    meanVolumeDB: exportReport.meanVolumeDB,
    thumbnail: existsSync(thumbnail) ? 'thumbnail.jpg' : null,
    scriptSource: fromScript ? 'saved scene text' : 'ai translation',
    newProviderCalls: 0,
    newServiceSpendINR: 0,
    language: job.language,
    voice: job.voice,
    note: testMode
      ? 'Five-second UI diagnostic. Not a final 60–90s export and not AI footage.'
      : 'Free Remotion motion-graphics project video. Not AI footage.',
  }, null, 2));
  status('done', 100, {file: 'output.mp4'});
  console.log(`Verified project graphics video: ${output}`);
} catch (error) {
  fail(error);
} finally {
  try { rmSync(lockPath, {force: true}); } catch { /* best effort */ }
}
