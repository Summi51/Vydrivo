const KEY_PREFIX = 'vydrivo.idea-directions.';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SUGGESTIONS = 5;

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function key(projectId) {
  return `${KEY_PREFIX}${projectId}`;
}

function isSuggestion(value) {
  return Boolean(value)
    && typeof value.title === 'string'
    && typeof value.hook === 'string'
    && typeof value.angle === 'string'
    && Array.isArray(value.outline)
    && value.outline.length > 0
    && value.outline.every((line) => typeof line === 'string')
    && typeof value.visualDirection === 'string'
    && typeof value.sampleScenePrompt === 'string';
}

export function loadIdeaSuggestions(projectId, { storage, now = Date.now() } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!projectId || !store) return null;
  try {
    const raw = store.getItem(key(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== 'number' || now - parsed.savedAt > MAX_AGE_MS) {
      store.removeItem(key(projectId));
      return null;
    }
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(isSuggestion).slice(0, MAX_SUGGESTIONS)
      : [];
    if (!suggestions.length) {
      store.removeItem(key(projectId));
      return null;
    }
    return {
      suggestions,
      sourceTopic: typeof parsed.sourceTopic === 'string' ? parsed.sourceTopic : '',
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveIdeaSuggestions(projectId, { suggestions, sourceTopic = '' } = {}, { storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!projectId || !store || !Array.isArray(suggestions)) return;
  const clean = suggestions.filter(isSuggestion).slice(0, MAX_SUGGESTIONS);
  if (!clean.length) return;
  try {
    store.setItem(key(projectId), JSON.stringify({
      suggestions: clean,
      sourceTopic: String(sourceTopic || ''),
      savedAt: Date.now(),
    }));
  } catch {
    // Storage can be full or unavailable; suggestions still work for this view.
  }
}

export function clearIdeaSuggestions(projectId, { storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!projectId || !store) return;
  try {
    store.removeItem(key(projectId));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
