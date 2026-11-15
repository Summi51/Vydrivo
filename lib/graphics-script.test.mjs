import assert from 'node:assert/strict';
import test from 'node:test';
import { scriptFromRenderData, validateGraphicsScript } from './graphics-script.js';

const project = {
  id: 'cd979cb3-d0f0-431b-9439-726baf1ad4ff',
  storyboard: {
    scenes: [
      { id: 's01', title: 'The real bottleneck', narration: 'English one.' },
      { id: 's02', title: 'Fix the route', narration: 'English two.' },
    ],
  },
};

function validScript() {
  return {
    scenes: [
      {
        id: 's01',
        headline: 'Asli bottleneck',
        diagram: 'statement',
        labels: ['3 waits', 'First frame'],
        displayNarration: 'Asli bottleneck waits hain.',
        narration: 'असली रुकावट इंतज़ार है।',
      },
      {
        id: 's02',
        headline: 'Do-tap route',
        diagram: 'steps',
        labels: ['Home screen', 'Camera', 'Record'],
        displayNarration: 'Do tap ka route banao.',
        narration: 'दो टैप का रास्ता बनाओ।',
      },
    ],
  };
}

test('validates scene text in approved scene order', () => {
  const result = validateGraphicsScript(project, validScript());
  assert.equal(result.scenes.length, 2);
  assert.equal(result.scenes[0].id, 's01');
  assert.equal(result.scenes[0].diagram, 'statement');
  assert.equal(result.scenes[1].labels.length, 3);
});

test('rejects a missing scene', () => {
  const script = validScript();
  script.scenes.pop();
  assert.throws(() => validateGraphicsScript(project, script), /scene count/);
});

test('rejects an unsupported diagram', () => {
  const script = validScript();
  script.scenes[0].diagram = 'interview';
  assert.throws(() => validateGraphicsScript(project, script), /supported diagram/);
});

test('rejects fewer than two labels', () => {
  const script = validScript();
  script.scenes[0].labels = ['Only one'];
  assert.throws(() => validateGraphicsScript(project, script), /at least two/);
});

test('rejects Latin-only voice narration', () => {
  const script = validScript();
  script.scenes[0].narration = 'Yeh Hinglish narration hai.';
  assert.throws(() => validateGraphicsScript(project, script), /Devanagari/);
});

test('seeds scene text from a completed render', () => {
  const data = {
    scenes: [
      { id: 's01', headline: 'Asli bottleneck', diagram: 'big-number', labels: ['3 waits', 'Gap'], displayNarration: 'Asli bottleneck waits hain.', narration: 'असली रुकावट इंतज़ार है।' },
      { id: 's02', headline: 'Do-tap route', diagram: 'steps', labels: ['Home', 'Camera'], displayNarration: 'Do tap route.', narration: 'दो टैप का रास्ता।' },
    ],
  };
  const script = scriptFromRenderData(project, data, 'run-1');
  assert.equal(script.sourceRunId, 'run-1');
  assert.equal(script.scenes[0].diagram, 'big-number');
  assert.equal(script.scenes[1].displayNarration, 'Do tap route.');
});
