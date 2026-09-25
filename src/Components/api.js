// src/Components/api.js

const API_URL = import.meta.env.VITE_NEST_API_URL;

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

// ─── Refresh deduplication ─────────────────────────────────────────
// Concurrent 401s must share a single refresh call. If two requests
// both hit /auth/refresh at once, the first rotates the token and the
// second revokes the session (server treats the stale token as theft).
let refreshInFlight = null;

// ─── Hard logout helper ────────────────────────────────────────────
const forceLogout = (setAuthData) => {
  setAuthData?.(null);
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
  } catch {
    /* noop */
  }
  // replace (not href) so the login page doesn't get a back-button entry
  // pointing at the now-broken dashboard state
  window.location.replace('/');
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
 *   - refreshes the access token on 401 (using /auth/refresh or /auth/admin/refresh
 *     depending on the account type), deduplicating concurrent refreshes
 *   - on 403, parses the backend error and attaches `status`, `code`, `details`
 *     to the thrown Error so callers can branch on it WITHOUT logging the user out
 *   - on other non-ok statuses, attaches `status`, `code`, `details` too
 *
 * Account type for refresh routing is resolved from (in order):
 *   1. authHint.type, if provided by the caller
 *   2. the `type` claim inside the access token itself
 *   3. 'user' as a last-resort default
 *
 * Returns the raw Response on success (ok === true).
 * Throws on refresh failure (session expired) or on any non-ok response.
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

  let response = await makeRequest(token);

  if (response.status === 401) {
    const hintedType = authHint?.type;
    const tokenType = token ? decodeJwtPayload(token)?.type : null;
    const accountType = hintedType || tokenType || 'user';
    const refreshPath =
      accountType === 'admin' ? '/auth/admin/refresh' : '/auth/refresh';

    try {
      // ★ Deduplicate: if a refresh is already in flight, await it
      // instead of firing a second one (which would revoke the session).
      if (!refreshInFlight) {
        refreshInFlight = (async () => {
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
          // Release the lock as soon as the promise settles
          refreshInFlight = null;
        });
      }

      const newToken = await refreshInFlight;

      setAuthData?.((prev) => ({ ...prev, token: newToken }));
      response = await makeRequest(newToken);

      // ★ If the retry itself still 401s, the new token is no good.
      // Session is likely revoked server-side (restart, admin revocation,
      // rotation race we didn't catch). Hard logout so the user isn't
      // left staring at a blank dashboard.
      if (response.status === 401) {
        forceLogout(setAuthData);
        throw sessionExpiredError();
      }
    } catch (error) {
      if (error?.code === 'AUTH_SESSION_EXPIRED') throw error;
      forceLogout(setAuthData);
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
    const err = new Error(body?.message || `Request failed (${response.status})`);
    err.status = response.status;
    err.code = body?.code;
    err.details = body?.details;
    err.path = body?.path;
    throw err;
  }

  return response;
};