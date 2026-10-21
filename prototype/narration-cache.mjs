import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {narrationHash} from './timeline.mjs';

const MODEL = 'eleven_multilingual_v2';
const DIR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

export function narrationCacheKey({voiceId, model, narration}) {
  if(!/^[A-Za-z0-9]{20}$/.test(voiceId || '')) throw new Error('Invalid voice ID.');
  if(model !== MODEL) throw new Error('Unsupported narration model.');
  if(typeof narration !== 'string' || !narration.trim()) throw new Error('Missing narration.');
  return createHash('sha256').update(JSON.stringify({voiceId, model, narration})).digest('hex');
}

export function upsertCacheIndex(index, entry) {
  if(!entry || typeof entry.key !== 'string' || !DIR.test(entry.relativeDir || '')) throw new Error('Invalid cache entry.');
  const entries = Array.isArray(index?.entries) ? index.entries.filter(item => item.key !== entry.key) : [];
  entries.push(entry);
  return {schemaVersion: 1, entries};
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Returns a verified local directory or null. Never calls a provider.
export function lookupNarrationCache(outputRoot, request) {
  const indexPath = path.join(outputRoot, 'narration-cache.json');
  if(!existsSync(indexPath)) return null;
  const index = readJson(indexPath);
  const key = narrationCacheKey(request);
  const entry = index.entries?.find(item => item.key === key);
  if(!entry) return null;
  if(!DIR.test(entry.relativeDir || '') || entry.voiceId !== request.voiceId || entry.model !== request.model || entry.narrationHash !== narrationHash(request.narration) || entry.costCapINR !== 0) return null;
  const dir = path.join(outputRoot, entry.relativeDir);
  const audio = path.join(dir, 'narration.mp3');
  if(!existsSync(audio) || !existsSync(path.join(dir, 'alignment.json'))) return null;
  const attempt = readJson(path.join(dir, 'attempt.json'));
  const alignment = readJson(path.join(dir, 'alignment.json'));
  if(attempt.state !== 'succeeded' || attempt.voiceId !== request.voiceId || attempt.model !== request.model || attempt.costCapINR !== 0) return null;
  if(alignment.narrationHash !== narrationHash(request.narration) || alignment.alignment?.characters?.join('') !== request.narration) return null;
  return dir;
}
