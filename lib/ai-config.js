export function planningConfig(env = process.env) {
  return {
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    freeTierVerified: env.AI_FREE_TIER_VERIFIED === 'true',
  };
}

// Gemini exposes an OpenAI-compatible chat endpoint, so it uses the same
// request shape as the primary gateway. It is a fallback only: the primary
// provider stays first and Gemini is used when the primary fails.
export function geminiConfig(env = process.env) {
  return {
    name: 'gemini',
    baseUrl: String(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').trim(),
    model: String(env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
    apiKey: String(env.GEMINI_API_KEY || '').trim(),
    freeTierVerified: env.AI_FREE_TIER_VERIFIED === 'true',
  };
}

export function chatProviders(env = process.env) {
  const primary = planningConfig(env);
  const providers = [];
  if (primary.apiKey && primary.model && primary.baseUrl) {
    providers.push({ ...primary, name: 'primary' });
  }
  const gemini = geminiConfig(env);
  if (gemini.apiKey && gemini.model && gemini.baseUrl) {
    const duplicate = providers.some(
      (provider) => provider.baseUrl === gemini.baseUrl && provider.model === gemini.model,
    );
    if (!duplicate) providers.push(gemini);
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
