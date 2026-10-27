// src/Hooks/useExportCatalog.js
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../Context/dataCont";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Models that have exports (backend: "export" operation of each).
const EXPORT_MODELS = ["User", "Admin", "ValidationRequest", "Fee", "Payment", "CreditTransaction", "File"];

// One request per (viewer, permission version), shared by every button.
// Keyed by viewer: another account never reads this one's entry.
const cache = new Map(); // key → Promise<{ reports, stats }>

/**
 * Reports the viewer can export — GET /exports/catalog:
 *   reports: [{ key, label: {fr, ar}, resource, formats, columns, filters, … }]
 *   stats:   [{ key, label }] — statistics pages exportable as XLSX
 * The backend lists a report only when the "export" operation is allowed AND
 * at least one column is visible, so a button built from this always works.
 * Not even requested when /permissions/me grants no export at all.
 */
export default function useExportCatalog() {
  const { authData, authedFetch, canDo, permissionsLoaded, permissionsVersion } =
    useContext(UserContext);
  const viewerId = authData?.user?.id;
  const mayExport = permissionsLoaded && EXPORT_MODELS.some((m) => canDo(m, "export"));
  const [state, setState] = useState({ loading: mayExport, reports: [], stats: [] });

  useEffect(() => {
    if (!viewerId || !mayExport) {
      setState({ loading: false, reports: [], stats: [] });
      return;
    }
    const key = `${viewerId}::${permissionsVersion ?? ""}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        authedFetch(`${NEST_API_URL}/exports/catalog`)
          .then((res) => res.json())
          .then((body) => ({ reports: body?.data?.reports ?? [], stats: body?.data?.stats ?? [] }))
          .catch((err) => {
            cache.delete(key);
            if (import.meta.env.DEV) console.warn("GET /exports/catalog failed:", err);
            return { reports: [], stats: [] };
          }),
      );
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    cache.get(key).then(({ reports, stats }) => alive && setState({ loading: false, reports, stats }));
    return () => {
      alive = false;
    };
  }, [viewerId, mayExport, permissionsVersion, authedFetch]);

  return {
    ...state,
    getReport: (reportKey) => state.reports.find((r) => r.key === reportKey) ?? null,
    canExportStats: (statsKey) => state.stats.some((s) => s.key === statsKey),
  };
}
