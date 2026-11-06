// Background job: approved project storyboard -> Hindi/English narration -> Remotion graphics reel.
// No AI video provider calls. ElevenLabs free allowance only.
import {existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {translateStoryboardToHindi} from '../lib/graphics-translate.js';
import {alignmentCues, requireFreeAllowance} from './voice-policy.mjs';
import {assertExport, probe} from './media.mjs';

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

const DIAGRAMS = new Set(['statement', 'steps', 'compare', 'checklist', 'timeline', 'recap']);

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
  const text = `${scene.title || ''} ${scene.narration || ''}`;
  if (/setting|option|choose|decide|check|config|list|सेटिंग|विकल्प|चुन|तय|जाँच|जांच|सूची/i.test(text)) return 'checklist';
  if (/wait|delay|gap|slow|block|late|रुक|देर|इंतज़ार|इंतजार|रुकावट|धीम|समय/i.test(text)) return 'timeline';
  if (/shortcut|fast|quick|save|hack|before|after|शॉर्टकट|तेज़|तेज|बचा|पहले|बाद/i.test(text)) return 'compare';
  if (/capture|idea|step|process|workflow|कदम|प्रक्रिया|आइडिया|पहले|फिर|अगला/i.test(text)) return 'steps';
  return ['steps', 'checklist', 'compare', 'timeline'][index % 4];
}

function labelsFor(diagram, scene) {
  const title = String(scene.title || 'Key idea').trim().slice(0, 44);
  const chunks = shortChunks(scene.narration, 3, 30);
  const labels = [...chunks];
  while (labels.length < 3) labels.push(title);
  if (diagram === 'statement') return [title, ...labels.slice(0, 2)];
  if (diagram === 'compare') return [labels[0], labels[1], labels[2]];
  return labels.slice(0, 3);
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

  status('translating', 5);
  const storyboard = job.language === 'hindi'
    ? await translateStoryboardToHindi(job.storyboard)
    : job.storyboard;
  status('generating-narration', 15);

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
    const audioSeconds = Number(probe(audioFile).format.duration);
    if (!Number.isFinite(audioSeconds) || audioSeconds <= 0) throw new Error(`Invalid audio duration for ${scene.id}.`);
    const durationInFrames = Math.ceil(audioSeconds * 30);
    const heuristic = diagramFor(scene, index, storyboard.scenes.length);
    const diagram = DIAGRAMS.has(scene.diagram) && (scene.diagram !== 'statement' || index === 0)
      ? scene.diagram
      : heuristic;
    scenes.push({
      id: scene.id,
      kicker: `SCENE ${String(index + 1).padStart(2, '0')}`,
      headline: headlineFor(scene.title),
      highlight: '',
      diagram,
      labels: Array.isArray(scene.labels) && scene.labels.length >= 2 ? scene.labels.slice(0, 4) : labelsFor(diagram, scene),
      narration: scene.narration,
      audio: `media/project-graphics/${job.runId}/${scene.id}.mp3`,
      captions,
      from: cursor,
      durationInFrames,
    });
    cursor += durationInFrames;
    status('generating-narration', 15 + ((index + 1) / storyboard.scenes.length) * 40);
  }

  if (cursor < 1800 || cursor > 2700) {
    throw new Error(`Narration is ${(cursor / 30).toFixed(1)}s; the graphics video must be 60–90 seconds.`);
  }

  const data = {
    schemaVersion: 1,
    title: job.title,
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: cursor,
    scenes,
    source: 'approved project storyboard',
    series: job.language === 'hindi' ? 'EXPLAINER · HINDI' : 'EXPLAINER · ENGLISH',
    footer: `${String(job.language || 'hindi').toUpperCase()} MOTION GRAPHICS · NOT AI FOOTAGE`,
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
  writeFileSync(path.join(jobDir, 'report.json'), JSON.stringify({
    kind: `${job.language}-motion-graphics-project-not-ai-footage`,
    seconds: exportReport.duration,
    width: exportReport.width,
    height: exportReport.height,
    videoCodec: exportReport.videoCodec,
    audioCodec: exportReport.audioCodec,
    fullDecodePassed: exportReport.fullDecodePassed,
    meanVolumeDB: exportReport.meanVolumeDB,
    newProviderCalls: 0,
    newServiceSpendINR: 0,
    language: job.language,
    voice: job.voice,
    note: 'Free Remotion motion-graphics project video. Not AI footage.',
  }, null, 2));
  status('done', 100, {file: 'output.mp4'});
  console.log(`Verified project graphics video: ${output}`);
} catch (error) {
  fail(error);
} finally {
  try { rmSync(lockPath, {force: true}); } catch { /* best effort */ }
}
