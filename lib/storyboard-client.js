import { apiRequest } from './session-fetch.js';

export async function storyboardRequest(method, body) {
  const response = await apiRequest('/api/v1/storyboards', { method, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Storyboard request failed.');
  return payload.data;
}
