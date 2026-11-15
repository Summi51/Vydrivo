// Free motion-graphics explainer renderer. Uses saved narration/captions and
// Remotion diagrams; no AI video provider calls. Not an AI-footage product export.
import {existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {assertExport, binaries, checksum, probe, run} from './media.mjs';

const FPS = 30;
const SECONDS = 75;
const FRAMES = SECONDS * FPS;
const dataPath = path.resolve('remotion/vydrivo-data-en.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

if (data.fps !== FPS || data.width !== 1080 || data.height !== 1920 || data.durationInFrames !== FRAMES) {
  throw new Error('Graphics data must be 1080x1920, 30fps, 75 seconds.');
}
let cursor = 0;
for (const scene of data.scenes) {
  if (scene.from !== cursor) throw new Error(`Scene ${scene.id} starts at ${scene.from}, expected ${cursor}.`);
  if (!scene.durationInFrames || scene.durationInFrames <= 0) throw new Error(`Scene ${scene.id} has no duration.`);
  if (!Array.isArray(scene.captions) || !scene.captions.length) throw new Error(`Scene ${scene.id} has no captions.`);
  const audio = path.resolve('remotion/public', scene.audio);
  if (!existsSync(audio)) throw new Error(`Missing narration: ${scene.audio}`);
  cursor += scene.durationInFrames;
}
if (cursor !== FRAMES) throw new Error('Scene durations do not total 75 seconds.');

const disk = statfsSync('.');
if (disk.bavail * disk.bsize < 20 * 1024 ** 3) throw new Error('Keep 20 GiB free before rendering.');

const browser = process.env.BROWSER_EXECUTABLE
  ? path.resolve(process.env.BROWSER_EXECUTABLE)
  : path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
if (!existsSync(browser)) throw new Error('Installed headless browser not found; no automatic download.');

const outDir = path.resolve('prototype/output/graphics-explainer');
mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({
  entryPoint: path.resolve('remotion/index.jsx'),
  outDir: path.join(outDir, 'bundle'),
  publicDir: path.resolve('remotion/public'),
});

const composition = await selectComposition({
  serveUrl,
  id: 'GraphicsExplainer',
  inputProps: {},
  browserExecutable: browser,
});
if (composition.durationInFrames !== FRAMES || composition.fps !== FPS || composition.width !== 1080 || composition.height !== 1920) {
  throw new Error('GraphicsExplainer composition has the wrong format.');
}

const partial = path.join(outDir, 'graphics-explainer-en.partial.mp4');
const final = path.join(outDir, 'graphics-explainer-en.mp4');
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  audioCodec: 'aac',
  outputLocation: partial,
  inputProps: {},
  browserExecutable: browser,
  concurrency: 1,
  overwrite: true,
  timeoutInMilliseconds: 300000,
  onProgress: ({progress}) => {
    const percent = Math.floor(progress * 100);
    if (percent % 10 === 0 && percent !== globalThis.lastGraphicsProgress) {
      globalThis.lastGraphicsProgress = percent;
      console.log(`Rendering ${percent}%`);
    }
  },
});

const exportReport = assertExport(partial, {durationSeconds: SECONDS});
run(binaries.ffmpeg, ['-y', '-v', 'error', '-i', partial, '-c', 'copy', '-movflags', '+faststart', final], {timeout: 120000});
const info = probe(final);
const video = info.streams.find((stream) => stream.codec_type === 'video');
const sound = info.streams.find((stream) => stream.codec_type === 'audio');
const duration = Number(info.format.duration);

const contactSheet = path.join(outDir, 'graphics-explainer-en-contact-sheet.jpg');
run(binaries.ffmpeg, [
  '-y', '-v', 'error', '-i', final,
  '-vf', 'fps=1/6.25,scale=270:480,tile=4x3',
  '-frames:v', '1', contactSheet,
], {timeout: 120000});

const report = {
  kind: 'motion-graphics-explainer-not-ai-footage',
  composition: 'GraphicsExplainer',
  seconds: duration,
  width: video?.width,
  height: video?.height,
  fps: FPS,
  frames: composition.durationInFrames,
  videoCodec: video?.codec_name,
  audioCodec: sound?.codec_name,
  fullDecodePassed: exportReport.fullDecodePassed,
  meanVolumeDB: exportReport.meanVolumeDB,
  newProviderCalls: 0,
  newServiceSpendINR: 0,
  dataChecksum: checksum(dataPath),
  fileChecksum: checksum(final),
  fileBytes: info.format.size,
  note: 'Free Remotion motion-graphics explainer with saved ElevenLabs narration. Not AI footage and not the V1 AI-footage product export.',
};
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Verified free graphics explainer: ${final}`);
console.log(`Report: ${path.join(outDir, 'report.json')}`);
console.log(`Contact sheet: ${contactSheet}`);
