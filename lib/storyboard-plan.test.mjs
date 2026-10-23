import assert from 'node:assert/strict';
import test from 'node:test';
import { draftStoryboard, reviewStoryboard, splitTopic } from './storyboard-plan.js';

const board = () => ({
  schemaVersion: 1,
  title: 'Water cycle',
  scenes: Array.from({ length: 3 }, (_, index) => ({
    id: `scene-${index + 1}`,
    title: 'Scene',
    narration: 'Water moves through the sky and ground.',
    visualKind: 'ai-generated-footage',
    visualPrompt: 'A river flows toward the sea.',
    estimatedSeconds: 25,
  })),
});

const env = {
  AI_BASE_URL: 'https://ai.example/v1',
  AI_MODEL: 'ocg/deepseek-v4.1-flash',
  AI_API_KEY: 'test-key',
  AI_FREE_TIER_VERIFIED: 'true',
};

test('long topics split into planner topic and notes', () => {
  const split = splitTopic(`${'river '.repeat(300)}notes`);
  assert.equal(split.ok, true);
  assert.ok(split.topic.length <= 1000);
  assert.ok(split.notes.length > 0);
});

test('draft uses the configured model once and stays unapproved', async () => {
  let calls = 0;
  const result = await draftStoryboard('How rivers reach the sea', env, async (_url, options) => {
    calls += 1;
    assert.equal(JSON.parse(options.body).model, 'ocg/deepseek-v4.1-flash');
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(board()) } }] }));
  });
  assert.equal(calls, 1);
  assert.equal(result.review.approved, false);
  assert.equal(result.videoGeneration, 'not-connected');
  assert.equal(result.seconds, 75);
});

test('approval binds the exact storyboard and rejects edits', () => {
  const reviewed = reviewStoryboard(board(), true);
  assert.equal(reviewed.review.approved, true);
  const edited = board();
  edited.scenes[0].narration = 'Changed after review.';
  assert.notEqual(reviewStoryboard(edited, true).review.storyboardHash, reviewed.review.storyboardHash);
  assert.throws(() => reviewStoryboard(board(), false), /Review the scenes/);
});

test('planner stays blocked when the operator has not verified the model', async () => {
  let called = false;
  await assert.rejects(
    draftStoryboard('Rivers', { ...env, AI_FREE_TIER_VERIFIED: 'false' }, async () => {
      called = true;
      return new Response('{}');
    }),
    /Planner blocked/,
  );
  assert.equal(called, false);
});
