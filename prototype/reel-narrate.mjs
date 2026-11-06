// Generate Hindi narration + measured captions for the payment-systems reel.
// Free-allowance guard only; no automatic retry or paid fallback.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {alignmentCues, requireFreeAllowance} from './voice-policy.mjs';
import {probe} from './media.mjs';

const scriptPath = path.resolve('prototype/reel-payment-hi.json');
const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
const apiKey = process.env.ELEVENLABS_API_KEY_NEW || process.env.ELEVENLABS_API_KEY;
const voiceKey = `ELEVENLABS_${String(script.voice || 'male').toUpperCase()}_VOICE_ID`;
const voiceId = process.env[`${voiceKey}_NEW`] || process.env[voiceKey];
const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const audioDir = path.resolve('remotion/public/media/reel-hi');
const outDir = path.resolve('prototype/output/reel-payment-hi');
const dataPath = path.resolve('remotion/reel-hi-data.json');

if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY in ignored .env.local.');
if (!/^[A-Za-z0-9]{20}$/.test(voiceId || '')) throw new Error('Missing or invalid male voice ID.');
mkdirSync(audioDir, {recursive: true});
mkdirSync(outDir, {recursive: true});

async function subscription() {
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: {'xi-api-key': apiKey},
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`ElevenLabs subscription HTTP ${response.status}`);
  return response.json();
}

async function speech(text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {'xi-api-key': apiKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({text, model_id: model}),
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok) throw new Error(`ElevenLabs speech HTTP ${response.status}; no automatic retry or paid fallback.`);
  return response.json();
}

const scenes = [];
let cursor = 0;
for (const scene of script.scenes) {
  const audioFile = path.join(audioDir, `${scene.id}.mp3`);
  const captionsFile = path.join(outDir, `${scene.id}.json`);
  let captions;
  if (existsSync(audioFile) && existsSync(captionsFile)) {
    captions = JSON.parse(readFileSync(captionsFile, 'utf8'));
  } else {
    const current = await subscription();
    requireFreeAllowance(current, scene.narration);
    const data = await speech(scene.narration);
    if (typeof data.audio_base64 !== 'string' || !data.audio_base64.length) {
      throw new Error(`Speech response has no audio for ${scene.id}.`);
    }
    writeFileSync(audioFile, Buffer.from(data.audio_base64, 'base64'));
    const alignment = data.alignment || data.normalized_alignment;
    captions = alignmentCues(alignment, scene.narration);
    writeFileSync(captionsFile, JSON.stringify(captions, null, 2));
  }

  const audioSeconds = Number(probe(audioFile).format.duration);
  if (!Number.isFinite(audioSeconds) || audioSeconds <= 0) throw new Error(`Invalid audio duration for ${scene.id}.`);
  const durationInFrames = Math.ceil(audioSeconds * 30);
  scenes.push({
    ...scene,
    audio: `media/reel-hi/${scene.id}.mp3`,
    captions,
    from: cursor,
    durationInFrames,
    audioSeconds,
  });
  cursor += durationInFrames;
}

if (cursor < 1800 || cursor > 2700) {
  throw new Error(`Reel duration is ${(cursor / 30).toFixed(2)}s; target 60–90 seconds. Adjust the script.`);
}

const data = {
  schemaVersion: 1,
  title: script.title,
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: cursor,
  scenes,
  source: 'original Hindi/Hinglish payment-systems graphics reel',
  voice: script.voice,
  model,
};
writeFileSync(dataPath, JSON.stringify(data, null, 2));
writeFileSync(path.join(outDir, 'narration.json'), JSON.stringify({
  voice: script.voice,
  model,
  seconds: cursor / 30,
  scenes: scenes.map((scene) => ({id: scene.id, audioSeconds: scene.audioSeconds, captions: scene.captions.length})),
  newPaidCalls: 0,
}, null, 2));
console.log(`Reel narration ready: ${(cursor / 30).toFixed(2)}s, ${scenes.length} scenes.`);
console.log(`Data: ${dataPath}`);
