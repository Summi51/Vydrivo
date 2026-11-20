import test from 'node:test';
import assert from 'node:assert/strict';
import { isMp3, isSpeechContainer, isWav, speechToWav, wavFromPcm } from './speech-audio.js';

test('raw PCM gets one WAV header and a real duration', () => {
  const pcm = Buffer.alloc(48000, 1);
  const spoken = speechToWav(pcm, 24000);
  assert.equal(spoken.container, false);
  assert.equal(isWav(spoken.wav), true);
  assert.equal(spoken.wav.length, 44 + 48000);
  assert.ok(Math.abs(spoken.seconds - 1) < 0.001);
});

test('an already wrapped WAV is not wrapped again', () => {
  const wrapped = wavFromPcm(Buffer.alloc(4800, 2), 24000);
  const spoken = speechToWav(wrapped, 24000);
  assert.equal(spoken.container, true);
  assert.equal(spoken.wav, wrapped);
  assert.ok(Math.abs(spoken.seconds - 0.1) < 0.001);
});

test('MP3 bytes are left as a container so they are not played as noise', () => {
  const mp3 = Buffer.from([0x49, 0x44, 0x33, 1, 2, 3, 4]);
  assert.equal(isMp3(mp3), true);
  assert.equal(isSpeechContainer(mp3), true);
  const spoken = speechToWav(mp3, 24000);
  assert.equal(spoken.container, true);
  assert.equal(spoken.wav, mp3);
  assert.ok(spoken.seconds > 0);
});
