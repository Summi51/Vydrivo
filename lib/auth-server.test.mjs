import assert from 'node:assert/strict';
import test from 'node:test';
import { csrfMatches, issueCsrf, originAllowed, sessionCookies, clearSessionCookies } from './auth-server.js';

function requestWith({ origin = 'http://127.0.0.1:3001', cookie = '', url = 'http://127.0.0.1:3001/api/v1/auth/sign-in' } = {}) {
  return new Request(url, { headers: { origin, cookie } });
}

test('csrf token matches only the bound cookie and a fresh expiry', () => {
  const issued = issueCsrf();
  const request = requestWith({
    cookie: `vydrivo_csrf=${encodeURIComponent(issued.cookieValue)}`,
  });
  request.headers.set('x-csrf-token', issued.token);
  assert.equal(csrfMatches(request), true);
  request.headers.set('x-csrf-token', 'wrong-token-value-not-the-issued-one');
  assert.equal(csrfMatches(request), false);
});

test('origin must match the request origin', () => {
  assert.equal(originAllowed(requestWith()), true);
  assert.equal(originAllowed(requestWith({ origin: 'https://evil.example' })), false);
  assert.equal(originAllowed(requestWith({ origin: '' })), false);
  assert.equal(originAllowed(requestWith({
    origin: 'http://localhost:3000',
    url: 'http://127.0.0.1:3000/api/v1/auth/sign-in',
  })), true);
  assert.equal(originAllowed(requestWith({
    origin: 'http://localhost:3001',
    url: 'http://127.0.0.1:3000/api/v1/auth/sign-in',
  })), false);
});

test('session cookies are httpOnly and host-only, and sign-out clears them', () => {
  const request = requestWith();
  const cookies = sessionCookies(request, { access_token: 'a', refresh_token: 'r', expires_in: 60 });
  assert.equal(cookies.every((cookie) => cookie.options.httpOnly && cookie.options.path === '/'), true);
  assert.equal('domain' in cookies[0].options, false);
  const cleared = clearSessionCookies(request);
  assert.equal(cleared.length, 5);
  assert.equal(cleared.every((cookie) => cookie.options.maxAge === 0), true);
});

test('remember me extends the refresh cookie and marks the session', () => {
  const request = requestWith();
  const cookies = sessionCookies(request, { access_token: 'a', refresh_token: 'r', expires_in: 60 }, false, true);
  const refresh = cookies.find((cookie) => cookie.name === 'vydrivo_refresh');
  const remember = cookies.find((cookie) => cookie.name === 'vydrivo_remember');
  assert.equal(refresh.options.maxAge, 60 * 60 * 24 * 30);
  assert.equal(remember.value, '1');
  assert.equal(remember.options.maxAge, 60 * 60 * 24 * 30);
});
