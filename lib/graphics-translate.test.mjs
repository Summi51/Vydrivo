import test from 'node:test';
import assert from 'node:assert/strict';
import { translateScenes, translateStoryboardToHindi } from './graphics-translate.js';

const ENV = {
  AI_BASE_URL: 'https://gateway.example.com/v1',
  AI_MODEL: 'test/model',
  AI_API_KEY: 'test-key',
  AI_FREE_TIER_VERIFIED: 'true',
};

const STORYBOARD = {
  scenes: [{
    id: 'scene-01',
    title: 'The first spark',
    narration: 'An idea can feel vivid the moment it arrives.',
    visualKind: 'motion-graphics',
    visualPrompt: 'A glowing dot.',
    estimatedSeconds: 8,
  }],
};

function reply() {
  const content = JSON.stringify({
    scenes: [{
      id: 'scene-01',
      title: 'Pehli Chingaari',
      narration: 'एक आइडिया आते ही कितना जीवंत लग सकता है।',
      displayNarration: 'Ek idea aate hi kitna vivid lag sakta hai.',
      diagram: 'statement',
      labels: ['Ek idea', 'Pehli chingaari'],
    }],
  });
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('a translation batch retries once after a network failure', async () => {
  let calls = 0;
  const result = await translateStoryboardToHindi(STORYBOARD, {
    env: ENV,
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('fetch failed');
      return reply();
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.scenes[0].title, 'Pehli Chingaari');
  assert.equal(result.scenes[0].diagram, 'statement');
});

test('two failed batches fail the translation with the safe message', async () => {
  let calls = 0;
  await assert.rejects(
    translateStoryboardToHindi(STORYBOARD, {
      env: ENV,
      retryDelayMs: 0,
      fetchImpl: async () => {
        calls += 1;
        throw new TypeError('fetch failed');
      },
    }),
    (error) => error.code === 'GRAPHICS_TRANSLATION_FAILED' && /did not respond/.test(error.message),
  );
  assert.equal(calls, 2);
});

test('an invalid batch is repaired with a second request', async () => {
  let calls = 0;
  const bad = JSON.stringify({
    scenes: [{
      id: 'scene-01',
      title: 'Pehli Chingaari',
      narration: 'Ek idea aate hi vivid lagta hai.',
      displayNarration: 'Ek idea aate hi vivid lagta hai.',
      diagram: 'statement',
      labels: ['Ek idea', 'Pehli chingaari'],
    }],
  });
  const result = await translateStoryboardToHindi(STORYBOARD, {
    env: ENV,
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ choices: [{ message: { content: bad } }] }), { status: 200 });
      }
      return reply();
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.scenes[0].narration.includes('आइडिया'), true);
});

test('Gemini is tried first and a failed Gemini model falls back to DeepSeek', async () => {
  const urls = [];
  const env = { ...ENV, GEMINI_API_KEY: 'gemini-key', GEMINI_MODEL: 'gemini-2.5-flash' };
  const result = await translateStoryboardToHindi(STORYBOARD, {
    env,
    retryDelayMs: 0,
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (!String(url).includes('gateway.example.com')) return new Response('{}', { status: 500 });
      return reply();
    },
  });
  assert.equal(result.scenes[0].title, 'Pehli Chingaari');
  assert.equal(result.scenes[0].narration.includes('आइडिया'), true);
  assert.equal(urls[0], 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(urls.at(-1), 'https://gateway.example.com/v1/chat/completions');
});

test('a shared deadline stops the retry before Amplify cuts the request off', async () => {
  let calls = 0;
  await assert.rejects(
    translateScenes(STORYBOARD.scenes, {
      env: ENV,
      retryDelayMs: 0,
      deadlineMs: 1100,
      fetchImpl: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 200));
        throw new TypeError('fetch failed');
      },
    }),
    (error) => error.code === 'GRAPHICS_TRANSLATION_FAILED' && /did not respond/.test(error.message),
  );
  assert.equal(calls, 1);
});
