import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '../Context/dataCont';
import LoginForm from './Login';
import { jsonResponse, userContextValue } from '../test/utils';

// The member login page: success routing by grade, lockout countdown
// (from the 401 message or a 429), messages from ?reason=, network errors.

const renderLogin = (path = '/') => {
  const setAuthData = vi.fn();
  render(
    <UserContext.Provider value={userContextValue({ setAuthData })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/auth/profile" element={<p>page: profile</p>} />
          <Route path="/dash" element={<p>page: dash</p>} />
        </Routes>
      </MemoryRouter>
    </UserContext.Provider>,
  );
  return { setAuthData };
};

const fillAndSubmit = async (email = 'amel@example.test', password = 'Secret#123') => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('nom.prenom@elmi3mari.dz'), email);
  await user.type(screen.getByPlaceholderText('••••••••'), password);
  await user.click(screen.getByRole('button', { name: /se connecter/i }));
};

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe('Login page', () => {
  it('posts the credentials with cookies and sends a member to their profile', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { success: true, data: { user: { id: 'u1', grade: 'user' }, accessToken: 'T' } }));
    const { setAuthData } = renderLogin();
    await fillAndSubmit();

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://api.test/auth/login');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(init.body)).toEqual({ email: 'amel@example.test', password: 'Secret#123' });
    expect(setAuthData).toHaveBeenCalledWith({ user: { id: 'u1', grade: 'user' }, token: 'T' });
    expect(await screen.findByText('page: profile')).toBeInTheDocument();
  });

  it('sends an admin to the dashboard (response wrapped by the interceptor)', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { success: true, data: { data: { user: { id: 'a1', grade: 'admin' }, accessToken: 'T' } } }));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText('page: dash')).toBeInTheDocument();
  });

  it('wrong credentials: shows the server message and clears the password', async () => {
    fetch.mockResolvedValue(jsonResponse(401, { success: false, message: 'Email ou mot de passe incorrect' }));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText('Email ou mot de passe incorrect')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('');
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeEnabled();
  });

  it.each([
    ['the French lock message', 'Trop de tentatives échouées. Compte bloqué pendant 1 minute.', '1:00'],
    ['the English lock message', 'Account locked for 30 seconds, please retry later', '0:30'],
  ])('a lock in %s disables the form with a countdown that survives a reload', async (_label, message, shown) => {
    fetch.mockResolvedValue(jsonResponse(401, { success: false, message }));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByRole('button', { name: new RegExp(`Bloqué \\(${shown}\\)`) })).toBeDisabled();
    expect(screen.getByPlaceholderText('nom.prenom@elmi3mari.dz')).toBeDisabled();
    expect(Number(localStorage.getItem('loginLockUntil'))).toBeGreaterThan(Date.now());
  });

  it('the countdown ends and the form comes back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem('loginLockUntil', String(Date.now() + 2000));
    renderLogin();
    expect(screen.getByRole('button', { name: /Bloqué \(0:02\)/ })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeEnabled();
    expect(localStorage.getItem('loginLockUntil')).toBeNull();
    vi.useRealTimers();
  });

  it('a 429 (rate limit) locks for the time the server gives', async () => {
    fetch.mockResolvedValue(jsonResponse(429, { message: 'Trop de requêtes', data: { remainingTime: 90 } }));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByRole('button', { name: /Bloqué \(1:30\)/ })).toBeDisabled();
  });

  it('a network failure says so', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText(/Erreur réseau/)).toBeInTheDocument();
  });

  it.each([
    ['/?reason=session-expired', 'Votre session a expiré. Veuillez vous reconnecter.'],
    ['/?reason=password-changed', /Votre mot de passe a été modifié/],
    ['/?verified=true', /Votre email a été vérifié/],
  ])('%s shows its message', (path, text) => {
    renderLogin(path);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('an unknown reason shows nothing', () => {
    renderLogin('/?reason=<script>');
    expect(screen.queryByText('<script>')).not.toBeInTheDocument();
  });
});
