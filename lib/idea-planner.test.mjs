import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildIdeaMessages,
  planIdeas,
  validateIdeaInput,
  validateIdeaSuggestions,
} from './idea-planner.js';

const baseSuggestion = {
  title: 'The desk and the filing cabinet',
  hook: 'Your computer forgets everything when the power goes off. Here is why that is a feature.',
  angle: 'Use a desk for active work and a filing cabinet for long-term storage so the difference becomes physical.',
  outline: [
    'Open with a messy desk and a laptop',
    'Show active work staying on the desk',
    'Move finished work into the filing cabinet',
  ],
  visualDirection: 'Warm overhead desk scene, then a wide filing cabinet shot.',
  sampleScenePrompt: 'Slow top-down push-in on a wooden desk covered in papers and a glowing laptop, warm afternoon light, shallow depth of field, 9:16, 5 seconds, realistic, no text, no logos.',
};

function suggestions(count = 3) {
  return Array.from({ length: count }, (_, index) => ({
    ...baseSuggestion,
    title: `${baseSuggestion.title} ${index + 1}`,
  }));
}

function providerResponse(payload, { status = 200, finishReason = 'stop' } = {}) {
  return new Response(JSON.stringify({
    choices: [{ finish_reason: finishReason, message: { content: JSON.stringify(payload) } }],
  }), { status, headers: { 'content-type': 'application/json' } });
}

test('validates idea input bounds and multiline notes', () => {
  const valid = validateIdeaInput({
    topic: 'Explain RAM versus storage',
    audience: 'Beginner computer users',
    notes: 'Use a desk analogy.\nKeep it under 90 seconds.',
  });
  assert.equal(valid.topic, 'Explain RAM versus storage');
  assert.match(valid.notes, /desk analogy/);
  assert.throws(() => validateIdeaInput({ topic: '' }), /Topic is required/);
  assert.throws(() => validateIdeaInput({ topic: 'x'.repeat(2001) }), /Topic is too long/);
  assert.throws(() => validateIdeaInput({ topic: 'Topic', audience: 'x'.repeat(501) }), /Audience is too long/);
  assert.throws(() => validateIdeaInput({ topic: 'Topic', notes: '<script>' }), /unsupported characters/);
});

test('accepts 3–5 well-formed suggestions and rejects weak output', () => {
  const valid = validateIdeaSuggestions({ suggestions: suggestions(3) });
  assert.equal(valid.length, 3);
  assert.equal(valid[0].sampleScenePrompt.includes('9:16'), true);

  assert.throws(() => validateIdeaSuggestions({ suggestions: suggestions(2) }), /3–5 suggestions/);
  assert.throws(() => validateIdeaSuggestions({ suggestions: suggestions(6) }), /3–5 suggestions/);

  const duplicate = suggestions(3);
  duplicate[1].title = duplicate[0].title;
  assert.throws(() => validateIdeaSuggestions({ suggestions: duplicate }), /duplicate suggestion titles/);

  const linked = suggestions(3);
  linked[0].hook = 'Read more at https://example.com';
  assert.throws(() => validateIdeaSuggestions({ suggestions: linked }), /must not contain links/);
});

test('repairs a short or long outline instead of rejecting the batch', () => {
  const short = suggestions(3);
  short[1].outline = short[1].outline.slice(0, 2);
  const repaired = validateIdeaSuggestions({ suggestions: short });
  assert.equal(repaired[1].outline.length, 3);
  assert.equal(repaired[1].outline[2], short[1].hook);

  const long = suggestions(3);
  long[0].outline = [...long[0].outline, 'Add a fourth beat', 'Add a fifth beat', 'Drop this sixth beat'];
  const trimmed = validateIdeaSuggestions({ suggestions: long });
  assert.equal(trimmed[0].outline.length, 5);
  assert.equal(trimmed[0].outline.includes('Drop this sixth beat'), false);

  const empty = suggestions(3);
  empty[0].outline = [];
  assert.throws(() => validateIdeaSuggestions({ suggestions: empty }), /3–5 outline beats/);
});

test('accepts long scene prompts and clamps only the extreme ones', () => {
  const moderate = suggestions(3);
  moderate[0].sampleScenePrompt = 'A slow push-in over a wooden desk. '.repeat(20);
  assert.equal(validateIdeaSuggestions({ suggestions: moderate }).length, 3);

  const extreme = suggestions(3);
  extreme[1].sampleScenePrompt = `A slow push-in. ${'Detailed camera and lighting notes. '.repeat(100)}`;
  const valid = validateIdeaSuggestions({ suggestions: extreme });
  assert.equal(valid.length, 3);
  assert.equal(valid[1].sampleScenePrompt.length <= 2001, true);
  assert.equal(valid[1].sampleScenePrompt.endsWith('…'), true);
});

test('builds a data-only prompt and includes refinement context', () => {
  const messages = buildIdeaMessages({
    topic: 'Explain RAM versus storage',
    feedback: 'Make it more beginner-friendly',
    previousSuggestions: suggestions(3),
  });
  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /untrusted reference data/);
  const user = JSON.parse(messages[1].content);
  assert.equal(user.task, 'refine_ideas');
  assert.equal(user.topic, 'Explain RAM versus storage');
  assert.equal(user.previousSuggestions.length, 3);
  assert.equal(user.constraints.aspect, '9:16');
});

test('planIdeas requires an explicitly verified provider', async () => {
  await assert.rejects(
    () => planIdeas({
      topic: 'Explain RAM versus storage',
      baseUrl: 'https://example.test/v1',
      model: 'deepseek-chat',
      apiKey: 'test-key',
      freeTierVerified: false,
      fetchImpl: async () => providerResponse({ suggestions: suggestions(3) }),
    }),
    /verify provider eligibility/,
  );
});

test('planIdeas calls the configured endpoint and returns validated suggestions', async () => {
  let captured;
  const result = await planIdeas({
    topic: 'Explain RAM versus storage',
    baseUrl: 'https://example.test/v1',
    model: 'deepseek-chat',
    apiKey: 'test-key',
    freeTierVerified: true,
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options };
      return providerResponse({ suggestions: suggestions(3) });
    },
  });

  assert.equal(captured.url, 'https://example.test/v1/chat/completions');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.model, 'deepseek-chat');
  assert.equal(body.temperature, 0.5);
  assert.match(body.messages[0].content, /idea assistant/);
  assert.match(body.messages[1].content, /Explain RAM versus storage/);
  assert.equal(result.suggestions.length, 3);
  assert.equal(result.model, 'deepseek-chat');
  assert.equal(result.provider, 'openai-compatible');
});

test('planIdeas rejects malformed provider output without exposing the key', async () => {
  await assert.rejects(
    () => planIdeas({
      topic: 'Explain RAM versus storage',
      baseUrl: 'https://example.test/v1',
      model: 'deepseek-chat',
      apiKey: 'super-secret-key',
      freeTierVerified: true,
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: 'not json' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    }),
    (error) => error.status === 422
      && error.code === 'PLANNER_REJECTED'
      && !String(error.message).includes('super-secret-key'),
  );
});

test('planIdeas tolerates a gateway streaming terminator on a JSON response', async () => {
  const result = await planIdeas({
    topic: 'Explain RAM versus storage',
    baseUrl: 'https://example.test/v1',
    model: 'deepseek-chat',
    apiKey: 'test-key',
    freeTierVerified: true,
    fetchImpl: async () => new Response(
      `${JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ suggestions: suggestions(3) }) } }] })}\ndata: [DONE]\n`,
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  });
  assert.equal(result.suggestions.length, 3);
});

test('planIdeas rejects truncated provider output with a clear message', async () => {
  await assert.rejects(
    () => planIdeas({
      topic: 'Explain RAM versus storage',
      baseUrl: 'https://example.test/v1',
      model: 'deepseek-chat',
      apiKey: 'test-key',
      freeTierVerified: true,
      fetchImpl: async () => providerResponse({ suggestions: suggestions(3) }, { finishReason: 'length' }),
    }),
    (error) => error.status === 422 && /truncated/i.test(error.message),
  );
});

test('planIdeas reports invalid provider configuration instead of a fake outage', async () => {
  let fetched = false;
  await assert.rejects(
    () => planIdeas({
      topic: 'Explain RAM versus storage',
      baseUrl: 'http://example.test/v1',
      model: 'deepseek-chat',
      apiKey: 'test-key',
      freeTierVerified: true,
      fetchImpl: async () => {
        fetched = true;
        return providerResponse({ suggestions: suggestions(3) });
      },
    }),
    /AI_BASE_URL must use https/,
  );
  assert.equal(fetched, false);
});

test('planIdeas maps provider rate limits to a retryable planner error', async () => {
  await assert.rejects(
    () => planIdeas({
      topic: 'Explain RAM versus storage',
      baseUrl: 'https://example.test/v1',
      model: 'deepseek-chat',
      apiKey: 'test-key',
      freeTierVerified: true,
      fetchImpl: async () => new Response('{}', { status: 429, headers: { 'content-type': 'application/json' } }),
    }),
    (error) => error.status === 503 && error.code === 'PLANNER_UNAVAILABLE',
  );
});
