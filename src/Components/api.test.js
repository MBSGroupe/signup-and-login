// @vitest-environment node
// fetchWithRefresh: token refresh on 401 (deduplicated), hard logout to the
// right login page, and error objects callers branch on.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeJwt, jsonResponse } from '../test/utils';

let fetchWithRefresh;
let location;
let store;

beforeEach(async () => {
  vi.resetModules();
  location = { replace: vi.fn() };
  store = { accessToken: 'x', refreshToken: 'y', authUser: 'z' };
  vi.stubGlobal('window', { location });
  vi.stubGlobal('localStorage', { removeItem: vi.fn((k) => delete store[k]) });
  vi.stubGlobal('fetch', vi.fn());
  ({ fetchWithRefresh } = await import('./api'));
});
afterEach(() => vi.unstubAllGlobals());

const memberToken = fakeJwt({ sub: 'u1', type: 'user' });
const adminToken = fakeJwt({ sub: 'a1', type: 'admin' });
const call = (token = memberToken, setAuthData = vi.fn(), hint) =>
  fetchWithRefresh('http://api.test/things', { method: 'GET' }, token, setAuthData, hint);
const route = (handlers) =>
  fetch.mockImplementation(async (url, init) => {
    for (const [match, respond] of handlers) if (url.includes(match)) return respond(url, init);
    throw new Error(`unexpected fetch ${url}`);
  });

describe('fetchWithRefresh', () => {
  it('sends the bearer token and JSON content type', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: 1 }));
    const res = await call();
    expect(res.status).toBe(200);
    const [, init] = fetch.mock.calls[0];
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' });
  });

  it('on 401 refreshes once, stores the new token and retries', async () => {
    const setAuthData = vi.fn();
    let first = true;
    route([
      ['/auth/refresh', () => jsonResponse(200, { data: { accessToken: 'NEW' } })],
      ['/things', (_u, init) => {
        if (first) { first = false; return jsonResponse(401, {}); }
        return jsonResponse(200, { auth: init.headers.Authorization });
      }],
    ]);
    const res = await call(memberToken, setAuthData);
    expect(await res.json()).toEqual({ auth: 'Bearer NEW' });
    expect(setAuthData.mock.calls[0][0]({ user: 'u' })).toEqual({ user: 'u', token: 'NEW' });
    const refresh = fetch.mock.calls.find(([u]) => u.endsWith('/auth/refresh'));
    expect(refresh[1]).toMatchObject({ method: 'POST', credentials: 'include' });
  });

  it('concurrent 401s share one refresh (a second refresh would revoke the session)', async () => {
    const seen = new Set();
    route([
      ['/auth/refresh', async () => { await new Promise((r) => setTimeout(r, 5)); return jsonResponse(200, { accessToken: 'NEW' }); }],
      ['/things', (_u, init) => {
        const auth = init.headers.Authorization;
        if (auth === `Bearer ${memberToken}`) return jsonResponse(401, {});
        seen.add(auth);
        return jsonResponse(200, {});
      }],
    ]);
    await Promise.all([call(), call(), call()]);
    expect(fetch.mock.calls.filter(([u]) => u.endsWith('/auth/refresh'))).toHaveLength(1);
    expect([...seen]).toEqual(['Bearer NEW']);
  });

  it('admins refresh on the admin endpoint (from the token or the hint)', async () => {
    route([['/auth/admin/refresh', () => jsonResponse(200, { accessToken: 'NEW' })], ['/things', (_u, i) => jsonResponse(i.headers.Authorization === 'Bearer NEW' ? 200 : 401, {})]]);
    await call(adminToken);
    await call('opaque-token', vi.fn(), { type: 'admin' });
    expect(fetch.mock.calls.filter(([u]) => u.endsWith('/auth/admin/refresh'))).toHaveLength(2);
    expect(fetch.mock.calls.some(([u]) => u.endsWith('/auth/refresh'))).toBe(false);
  });

  it.each([
    ['refresh refused', () => jsonResponse(401, {})],
    ['refresh without a token', () => jsonResponse(200, { data: {} })],
    ['refresh network error', () => { throw new TypeError('Failed to fetch'); }],
  ])('%s → logged out to the member login page', async (_label, refresh) => {
    const setAuthData = vi.fn();
    route([['/auth/refresh', refresh], ['/things', () => jsonResponse(401, {})]]);
    await expect(call(memberToken, setAuthData)).rejects.toMatchObject({ status: 401, code: 'AUTH_SESSION_EXPIRED' });
    expect(setAuthData).toHaveBeenCalledWith(null);
    expect(store).toEqual({});
    expect(location.replace).toHaveBeenCalledWith('/?reason=session-expired');
  });

  it('a retry that still gets 401 logs an admin out to the admin login', async () => {
    route([['/auth/admin/refresh', () => jsonResponse(200, { accessToken: 'NEW' })], ['/things', () => jsonResponse(401, {})]]);
    await expect(call(adminToken)).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
    expect(location.replace).toHaveBeenCalledWith('/adminlogin?reason=session-expired');
  });

  it('other errors carry status, code, details and the server message — no logout', async () => {
    fetch.mockResolvedValue(jsonResponse(403, { message: 'Champs refusés', code: 'AUTHZ_FIELD_DENIED', details: { fields: ['grade'] }, path: '/things' }));
    await expect(call()).rejects.toMatchObject({ message: 'Champs refusés', status: 403, code: 'AUTHZ_FIELD_DENIED', details: { fields: ['grade'] } });
    fetch.mockResolvedValue(new Response('<html>oops</html>', { status: 500 }));
    await expect(call()).rejects.toMatchObject({ message: 'Request failed (500)', status: 500 });
    expect(location.replace).not.toHaveBeenCalled();
    expect(fetch.mock.calls.some(([u]) => u.includes('/refresh'))).toBe(false);
  });

  it('a 400 (e.g. wrong current password) is shown, not treated as a dead session', async () => {
    fetch.mockResolvedValue(jsonResponse(400, { message: 'Mot de passe actuel incorrect', code: 'AUTH_INVALID_CREDENTIALS' }));
    await expect(call()).rejects.toMatchObject({ status: 400, message: 'Mot de passe actuel incorrect' });
    expect(location.replace).not.toHaveBeenCalled();
  });
});
