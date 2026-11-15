// Renders the solar-system graphics diagnostic with saved male narration.
// One ElevenLabs TTS call was made separately; this script makes no provider calls.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statfsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import { probe, run, binaries, checksum } from './media.mjs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

try {
  const disk = statfsSync('.');
  if (disk.bavail * disk.bsize < 20 * 1024 ** 3) throw new Error('Keep 20 GiB free before rendering.');

  const browser = process.env.BROWSER_EXECUTABLE
    ? path.resolve(process.env.BROWSER_EXECUTABLE)
    : path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  if (!existsSync(browser)) throw new Error('Installed headless browser not found; no automatic download.');

  const source = 'prototype/output/solar-system-voice-001';
  const script = read('prototype/solar-system-scene.json');
  const captions = read(`${source}/captions.json`);
  const attempt = read(`${source}/attempt.json`);
  if (attempt.state !== 'succeeded' || attempt.costCapINR !== 0) {
    throw new Error('Missing saved zero-cost narration evidence.');
  }
  const normalize = (s) => s.replace(/\s+/g, ' ').trim();
  if (normalize(captions.map((c) => c.text).join(' ')) !== normalize(script.narration)) {
    throw new Error('Saved captions do not match the script.');
  }

  const audio = path.resolve(source, 'narration.mp3');
  const audioSeconds = Number(probe(audio).format.duration);
  const outroSeconds = 9;
  const totalSeconds = audioSeconds + outroSeconds;

  const findCue = (phrase) => captions.find((c) => c.text.toLowerCase().includes(phrase.toLowerCase()));
  const sunStart = findCue('the sun holds')?.start;
  const rockyStart = findCue('closest to the sun')?.start;
  const giantsStart = findCue('gas and ice giants')?.start;
  // "one star" also appears in the intro line, so take the last occurrence.
  const finaleStart = captions.findLast((c) => c.text.toLowerCase().includes('one star'))?.start;
  const bounds = [0, sunStart, rockyStart, giantsStart, finaleStart, totalSeconds];
  if (!bounds.every((v, i) => Number.isFinite(v) && (i === 0 || v > bounds[i - 1]))) {
    throw new Error('Could not resolve ordered section cues from measured captions.');
  }

  const sections = [
    { id: 'intro', kind: 'intro', title: 'The Solar System', from: 0, to: sunStart },
    { id: 'sun', kind: 'sun', title: 'Our Star', from: sunStart, to: rockyStart },
    { id: 'rocky', kind: 'rocky', title: 'Rocky Planets', from: rockyStart, to: giantsStart },
    { id: 'giants', kind: 'giants', title: 'Gas & Ice Giants', from: giantsStart, to: finaleStart },
    { id: 'finale', kind: 'finale', title: 'One home', from: finaleStart, to: totalSeconds },
  ];

  const runId = `solar-system-${Date.now()}`;
  const out = path.resolve('prototype/output', runId);
  mkdirSync(out, { recursive: false });
  const audioSrc = `media/${runId}/narration.mp3`;
  const publicAudio = path.resolve('remotion/public', audioSrc);
  mkdirSync(path.dirname(publicAudio), { recursive: true });
  copyFileSync(audio, publicAudio);

  const durationInFrames = Math.ceil(totalSeconds * 30);
  const inputProps = { audioSrc, durationInFrames, captions, sections };
  writeFileSync(path.join(out, 'props.json'), JSON.stringify(inputProps, null, 2));

  const serveUrl = await bundle({
    entryPoint: path.resolve('remotion/index.jsx'),
    outDir: path.join(out, 'bundle'),
    publicDir: path.resolve('remotion/public'),
  });
  const composition = await selectComposition({ serveUrl, id: 'SolarSystem', inputProps, browserExecutable: browser });
  const outputLocation = path.join(out, 'solar-system.partial.mp4');
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    outputLocation,
    inputProps,
    browserExecutable: browser,
    concurrency: 1,
    overwrite: false,
    timeoutInMilliseconds: 120000,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100);
      if (percent % 20 === 0 && percent !== globalThis.lastProgress) {
        globalThis.lastProgress = percent;
        console.log(`Rendering ${percent}%`);
      }
    },
  });

  const info = probe(outputLocation);
  const video = info.streams.find((s) => s.codec_type === 'video');
  const sound = info.streams.find((s) => s.codec_type === 'audio');
  if (
    video?.codec_name !== 'h264' ||
    video.width !== 1080 ||
    video.height !== 1920 ||
    sound?.codec_name !== 'aac' ||
    Math.abs(Number(info.format.duration) - totalSeconds) > 0.15
  ) {
    throw new Error('Export validation failed.');
  }

  run(binaries.ffmpeg, ['-v', 'error', '-i', outputLocation, '-f', 'null', '-'], { timeout: 180000 });
  const levels = spawnSync(
    binaries.ffmpeg,
    ['-hide_banner', '-i', outputLocation, '-af', 'volumedetect', '-vn', '-f', 'null', '-'],
    { encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 },
  );
  const meanVolumeDB = Number(levels.stderr?.match(/mean_volume: (-?[\d.]+) dB/)?.[1]);
  if (levels.status !== 0 || !Number.isFinite(meanVolumeDB) || meanVolumeDB < -55) {
    throw new Error('Narration is silent or unexpectedly quiet.');
  }

  writeFileSync(
    path.join(out, 'report.json'),
    JSON.stringify(
      {
        kind: 'graphics-diagnostic-not-ai-footage',
        topic: script.title,
        narrationProvider: 'elevenlabs',
        narrationVoice: 'male',
        voiceId: attempt.voiceId,
        model: attempt.model,
        newProviderCalls: 1,
        newServiceSpendINR: 0,
        narrationChecksum: checksum(audio),
        captionTiming: 'provider-character-alignment',
        sections: sections.map((s) => ({ id: s.id, from: s.from, to: s.to })),
        seconds: Number(info.format.duration),
        width: video.width,
        height: video.height,
        videoCodec: video.codec_name,
        audioCodec: sound.codec_name,
        fullDecodePassed: true,
        meanVolumeDB,
      },
      null,
      2,
    ),
  );

  run(binaries.ffmpeg, [
    '-v', 'error', '-i', outputLocation,
    '-vf', 'fps=1/7,scale=270:480,tile=4x2',
    '-frames:v', '1', path.join(out, 'contact-sheet.jpg'),
  ]);

  const final = path.join(out, 'solar-system.mp4');
  renameSync(outputLocation, final);
  console.log(`Verified export: ${final}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
