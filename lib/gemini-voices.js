// Gemini prebuilt TTS voices. Names and styles match the public speech docs.
// male/female stay valid so older render jobs and the ElevenLabs backup still work.
export const GEMINI_VOICES = [
  { id: 'Achernar', label: 'Achernar', style: 'Soft', tone: 'female' },
  { id: 'Achird', label: 'Achird', style: 'Friendly', tone: 'male' },
  { id: 'Algenib', label: 'Algenib', style: 'Gravelly', tone: 'male' },
  { id: 'Algieba', label: 'Algieba', style: 'Smooth', tone: 'male' },
  { id: 'Alnilam', label: 'Alnilam', style: 'Firm', tone: 'male' },
  { id: 'Aoede', label: 'Aoede', style: 'Breezy', tone: 'female' },
  { id: 'Autonoe', label: 'Autonoe', style: 'Bright', tone: 'female' },
  { id: 'Callirrhoe', label: 'Callirrhoe', style: 'Easy-going', tone: 'female' },
  { id: 'Charon', label: 'Charon', style: 'Informative', tone: 'male' },
  { id: 'Despina', label: 'Despina', style: 'Smooth', tone: 'female' },
  { id: 'Enceladus', label: 'Enceladus', style: 'Breathy', tone: 'male' },
  { id: 'Erinome', label: 'Erinome', style: 'Clear', tone: 'female' },
  { id: 'Fenrir', label: 'Fenrir', style: 'Excitable', tone: 'male' },
  { id: 'Gacrux', label: 'Gacrux', style: 'Mature', tone: 'female' },
  { id: 'Iapetus', label: 'Iapetus', style: 'Clear', tone: 'male' },
  { id: 'Kore', label: 'Kore', style: 'Firm', tone: 'female' },
  { id: 'Laomedeia', label: 'Laomedeia', style: 'Upbeat', tone: 'female' },
  { id: 'Leda', label: 'Leda', style: 'Youthful', tone: 'female' },
  { id: 'Orus', label: 'Orus', style: 'Firm', tone: 'male' },
  { id: 'Pulcherrima', label: 'Pulcherrima', style: 'Forward', tone: 'female' },
  { id: 'Puck', label: 'Puck', style: 'Upbeat', tone: 'male' },
  { id: 'Rasalgethi', label: 'Rasalgethi', style: 'Informative', tone: 'male' },
  { id: 'Sadachbia', label: 'Sadachbia', style: 'Lively', tone: 'male' },
  { id: 'Sadaltager', label: 'Sadaltager', style: 'Knowledgeable', tone: 'male' },
  { id: 'Schedar', label: 'Schedar', style: 'Even', tone: 'male' },
  { id: 'Sulafat', label: 'Sulafat', style: 'Warm', tone: 'female' },
  { id: 'Umbriel', label: 'Umbriel', style: 'Easy-going', tone: 'male' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', style: 'Gentle', tone: 'female' },
  { id: 'Zephyr', label: 'Zephyr', style: 'Bright', tone: 'female' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', style: 'Casual', tone: 'male' },
];

const BY_ID = new Map(GEMINI_VOICES.map((voice) => [voice.id, voice]));

export function isGeminiVoice(value) {
  return typeof value === 'string' && BY_ID.has(value);
}

export function geminiVoice(value) {
  return BY_ID.get(value) || null;
}

// male/female map to the previous defaults so an old job still speaks.
export function resolveGeminiVoice(value, env = process.env) {
  if (isGeminiVoice(value)) return value;
  if (value === 'female') return env.GEMINI_TTS_FEMALE_VOICE || 'Kore';
  return env.GEMINI_TTS_MALE_VOICE || 'Puck';
}
