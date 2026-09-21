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

/**
 * Wrapper around fetch that:
 *   - attaches the Authorization header
 *   - refreshes the access token on 401 (using /auth/refresh or /auth/admin/refresh
 *     depending on the account type)
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
    const refreshPath = accountType === 'admin' ? '/auth/admin/refresh' : '/auth/refresh';

    try {
      const refreshResponse = await fetch(`${API_URL}${refreshPath}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newToken = data?.data?.accessToken || data?.accessToken;
        if (newToken) {
          setAuthData?.((prev) => ({ ...prev, token: newToken }));
          response = await makeRequest(newToken);
        }
      } else {
        setAuthData?.(null);
        window.location.href = '/';
        const err = new Error('Session expired');
        err.status = 401;
        err.code = 'AUTH_SESSION_EXPIRED';
        throw err;
      }
    } catch (error) {
      if (error?.code === 'AUTH_SESSION_EXPIRED') throw error;
      setAuthData?.(null);
      window.location.href = '/';
      const err = new Error('Session expired');
      err.status = 401;
      err.code = 'AUTH_SESSION_EXPIRED';
      throw err;
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