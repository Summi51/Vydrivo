export const DRAFT_KEY = 'vydrivo.project-draft';
export const TOPIC_LIMIT = 10000;

export function draftFromTopic(topic) {
  const clean = String(topic || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { ok: false, error: 'Add a topic or a few notes to start.' };
  if (clean.length > TOPIC_LIMIT) return { ok: false, error: 'Keep the topic under 10,000 characters.' };
  const title = clean.length > 72 ? `${clean.slice(0, 69).trimEnd()}...` : clean;
  return {
    ok: true,
    draft: {
      title,
      topic: clean,
      createdAt: new Date().toISOString(),
      status: 'draft',
      persistence: 'browser-only',
    },
  };
}

export function saveDraft(storage, draft) {
  storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export function readDraft(storage) {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.topic !== 'string' || !parsed.topic.trim()) return null;
  return parsed;
}
