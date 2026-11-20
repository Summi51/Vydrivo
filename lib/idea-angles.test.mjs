import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIdeaAngle, ideaAngles, ideaSubject } from './idea-angles.js';

test('an empty box keeps the generic starters and does not invent a topic', () => {
  const angles = ideaAngles('   ');
  assert.deepEqual(angles.map((angle) => angle.label), [
    'Explain a concept',
    'Share a workflow',
    'Tease a feature',
    '3 quick signs',
  ]);
  assert.equal(angles.every((angle) => angle.topic === '' && angle.tailored === false), true);
});

test('a typed subject rewrites every chip and prompt around that subject', () => {
  assert.equal(ideaSubject('Load balancer'), 'Load balancer');
  const angles = ideaAngles('load balancer');
  assert.deepEqual(angles.map((angle) => angle.label), [
    'Explain load balancer',
    'Share a load balancer workflow',
    'Tease a load balancer feature',
    '3 load balancer signs',
  ]);
  assert.equal(angles.every((angle) => angle.tailored && /load balancer/i.test(angle.topic)), true);
  assert.equal(/RAM|creative teams|content workflow/i.test(angles.map((angle) => angle.topic).join(' ')), false);
});

test('a lead-in is stripped so the chip does not say Explain explain', () => {
  assert.equal(ideaSubject('Explain a load balancer to beginners'), 'load balancer to beginners');
  const [concept] = ideaAngles('Please explain the load balancer.');
  assert.equal(concept.label, 'Explain load balancer');
  assert.match(concept.topic, /^Explain load balancer /);
});

test('a long note uses only the first sentence and stays inside the chip width', () => {
  const note = `How a load balancer spreads traffic. ${'Extra detail. '.repeat(40)}`;
  const angles = ideaAngles(note);
  assert.equal(angles[0].label.length <= 48, true);
  assert.match(angles[1].topic, /load balancer spreads traffic/i);
  assert.equal(angles[1].topic.includes('Extra detail'), false);
});

test('an empty chip does not wipe a typed topic, and a click stays on that topic', () => {
  const empty = ideaAngles('');
  assert.equal(applyIdeaAngle('load balancer', empty[0]), 'load balancer');
  const workflow = ideaAngles('load balancer').find((angle) => angle.id === 'workflow');
  const applied = applyIdeaAngle('load balancer', workflow);
  assert.match(applied, /^Share one practical load balancer workflow/);
  assert.match(applied, /Starting point: load balancer$/);
  const afterClick = ideaAngles(applied);
  assert.equal(afterClick[0].label, 'Explain load balancer');
  assert.equal(afterClick.every((angle) => /load balancer/i.test(angle.topic)), true);
  assert.equal(applyIdeaAngle(applied, workflow), applied);
});
