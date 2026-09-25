// src/Context/dataCont.jsx
import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchWithRefresh } from "../Components/api";

export const UserContext = createContext();

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function UserProvider({ children }) {
  const [authData, setAuthData] = useState({ user: null, token: null });
  const [loading, setLoading] = useState(true);

  // Cache of field-permission bundles, keyed by `${model}:${targetId}:${mode}`.
  // In-memory only — cleared on logout. Not persisted (schemas can change).
  const fieldPermCache = useRef(new Map());

  // ------------------------------------------------------------------
  // Hydrate auth state ONCE on app load
  // ------------------------------------------------------------------
  useEffect(() => {
    const storedAuth = localStorage.getItem("authData");
    if (storedAuth) {
      try {
        setAuthData(JSON.parse(storedAuth));
      } catch (err) {
        console.error("Invalid authData in storage");
        localStorage.removeItem("authData");
      }
    }
    setLoading(false);
  }, []);

  // ------------------------------------------------------------------
  // Persist auth changes AFTER hydration
  // ------------------------------------------------------------------
  useEffect(() => {
    if (loading) return;
    if (authData?.user && authData?.token) {
      localStorage.setItem("authData", JSON.stringify(authData));
    } else {
      localStorage.removeItem("authData");
    }
  }, [authData, loading]);

  // ------------------------------------------------------------------
  // Logout — also clears the permission cache
  // ------------------------------------------------------------------
  const logout = useCallback(() => {
    setAuthData({ user: null, token: null });
    localStorage.removeItem("authData");
    fieldPermCache.current.clear();
  }, []);

  // ------------------------------------------------------------------
  // Grade helpers (unchanged behavior — already correct)
  // ------------------------------------------------------------------
  const isUser = () => authData?.user?.grade === "user";
  const isAdmin = () => authData?.user?.grade === "admin";
  const isSuperAdmin = () => authData?.user?.grade === "super_admin";
  const isAdminOrSuper = () =>
    ["admin", "super_admin"].includes(authData?.user?.grade);

  // roleName-only — no phantom user.role.name fallback
  const getRoleName = () => authData?.user?.roleName || null;
  const hasRole = (roleName) => authData?.user?.roleName === roleName;

  // ------------------------------------------------------------------
  // Shared low-level authed fetch.
  // Uses fetchWithRefresh and passes authHint so refresh picks the right endpoint.
  // ------------------------------------------------------------------
  const authedFetch = useCallback(
    (url, options = {}) =>
      fetchWithRefresh(
        url,
        options,
        authData?.token,
        setAuthData,
        { type: authData?.user?.type },
      ),
    [authData?.token, authData?.user?.type],
  );

  // ------------------------------------------------------------------
  // can(model, operation, targetId?) → Promise<boolean>
  //   Calls POST /permissions/:targetId/check-operation.
  //   targetId defaults to the current user's id (self-check).
  //   403 → false (no throw). Other errors propagate.
  // ------------------------------------------------------------------
  const can = useCallback(
    async (model, operation, targetId) => {
      if (!model || !operation) return false;
      const id = targetId || authData?.user?.id;
      if (!id || !authData?.token) return false;

      try {
        const res = await authedFetch(
          `${API_URL}/permissions/${id}/check-operation`,
          {
            method: "POST",
            body: JSON.stringify({ operation, model }),
          },
        );
        const body = await res.json();
        return Boolean(body?.data?.canPerform);
      } catch (err) {
        // AUTHZ_* → not allowed. Treat as false. Do not logout.
        if (err?.status === 403) return false;
        // Network / unexpected → return false but rethrow in dev so it's visible
        if (import.meta.env.DEV) console.warn("can() failed:", err);
        return false;
      }
    },
    [authedFetch, authData?.user?.id, authData?.token],
  );

  // ------------------------------------------------------------------
  // getFieldPermissions(model, targetId?, mode?) → Promise<{
  //   fields: string[],
  //   configs: Record<string, FieldConfig>,
  //   permissions: PermissionSet
  // } | null>
  //   mode: 'edit' | 'view' | 'create' (default 'edit')
  //   Cached in-memory per (model, targetId, mode).
  // ------------------------------------------------------------------
  const getFieldPermissions = useCallback(
    async (model, targetId, mode = "edit") => {
      if (!model) return null;
      const id = targetId || authData?.user?.id;
      if (!id || !authData?.token) return null;

      const cacheKey = `${model}:${id}:${mode}`;
      if (fieldPermCache.current.has(cacheKey)) {
        return fieldPermCache.current.get(cacheKey);
      }

      const suffix =
        mode === "view"
          ? "viewable-fields"
          : mode === "create"
            ? "creatable-fields"
            : "editable-fields";

      try {
        const res = await authedFetch(
          `${API_URL}/permissions/user/${id}/${suffix}?model=${encodeURIComponent(model)}`,
        );
        const body = await res.json();
        // Response shape: { success, data: { fields, configs, permissions } }
        const payload = body?.data ?? null;
        if (payload) fieldPermCache.current.set(cacheKey, payload);
        return payload;
      } catch (err) {
        if (err?.status === 403) {
          // No permission to even read field list — return empty, don't throw.
          const empty = { fields: [], configs: {}, permissions: null };
          fieldPermCache.current.set(cacheKey, empty);
          return empty;
        }
        if (import.meta.env.DEV) console.warn("getFieldPermissions failed:", err);
        return null;
      }
    },
    [authedFetch, authData?.user?.id, authData?.token],
  );

  // ------------------------------------------------------------------
  // canEditField(model, field, targetId?) → Promise<boolean>
  // ------------------------------------------------------------------
  const canEditField = useCallback(
    async (model, field, targetId) => {
      const bundle = await getFieldPermissions(model, targetId, "edit");
      return Boolean(bundle?.fields?.includes(field));
    },
    [getFieldPermissions],
  );

  // ------------------------------------------------------------------
  // canViewField(model, field, targetId?) → Promise<boolean>
  // ------------------------------------------------------------------
  const canViewField = useCallback(
    async (model, field, targetId) => {
      const bundle = await getFieldPermissions(model, targetId, "view");
      return Boolean(bundle?.fields?.includes(field));
    },
    [getFieldPermissions],
  );

  // ------------------------------------------------------------------
  // Invalidate cache — useful after a schema change or an edit is saved.
  // ------------------------------------------------------------------
  const invalidateFieldPermissions = useCallback((model, targetId) => {
    if (!model) {
      fieldPermCache.current.clear();
      return;
    }
    const prefix = `${model}:${targetId ?? ""}`;
    for (const key of fieldPermCache.current.keys()) {
      if (key.startsWith(prefix)) fieldPermCache.current.delete(key);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        // state
        authData,
        setAuthData,
        loading,
        // session
        logout,
        // grade helpers (unchanged API)
        isUser,
        isAdmin,
        isSuperAdmin,
        isAdminOrSuper,
        getRoleName,
        hasRole,
        // permission helpers (new)
        can,
        getFieldPermissions,
        canEditField,
        canViewField,
        invalidateFieldPermissions,
        // raw authed fetch for one-off calls
        authedFetch,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}