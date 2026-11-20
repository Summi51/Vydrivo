// Gemini TTS returns raw PCM or a complete WAV/MP3 container. Treating a
// container as raw samples plays the file header as noise and breaks the voice.

export function speechBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.alloc(0);
}

export function isWav(bytes) {
  const data = speechBytes(bytes);
  return data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE';
}

export function isMp3(bytes) {
  const data = speechBytes(bytes);
  if (data.length < 3) return false;
  if (data.toString('ascii', 0, 3) === 'ID3') return true;
  return data[0] === 0xff && (data[1] & 0xe0) === 0xe0;
}

export function isSpeechContainer(bytes) {
  return isWav(bytes) || isMp3(bytes);
}

export function wavSampleRate(bytes) {
  const data = speechBytes(bytes);
  if (!isWav(data) || data.length < 28) return 0;
  const rate = data.readUInt32LE(24);
  return rate >= 8000 && rate <= 96000 ? rate : 0;
}

export function wavDurationSeconds(bytes) {
  const data = speechBytes(bytes);
  const rate = wavSampleRate(data);
  if (!rate || data.length < 44) return 0;
  const channels = data.readUInt16LE(22) || 1;
  const bits = data.readUInt16LE(34) || 16;
  const payload = Math.max(0, data.length - 44);
  const seconds = payload / (rate * channels * (bits / 8));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

export function wavFromPcm(pcm, rate = 24000) {
  const samples = speechBytes(pcm);
  const even = samples.length - (samples.length % 2);
  const body = even === samples.length ? samples : samples.subarray(0, even);
  const sampleRate = Number.isFinite(Number(rate)) && Number(rate) >= 8000 ? Math.round(Number(rate)) : 24000;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + body.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(body.length, 40);
  return Buffer.concat([header, body]);
}

// A container is returned unchanged. Raw PCM gets one WAV header.
export function speechToWav(bytes, rate = 24000) {
  const data = speechBytes(bytes);
  if (isSpeechContainer(data)) {
    const measured = isWav(data) ? wavDurationSeconds(data) : 0;
    // MP3 has no sample rate in the first bytes. A small estimate lets the
    // browser remeasure; rejecting it here drops a valid voice.
    const seconds = measured > 0 ? measured : Math.max(0.2, data.length / 16000);
    return { wav: data, seconds, container: true };
  }
  const sampleRate = Number(rate) || 24000;
  return { wav: wavFromPcm(data, sampleRate), seconds: data.length / 2 / sampleRate, container: false };
}
