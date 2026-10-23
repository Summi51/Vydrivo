async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Refresh the page and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

export async function storyboardRequest(method, body) {
  const token = await csrfToken();
  const response = await fetch('/api/v1/storyboards', {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Storyboard request failed.');
  return payload.data;
}
