import { GEMINI_VOICES } from './gemini-voices.js';

export const DEFAULT_VOICE_PRESET = 'gemini-Kore';

const LEGACY_VOICE_OPTIONS = [
  {
    id: 'daniel-test',
    label: 'Daniel — English — Test voice',
    shortLabel: 'Daniel',
    language: 'English',
    status: 'test',
    // Older presets have no Gemini name. Render them with the matching gender
    // voice so the Idea choice still opens selected on the Video page.
    geminiVoice: 'Puck',
    tone: 'male',
    detail: 'Older test preset. Graphics video speaks it with Puck.',
    previewAvailable: false,
  },
  {
    id: 'indian-english-male',
    label: 'Indian English — Male',
    shortLabel: 'Indian male',
    language: 'English',
    status: 'configured-unverified',
    geminiVoice: 'Puck',
    tone: 'male',
    detail: 'Older preset. Graphics video speaks it with Puck.',
    previewAvailable: false,
  },
  {
    id: 'indian-english-female',
    label: 'Indian English — Female',
    shortLabel: 'Indian female',
    language: 'English',
    status: 'configured-unverified',
    geminiVoice: 'Kore',
    tone: 'female',
    detail: 'Older preset. Graphics video speaks it with Kore.',
    previewAvailable: false,
  },
];

export const VOICE_OPTIONS = [
  ...GEMINI_VOICES.map((voice) => ({
    id: `gemini-${voice.id}`,
    label: `${voice.label} — ${voice.style}`,
    shortLabel: voice.label,
    language: 'Hindi / English',
    status: 'gemini',
    geminiVoice: voice.id,
    tone: voice.tone,
    detail: `${voice.style} Gemini voice. Used when a graphics video is rendered.`,
    previewAvailable: false,
  })),
  ...LEGACY_VOICE_OPTIONS,
];

const VOICE_IDS = new Set(VOICE_OPTIONS.map((voice) => voice.id));

export function isVoicePreset(value) {
  return typeof value === 'string' && VOICE_IDS.has(value);
}

export function geminiVoiceId(preset) {
  const option = VOICE_OPTIONS.find((voice) => voice.id === preset);
  return option?.geminiVoice || null;
}

// The Video dropdown uses the same preset id the Idea page saved. Rendering
// still needs a Gemini voice name, so legacy presets map without rewriting
// the saved choice.
export function graphicsVoiceFor(preset) {
  if (isGraphicsVoice(preset)) return preset;
  return geminiVoiceId(preset) || 'Kore';
}

export const GRAPHICS_VOICES = [
  'male',
  'female',
  ...GEMINI_VOICES.map((voice) => voice.id),
];

export function isGraphicsVoice(value) {
  return GRAPHICS_VOICES.includes(value);
}

export function voiceOption(value) {
  return VOICE_OPTIONS.find((voice) => voice.id === value) || VOICE_OPTIONS[0];
}
