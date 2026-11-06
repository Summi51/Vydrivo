import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const run = promisify(execFile);

function firstExisting(candidates) {
  return candidates.filter(Boolean).find((candidate) => existsSync(candidate)) || null;
}

// Turbopack rewrites the package-provided __dirname to /ROOT in the server
// bundle. Resolve the bundled binary from the project root at runtime instead.
const FFPROBE_PATH = firstExisting([
  process.env.FFPROBE_PATH,
  join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', process.platform, process.arch, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'),
  ffprobeStatic?.path,
]);

const FFMPEG_PATH = firstExisting([
  process.env.FFMPEG_PATH,
  join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
  typeof ffmpegStatic === 'string' ? ffmpegStatic : '',
]);

const VIDEO_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1', 'hevc']);
const IMAGE_CODECS = new Set(['png', 'mjpeg', 'jpeg']);
const MAX_DIMENSION = 8192;
const MAX_VIDEO_MS = 120000;

export class MediaProbeError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseFrameRate(value) {
  if (typeof value !== 'string') return null;
  const [numerator, denominator] = value.split('/').map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  const rate = numerator / denominator;
  if (!Number.isFinite(rate) || rate <= 0 || rate > 240) return null;
  return Math.round(rate * 1000) / 1000;
}

export function validateProbeProperties(properties, { mime } = {}) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'The media properties were not readable.');
  }
  if (!Number.isInteger(properties.width) || properties.width < 1 || properties.width > MAX_DIMENSION) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'The image or video width is outside the allowed range.');
  }
  if (!Number.isInteger(properties.height) || properties.height < 1 || properties.height > MAX_DIMENSION) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'The image or video height is outside the allowed range.');
  }
  if (properties.kind === 'image') {
    if (properties.durationMs !== null) {
      throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'An image must not report a video duration.');
    }
    if (!IMAGE_CODECS.has(properties.videoCodec)) {
      throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'The image codec is not supported.');
    }
  } else if (properties.kind === 'video') {
    if (!Number.isInteger(properties.durationMs) || properties.durationMs < 100 || properties.durationMs > MAX_VIDEO_MS) {
      throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'Reference videos must be between 0.1 and 120 seconds.');
    }
    if (!VIDEO_CODECS.has(properties.videoCodec)) {
      throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'The video codec is not supported.');
    }
  } else {
    throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'The media kind was not recognized.');
  }
  if (properties.frameRate !== null && (!Number.isFinite(properties.frameRate) || properties.frameRate <= 0 || properties.frameRate > 240)) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'The frame rate is outside the allowed range.');
  }
  return properties;
}

export function normalizeProbeResult(info, { mime } = {}) {
  const streams = Array.isArray(info?.streams) ? info.streams : [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  if (!video) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'No image or video stream was found.');
  }
  const isImage = typeof mime === 'string' && mime.startsWith('image/');
  const duration = Number(info?.format?.duration || video.duration || 0);
  const properties = {
    kind: isImage ? 'image' : 'video',
    width: Number(video.width),
    height: Number(video.height),
    durationMs: isImage ? null : Math.round(duration * 1000),
    videoCodec: String(video.codec_name || ''),
    audioCodec: String(audio?.codec_name || ''),
    hasAudio: Boolean(audio),
    frameRate: parseFrameRate(video.avg_frame_rate || video.r_frame_rate),
    format: String(info?.format?.format_name || ''),
    fullDecode: true,
    probedAt: new Date().toISOString(),
  };
  return validateProbeProperties(properties, { mime });
}

export async function probeMediaFile(filePath, { mime } = {}) {
  if (!FFPROBE_PATH || !FFMPEG_PATH) {
    throw new MediaProbeError(503, 'MEDIA_PROBE_UNAVAILABLE', 'Media validation is not available on this server.');
  }
  let info;
  try {
    const { stdout } = await run(FFPROBE_PATH, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    info = JSON.parse(stdout);
  } catch (error) {
    console.error('media probe ffprobe failed', error?.code || '');
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'The file could not be read as an image or video.');
  }

  const properties = normalizeProbeResult(info, { mime });
  const isImage = properties.kind === 'image';
  try {
    await run(FFMPEG_PATH, [
      '-v', 'error',
      '-i', filePath,
      ...(isImage ? ['-frames:v', '1'] : []),
      '-f', 'null',
      '-',
    ], { timeout: isImage ? 15000 : 60000, maxBuffer: 2 * 1024 * 1024 });
  } catch {
    throw new MediaProbeError(422, 'MEDIA_DECODE_FAILED', 'The file could not be fully decoded.');
  }
  return properties;
}
