export const STORYBOARD_KEY = 'vydrivo.storyboard-draft';

export function readStoryboard(storage) {
  const raw = storage.getItem(STORYBOARD_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.storyboard?.scenes) || !parsed.storyboard.scenes.length) return null;
  return parsed;
}

export function saveStoryboard(storage, value) {
  storage.setItem(STORYBOARD_KEY, JSON.stringify(value));
  return value;
}

export function removeStoryboard(storage) {
  storage.removeItem(STORYBOARD_KEY);
}
