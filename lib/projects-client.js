export const CURRENT_PROJECT_KEY = 'vydrivo.current-project-id';

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Refresh the page and try again.');
  const payload = await response.json();
  return payload.data.csrfToken;
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Project request failed.');
  }
  return payload.data;
}

export async function listProjects({ limit = 20, offset = 0 } = {}) {
  return request(`/api/v1/projects?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`);
}

export async function getProject(id) {
  const data = await request(`/api/v1/projects/${encodeURIComponent(id)}`);
  return data.project;
}

export async function createProject(input) {
  const data = await request('/api/v1/projects', { method: 'POST', body: input });
  return data.project;
}

export async function updateProject(id, patch) {
  const data = await request(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  return data.project;
}

export async function deleteProject(id) {
  return request(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function saveProjectStoryboard(id, { storyboard, approved = false }) {
  const data = await request(`/api/v1/projects/${encodeURIComponent(id)}/storyboard`, {
    method: 'PUT',
    body: { storyboard, approved },
  });
  return data.project;
}

export async function suggestIdeas(id, input) {
  return request(`/api/v1/projects/${encodeURIComponent(id)}/ideas`, {
    method: 'POST',
    body: input,
  });
}

export function projectStoryboardSummary(project) {
  const scenes = project?.storyboard?.scenes;
  const sceneCount = Array.isArray(scenes) ? scenes.length : 0;
  const seconds = Array.isArray(scenes)
    ? scenes.reduce((total, scene) => total + (Number(scene.estimatedSeconds) || 0), 0)
    : 0;
  return {
    sceneCount,
    seconds,
    state: project?.review?.approved
      ? 'approved'
      : ['generating', 'ready', 'failed'].includes(project?.status)
        ? project.status
        : sceneCount
          ? 'planning'
          : 'draft',
  };
}
