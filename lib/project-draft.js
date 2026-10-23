export const DRAFT_KEY = 'vydrivo.project-draft';
export const TOPIC_LIMIT = 10000;

export function draftFromTopic(topic, options = {}) {
  const clean = String(topic || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { ok: false, error: 'Add a topic or a few notes to start.' };
  if (clean.length > TOPIC_LIMIT) return { ok: false, error: 'Keep the topic under 10,000 characters.' };
  const title = clean.length > 72 ? `${clean.slice(0, 69).trimEnd()}...` : clean;
  const format = typeof options.format === 'string' && options.format.trim()
    ? options.format.trim().slice(0, 80)
    : 'Talking head / explainer';
  const formatId = typeof options.formatId === 'string' && options.formatId.trim()
    ? options.formatId.trim().slice(0, 40)
    : 'talking-head';
  const targetSeconds = Number.isFinite(Number(options.targetSeconds))
    ? Math.min(90, Math.max(60, Math.round(Number(options.targetSeconds))))
    : 90;
  const targetLabel = typeof options.targetLabel === 'string' && options.targetLabel.trim()
    ? options.targetLabel.trim().slice(0, 20)
    : `${targetSeconds}s`;
  const aspect = options.aspect === '16:9' ? '16:9' : '9:16';
  const createdAt = new Date().toISOString();
  return {
    ok: true,
    draft: {
      title,
      topic: clean,
      format,
      formatId,
      targetSeconds,
      targetLabel,
      aspect,
      createdAt,
      updatedAt: createdAt,
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

export function removeDraft(storage) {
  storage.removeItem(DRAFT_KEY);
}
