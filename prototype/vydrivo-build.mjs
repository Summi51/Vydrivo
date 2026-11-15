// Builds the 75-second Vydrivo explainer from measured narration and licensed stock footage.
// This is an explainer, not the V1 AI-footage product export.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {binaries, run, probe, checksum} from './media.mjs';

const ROOT = path.resolve('.');
const OUT = path.resolve('prototype/output/vydrivo-explainer');
const PUBLIC = path.resolve('remotion/public/media/vydrivo');
const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const TOTAL_SECONDS = 75;

const FOOTAGE = [
  {
    id: 'scene-1',
    source: 'prototype/private/footage/pexels/hires/scene1-typing.mp4',
    output: 'scene1-typing.mp4',
    start: 0,
    seconds: 10.5,
    filter: 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
    sourcePage: 'https://www.pexels.com/search/videos/woman%20typing%20laptop/',
    sourceVideo: 'https://videos.pexels.com/video-files/12692035/12692035-hd_1080_1920_60fps.mp4',
    pexelsId: 12692035,
    original: '1080x1920, 60fps, 15.998s',
  },
  {
    id: 'scene-3',
    source: 'prototype/private/footage/pexels/hires/scene3-review.mp4',
    output: 'scene3-review.mp4',
    start: 0,
    seconds: 12.5,
    filter: 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
    sourcePage: 'https://www.pexels.com/search/videos/woman%20reviewing%20notes/',
    sourceVideo: 'https://videos.pexels.com/video-files/36633828/15531309_1080_1920_25fps.mp4',
    pexelsId: 36633828,
    original: '1080x1920, 25fps, 12.920s',
  },
  {
    id: 'scene-4',
    source: 'prototype/private/footage/pexels/hires/scene4-editor.mp4',
    output: 'scene4-editor.mp4',
    start: 0.5,
    seconds: 18.5,
    filter: 'scale=1280:720,fps=30,eq=brightness=0.05:contrast=1.1:saturation=1.15',
    sourcePage: 'https://www.pexels.com/search/videos/video%20editor/',
    sourceVideo: 'https://videos.pexels.com/video-files/1536321/1536321-hd_1920_1080_30fps.mp4',
    pexelsId: 1536321,
    original: '1280x720, 30fps, 19.518s',
  },
  {
    id: 'scene-5',
    source: 'prototype/private/footage/pexels/hires/scene5-phone.mp4',
    output: 'scene5-phone.mp4',
    start: 4,
    seconds: 15.5,
    filter: 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
    sourcePage: 'https://www.pexels.com/search/videos/holding%20phone/',
    sourceVideo: 'https://videos.pexels.com/video-files/38410501/16310021_1080_1920_25fps.mp4',
    pexelsId: 38410501,
    original: '1080x1920, 25fps, 21.280s',
  },
];

const TARGET_SECONDS = {
  'scene-1': 10,
  'scene-2': 8,
  'scene-3': 12,
  'scene-4': 18,
  'scene-5': 15,
  'scene-6': 12,
};

const FOOTAGE_IDS = new Set(['scene-1', 'scene-3', 'scene-4', 'scene-5']);

function ensureDir(dir) {
  mkdirSync(dir, {recursive: true});
}

function fitAudio({lang, scene, target, sourceDir}) {
  const input = path.join(sourceDir, scene.id, 'narration.mp3');
  const captionsPath = path.join(sourceDir, scene.id, 'captions.json');
  if (!existsSync(input) || !existsSync(captionsPath)) {
    throw new Error(`Missing narration for ${lang}/${scene.id}.`);
  }
  const measured = Number(probe(input).format.duration);
  const ratio = measured / target;
  if (!Number.isFinite(measured) || measured <= 0) throw new Error(`Invalid audio duration for ${scene.id}.`);
  if (ratio > 1.10) throw new Error(`${lang}/${scene.id} narration is ${measured.toFixed(3)}s for a ${target}s scene; rewrite it rather than speeding it up by ${((ratio - 1) * 100).toFixed(1)}%.`);

  const outDir = path.join(PUBLIC, lang);
  ensureDir(outDir);
  const output = path.join(outDir, `${scene.id}.mp3`);
  const tempo = ratio > 1.0005 ? `atempo=${ratio.toFixed(6)},` : '';
  const filter = `${tempo}loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur=${target}`;
  run(
    binaries.ffmpeg,
    ['-y', '-v', 'error', '-i', input, '-af', filter, '-t', String(target), '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', output],
    {timeout: 180000},
  );
  const fitted = Number(probe(output).format.duration);
  if (Math.abs(fitted - target) > 0.08) throw new Error(`${scene.id} fitted audio is ${fitted}s, expected ${target}s.`);

  const cues = JSON.parse(readFileSync(captionsPath, 'utf8'));
  const scale = ratio > 1.0005 ? target / measured : 1;
  const captions = cues.map((c) => ({
    start: Number((c.start * scale).toFixed(3)),
    end: Number(Math.min(c.end * scale, target).toFixed(3)),
    text: c.text,
  }));
  if (!captions.length) throw new Error(`No measured captions for ${scene.id}.`);
  if (captions.at(-1).end > target + 0.02) throw new Error(`Captions exceed ${scene.id} target.`);
  return {
    audio: `media/vydrivo/${lang}/${scene.id}.mp3`,
    captions,
    measuredSeconds: Number(measured.toFixed(3)),
    fittedSeconds: Number(fitted.toFixed(3)),
    tempo: ratio > 1.0005 ? Number(ratio.toFixed(5)) : 1,
    audioChecksum: checksum(output),
  };
}

function buildFootage() {
  ensureDir(path.join(PUBLIC, 'footage'));
  return FOOTAGE.map((item) => {
    if (!existsSync(item.source)) throw new Error(`Missing source footage: ${item.source}`);
    const output = path.join(PUBLIC, 'footage', item.output);
    run(
      binaries.ffmpeg,
      [
        '-y', '-v', 'error',
        '-ss', String(item.start),
        '-i', item.source,
        '-t', String(item.seconds),
        '-vf', item.filter,
        '-an',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        output,
      ],
      {timeout: 600000},
    );
    const info = probe(output);
    const video = info.streams.find((s) => s.codec_type === 'video');
    const seconds = Number(video?.duration || info.format.duration);
    if (!video || video.codec_name !== 'h264' || !info.format.format_name?.includes('mp4')) throw new Error(`Invalid footage output: ${item.output}`);
    if (seconds < TARGET_SECONDS[item.id]) throw new Error(`${item.id} footage (${seconds}s) does not cover ${TARGET_SECONDS[item.id]}s.`);
    return {
      id: item.id,
      file: `media/vydrivo/footage/${item.output}`,
      output: item.output,
      seconds: Number(seconds.toFixed(3)),
      width: video.width,
      height: video.height,
      sourcePage: item.sourcePage,
      sourceVideo: item.sourceVideo,
      pexelsId: item.pexelsId,
      license: 'Pexels License (free use, no attribution required): https://www.pexels.com/license/',
      original: item.original,
      trimStart: item.start,
      trimSeconds: item.seconds,
      sourceChecksum: checksum(item.source),
      outputChecksum: checksum(output),
    };
  });
}

try {
  ensureDir(OUT);
  const footage = buildFootage();
  const footageById = new Map(footage.map((f) => [f.id, f]));
  const report = {
    kind: 'licensed-stock-explainer',
    note: 'Real licensed stock footage, not AI-generated footage. This is a system explainer, not the V1 AI-footage product export.',
    totalSeconds: TOTAL_SECONDS,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    footageSeconds: 0,
    footageCoverage: 0,
    footage: footage.map((f) => ({
      id: f.id,
      file: f.output,
      seconds: f.seconds,
      pexelsId: f.pexelsId,
      sourcePage: f.sourcePage,
      sourceVideo: f.sourceVideo,
      license: f.license,
      original: f.original,
      trimStart: f.trimStart,
      trimSeconds: f.trimSeconds,
      sourceChecksum: f.sourceChecksum,
      outputChecksum: f.outputChecksum,
    })),
    languages: {},
  };

  for (const lang of ['en', 'hi']) {
    const master = JSON.parse(readFileSync(path.resolve('prototype/private/vydrivo-scripts', `${lang}.json`), 'utf8'));
    const sourceDir = path.resolve('prototype/output', `vydrivo-${lang}-final`);
    const scenes = [];
    let frameOffset = 0;
    let footageFrames = 0;
    const langReport = {audio: [], scenes: []};

    for (const scene of master.scenes) {
      const target = TARGET_SECONDS[scene.id];
      if (!target) throw new Error(`Unknown scene target for ${scene.id}.`);
      if (scene.targetSeconds !== target) throw new Error(`Scene ${scene.id} target mismatch.`);
      const durationInFrames = target * FPS;
      const fitted = fitAudio({lang, scene, target, sourceDir});
      const isFootage = FOOTAGE_IDS.has(scene.id);
      if (isFootage && !footageById.has(scene.id)) throw new Error(`Missing footage bundle for ${scene.id}.`);
      if (!isFootage && scene.kind === 'footage') throw new Error(`Scene ${scene.id} is marked footage without a footage bundle.`);
      const built = {
        id: scene.id,
        kind: scene.kind,
        title: scene.title,
        kicker: scene.kicker,
        durationInFrames,
        from: frameOffset,
        audio: fitted.audio,
        captions: fitted.captions,
        ...(isFootage ? {video: footageById.get(scene.id).file} : {}),
      };
      scenes.push(built);
      langReport.audio.push({
        id: scene.id,
        targetSeconds: target,
        measuredSeconds: fitted.measuredSeconds,
        fittedSeconds: fitted.fittedSeconds,
        tempo: fitted.tempo,
        captions: fitted.captions.length,
        audioChecksum: fitted.audioChecksum,
      });
      langReport.scenes.push({id: scene.id, from: frameOffset, durationInFrames, kind: scene.kind, footage: isFootage});
      frameOffset += durationInFrames;
      if (isFootage) footageFrames += durationInFrames;
    }

    if (frameOffset !== TOTAL_SECONDS * FPS) throw new Error(`${lang} timeline is ${frameOffset} frames, expected ${TOTAL_SECONDS * FPS}.`);
    if (footageFrames < frameOffset / 2) throw new Error(`${lang} footage coverage is below 50%.`);
    if (lang === 'en') {
      report.footageSeconds = footageFrames / FPS;
      report.footageCoverage = Number((footageFrames / frameOffset).toFixed(4));
    }
    const data = {
      schemaVersion: 1,
      title: master.title,
      language: lang,
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
      durationInFrames: frameOffset,
      footageCoverage: Number((footageFrames / frameOffset).toFixed(4)),
      scenes,
    };
    writeFileSync(path.resolve('remotion', `vydrivo-data-${lang}.json`), JSON.stringify(data, null, 2));
    langReport.totalFrames = frameOffset;
    langReport.footageFrames = footageFrames;
    langReport.footageCoverage = Number((footageFrames / frameOffset).toFixed(4));
    report.languages[lang] = langReport;
  }

  writeFileSync(path.join(OUT, 'build-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ok: true, output: path.join(OUT, 'build-report.json'), footageSeconds: report.footageSeconds, coverage: report.footageCoverage}, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
