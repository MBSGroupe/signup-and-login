import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { UserContext } from '../Context/dataCont';
import { admin, userContextValue } from '../test/utils';

// fetchWithRefresh is tested on its own (api.test.js); here it is mocked to
// check what the hooks do with its results.
vi.mock('../Components/api', () => ({ fetchWithRefresh: vi.fn() }));
const toasts = { showError: vi.fn(), showWarning: vi.fn() };
vi.mock('../Context/ErrorContext', () => ({ useError: () => toasts }));

const { fetchWithRefresh } = await import('../Components/api');
const { useApi } = await import('./useApi');
const { default: usePermissions, clearPermissionCache } = await import('./usePermissions');

const wrapperFor = (context) => ({ children }) => <UserContext.Provider value={context}>{children}</UserContext.Provider>;
const apiError = (status, extra = {}) => Object.assign(new Error(extra.message ?? `HTTP ${status}`), { status, ...extra });

beforeEach(() => {
  fetchWithRefresh.mockReset();
  toasts.showError.mockReset();
  toasts.showWarning.mockReset();
  clearPermissionCache();
});

describe('useApi', () => {
  const setup = () => {
    const setAuthData = vi.fn();
    const { result } = renderHook(() => useApi(), { wrapper: wrapperFor(userContextValue({ user: admin, token: 'T', setAuthData })) });
    return { api: result.current, setAuthData };
  };

  it('prefixes the API url, sends the token, parses JSON, returns null for 204 / empty bodies', async () => {
    const { api, setAuthData } = setup();
    fetchWithRefresh.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    await expect(api.post('/things', { a: 1 })).resolves.toEqual({ id: 1 });
    expect(fetchWithRefresh).toHaveBeenCalledWith('http://api.test/things', { method: 'POST', body: '{"a":1}' }, 'T', setAuthData, { type: 'admin' });

    fetchWithRefresh.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.del('/things/1')).resolves.toBeNull();
    fetchWithRefresh.mockResolvedValueOnce(new Response('', { status: 200 }));
    await expect(api.get('https://other.test/x')).resolves.toBeNull();
    expect(fetchWithRefresh.mock.calls[2][0]).toBe('https://other.test/x');
  });

  it.each([
    ['401: silent (the redirect is the feedback)', apiError(401), null, null],
    ['400: warning', apiError(400, { message: 'Montant invalide' }), 'showWarning', 'Montant invalide'],
    ['403: error, no logout', apiError(403, { message: 'Refusé' }), 'showError', 'Refusé'],
    ['403 field denied: names the fields', apiError(403, { code: 'AUTHZ_FIELD_DENIED', details: { fields: ['grade', 'credit'] } }), 'showError', 'Champs non autorisés : grade, credit'],
    ['500: error', apiError(500, { message: 'Erreur serveur' }), 'showError', 'Erreur serveur'],
  ])('%s', async (_label, error, toast, text) => {
    const { api } = setup();
    fetchWithRefresh.mockRejectedValueOnce(error);
    await expect(api.get('/x')).rejects.toBe(error);
    if (toast) expect(toasts[toast]).toHaveBeenCalledWith(text);
    else expect([...toasts.showError.mock.calls, ...toasts.showWarning.mock.calls]).toEqual([]);
  });
});

describe('usePermissions', () => {
  const body = {
    success: true,
    permissions: { canUpdate: ['name'], canView: ['name', 'email'], canCreate: 'oops', operations: { read: true }, fieldConfigs: { name: { label: 'Nom' } } },
  };
  const render = (args = ['u9'], context = userContextValue({ user: admin, token: 'T-abcdefghijkl' })) =>
    renderHook(() => usePermissions(...args), { wrapper: wrapperFor(context) });

  it('loads the target\'s permissions and normalises them', async () => {
    fetchWithRefresh.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const { result } = render();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current).toMatchObject({ canUpdate: ['name'], canView: ['name', 'email'], canCreate: [], operations: { read: true }, configs: { name: { label: 'Nom' } }, error: null });
    expect(fetchWithRefresh.mock.calls[0][0]).toBe('http://api.test/permissions/user/u9/editable-fields?model=User');
  });

  it('is cached per target, model and session', async () => {
    fetchWithRefresh.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }));
    const first = render();
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    const again = render();
    expect(again.result.current.loaded).toBe(true);
    const otherSession = render(['u9'], userContextValue({ user: admin, token: 'T-zzzzzzzzzzzz' }));
    await waitFor(() => expect(otherSession.result.current.loaded).toBe(true));
    expect(fetchWithRefresh).toHaveBeenCalledTimes(2);
  });

  it('without a target or a session nothing is fetched', () => {
    const noTarget = render([null]);
    const anon = render(['u9'], userContextValue());
    expect(noTarget.result.current).toMatchObject({ loading: false, loaded: false });
    expect(anon.result.current.loaded).toBe(false);
    expect(fetchWithRefresh).not.toHaveBeenCalled();
  });

  it('an unknown kind never hits an endpoint; a failure is reported, not "loaded"', async () => {
    const bad = render(['u9', 'User', 'deletable']);
    await waitFor(() => expect(bad.result.current.error?.message).toBe('Invalid permissions kind: deletable'));
    expect(fetchWithRefresh).not.toHaveBeenCalled();

    fetchWithRefresh.mockRejectedValueOnce(apiError(403, { message: 'Refusé' }));
    const denied = render(['u7']);
    await waitFor(() => expect(denied.result.current.error?.message).toBe('Refusé'));
    expect(denied.result.current.loaded).toBe(false);
  });
});
