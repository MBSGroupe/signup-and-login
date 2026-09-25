import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../Context/dataCont";
import { fetchWithRefresh } from "../Components/api";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Module-level cache keyed by `${targetUserId}::${model}::${tokenFingerprint}`.
// Persists across component mounts for the lifetime of the page.
const permissionCache = new Map();

const cacheKey = (targetUserId, model, token) =>
  `${targetUserId}::${model}::${token ? token.slice(-12) : "anon"}`;

const VALID_KINDS = new Set(["editable", "viewable", "creatable"]);

/**
 * Fetch the caller's effective permissions for a given (targetUser, model).
 *
 * Backed by the real backend endpoints:
 *   GET /permissions/user/:targetUserId/editable-fields?model=User
 *   GET /permissions/user/:targetUserId/viewable-fields?model=User
 *   GET /permissions/user/:targetUserId/creatable-fields?model=User
 *
 * The `:targetUserId` is the *target* of the operation. The viewer is
 * always derived server-side from the JWT.
 *
 * Returns:
 *   {
 *     loading, error, loaded,
 *     canUpdate: string[],
 *     canView:   string[],
 *     canCreate: string[],
 *     operations: Record<string, boolean>,
 *     configs:   Record<string, FieldConfig>,
 *     context:   Record<string, any>,
 *   }
 *
 * `kind` selects which endpoint is called. `editable` is the most
 * informative because the backend returns the *full* permissions object
 * (canUpdate + canView + canCreate + operations + configs) regardless of
 * which of the three endpoints you call. We default to `editable` and use
 * it for all three field lists — that avoids 3 HTTP calls per form.
 */
export default function usePermissions(targetUserId, model = "User", kind = "editable") {
  const { authData } = useContext(UserContext);
  const token = authData?.token || null;

  const [state, setState] = useState(() => {
    if (!targetUserId || !token) {
      return {
        loading: false,
        error: null,
        loaded: false,
        canUpdate: [],
        canView: [],
        canCreate: [],
        operations: {},
        configs: {},
        context: {},
      };
    }
    const cached = permissionCache.get(cacheKey(targetUserId, model, token));
    if (cached) {
      return { ...cached, loading: false, error: null, loaded: true };
    }
    return {
      loading: true,
      error: null,
      loaded: false,
      canUpdate: [],
      canView: [],
      canCreate: [],
      operations: {},
      configs: {},
      context: {},
    };
  });

  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!targetUserId || !token) {
      setState({
        loading: false,
        error: null,
        loaded: false,
        canUpdate: [],
        canView: [],
        canCreate: [],
        operations: {},
        configs: {},
        context: {},
      });
      return;
    }

    if (!VALID_KINDS.has(kind)) {
      // Defensive: an invalid kind must not silently hit a wrong endpoint.
      setState((prev) => ({
        ...prev,
        loading: false,
        error: new Error(`Invalid permissions kind: ${kind}`),
      }));
      return;
    }

    const key = cacheKey(targetUserId, model, token);
    const cached = permissionCache.get(key);
    if (cached) {
      setState({ ...cached, loading: false, error: null, loaded: true });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const url = `${NEST_API_URL}/permissions/user/${encodeURIComponent(
          targetUserId,
        )}/${kind}-fields?model=${encodeURIComponent(model)}`;

        const res = await fetchWithRefresh(url, { method: "GET" }, token, null);
        const body = await res.json();

        if (!res.ok || body?.success === false) {
          const message = body?.message || "Failed to load permissions";
          const err = new Error(message);
          err.statusCode = body?.statusCode ?? res.status;
          err.code = body?.code;
          err.details = body?.details;
          throw err;
        }

        const perms = body?.permissions || {};
        const normalized = {
          canUpdate: Array.isArray(perms.canUpdate) ? perms.canUpdate : [],
          canView: Array.isArray(perms.canView) ? perms.canView : [],
          canCreate: Array.isArray(perms.canCreate) ? perms.canCreate : [],
          operations:
            perms.operations && typeof perms.operations === "object"
              ? perms.operations
              : {},
          configs:
            perms.fieldConfigs && typeof perms.fieldConfigs === "object"
              ? perms.fieldConfigs
              : body?.configs && typeof body.configs === "object"
                ? body.configs
                : {},
          context: perms.context && typeof perms.context === "object" ? perms.context : {},
        };

        permissionCache.set(key, normalized);

        if (!cancelled && aliveRef.current) {
          setState({ ...normalized, loading: false, error: null, loaded: true });
        }
      } catch (err) {
        if (!cancelled && aliveRef.current) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err,
            loaded: false,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetUserId, model, kind, token]);

  return state;
}

/** Call this on logout to avoid leaking another account's permissions. */
export function clearPermissionCache() {
  permissionCache.clear();
}