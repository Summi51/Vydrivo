import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {lookupNarrationCache, narrationCacheKey, upsertCacheIndex} from './narration-cache.mjs';
import {narrationHash} from './timeline.mjs';

const voiceId = 'iP95p4xoKVk53GoZ742B';
const model = 'eleven_multilingual_v2';
const narration = 'Water moves.';
const request = {voiceId, model, narration};

function seed(root, patch = {}) {
  const dir = path.join(root, 'voice-001');
  mkdirSync(dir);
  const alignment = {sceneId: 'water', narrationHash: narrationHash(narration), alignment: {characters: narration.split(''), character_start_times_seconds: narration.split('').map((_, i) => i), character_end_times_seconds: narration.split('').map((_, i) => i + 1)}};
  const attempt = {state: 'succeeded', voiceId, model, costCapINR: 0};
  writeFileSync(path.join(dir, 'narration.mp3'), 'not-a-real-mp3');
  writeFileSync(path.join(dir, 'alignment.json'), JSON.stringify(alignment));
  writeFileSync(path.join(dir, 'attempt.json'), JSON.stringify({...attempt, ...patch}));
  const entry = {key: narrationCacheKey(request), relativeDir: 'voice-001', voiceId, model, narrationHash: narrationHash(narration), costCapINR: 0};
  writeFileSync(path.join(root, 'narration-cache.json'), JSON.stringify(upsertCacheIndex(null, entry)));
  return {dir, alignment};
}

test('cache reuses a verified zero-cost narration and misses anything else', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vydrivo-cache-'));
  try {
    const {dir} = seed(root);
    assert.equal(lookupNarrationCache(root, request), dir);
    assert.equal(lookupNarrationCache(root, {...request, narration: 'Changed.'}), null);
    assert.throws(() => lookupNarrationCache(root, {...request, model: 'other'}), /Unsupported narration model/);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('cache refuses a paid, failed, or mismatched saved attempt', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vydrivo-cache-'));
  try {
    seed(root, {costCapINR: 1, state: 'failed'});
    assert.equal(lookupNarrationCache(root, request), null);
    const file = path.join(root, 'voice-001', 'alignment.json');
    const alignment = JSON.parse(readFileSync(file, 'utf8'));
    alignment.alignment.characters[0] = 'X';
    writeFileSync(file, JSON.stringify(alignment));
    writeFileSync(path.join(root, 'voice-001', 'attempt.json'), JSON.stringify({state: 'succeeded', voiceId, model, costCapINR: 0}));
    assert.equal(lookupNarrationCache(root, request), null);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
