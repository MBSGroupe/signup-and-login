// src/Components/api.js

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Login routes per account type ─────────────────────────────────
// Keep these in sync with your router.
const LOGIN_PATH = {
  user: '/',
  admin: '/adminlogin',
};

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// ─── Refresh deduplication (per refresh path) ──────────────────────
// Concurrent 401s must share a single refresh call. If two requests
// both hit /auth/refresh at once, the first rotates the token and the
// second revokes the session (server treats the stale token as theft).
//
// The dedupe key is the refresh PATH so a user refresh and an admin
// refresh never share a promise.
const refreshInFlightByPath = new Map();

// ─── Hard logout helper ────────────────────────────────────────────
const forceLogout = (setAuthData, accountType = 'user') => {
  setAuthData?.(null);
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
  } catch {
    /* noop */
  }

  const base = LOGIN_PATH[accountType] || LOGIN_PATH.user;
  const target = `${base}?reason=session-expired`;

  // replace (not href) so the login page doesn't get a back-button entry
  // pointing at the now-broken dashboard state
  window.location.replace(target);
};

const sessionExpiredError = () => {
  const err = new Error('Session expired');
  err.status = 401;
  err.code = 'AUTH_SESSION_EXPIRED';
  return err;
};

/**
 * Wrapper around fetch that:
 *   - attaches the Authorization header
 *   - refreshes the access token on 401 (/auth/refresh or /auth/admin/refresh
 *     depending on account type), deduplicating concurrent refreshes
 *   - on refresh failure, hard-logs out AND redirects to the correct login page
 *     (member → "/", admin → "/admin/login")
 *   - on 403, parses the backend error and attaches `status`, `code`, `details`
 *     to the thrown Error so callers can branch on it WITHOUT logging out
 *   - on other non-ok statuses, attaches `status`, `code`, `details` too
 *
 * Account type is resolved once, up-front, from (in order):
 *   1. authHint.type, if provided by the caller
 *   2. the `type` claim inside the access token
 *   3. 'user' as a last-resort default
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {string} token
 * @param {(updater: any) => void} setAuthData
 * @param {{ type?: 'user' | 'admin' }} [authHint]
 */
export const fetchWithRefresh = async (
  url,
  options,
  token,
  setAuthData,
  authHint = {},
) => {
  const makeRequest = (accessToken) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  // ★ Resolve account type ONCE, up-front, so both the refresh routing
  // and the post-refresh hard-logout target the right login page.
  const hintedType = authHint?.type;
  const tokenType = token ? decodeJwtPayload(token)?.type : null;
  const accountType = hintedType || tokenType || 'user';

  const refreshPath =
    accountType === 'admin' ? '/auth/admin/refresh' : '/auth/refresh';

  let response = await makeRequest(token);

  if (response.status === 401) {
    try {
      // ★ Dedupe per refresh path — a user refresh never blocks or
      // hijacks an admin refresh.
      if (!refreshInFlightByPath.has(refreshPath)) {
        const promise = (async () => {
          const refreshResponse = await fetch(`${API_URL}${refreshPath}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!refreshResponse.ok) {
            throw new Error('Refresh failed');
          }

          const data = await refreshResponse.json();
          const newToken = data?.data?.accessToken || data?.accessToken;
          if (!newToken) {
            throw new Error('Refresh returned no token');
          }
          return newToken;
        })().finally(() => {
          refreshInFlightByPath.delete(refreshPath);
        });

        refreshInFlightByPath.set(refreshPath, promise);
      }

      const newToken = await refreshInFlightByPath.get(refreshPath);

      setAuthData?.((prev) => ({ ...prev, token: newToken }));
      response = await makeRequest(newToken);

      // ★ If the retry itself still 401s, the new token is no good.
      // Session is likely revoked server-side (restart, admin revocation,
      // rotation race we didn't catch). Hard logout to the right login.
      if (response.status === 401) {
        forceLogout(setAuthData, accountType);
        throw sessionExpiredError();
      }
    } catch (error) {
      if (error?.code === 'AUTH_SESSION_EXPIRED') throw error;
      forceLogout(setAuthData, accountType);
      throw sessionExpiredError();
    }
  }

  if (!response.ok) {
    let body = {};
    try {
      body = await response.clone().json();
    } catch {
      // non-JSON error body — leave as empty object
    }
    const err = new Error(
      body?.message || `Request failed (${response.status})`,
    );
    err.status = response.status;
    err.code = body?.code;
    err.details = body?.details;
    err.path = body?.path;
    throw err;
  }

  return response;
};