import assert from 'node:assert/strict';
import test from 'node:test';
import { draftFromTopic, readDraft, saveDraft } from './project-draft.js';

test('draft keeps a trimmed topic and refuses empty input', () => {
  const draft = draftFromTopic('  Why do we dream?  ');
  assert.equal(draft.ok, true);
  assert.equal(draft.draft.topic, 'Why do we dream?');
  assert.equal(draft.draft.persistence, 'browser-only');
  assert.equal(draftFromTopic('   ').ok, false);
});

test('draft round-trips in storage and rejects a bad record', () => {
  const memory = new Map();
  const storage = {
    setItem: (key, value) => memory.set(key, value),
    getItem: (key) => memory.get(key) ?? null,
  };
  saveDraft(storage, draftFromTopic('A slower morning').draft);
  assert.equal(readDraft(storage).title, 'A slower morning');
  memory.set('vydrivo.project-draft', '{"topic":"  "}');
  assert.equal(readDraft(storage), null);
});
