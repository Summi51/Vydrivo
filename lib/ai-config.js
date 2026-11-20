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

const DEFAULT_PROMPT_BASE = 'https://opencode.ai/inference/go/v1';
const DEFAULT_PROMPT_MODEL = 'deepseek-v4.1-flash';

// The new prompt key is preferred. The original AI_API_KEY stays as the backup
// and is never removed. Voice does not read this key.
export function promptConfig(env = process.env) {
  const apiKey = String(env.AI_API_KEY_NEW || '').trim();
  const baseUrl = String(env.AI_BASE_URL_NEW || DEFAULT_PROMPT_BASE).trim() || DEFAULT_PROMPT_BASE;
  const model = String(env.AI_MODEL_NEW || DEFAULT_PROMPT_MODEL).trim() || DEFAULT_PROMPT_MODEL;
  return {
    name: 'prompt',
    baseUrl,
    model,
    apiKey,
    // A key alone is not a spend gate. The operator flag still has to be true.
    freeTierVerified: Boolean(apiKey) && env.AI_FREE_TIER_VERIFIED === 'true',
    headers: apiKey ? { 'x-opencode-session': 'vydrivo-prompt', 'User-Agent': 'vydrivo/1.0' } : null,
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
    // A configured Gemini key is not a spend gate by itself. The operator flag
    // still has to be true, same as the original gateway.
    freeTierVerified: Boolean(String(env.GEMINI_API_KEY || '').trim()) && env.AI_FREE_TIER_VERIFIED === 'true',
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

function usable(provider) {
  return Boolean(
    provider?.apiKey
    && provider.baseUrl
    && provider.model
    && MODEL_ID.test(String(provider.model)),
  );
}

// The new DeepSeek prompt key is first. Gemini text is the backup, then the
// original gateway. A missing new key keeps the old order, so local tests and
// the original key still work. Voice never uses this list.
// A short request (one scene inside Amplify's 30-second cut) cannot wait for
// the slower prompt key and still have a fallback, so preferFast tries Gemini
// first and keeps the prompt key as the backup. It does not drop any key.
export function chatProviders(env = process.env, { preferFast = false } = {}) {
  const providers = [];
  const prompt = promptConfig(env);
  const geminiModels = [];
  const gemini = geminiConfig(env);
  if (gemini.apiKey && gemini.baseUrl) {
    for (const model of geminiTextModels(env)) {
      geminiModels.push({ ...gemini, name: 'gemini', model });
    }
  }
  if (preferFast) providers.push(...geminiModels);
  if (usable(prompt)) providers.push(prompt);
  if (!preferFast) providers.push(...geminiModels);
  const primary = planningConfig(env);
  if (usable(primary)) {
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
