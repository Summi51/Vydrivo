export function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
}
