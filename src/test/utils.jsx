// Test helpers for components that read the auth context or the router.
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '../Context/dataCont';

// A JWT-shaped token whose payload the app can decode (signature is fake).
export const fakeJwt = (payload) => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`;
};

export const member = { id: 'u1', grade: 'user', type: 'user', roleName: null, name: 'Amel' };
export const admin = { id: 'a1', grade: 'admin', type: 'admin', roleName: 'sec_cnoa', name: 'Admin' };
export const superAdmin = { id: 's1', grade: 'super_admin', type: 'admin', roleName: null, name: 'Boss' };

// What UserProvider exposes, for a given logged-in user (or none).
export function userContextValue({ user = null, token = user ? 'token' : null, loading = false, setAuthData = () => {} } = {}) {
  const grade = user?.grade;
  return {
    authData: { user, token },
    setAuthData,
    loading,
    isUser: () => grade === 'user',
    isAdmin: () => grade === 'admin',
    isSuperAdmin: () => grade === 'super_admin',
    isAdminOrSuper: () => ['admin', 'super_admin'].includes(grade),
  };
}

// Renders `ui` at `path` inside a router with stub pages for the redirect
// targets, so a test can read where it landed.
export function renderAt(ui, { path = '/private', context = userContextValue() } = {}) {
  return render(
    <UserContext.Provider value={context}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="/" element={<p>page: login</p>} />
          <Route path="/auth/profile" element={<p>page: profile</p>} />
          <Route path="/dash" element={<p>page: dash</p>} />
        </Routes>
      </MemoryRouter>
    </UserContext.Provider>,
  );
}

// A fetch Response stand-in.
export const jsonResponse = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
