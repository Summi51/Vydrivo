import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

function firstExisting(candidates) {
  return candidates.filter(Boolean).find((candidate) => existsSync(/* turbopackIgnore: true */ candidate)) || null;
}

// Do not import ffmpeg-static or ffprobe-static. Their package entry points
// point at a binary, and Amplify's Next 16 trace ships that file. The Linux
// pair is about 138 MB, which is what pushed the SSR bundle over 220 MB.
// Resolve from the project root at runtime instead. The join is ignored so
// the tracer does not follow it. On Amplify the binaries are absent and
// probeMediaFile returns 503; local renders and the prototype scripts still
// find them in node_modules.
const FFPROBE_PATH = firstExisting([
  process.env.FFPROBE_PATH,
  join(/* turbopackIgnore: true */ process.cwd(), 'node_modules', 'ffprobe-static', 'bin', process.platform, process.arch, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'),
]);

const FFMPEG_PATH = firstExisting([
  process.env.FFMPEG_PATH,
  join(/* turbopackIgnore: true */ process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
]);

const VIDEO_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1', 'hevc']);
const IMAGE_CODECS = new Set(['png', 'mjpeg', 'jpeg']);
const MAX_DIMENSION = 8192;
const MAX_VIDEO_MS = 60000;

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
      throw new MediaProbeError(422, 'MEDIA_PROBE_REJECTED', 'Reference videos must be between 0.1 and 60 seconds.');
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

function u32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function u16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

// PNG stores width and height in the IHDR chunk, 16 bytes after the signature.
function pngSize(bytes) {
  if (bytes.length < 24) return null;
  const ihdr = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (ihdr !== 'IHDR') return null;
  return { width: u32(bytes, 16), height: u32(bytes, 20) };
}

// JPEG stores the size in a SOF marker. Scan the segment headers, not the image data.
function jpegSize(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= bytes.length) return null;
    const length = u16(bytes, offset);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (offset + 7 >= bytes.length) return null;
      return { height: u16(bytes, offset + 3), width: u16(bytes, offset + 5) };
    }
    offset += length;
  }
  return null;
}

// The hosted server has no ffprobe. Images are small enough to check from their
// own header, so a reference image can finish without the media binary.
export function probeImageBytes(input, { mime } = {}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  const declared = String(mime || '');
  const size = declared === 'image/png' ? pngSize(bytes) : declared === 'image/jpeg' ? jpegSize(bytes) : null;
  if (!size) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'The image size could not be read.');
  }
  return validateProbeProperties({
    kind: 'image',
    width: size.width,
    height: size.height,
    durationMs: null,
    videoCodec: declared === 'image/png' ? 'png' : 'mjpeg',
    audioCodec: '',
    hasAudio: false,
    frameRate: null,
    format: declared === 'image/png' ? 'png' : 'jpeg',
    fullDecode: false,
    probedAt: new Date().toISOString(),
  }, { mime: declared });
}

function boxType(bytes, offset) {
  return String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
}

function boxSize(bytes, offset) {
  const size = u32(bytes, offset);
  if (size === 1) {
    if (offset + 16 > bytes.length) return 0;
    const high = u32(bytes, offset + 8);
    const low = u32(bytes, offset + 12);
    if (high > 0) return 0;
    return low;
  }
  return size;
}

// Walk one level of MP4 boxes. A size of 0 means the box runs to the end.
function mp4Boxes(bytes, start, end) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    const size = boxSize(bytes, offset);
    const type = boxType(bytes, offset);
    const length = size === 0 ? end - offset : size;
    if (length < 8 || offset + length > end) break;
    boxes.push({ type, start: offset, end: offset + length });
    if (size === 0) break;
    offset += length;
  }
  return boxes;
}

function mp4Find(bytes, start, end, type) {
  return mp4Boxes(bytes, start, end).find((box) => box.type === type) || null;
}

// tkhd stores width and height as 16.16 fixed point. Version 1 shifts them by 12 bytes.
function mp4TrackSize(bytes, trak) {
  const box = mp4Find(bytes, trak.start + 8, trak.end, 'tkhd');
  if (!box) return null;
  const version = bytes[box.start + 8];
  const base = box.start + 8 + (version === 1 ? 88 : 76);
  if (base + 8 > box.end) return null;
  const width = u32(bytes, base) / 65536;
  const height = u32(bytes, base + 4) / 65536;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

function mp4Timescale(bytes, box) {
  const version = bytes[box.start + 8];
  const offset = box.start + 8 + (version === 1 ? 20 : 12);
  if (offset + 4 > box.end) return 0;
  return u32(bytes, offset);
}

// stts gives sample count and duration. Duration in seconds is the sum divided by the movie timescale.
function mp4SampleMs(bytes, box, timescale) {
  if (!timescale || box.start + 16 > box.end) return 0;
  const count = u32(bytes, box.start + 12);
  let samples = 0;
  let offset = box.start + 16;
  for (let index = 0; index < count && offset + 8 <= box.end; index += 1) {
    const entries = u32(bytes, offset);
    const duration = u32(bytes, offset + 4);
    samples += entries * duration;
    offset += 8;
  }
  return Math.round((samples / timescale) * 1000);
}

function mp4Codec(bytes, box) {
  const sample = mp4Find(bytes, box.start + 8, box.end, 'stsd');
  if (!sample || sample.start + 20 > bytes.length) return '';
  const type = String.fromCharCode(bytes[sample.start + 20], bytes[sample.start + 21], bytes[sample.start + 22], bytes[sample.start + 23]);
  if (type === 'avc1' || type === 'avc3') return 'h264';
  if (type === 'hvc1' || type === 'hev1') return 'hevc';
  if (type === 'vp09') return 'vp9';
  if (type === 'av01') return 'av1';
  return '';
}

function mp4HasAudio(bytes, trak) {
  const handler = mp4Find(bytes, trak.start + 8, trak.end, 'mdia');
  if (!handler) return false;
  const hdlr = mp4Find(bytes, handler.start + 8, handler.end, 'hdlr');
  if (!hdlr || hdlr.start + 16 > bytes.length) return false;
  return boxType(bytes, hdlr.start + 16) === 'soun';
}

// A phone upload is an MP4. The hosted server has no ffprobe, so read the movie
// header instead of decoding the file. WebM still needs the server probe.
export function probeMp4Bytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  if (bytes.length < 16 || boxType(bytes, 0) !== 'ftyp') {
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'The video size could not be read.');
  }
  const moov = mp4Find(bytes, 0, bytes.length, 'moov');
  const mvhd = moov ? mp4Find(bytes, moov.start + 8, moov.end, 'mvhd') : null;
  if (!moov || !mvhd) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'The video size could not be read.');
  }
  const timescale = mp4Timescale(bytes, mvhd);
  let size = null;
  let durationMs = 0;
  let codec = '';
  let hasAudio = false;
  for (const trak of mp4Boxes(bytes, moov.start + 8, moov.end)) {
    if (trak.type !== 'trak') continue;
    if (mp4HasAudio(bytes, trak)) {
      hasAudio = true;
      continue;
    }
    const trackSize = mp4TrackSize(bytes, trak);
    if (!trackSize || size) continue;
    size = trackSize;
    const mdia = mp4Find(bytes, trak.start + 8, trak.end, 'mdia');
    const minf = mdia ? mp4Find(bytes, mdia.start + 8, mdia.end, 'minf') : null;
    const stbl = minf ? mp4Find(bytes, minf.start + 8, minf.end, 'stbl') : null;
    const stts = stbl ? mp4Find(bytes, stbl.start + 8, stbl.end, 'stts') : null;
    codec = stbl ? mp4Codec(bytes, stbl) : '';
    durationMs = stts ? mp4SampleMs(bytes, stts, timescale) : 0;
  }
  if (!size || !codec) {
    throw new MediaProbeError(422, 'MEDIA_PROBE_FAILED', 'The video size could not be read.');
  }
  return validateProbeProperties({
    kind: 'video',
    width: size.width,
    height: size.height,
    durationMs,
    videoCodec: codec,
    audioCodec: hasAudio ? 'aac' : '',
    hasAudio,
    frameRate: null,
    format: 'mp4',
    fullDecode: false,
    probedAt: new Date().toISOString(),
  }, { mime: 'video/mp4' });
}
