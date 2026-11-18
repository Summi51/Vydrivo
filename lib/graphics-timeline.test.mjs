import test from 'node:test';
import assert from 'node:assert/strict';
import { fitTimeline, planGraphicsTimeline, sceneDurationSeconds } from './graphics-timeline.js';

test('a 60–90 second narration is left alone', () => {
  const fit = fitTimeline([20, 25, 30]);
  assert.equal(fit.fitted, false);
  assert.equal(fit.tempo, 1);
  assert.equal(fit.total, 75);
});

test('a modest overrun is fitted to 90 seconds', () => {
  const fit = fitTimeline([40, 40, 36]);
  assert.equal(fit.fitted, true);
  assert.ok(fit.tempo > 1 && fit.tempo <= 1.35);
  assert.ok(Math.abs(fit.total - 90) < 0.001);
});

test('an extreme overrun is refused', () => {
  assert.throws(() => fitTimeline([80, 80]), /too far/);
});

test('a short scene keeps its storyboard estimate when speech is shorter', () => {
  assert.equal(sceneDurationSeconds(4, 8), 8);
  assert.equal(sceneDurationSeconds(9, 8), 9);
});

test('held scene estimates are fitted, not the raw speech', () => {
  const plan = planGraphicsTimeline([
    { speechSeconds: 8, estimatedSeconds: 20 },
    { speechSeconds: 8, estimatedSeconds: 25 },
    { speechSeconds: 8, estimatedSeconds: 30 },
  ]);
  assert.equal(plan[0].fitted, false);
  assert.equal(plan[0].tempo, 1);
  assert.equal(plan[0].durationInFrames, 600);
  assert.equal(plan.reduce((sum, scene) => sum + scene.durationInFrames, 0), 2250);
});

test('a held overrun speeds the speech and keeps the cut at 90 seconds', () => {
  const plan = planGraphicsTimeline([
    { speechSeconds: 20, estimatedSeconds: 40 },
    { speechSeconds: 20, estimatedSeconds: 40 },
    { speechSeconds: 18, estimatedSeconds: 36 },
  ]);
  assert.equal(plan[0].fitted, true);
  assert.ok(plan[0].speechSeconds < 20);
  assert.equal(plan.reduce((sum, scene) => sum + scene.durationInFrames, 0), 2700);
});

