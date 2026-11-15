// Two-account RLS isolation test through the Supabase REST API.
// Requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY
// in .env.local. The service-role key is used only to create/delete temporary
// users; never print it, commit it or expose it to the browser.
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishable || !service) {
  console.error('Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const adminHeaders = {
  apikey: service,
  Authorization: `Bearer ${service}`,
  'Content-Type': 'application/json',
};
const userHeaders = (token) => ({
  apikey: publishable,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

function assert(condition, label) {
  if (!condition) throw new Error(`RLS isolation failed: ${label}`);
}

async function read(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function admin(path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...adminHeaders, ...(options.headers || {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  return { ok: response.ok, status: response.status, body: await read(response) };
}

async function signIn(email, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishable, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const body = await read(response);
  if (!response.ok || !body?.access_token) throw new Error(`Could not sign in temporary user: ${body?.msg || body?.error_description || response.status}`);
  return body.access_token;
}

async function rest(path, token, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...userHeaders(token), ...(options.headers || {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  return { ok: response.ok, status: response.status, body: await read(response) };
}

const stamp = Date.now();
const users = [];
try {
  for (const label of ['a', 'b']) {
    const email = `rls-test-${stamp}-${label}@example.invalid`;
    const password = `Rls-${randomUUID()}`;
    const created = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!created.ok || !created.body?.id) throw new Error(`Could not create temporary user ${label}: ${created.body?.msg || created.status}`);
    users.push({ id: created.body.id, email, password, token: await signIn(email, password) });
  }

  const projects = {};
  for (const [index, user] of users.entries()) {
    const created = await rest('/rest/v1/projects', user.token, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ title: `RLS API test ${index + 1}`, topic: 'Temporary RLS isolation project.' }),
    });
    assert(created.ok && Array.isArray(created.body) && created.body[0]?.id, `owner ${index + 1} could not create a project`);
    projects[user.id] = created.body[0].id;
  }

  const [a, b] = users;

  const listA = await rest('/rest/v1/projects?select=id', a.token);
  assert(listA.ok && Array.isArray(listA.body) && listA.body.length === 1 && listA.body[0].id === projects[a.id], 'owner A sees the wrong project set');

  const getB = await rest(`/rest/v1/projects?select=id&id=eq.${projects[b.id]}`, a.token);
  assert(getB.ok && Array.isArray(getB.body) && getB.body.length === 0, 'owner A can read owner B project');

  const patchB = await rest(`/rest/v1/projects?id=eq.${projects[b.id]}`, a.token, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ title: 'hacked' }),
  });
  assert(patchB.ok && Array.isArray(patchB.body) && patchB.body.length === 0, 'owner A can update owner B project');

  const deleteB = await rest(`/rest/v1/projects?id=eq.${projects[b.id]}`, a.token, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
  assert(deleteB.ok && Array.isArray(deleteB.body) && deleteB.body.length === 0, 'owner A can delete owner B project');

  const insertB = await rest('/rest/v1/projects', a.token, {
    method: 'POST',
    body: JSON.stringify({ owner_id: b.id, title: 'bad insert', topic: 'bad insert' }),
  });
  assert(!insertB.ok, 'owner A can insert a project for owner B');

  const listB = await rest('/rest/v1/projects?select=id', b.token);
  assert(listB.ok && Array.isArray(listB.body) && listB.body.length === 1 && listB.body[0].id === projects[b.id], 'owner B sees the wrong project set');

  const getA = await rest(`/rest/v1/projects?select=id&id=eq.${projects[a.id]}`, b.token);
  assert(getA.ok && Array.isArray(getA.body) && getA.body.length === 0, 'owner B can read owner A project');

  const patchA = await rest(`/rest/v1/projects?id=eq.${projects[a.id]}`, b.token, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ title: 'hacked' }),
  });
  assert(patchA.ok && Array.isArray(patchA.body) && patchA.body.length === 0, 'owner B can update owner A project');

  const deleteA = await rest(`/rest/v1/projects?id=eq.${projects[a.id]}`, b.token, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
  assert(deleteA.ok && Array.isArray(deleteA.body) && deleteA.body.length === 0, 'owner B can delete owner A project');

  const anon = await fetch(`${url}/rest/v1/projects?select=id`, {
    headers: { apikey: publishable, Authorization: `Bearer ${publishable}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const anonBody = await read(anon);
  assert(!anon.ok || (Array.isArray(anonBody) && anonBody.length === 0), 'anonymous role can read projects');

  console.log('RLS isolation passed');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const user of users) {
    await admin(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' });
  }
}
