import { resolveGeminiVoice } from './gemini-voices.js';

export class GeminiSpeechError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function models(env) {
  const preferred = String(env.GEMINI_TTS_MODEL || '').trim();
  const listed = String(env.GEMINI_TTS_MODELS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const out = [];
  for (const model of [preferred, ...listed, 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts']) {
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(model) || out.includes(model)) continue;
    out.push(model);
  }
  return out;
}

function wavFromPcm(pcm, rate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function once(text, voiceName, model, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }),
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!response.ok) throw new GeminiSpeechError(503, 'VOICE_UNAVAILABLE', 'Voice is temporarily unavailable.');
  const payload = await response.json();
  const inline = payload?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const pcm = Buffer.from(String(inline?.data || ''), 'base64');
  if (pcm.length < 2) throw new GeminiSpeechError(503, 'VOICE_UNAVAILABLE', 'Voice returned no audio.');
  const rate = Number(String(inline?.mimeType || '').match(/rate=(\d+)/)?.[1] || 24000);
  return { wav: wavFromPcm(pcm, rate), seconds: pcm.length / 2 / rate, model };
}

export async function geminiSpeechWav(text, voice, env = process.env) {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new GeminiSpeechError(503, 'VOICE_UNAVAILABLE', 'Voice is not configured on this server.');
  const narration = String(text || '').trim();
  if (!narration || narration.length > 700) {
    throw new GeminiSpeechError(422, 'INVALID_NARRATION', 'Voice narration must be 1–700 characters.');
  }
  const voiceName = resolveGeminiVoice(voice, env);
  let last;
  for (const model of models(env)) {
    try {
      return await once(narration, voiceName, model, apiKey);
    } catch (error) {
      last = error;
    }
  }
  if (last instanceof GeminiSpeechError) throw last;
  throw new GeminiSpeechError(503, 'VOICE_UNAVAILABLE', 'Voice is temporarily unavailable.');
}
