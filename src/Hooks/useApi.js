// src/Hooks/useApi.js
import { useState, useCallback } from "react";
import { useError } from "../Context/ErrorContext";
import { fetchWithRefresh } from "../Components/api";
import { useContext } from "react";
import { UserContext } from "../Context/dataCont";

const API_URL = import.meta.env.VITE_NEST_API_URL;

/**
 * useApi — thin wrapper around fetchWithRefresh that:
 *   - auto-attaches the current access token from UserContext
 *   - branches toasts by HTTP status / backend `code`:
 *       400              → showWarning
 *       401              → silent (api.js already redirected) — or a single toast
 *       403 AUTHZ_*      → showError, NO logout
 *       403 FIELD_DENIED → showError with the named fields
 *       other 4xx/5xx    → showError
 *   - returns parsed JSON on success, throws on error (caller decides)
 */
export function useApi() {
  const { authData, setAuthData } = useContext(UserContext);
  const { showError, showWarning } = useError();
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async (method, path, body, options = {}) => {
      setLoading(true);
      const url = path.startsWith("http") ? path : `${API_URL}${path}`;
      const fetchOptions = {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...options,
      };

      try {
        const res = await fetchWithRefresh(
          url,
          fetchOptions,
          authData?.token,
          setAuthData,
          { type: authData?.user?.type },
        );
        // Success path — parse JSON (may be empty for 204)
        if (res.status === 204) return null;
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      } catch (err) {
        const status = err?.status;
        const code = err?.code;
        const message = err?.message || "Une erreur est survenue";

        if (status === 401) {
          // api.js already cleared the session and redirected.
          // No toast — the redirect is the feedback.
          throw err;
        }

        if (status === 403) {
          // Authenticated but not authorized. Never log out.
          if (code === "AUTHZ_FIELD_DENIED" && err?.details?.fields?.length) {
            showError(
              `Champs non autorisés : ${err.details.fields.join(", ")}`,
            );
          } else {
            showError(message);
          }
          throw err;
        }

        if (status === 400) {
          showWarning(message);
          throw err;
        }

        // Everything else (404, 409, 429, 500, network)
        showError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [authData?.token, authData?.user?.type, setAuthData, showError, showWarning],
  );

  // Convenience verbs — keep whatever your components already call.
  const get = useCallback((path, options) => request("GET", path, undefined, options), [request]);
  const post = useCallback((path, body, options) => request("POST", path, body, options), [request]);
  const put = useCallback((path, body, options) => request("PUT", path, body, options), [request]);
  const patch = useCallback((path, body, options) => request("PATCH", path, body, options), [request]);
  const del = useCallback((path, options) => request("DELETE", path, undefined, options), [request]);

  return { get, post, put, patch, del, loading, request };
}