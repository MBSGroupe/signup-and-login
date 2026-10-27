// src/Pages/DashBoard/Exports/ExportsPage.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  RotateCcw,
  Users,
  Shield,
  ClipboardList,
  Wallet,
  CreditCard,
  Coins,
  Award,
  Scale,
  Hourglass,
  Activity,
  SearchCheck,
  History,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import useExportCatalog from "../../../Hooks/useExportCatalog";
import ExportModal from "../../../Components/Export/ExportModal";
import {
  countExport,
  EXPORT_MAX_JOB_ROWS,
  EXPORT_MAX_ROWS,
} from "../../../Components/Export/exportApi";
import wilayasData from "../../../assets/data/wilayas.json";

const ICONS = {
  members: Users,
  admins: Shield,
  "validation-requests": ClipboardList,
  fees: Wallet,
  payments: CreditCard,
  "credit-transactions": Coins,
  documents: Award,
  "fee-situation": Scale,
  "pending-backlog": Hourglass,
  "approver-activity": Activity,
  "data-quality": SearchCheck,
};

// Groups of the report list, in this order.
const GROUPS = [
  { key: "list", label: "Listes" },
  { key: "situation", label: "Situations" },
];

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] text-sm placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-emerald-500";

const formatCount = (n) => (n ?? 0).toLocaleString("fr-FR");
const wilayaName = (code) => {
  const w = wilayasData.find(
    (x) => String(Number(x.code)) === String(Number(code)),
  );
  return w ? `${String(w.code).padStart(2, "0")} - ${w.name}` : code;
};

/** One filter input, from the catalog's description of it. */
function FilterInput({ field, value, onChange }) {
  const set = (v) => onChange(field.key, v);
  switch (field.type) {
    case "select":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          className={inputClass}
        >
          <option value="">Tous</option>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label.fr}
            </option>
          ))}
        </select>
      );
    case "wilaya":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          className={inputClass}
        >
          <option value="">Toutes</option>
          {wilayasData.map((w) => (
            <option key={w.code} value={String(Number(w.code))}>
              {String(w.code).padStart(2, "0")} - {w.name}
            </option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          className={`${inputClass} [color-scheme:dark]`}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          className={inputClass}
        />
      );
    default:
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          placeholder="…"
          className={inputClass}
        />
      );
  }
}

/** "Label : value" of the filters set, as reminders in the export window. */
function labelsOf(report, filters) {
  return report.filters
    .filter((f) => filters[f.key])
    .map((f) => {
      const v = filters[f.key];
      const shown =
        f.type === "select"
          ? (f.options?.find((o) => o.value === v)?.label.fr ?? v)
          : f.type === "wilaya"
            ? wilayaName(v)
            : f.type === "date"
              ? new Date(v).toLocaleDateString("fr-FR")
              : v;
      return `${f.label.fr} : ${shown}`;
    });
}

/**
 * Every export the viewer can run, with each report's filters. The list
 * comes from GET /exports/catalog: what's shown here is what the backend
 * will accept (permission, scope and visible columns already applied).
 */
export default function ExportsPage() {
  const { authedFetch } = useContext(UserContext);
  const navigate = useNavigate();
  const { reports, loading } = useExportCatalog();
  const [selectedKey, setSelectedKey] = useState(null);
  const [filtersByReport, setFiltersByReport] = useState({});
  const [count, setCount] = useState({
    loading: false,
    rows: null,
    error: null,
  });
  const [modalOpen, setModalOpen] = useState(false);

  const report = useMemo(
    () => reports.find((r) => r.key === selectedKey) ?? reports[0] ?? null,
    [reports, selectedKey],
  );
  const filters = useMemo(
    () => (report ? (filtersByReport[report.key] ?? {}) : {}),
    [report, filtersByReport],
  );
  // Only filled filters are sent.
  const sent = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v !== "" && v !== undefined && v !== null,
        ),
      ),
    [filters],
  );
  const sentKey = JSON.stringify(sent);

  const setFilter = (key, value) =>
    setFiltersByReport((prev) => ({
      ...prev,
      [report.key]: { ...(prev[report.key] ?? {}), [key]: value },
    }));
  const resetFilters = () =>
    setFiltersByReport((prev) => ({ ...prev, [report.key]: {} }));

  // Matching rows, a moment after the last filter change.
  useEffect(() => {
    if (!report) return;
    let alive = true;
    setCount((c) => ({ ...c, loading: true, error: null }));
    const t = setTimeout(async () => {
      try {
        const rows = await countExport(
          authedFetch,
          report.key,
          JSON.parse(sentKey),
        );
        if (alive) setCount({ loading: false, rows, error: null });
      } catch (err) {
        if (alive)
          setCount({
            loading: false,
            rows: null,
            error: err?.message || "Comptage impossible",
          });
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [report, sentKey, authedFetch]);

  return (
    <div className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#111827] rounded-2xl p-6 md:p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Exports
              </h1>
              <p className="text-sm text-[#94A3B8] mt-1">
                Listes et journaux en Excel ou CSV, limités aux données que
                votre rôle permet d’exporter.
              </p>
            </div>
            <button
              onClick={() => navigate("/dash/exports/history")}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] transition-colors"
            >
              <History className="w-4 h-4" /> Mes exports
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : !report ? (
          <p className="mt-10 text-center text-[#64748B]">
            Aucun export n’est disponible pour votre rôle.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* Reports */}
            <nav className="space-y-5" aria-label="Exports disponibles">
              {GROUPS.map((g) => {
                const inGroup = reports.filter(
                  (r) => (r.category ?? "list") === g.key,
                );
                if (!inGroup.length) return null;
                return (
                  <div key={g.key} className="space-y-2">
                    <h2 className="px-1 text-[11px] uppercase tracking-wider text-[#64748B]">
                      {g.label}
                    </h2>
                    {inGroup.map((r) => {
                      const Icon = ICONS[r.key] ?? FileSpreadsheet;
                      const active = r.key === report.key;
                      return (
                        <button
                          key={r.key}
                          onClick={() => setSelectedKey(r.key)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                            active
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-[#111827] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mt-0.5 shrink-0 ${active ? "text-emerald-400" : "text-[#64748B]"}`}
                          />
                          <span className="min-w-0">
                            <span
                              className={`block text-sm font-medium ${active ? "text-emerald-300" : "text-[#F8FAFC]"}`}
                            >
                              {r.label.fr}
                            </span>
                            <span
                              className="block text-xs text-[#64748B] font-arabic truncate"
                              dir="rtl"
                            >
                              {r.label.ar}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            {/* Filters of the selected report */}
            <section className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6">
              <h2 className="text-xl font-bold tracking-tight">
                {report.label.fr}
              </h2>
              {report.description && (
                <p className="text-sm text-[#94A3B8] mt-1 max-w-3xl">
                  {report.description.fr}
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {report.filters.map((f) => (
                  <label key={f.key} className="block">
                    <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                      {f.label.fr}
                    </span>
                    <FilterInput
                      field={f}
                      value={filters[f.key]}
                      onChange={setFilter}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm" aria-live="polite">
                  {count.loading ? (
                    <span className="inline-flex items-center gap-2 text-[#94A3B8]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Comptage…
                    </span>
                  ) : count.error ? (
                    <span className="text-rose-400">{count.error}</span>
                  ) : (
                    <span className="text-[#94A3B8]">
                      <span className="text-2xl font-semibold text-[#F8FAFC] mr-1.5">
                        {formatCount(count.rows)}
                      </span>
                      lignes correspondent
                      {count.rows > EXPORT_MAX_JOB_ROWS ? (
                        <span className="block text-rose-400 mt-1">
                          Au-delà de {formatCount(EXPORT_MAX_JOB_ROWS)} : affinez
                          les filtres.
                        </span>
                      ) : (
                        count.rows > EXPORT_MAX_ROWS && (
                          <span className="block text-amber-400 mt-1">
                            Plus de {formatCount(EXPORT_MAX_ROWS)} : préparé en
                            arrière-plan.
                          </span>
                        )
                      )}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[#94A3B8] hover:text-[#F8FAFC] bg-[#182233] border border-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Réinitialiser
                  </button>
                  <button
                    onClick={() => setModalOpen(true)}
                    disabled={
                      count.loading ||
                      !count.rows ||
                      count.rows > EXPORT_MAX_JOB_ROWS
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" /> Exporter…
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {modalOpen && report && (
        <ExportModal
          report={report}
          filters={sent}
          filterLabels={labelsOf(report, sent)}
          totalCount={count.rows ?? 0}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
