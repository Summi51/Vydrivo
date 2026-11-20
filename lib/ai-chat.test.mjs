import test from 'node:test';
import assert from 'node:assert/strict';
import { chatCompletion } from './ai-chat.js';

const ENV = {
  AI_BASE_URL: 'https://gateway.example.com/v1',
  AI_MODEL: 'primary/model',
  AI_API_KEY: 'primary-key',
  AI_FREE_TIER_VERIFIED: 'true',
  GEMINI_API_KEY: 'gemini-key',
  GEMINI_MODEL: 'gemini-2.5-flash',
};

function ok(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('without the new prompt key, Gemini is used first and the old gateway is not called', async () => {
  const urls = [];
  const result = await chatCompletion({
    env: ENV,
    messages: [{ role: 'user', content: 'hi' }],
    fetchImpl: async (url) => {
      urls.push(String(url));
      return ok({ choices: [{ message: { content: 'gemini' } }] });
    },
  });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-2.5-flash');
  assert.equal(urls.length, 1);
  assert.equal(urls[0], 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
});

test('the new DeepSeek prompt key is tried first and sends the Go session header', async () => {
  const calls = [];
  const result = await chatCompletion({
    env: { ...ENV, AI_API_KEY_NEW: 'oc_sk_test' },
    messages: [{ role: 'user', content: 'hi' }],
    fetchImpl: async (url, init) => {
      calls.push({
        url: String(url),
        model: JSON.parse(init.body).model,
        session: init.headers['x-opencode-session'],
        maxTokens: JSON.parse(init.body).max_tokens,
      });
      return ok({ choices: [{ message: { content: 'ideas' } }] });
    },
  });
  assert.equal(result.provider, 'prompt');
  assert.equal(result.model, 'deepseek-v4.1-flash');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://opencode.ai/inference/go/v1/chat/completions');
  assert.equal(calls[0].session, 'vydrivo-prompt');
  assert.equal(calls[0].maxTokens, 8192);
});

test('a short scene request tries Gemini before the slower prompt key', async () => {
  const calls = [];
  const result = await chatCompletion({
    env: { ...ENV, AI_API_KEY_NEW: 'oc_sk_test' },
    preferFast: true,
    messages: [{ role: 'user', content: 'hi' }],
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), model: JSON.parse(init.body).model });
      return ok({ choices: [{ message: { content: 'scene' } }] });
    },
  });
  assert.equal(result.provider, 'gemini');
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(calls.length, 1);
});


test('a failed Gemini model falls through to the next Gemini model, then DeepSeek', async () => {
  const calls = [];
  const result = await chatCompletion({
    env: ENV,
    messages: [{ role: 'user', content: 'hi' }],
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), model: JSON.parse(init.body).model, auth: init.headers.Authorization });
      if (!String(url).includes('gateway.example.com')) return new Response('{}', { status: 500 });
      return ok({ choices: [{ message: { content: 'primary' } }] });
    },
  });
  assert.equal(result.provider, 'primary');
  assert.equal(calls.at(-1).url, 'https://gateway.example.com/v1/chat/completions');
  assert.equal(calls.at(-1).auth, 'Bearer primary-key');
  assert.equal(calls[0].model, 'gemini-2.5-flash');
  assert.ok(calls.some((call) => call.model === 'gemini-3.8-flash'));
});

test('both providers failing raises a safe error without keys or payloads', async () => {
  await assert.rejects(
    chatCompletion({
      env: ENV,
      messages: [{ role: 'user', content: 'hi' }],
      fetchImpl: async () => new Response('{}', { status: 429 }),
    }),
    (error) => {
      assert.equal(error.name, 'AiChatError');
      assert.equal(JSON.stringify(error.failures).includes('primary-key'), false);
      assert.equal(JSON.stringify(error.failures).includes('gemini-key'), false);
      return true;
    },
  );
});

test('without a Gemini key only the primary provider is configured', async () => {
  let calls = 0;
  await assert.rejects(
    chatCompletion({
      env: { ...ENV, GEMINI_API_KEY: '' },
      messages: [{ role: 'user', content: 'hi' }],
      fetchImpl: async () => {
        calls += 1;
        return new Response('{}', { status: 503 });
      },
    }),
    /Every AI provider failed/,
  );
  assert.equal(calls, 1);
});

test('a prompt key without the operator flag is not treated as verified', async () => {
  const { promptConfig, geminiConfig } = await import('./ai-config.js');
  const env = { AI_API_KEY_NEW: 'oc_sk_test', GEMINI_API_KEY: 'gemini-key', AI_FREE_TIER_VERIFIED: 'false' };
  assert.equal(promptConfig(env).freeTierVerified, false);
  assert.equal(geminiConfig(env).freeTierVerified, false);
  assert.equal(promptConfig({ ...env, AI_FREE_TIER_VERIFIED: 'true' }).freeTierVerified, true);
});
