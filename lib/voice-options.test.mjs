import assert from 'node:assert/strict';
import test from 'node:test';
import { graphicsVoiceFor, geminiVoiceId, isGraphicsVoice, isVoicePreset } from './voice-options.js';

test('idea voice presets map to the graphics voice without rewriting the saved id', () => {
  assert.equal(isVoicePreset('indian-english-female'), true);
  assert.equal(geminiVoiceId('indian-english-female'), 'Kore');
  assert.equal(graphicsVoiceFor('indian-english-female'), 'Kore');
  assert.equal(graphicsVoiceFor('indian-english-male'), 'Puck');
  assert.equal(graphicsVoiceFor('gemini-Achird'), 'Achird');
  assert.equal(graphicsVoiceFor('female'), 'female');
  assert.equal(isGraphicsVoice(graphicsVoiceFor('indian-english-female')), true);
  assert.equal(isGraphicsVoice('indian-english-female'), false);
});
