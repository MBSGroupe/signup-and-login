import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import { jsonResponse } from '../test/utils';

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Forgot password page', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );
  const button = () => screen.getByRole('button');

  it('only enables sending for a valid-looking email', async () => {
    renderPage();
    const user = userEvent.setup();
    expect(button()).toBeDisabled();
    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'amel@');
    expect(button()).toBeDisabled();
    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'example.test');
    expect(button()).toBeEnabled();
  });

  it('sends the trimmed email, shows the neutral answer, then a 60 s cooldown', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetch.mockResolvedValue(jsonResponse(201, { success: true, message: 'If that email exists, a reset link has been sent.' }));
    renderPage();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByPlaceholderText('vous@exemple.com'), '  amel@example.test  ');
    await user.click(button());

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'amel@example.test' });
    expect(await screen.findByText('If that email exists, a reset link has been sent.')).toBeInTheDocument();
    expect(button()).toHaveTextContent('Réessayer dans 60s');
    expect(button()).toBeDisabled();

    await act(async () => { vi.advanceTimersByTime(61_000); });
    expect(button()).toHaveTextContent('Envoyer le lien de réinitialisation');
    expect(button()).toBeEnabled();
  });

  it.each([
    [429, 'Trop de tentatives. Veuillez réessayer dans une minute.', {}],
    [400, 'email must be an email', { message: 'email must be an email' }],
    [500, 'Une erreur est survenue. Veuillez réessayer.', {}],
  ])('a %i shows "%s"', async (status, text, body) => {
    fetch.mockResolvedValue(jsonResponse(status, body));
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'amel@example.test');
    await user.click(button());
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('regression: leaving the page stops its timer (it used to leak an interval per visit)', () => {
    vi.useFakeTimers();
    const { unmount } = renderPage();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Reset password page', () => {
  const renderPage = (path = '/reset-password?token=abc') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<p>page: login</p>} />
        </Routes>
      </MemoryRouter>,
    );
  const input = (name) => document.querySelector(`input[name="${name}"]`);
  const submit = () => screen.getByRole('button', { name: /réinitialiser le mot de passe/i });

  it('without a token: says so and cannot submit', () => {
    renderPage('/reset-password');
    expect(screen.getByText('Jeton invalide ou manquant.')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('shows each password rule live and only enables submit when all pass and both match', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(input('newPassword'), 'abc');
    expect(screen.getByText('Au moins 8 caractères')).toHaveClass('text-[#64748B]');
    expect(screen.getByText('Au moins une lettre minuscule')).toHaveClass('text-emerald-400');
    expect(submit()).toBeDisabled();

    await user.clear(input('newPassword'));
    await user.type(input('newPassword'), 'Brand#New9');
    await user.type(input('confirmNewPassword'), 'Brand#New8');
    await user.tab();
    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
    expect(submit()).toBeDisabled();

    await user.clear(input('confirmNewPassword'));
    await user.type(input('confirmNewPassword'), 'Brand#New9');
    expect(submit()).toBeEnabled();
  });

  const fill = async ({ fakeTimers = false } = {}) => {
    const user = userEvent.setup(fakeTimers ? { advanceTimers: vi.advanceTimersByTime } : {});
    await user.type(input('newPassword'), 'Brand#New9');
    await user.type(input('confirmNewPassword'), 'Brand#New9');
    await user.click(submit());
  };

  it('success: sends token + both passwords, then goes to the login page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetch.mockResolvedValue(jsonResponse(201, { success: true }));
    renderPage();
    await fill({ fakeTimers: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token: 'abc', newPassword: 'Brand#New9', confirmPassword: 'Brand#New9' });
    expect(await screen.findByText(/réinitialisé avec succès/)).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(screen.getByText('page: login')).toBeInTheDocument();
  });

  it.each([
    [400, '❌ Lien invalide ou expiré.', { message: 'Lien invalide ou expiré.' }],
    [400, '❌ newPassword too weak • mismatch', { message: ['newPassword too weak', 'mismatch'] }],
    [429, 'Trop de tentatives. Veuillez réessayer dans une minute.', {}],
    [500, '❌ Échec de la réinitialisation du mot de passe.', {}],
  ])('a %i shows "%s" and keeps the form', async (status, text, body) => {
    fetch.mockResolvedValue(jsonResponse(status, body));
    renderPage();
    await fill();
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(submit()).toBeInTheDocument();
  });

  it('a network failure says so', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    await fill();
    expect(await screen.findByText('⚠️ Erreur réseau. Veuillez réessayer.')).toBeInTheDocument();
  });
});
