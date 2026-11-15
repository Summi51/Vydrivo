import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MediaProbeError,
  normalizeProbeResult,
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
