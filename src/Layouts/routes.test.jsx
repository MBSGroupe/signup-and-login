import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import { admin, member, renderAt, superAdmin, userContextValue } from '../test/utils';

const secret = <p>page: secret</p>;

describe('ProtectedRoute', () => {
  it('waits for the session to load before deciding', () => {
    const { container } = renderAt(<ProtectedRoute>{secret}</ProtectedRoute>, { context: userContextValue({ loading: true }) });
    expect(container).toBeEmptyDOMElement();
  });

  it('sends anonymous visitors to the login page', () => {
    renderAt(<ProtectedRoute>{secret}</ProtectedRoute>);
    expect(screen.getByText('page: login')).toBeInTheDocument();
  });

  it('a user object without a token is not logged in', () => {
    renderAt(<ProtectedRoute>{secret}</ProtectedRoute>, { context: userContextValue({ user: member, token: null }) });
    expect(screen.getByText('page: login')).toBeInTheDocument();
  });

  it('lets a logged-in member through when no grade or role is required', () => {
    renderAt(<ProtectedRoute>{secret}</ProtectedRoute>, { context: userContextValue({ user: member }) });
    expect(screen.getByText('page: secret')).toBeInTheDocument();
  });

  it.each([
    ['admin', member, false],
    ['admin', admin, true],
    [['admin', 'super_admin'], superAdmin, true],
    ['super_admin', admin, false],
  ])('requiredGrade %j for %o → allowed: %s', (requiredGrade, user, allowed) => {
    renderAt(<ProtectedRoute requiredGrade={requiredGrade}>{secret}</ProtectedRoute>, { context: userContextValue({ user }) });
    expect(screen.getByText(allowed ? 'page: secret' : 'page: login')).toBeInTheDocument();
  });

  it('requiredRole checks the role name', () => {
    renderAt(<ProtectedRoute requiredRole="sec_cnoa">{secret}</ProtectedRoute>, { context: userContextValue({ user: admin }) });
    expect(screen.getByText('page: secret')).toBeInTheDocument();
  });

  it('a missing role is refused', () => {
    renderAt(<ProtectedRoute requiredRole={['cloa_admin']}>{secret}</ProtectedRoute>, { context: userContextValue({ user: admin }) });
    expect(screen.getByText('page: login')).toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  it('sends anonymous visitors to the login page', () => {
    renderAt(<AdminRoute>{secret}</AdminRoute>);
    expect(screen.getByText('page: login')).toBeInTheDocument();
  });

  it('a member is sent to their profile', () => {
    renderAt(<AdminRoute>{secret}</AdminRoute>, { context: userContextValue({ user: member }) });
    expect(screen.getByText('page: profile')).toBeInTheDocument();
  });

  it.each([admin, superAdmin])('%o is let through', (user) => {
    renderAt(<AdminRoute>{secret}</AdminRoute>, { context: userContextValue({ user }) });
    expect(screen.getByText('page: secret')).toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    const { container } = renderAt(<AdminRoute>{secret}</AdminRoute>, { context: userContextValue({ user: admin, loading: true }) });
    expect(container).toBeEmptyDOMElement();
  });
});
