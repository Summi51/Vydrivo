import { planStoryboard } from '../prototype/planner.mjs';
import { storyboardHash, validateStoryboard } from '../prototype/storyboard.mjs';
import { STORYBOARD_KEY } from './storyboard-storage.js';
import { planningConfig } from './ai-config.js';

export { STORYBOARD_KEY };

const TOPIC_LIMIT = 1000;
const NOTES_LIMIT = 12000;

export function splitTopic(topic) {
  const clean = String(topic || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { ok: false, error: 'Add a topic before drafting a storyboard.' };
  if (clean.length <= TOPIC_LIMIT) return { ok: true, topic: clean, notes: '' };
  if (clean.length > TOPIC_LIMIT + NOTES_LIMIT) {
    return { ok: false, error: 'Keep the topic and notes under 13,000 characters.' };
  }
  const cut = clean.lastIndexOf(' ', TOPIC_LIMIT);
  const splitAt = cut > 200 ? cut : TOPIC_LIMIT;
  return { ok: true, topic: clean.slice(0, splitAt).trim(), notes: clean.slice(splitAt).trim() };
}

export function publicStoryboard(board, { model, reviewed = false } = {}) {
  const valid = validateStoryboard(board);
  const hash = storyboardHash(valid);
  const seconds = valid.scenes.reduce((sum, scene) => sum + scene.estimatedSeconds, 0);
  return {
    storyboard: valid,
    review: { approved: reviewed === true, storyboardHash: hash },
    model: typeof model === 'string' ? model : null,
    seconds,
    sceneCount: valid.scenes.length,
    persistence: 'browser-only',
    videoGeneration: 'not-connected',
  };
}

export async function draftStoryboard(topic, env = process.env, fetchImpl = fetch) {
  const split = splitTopic(topic);
  if (!split.ok) {
    const error = new Error(split.error);
    error.status = 422;
    error.code = 'VALIDATION_FAILED';
    throw error;
  }
  const config = planningConfig(env);
  try {
    const board = await planStoryboard({ ...split, ...config, fetchImpl });
    return publicStoryboard(board, { model: config.model, reviewed: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storyboard draft failed.';
    const wrapped = new Error(message);
    wrapped.status = /HTTP 429|HTTP 503|did not respond|timeout/i.test(message) ? 503 : 422;
    wrapped.code = wrapped.status === 503 ? 'PLANNER_UNAVAILABLE' : 'PLANNER_REJECTED';
    throw wrapped;
  }
}

export function reviewStoryboard(board, approved) {
  if (approved !== true) {
    const error = new Error('Review the scenes, then approve this exact draft.');
    error.status = 422;
    error.code = 'REVIEW_REQUIRED';
    throw error;
  }
  try {
    return publicStoryboard(board, { reviewed: true });
  } catch (error) {
    const wrapped = new Error(error instanceof Error ? error.message : 'Storyboard is invalid.');
    wrapped.status = 422;
    wrapped.code = 'VALIDATION_FAILED';
    throw wrapped;
  }
}
