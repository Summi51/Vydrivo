import { chatEndpoint, chatProviders } from './ai-config.js';

// One chat call with a provider fallback. Gemini models are tried first;
// the DeepSeek gateway is called only when every Gemini model throws, times
// out or returns a non-2xx response. Provider names and HTTP statuses are
// safe to expose; keys, prompts and provider payloads never are.
export class AiChatError extends Error {
  constructor(message, failures = []) {
    super(message);
    this.name = 'AiChatError';
    this.failures = failures;
  }
}

export async function chatCompletion({
  messages,
  temperature = 0.1,
  timeoutMs = 240000,
  deadlineMs = 0,
  fetchImpl = fetch,
  env = process.env,
} = {}) {
  const providers = chatProviders(env);
  if (!providers.length) throw new AiChatError('No AI provider is configured.');

  const failures = [];
  const startedAt = Date.now();
  for (const provider of providers) {
    const remainingMs = deadlineMs > 0 ? deadlineMs - (Date.now() - startedAt) : timeoutMs;
    if (remainingMs < 1000) {
      failures.push({ provider: provider.name, error: 'TimeoutError' });
      break;
    }
    try {
      const response = await fetchImpl(chatEndpoint(provider.baseUrl), {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(Math.min(timeoutMs, remainingMs)),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({ model: provider.model, temperature, messages }),
      });
      if (!response.ok) {
        failures.push({ provider: provider.name, status: response.status });
        continue;
      }
      return { response, provider: provider.name, model: provider.model };
    } catch (error) {
      failures.push({ provider: provider.name, error: error?.name || 'Error' });
    }
  }

  throw new AiChatError('Every AI provider failed.', failures);
}
