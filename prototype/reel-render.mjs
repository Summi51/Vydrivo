// Render the Hindi payment-systems motion-graphics reel.
// No AI video provider calls; narration was generated with the free ElevenLabs allowance.
import {existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {assertExport, binaries, checksum, probe, run} from './media.mjs';

const dataPath = path.resolve('remotion/reel-hi-data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const FPS = 30;
if (data.fps !== FPS || data.width !== 1080 || data.height !== 1920 || !Number.isInteger(data.durationInFrames)) {
  throw new Error('Reel data must be 1080x1920, 30fps with a valid duration.');
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
if (cursor !== data.durationInFrames) throw new Error('Scene durations do not match the reel duration.');

const disk = statfsSync('.');
if (disk.bavail * disk.bsize < 20 * 1024 ** 3) throw new Error('Keep 20 GiB free before rendering.');

const browser = process.env.BROWSER_EXECUTABLE
  ? path.resolve(process.env.BROWSER_EXECUTABLE)
  : path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
if (!existsSync(browser)) throw new Error('Installed headless browser not found; no automatic download.');

const outDir = path.resolve('prototype/output/reel-payment-hi');
mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({
  entryPoint: path.resolve('remotion/index.jsx'),
  outDir: path.join(outDir, 'bundle'),
  publicDir: path.resolve('remotion/public'),
});
const composition = await selectComposition({
  serveUrl,
  id: 'ReelExplainer',
  inputProps: {durationInFrames: data.durationInFrames},
  browserExecutable: browser,
});
if (composition.durationInFrames !== data.durationInFrames || composition.fps !== FPS || composition.width !== 1080 || composition.height !== 1920) {
  throw new Error('ReelExplainer composition has the wrong format.');
}

const partial = path.join(outDir, 'reel-payment-hi.partial.mp4');
const final = path.join(outDir, 'reel-payment-hi.mp4');
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  audioCodec: 'aac',
  outputLocation: partial,
  inputProps: {durationInFrames: data.durationInFrames},
  browserExecutable: browser,
  concurrency: 1,
  overwrite: true,
  timeoutInMilliseconds: 300000,
  onProgress: ({progress}) => {
    const percent = Math.floor(progress * 100);
    if (percent % 10 === 0 && percent !== globalThis.lastReelProgress) {
      globalThis.lastReelProgress = percent;
      console.log(`Rendering ${percent}%`);
    }
  },
});

const expectedSeconds = data.durationInFrames / FPS;
const exportReport = assertExport(partial, {durationSeconds: expectedSeconds, tolerance: 0.25});
run(binaries.ffmpeg, ['-y', '-v', 'error', '-i', partial, '-c', 'copy', '-movflags', '+faststart', final], {timeout: 120000});
const info = probe(final);
const video = info.streams.find((stream) => stream.codec_type === 'video');
const sound = info.streams.find((stream) => stream.codec_type === 'audio');
const duration = Number(info.format.duration);

const contactSheet = path.join(outDir, 'reel-payment-hi-contact-sheet.jpg');
run(binaries.ffmpeg, [
  '-y', '-v', 'error', '-i', final,
  '-vf', 'fps=1/6,scale=270:480,tile=4x3',
  '-frames:v', '1', contactSheet,
], {timeout: 120000});

const report = {
  kind: 'hindi-motion-graphics-reel-not-ai-footage',
  composition: 'ReelExplainer',
  seconds: duration,
  width: video?.width,
  height: video?.height,
  fps: FPS,
  frames: data.durationInFrames,
  videoCodec: video?.codec_name,
  audioCodec: sound?.codec_name,
  fullDecodePassed: exportReport.fullDecodePassed,
  meanVolumeDB: exportReport.meanVolumeDB,
  newProviderCalls: 0,
  newServiceSpendINR: 0,
  voice: data.voice,
  model: data.model,
  dataChecksum: checksum(dataPath),
  fileChecksum: checksum(final),
  fileBytes: info.format.size,
  note: 'Original Hindi/Hinglish payment-systems motion-graphics reel. Not AI footage. Narration used the free ElevenLabs allowance.',
};
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Verified Hindi reel: ${final}`);
console.log(`Report: ${path.join(outDir, 'report.json')}`);
console.log(`Contact sheet: ${contactSheet}`);
