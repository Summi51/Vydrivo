// Render a compiled timeline, or check an existing export against it.
// Usage:
//   node prototype/render-timeline.mjs <props.json>
//   node prototype/render-timeline.mjs <props.json> --mp4 <export.mp4>
//   node prototype/render-timeline.mjs <props.json> --out <dir>
import {existsSync, mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {validateRenderTimeline} from '../remotion/timeline-validation.mjs';
import {assertExport} from './media.mjs';

const args = process.argv.slice(2);
const propsFile = args[0];
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
if (!propsFile || propsFile.startsWith('--')) {
  console.error('Usage: node prototype/render-timeline.mjs <props.json> [--mp4 <export.mp4>] [--out <dir>]');
  process.exit(1);
}

try {
  const props = JSON.parse(readFileSync(propsFile, 'utf8'));
  const timeline = props.timeline || props;
  validateRenderTimeline(timeline);

  const mp4 = flag('--mp4');
  const outArg = flag('--out');
  const out = path.resolve(outArg || path.join('prototype/output', `timeline-check-${Date.now()}`));
  mkdirSync(out, {recursive: true});
  writeFileSync(path.join(out, 'props.json'), JSON.stringify({timeline}, null, 2), {flag: 'wx', mode: 0o600});

  const expected = {durationSeconds: timeline.durationInFrames / timeline.fps};
  const kind = timeline.mode === 'graphics-diagnostic'
    ? 'graphics-diagnostic-not-ai-footage'
    : timeline.benchmark
      ? 'benchmark-export'
      : 'timeline-export';

  let exportReport;
  let final;
  if (mp4) {
    final = path.resolve(mp4);
    if (!existsSync(final)) throw new Error(`Export not found: ${final}`);
    exportReport = assertExport(final, expected);
  } else {
    const disk = statfsSync('.');
    if (disk.bavail * disk.bsize < 20 * 1024 ** 3) throw new Error('Keep 20 GiB free before rendering.');
    const browser = path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
    if (!existsSync(browser)) throw new Error('Installed headless browser not found; no automatic download.');
    for (const scene of timeline.scenes) {
      for (const source of [scene.audioSrc, scene.videoSrc].filter(Boolean)) {
        if (!existsSync(path.resolve('remotion/public', source))) {
          throw new Error(`Missing ${source}; run compile and copy its media into remotion/public first.`);
        }
      }
    }

    const serveUrl = await bundle({
      entryPoint: path.resolve('remotion/index.jsx'),
      outDir: path.join(out, 'bundle'),
      publicDir: path.resolve('remotion/public'),
    });
    const composition = await selectComposition({
      serveUrl,
      id: 'StoryboardVideo',
      inputProps: {timeline},
      browserExecutable: browser,
    });
    const partial = path.join(out, 'timeline.partial.mp4');
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      audioCodec: 'aac',
      outputLocation: partial,
      inputProps: {timeline},
      browserExecutable: browser,
      concurrency: 1,
      overwrite: false,
      timeoutInMilliseconds: 300000,
      onProgress: ({progress}) => {
        const percent = Math.floor(progress * 100);
        if (percent % 20 === 0 && percent !== globalThis.lastTimelineProgress) {
          globalThis.lastTimelineProgress = percent;
          console.log(`Rendering ${percent}%`);
        }
      },
    });
    exportReport = assertExport(partial, expected);
    final = path.join(out, 'timeline.mp4');
    renameSync(partial, final);
  }

  const report = {
    kind,
    probeOnly: Boolean(mp4),
    sourceMp4: mp4 ? path.resolve(mp4) : undefined,
    timelineFrames: timeline.durationInFrames,
    fps: timeline.fps,
    storyboardHash: timeline.storyboardHash || null,
    newProviderCalls: 0,
    newServiceSpendINR: 0,
    ...exportReport,
  };
  writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Verified ${kind}: ${final} (${report.duration}s, ${report.width}×${report.height}, ${report.videoCodec}/${report.audioCodec})`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
