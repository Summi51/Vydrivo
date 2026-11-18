import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MediaProbeError,
  normalizeProbeResult,
  probeImageBytes,
  probeMediaFile,
} from './media-probe.js';

const pngInfo = {
  format: { format_name: 'png_pipe' },
  streams: [{ codec_type: 'video', codec_name: 'png', width: 1, height: 1, avg_frame_rate: '25/1' }],
};

const videoInfo = {
  format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '5.042' },
  streams: [
    { codec_type: 'video', codec_name: 'h264', width: 620, height: 1200, avg_frame_rate: '30/1' },
    { codec_type: 'audio', codec_name: 'aac' },
  ],
};

test('normalizes image and video probe properties', () => {
  const image = normalizeProbeResult(pngInfo, { mime: 'image/png' });
  assert.equal(image.kind, 'image');
  assert.equal(image.width, 1);
  assert.equal(image.height, 1);
  assert.equal(image.durationMs, null);
  assert.equal(image.videoCodec, 'png');
  assert.equal(image.fullDecode, true);

  const video = normalizeProbeResult(videoInfo, { mime: 'video/mp4' });
  assert.equal(video.kind, 'video');
  assert.equal(video.durationMs, 5042);
  assert.equal(video.videoCodec, 'h264');
  assert.equal(video.audioCodec, 'aac');
  assert.equal(video.hasAudio, true);
  assert.equal(video.frameRate, 30);
});

test('rejects missing streams, unsafe dimensions, long videos and unsupported codecs', () => {
  assert.throws(() => normalizeProbeResult({ streams: [] }, { mime: 'image/png' }), MediaProbeError);
  assert.throws(
    () => normalizeProbeResult({ ...pngInfo, streams: [{ ...pngInfo.streams[0], width: 9000 }] }, { mime: 'image/png' }),
    /width/,
  );
  assert.throws(
    () => normalizeProbeResult({ ...videoInfo, format: { ...videoInfo.format, duration: '200' } }, { mime: 'video/mp4' }),
    /60 seconds/,
  );
  assert.throws(
    () => normalizeProbeResult({ ...videoInfo, format: { ...videoInfo.format, duration: '0.05' } }, { mime: 'video/mp4' }),
    /0.1 and 60 seconds/,
  );
  assert.throws(
    () => normalizeProbeResult({ ...videoInfo, streams: [{ ...videoInfo.streams[0], codec_name: 'mpeg2video' }] }, { mime: 'video/mp4' }),
    /codec/,
  );
  assert.throws(
    () => normalizeProbeResult({ ...pngInfo, streams: [{ ...pngInfo.streams[0], codec_name: 'bmp' }] }, { mime: 'image/png' }),
    /codec/,
  );
});

test('rejects a file that is not decodable media', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vydrivo-probe-bad-'));
  const file = join(directory, 'broken.mp4');
  try {
    await writeFile(file, Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]));
    await assert.rejects(
      () => probeMediaFile(file, { mime: 'video/mp4' }),
      (error) => error instanceof MediaProbeError && error.status === 422,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('probes and fully decodes a real 1×1 PNG', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vydrivo-probe-test-'));
  const file = join(directory, 'test.png');
  try {
    await writeFile(file, Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ));
    const properties = await probeMediaFile(file, { mime: 'image/png' });
    assert.equal(properties.kind, 'image');
    assert.equal(properties.width, 1);
    assert.equal(properties.height, 1);
    assert.equal(properties.videoCodec, 'png');
    assert.equal(properties.fullDecode, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function pngBytes(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  bytes[16] = (width >>> 24) & 0xff;
  bytes[17] = (width >>> 16) & 0xff;
  bytes[18] = (width >>> 8) & 0xff;
  bytes[19] = width & 0xff;
  bytes[20] = (height >>> 24) & 0xff;
  bytes[21] = (height >>> 16) & 0xff;
  bytes[22] = (height >>> 8) & 0xff;
  bytes[23] = height & 0xff;
  return bytes;
}

test('reads an image size from the file header without ffprobe', () => {
  const png = probeImageBytes(pngBytes(1080, 1920), { mime: 'image/png' });
  assert.equal(png.width, 1080);
  assert.equal(png.height, 1920);
  assert.equal(png.kind, 'image');
  assert.equal(png.fullDecode, false);

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x04, 0x38, 0x07, 0x80, 0x00, 0x00, 0x00]);
  const photo = probeImageBytes(jpeg, { mime: 'image/jpeg' });
  assert.equal(photo.width, 1920);
  assert.equal(photo.height, 1080);
  assert.equal(photo.videoCodec, 'mjpeg');
});

test('rejects an image whose size cannot be read', () => {
  assert.throws(
    () => probeImageBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { mime: 'image/png' }),
    (error) => error instanceof MediaProbeError && error.status === 422,
  );
});
