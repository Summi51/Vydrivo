// Browser-only audio helpers for the free graphics render. These measure speech,
// speed it into the 60–90 second window, and wrap PCM as WAV. No server binaries.

function audioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error('This browser cannot measure speech audio.');
  return new Context();
}

export async function measureAudioSeconds(blob) {
  const context = audioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) {
      throw new Error('Speech audio duration is invalid.');
    }
    return buffer.duration;
  } finally {
    await context.close().catch(() => {});
  }
}

function encodeWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const rate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const data = new Int16Array(length * channels);
  for (let channel = 0; channel < channels; channel += 1) {
    const samples = audioBuffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const sample = Math.max(-1, Math.min(1, samples[index]));
      data[index * channels + channel] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
  }
  const buffer = new ArrayBuffer(44 + data.byteLength);
  const view = new DataView(buffer);
  const write = (offset, text) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + data.byteLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, data.byteLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(data.buffer));
  return new Blob([buffer], { type: 'audio/wav' });
}

// playback > 1 shortens the clip. OfflineAudioContext keeps pitch close enough
// for a modest fit; extreme tempos are rejected before this is called.
export async function fitAudioBlob(blob, playback) {
  const rate = Number(playback);
  if (!Number.isFinite(rate) || Math.abs(rate - 1) < 0.0001) return blob;
  const context = audioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const frames = Math.max(1, Math.ceil(decoded.length / rate));
    const offline = new OfflineAudioContext(decoded.numberOfChannels, frames, decoded.sampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.playbackRate.value = rate;
    source.connect(offline.destination);
    source.start(0);
    return encodeWav(await offline.startRendering());
  } finally {
    await context.close().catch(() => {});
  }
}

// Speech is often shorter than the scene. Pad with real silence and fade the
// edges so the next scene does not start on a click or leftover samples.
export async function padAudioBlob(blob, seconds) {
  const target = Number(seconds);
  const context = audioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const needed = Math.ceil(target * decoded.sampleRate);
    if (!Number.isFinite(target) || target <= 0 || needed <= decoded.length + decoded.sampleRate * 0.05) {
      return blob;
    }
    const offline = new OfflineAudioContext(decoded.numberOfChannels, needed, decoded.sampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    const fade = offline.createGain();
    const edge = Math.min(0.012, decoded.duration / 8);
    fade.gain.setValueAtTime(0, 0);
    fade.gain.linearRampToValueAtTime(1, edge);
    fade.gain.setValueAtTime(1, Math.max(edge, decoded.duration - edge));
    fade.gain.linearRampToValueAtTime(0, decoded.duration);
    source.connect(fade);
    fade.connect(offline.destination);
    source.start(0);
    return encodeWav(await offline.startRendering());
  } finally {
    await context.close().catch(() => {});
  }
}
