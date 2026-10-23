// Renders the six-scene Vydrivo explainer from saved narration, captions and
// licensed stock footage. No provider calls are made here.
//
// Usage:
//   node prototype/vydrivo-render.mjs en --stills
//   node prototype/vydrivo-render.mjs en
//   node prototype/vydrivo-render.mjs hi
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statfsSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { binaries, checksum, probe, run } from './media.mjs';

const language = process.argv[2];
if (!['en', 'hi'].includes(language)) {
  throw new Error('Choose a language: en or hi.');
}
const stillsOnly = process.argv.includes('--stills');

const fps = 30;
const expectedSeconds = 75;
const expectedFrames = expectedSeconds * fps;
const dataPath = path.resolve(`remotion/vydrivo-data-${language}.json`);
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

if (data.language !== language || data.fps !== fps || data.width !== 1080 || data.height !== 1920) {
  throw new Error('Composition data does not match the required 1080x1920/30fps output.');
}
if (data.durationInFrames !== expectedFrames) {
  throw new Error(`Expected ${expectedFrames} frames, got ${data.durationInFrames}.`);
}
let expectedFrom = 0;
for (const scene of data.scenes) {
  if (scene.from !== expectedFrom) throw new Error(`Scene ${scene.id} starts at ${scene.from}, expected ${expectedFrom}.`);
  if (!scene.durationInFrames || scene.durationInFrames <= 0) throw new Error(`Scene ${scene.id} has no duration.`);
  if (scene.captions.some((cue) => cue.end <= cue.start || cue.start < 0)) {
    throw new Error(`Scene ${scene.id} has invalid caption timings.`);
  }
  for (const key of ['audio', 'video']) {
    if (!scene[key]) continue;
    const asset = path.resolve('remotion/public', scene[key]);
    if (!existsSync(asset)) throw new Error(`Missing asset: ${scene[key]}`);
  }
  expectedFrom += scene.durationInFrames;
}
if (expectedFrom !== expectedFrames) {
  throw new Error(`Scene durations total ${expectedFrom} frames, expected ${expectedFrames}.`);
}

const disk = statfsSync('.');
if (disk.bavail * disk.bsize < 20 * 1024 ** 3) {
  throw new Error('Keep 20 GiB free before rendering.');
}

const browser = process.env.BROWSER_EXECUTABLE
  ? path.resolve(process.env.BROWSER_EXECUTABLE)
  : path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
if (!existsSync(browser)) {
  throw new Error('Installed headless browser not found; no automatic download.');
}

const outDir = path.resolve('prototype/output/vydrivo-explainer');
const stillsDir = path.join(outDir, 'stills');
mkdirSync(outDir, { recursive: true });
mkdirSync(stillsDir, { recursive: true });

const serveUrl = await bundle({
  entryPoint: path.resolve('remotion/index.jsx'),
  outDir: path.join(outDir, `bundle-${language}`),
  publicDir: path.resolve('remotion/public'),
});

const compositionId = language === 'en' ? 'VydrivoExplainerEN' : 'VydrivoExplainerHI';
const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  inputProps: {},
  browserExecutable: browser,
});
if (
  composition.durationInFrames !== expectedFrames ||
  composition.fps !== fps ||
  composition.width !== 1080 ||
  composition.height !== 1920
) {
  throw new Error('Selected composition does not match the required format.');
}

const stillFrames = [5, 8, 13, 16, 20, 29, 45, 55, 62, 65, 70, 73.5];
const stills = [];
for (const seconds of stillFrames) {
  const frame = Math.round(seconds * fps);
  if (frame >= composition.durationInFrames) continue;
  const output = path.join(stillsDir, `${language}-${String(seconds).replace('.', '-')}s.png`);
  await renderStill({
    composition,
    serveUrl,
    output,
    frame,
    imageFormat: 'png',
    browserExecutable: browser,
    overwrite: true,
  });
  stills.push({ seconds, frame, file: path.relative(process.cwd(), output) });
  console.log(`Rendered still ${seconds}s -> ${path.relative(process.cwd(), output)}`);
}

if (stillsOnly) {
  console.log(`Stills complete: ${stills.length}`);
  process.exit(0);
}

const outputLocation = path.join(outDir, `vydrivo-explainer-${language}.mp4`);
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  audioCodec: 'aac',
  outputLocation,
  inputProps: {},
  browserExecutable: browser,
  concurrency: 1,
  overwrite: true,
  timeoutInMilliseconds: 120000,
  onProgress: ({ progress }) => {
    const percent = Math.floor(progress * 100);
    if (percent % 5 === 0 && percent !== globalThis.lastProgress) {
      globalThis.lastProgress = percent;
      console.log(`Rendering ${percent}%`);
    }
  },
});

const info = probe(outputLocation);
const video = info.streams.find((stream) => stream.codec_type === 'video');
const sound = info.streams.find((stream) => stream.codec_type === 'audio');
const duration = Number(info.format.duration);
const frameRate = video?.avg_frame_rate;
if (
  video?.codec_name !== 'h264' ||
  video.width !== 1080 ||
  video.height !== 1920 ||
  sound?.codec_name !== 'aac' ||
  Math.abs(duration - expectedSeconds) > 0.15 ||
  frameRate !== '30/1'
) {
  throw new Error('Export validation failed: expected h264/aac 1080x1920 30fps 75s.');
}

run(binaries.ffmpeg, ['-v', 'error', '-i', outputLocation, '-f', 'null', '-'], { timeout: 300000 });

const levels = spawnSync(
  binaries.ffmpeg,
  ['-hide_banner', '-i', outputLocation, '-af', 'volumedetect', '-vn', '-f', 'null', '-'],
  { encoding: 'utf8', timeout: 180000, maxBuffer: 1024 * 1024 },
);
const meanVolumeDB = Number(levels.stderr?.match(/mean_volume: (-?[\d.]+) dB/)?.[1]);
if (levels.status !== 0 || !Number.isFinite(meanVolumeDB) || meanVolumeDB < -55) {
  throw new Error('Narration is silent or unexpectedly quiet.');
}

const contactSheet = path.join(outDir, `vydrivo-explainer-${language}-contact-sheet.jpg`);
run(binaries.ffmpeg, [
  '-y', '-v', 'error', '-i', outputLocation,
  '-vf', 'fps=1/6.25,scale=270:480,tile=4x3',
  '-frames:v', '1', contactSheet,
]);

const report = {
  kind: 'licensed-stock-explainer',
  language,
  composition: compositionId,
  seconds: duration,
  width: video.width,
  height: video.height,
  fps: 30,
  frames: composition.durationInFrames,
  videoCodec: video.codec_name,
  audioCodec: sound.codec_name,
  fullDecodePassed: true,
  meanVolumeDB,
  footageCoverage: data.footageCoverage,
  dataChecksum: checksum(dataPath),
  fileChecksum: checksum(outputLocation),
  fileBytes: info.format.size,
  stills,
  note: 'Real licensed stock footage, not AI-generated footage. This is a system explainer, not the V1 AI-footage product export.',
};
writeFileSync(path.join(outDir, `render-${language}.json`), JSON.stringify(report, null, 2));
console.log(`Verified ${language} export: ${path.relative(process.cwd(), outputLocation)}`);
console.log(`Report: ${path.relative(process.cwd(), path.join(outDir, `render-${language}.json`))}`);
console.log(`Contact sheet: ${path.relative(process.cwd(), contactSheet)}`);
