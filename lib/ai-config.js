// Verified on this free key (14 November 2026): each model returned JSON.
// Newer models go first. Older models stay so a single expiry does not stop
// ideas, storyboards or scene text. DeepSeek is the last text backup.
export const GEMINI_TEXT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
];

const MODEL_ID = /^[A-Za-z0-9._:/@-]{1,80}$/;
const DEFAULT_GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

export function planningConfig(env = process.env) {
  return {
    name: 'primary',
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    freeTierVerified: env.AI_FREE_TIER_VERIFIED === 'true',
  };
}

export function geminiBase(env = process.env) {
  return String(env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE).trim() || DEFAULT_GEMINI_BASE;
}

// Gemini exposes an OpenAI-compatible chat endpoint, so it uses the same
// request shape as the DeepSeek gateway. Gemini models are tried first.
export function geminiConfig(env = process.env) {
  const models = geminiTextModels(env);
  return {
    name: 'gemini',
    baseUrl: geminiBase(env),
    model: models[0] || GEMINI_TEXT_MODELS[0],
    apiKey: String(env.GEMINI_API_KEY || '').trim(),
    freeTierVerified: env.AI_FREE_TIER_VERIFIED === 'true',
  };
}

export function geminiTextModels(env = process.env) {
  const preferred = String(env.GEMINI_MODEL || '').trim();
  const listed = String(env.GEMINI_TEXT_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  const models = [];
  for (const model of [preferred, ...listed, ...GEMINI_TEXT_MODELS]) {
    if (!MODEL_ID.test(model) || models.includes(model)) continue;
    models.push(model);
  }
  return models;
}

// Gemini first, one entry per verified model, then the DeepSeek gateway.
// A missing Gemini key leaves only the gateway, so local tests still run.
export function chatProviders(env = process.env) {
  const providers = [];
  const gemini = geminiConfig(env);
  if (gemini.apiKey && gemini.baseUrl) {
    for (const model of geminiTextModels(env)) {
      providers.push({ ...gemini, name: 'gemini', model });
    }
  }
  const primary = planningConfig(env);
  if (primary.apiKey && primary.model && primary.baseUrl && MODEL_ID.test(String(primary.model))) {
    const duplicate = providers.some(
      (provider) => provider.baseUrl === primary.baseUrl && provider.model === primary.model,
    );
    if (!duplicate) providers.push(primary);
  }
  return providers;
}

export function chatEndpoint(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl || '');
  } catch {
    throw new Error('Configure AI_BASE_URL as an https URL.');
  }
  if (url.protocol !== 'https:') throw new Error('AI_BASE_URL must use https.');
  if (url.username || url.password) throw new Error('AI_BASE_URL must not contain credentials.');
  return `${url.toString().replace(/\/$/, '')}/chat/completions`;
}
