// src/Components/Export/ExportModal.jsx
import { useContext, useMemo, useState } from "react";
import { X, Download, Loader2, FileSpreadsheet, FileText, Search, Info } from "lucide-react";
import { UserContext } from "../../Context/dataCont";
import { useError } from "../../Context/ErrorContext";
import { downloadExport, EXPORT_MAX_ROWS } from "./exportApi";

const FORMATS = [
  { value: "xlsx", label: "Excel (.xlsx)", icon: <FileSpreadsheet className="w-4 h-4" />, hint: "Dates et nombres prêts à trier" },
  { value: "csv", label: "CSV", icon: <FileText className="w-4 h-4" />, hint: "Séparateur « ; », UTF-8" },
];
const LANGS = [
  { value: "both", label: "Bilingue", hint: "En-têtes FR + AR" },
  { value: "fr", label: "Français", hint: "" },
  { value: "ar", label: "العربية", hint: "Feuille de droite à gauche" },
];

// Last choices per report, for this browser only.
const prefsKey = (viewerId, reportKey) => `export-prefs::${viewerId}::${reportKey}`;
function loadPrefs(viewerId, reportKey) {
  try {
    return JSON.parse(localStorage.getItem(prefsKey(viewerId, reportKey))) || {};
  } catch {
    return {};
  }
}
function savePrefs(viewerId, reportKey, prefs) {
  try {
    localStorage.setItem(prefsKey(viewerId, reportKey), JSON.stringify(prefs));
  } catch {
    /* private mode / storage blocked: not remembered */
  }
}

const formatCount = (n) => (n ?? 0).toLocaleString("fr-FR");

/**
 * The export window: which rows (filtered list or selection), format,
 * language and columns. Columns and rows are those the backend allows for
 * this viewer (catalog); nothing here can widen them.
 *
 *   report       catalog entry (useExportCatalog().getReport(key))
 *   filters      the list's current filters, as the list endpoint takes them
 *   filterLabels human-readable active filters, shown as a reminder
 *   totalCount   rows of the filtered list
 *   selectedIds  ids ticked in the list (optional)
 */
export default function ExportModal({ report, filters, filterLabels = [], totalCount, selectedIds = [], onClose }) {
  const { authData, authedFetch } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const viewerId = authData?.user?.id;

  const offeredKeys = useMemo(() => report.columns.map((c) => c.key), [report]);
  const defaultKeys = useMemo(() => report.columns.filter((c) => c.default).map((c) => c.key), [report]);

  const saved = useMemo(() => loadPrefs(viewerId, report.key), [viewerId, report.key]);
  const [format, setFormat] = useState(saved.format || "xlsx");
  const [lang, setLang] = useState(saved.lang || "both");
  const [columns, setColumns] = useState(() => {
    // Saved columns the viewer can still see; else the defaults.
    const kept = (saved.columns || []).filter((k) => offeredKeys.includes(k));
    return new Set(kept.length ? kept : defaultKeys);
  });
  const hasSelection = selectedIds.length > 0;
  const [rowsScope, setRowsScope] = useState(hasSelection ? "selection" : "filtered");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const rowCount = rowsScope === "selection" ? selectedIds.length : totalCount;
  const tooMany = rowCount > EXPORT_MAX_ROWS;

  const shown = report.columns.filter((c) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return c.label.fr.toLowerCase().includes(q) || (c.label.ar || "").includes(query.trim());
  });

  const toggle = (key) =>
    setColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const run = async () => {
    // Offered order, not click order: the file reads like the catalog.
    const chosen = offeredKeys.filter((k) => columns.has(k));
    setBusy(true);
    try {
      const body = {
        format,
        lang,
        columns: chosen,
        filters: rowsScope === "selection" ? { ...filters, ids: selectedIds } : filters,
      };
      const { fileName, rows } = await downloadExport(authedFetch, report.key, body);
      savePrefs(viewerId, report.key, { format, lang, columns: chosen });
      showSuccess(`${fileName} — ${formatCount(rows ?? rowCount)} lignes exportées`);
      onClose();
    } catch (err) {
      showError(err?.message || "L'export a échoué");
    } finally {
      setBusy(false);
    }
  };

  const segment = (active) =>
    `flex-1 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
      active
        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
        : "bg-[#0A0F1C] border-[rgba(255,255,255,0.06)] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[rgba(255,255,255,0.12)]"
    }`;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={() => !busy && onClose()}
    >
      <div
        className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 w-full max-w-3xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div>
            <h3 id="export-title" className="text-xl font-bold text-[#F8FAFC] tracking-tight">
              Exporter — {report.label.fr}
            </h3>
            <p className="text-sm text-[#64748B] mt-1 font-arabic" dir="rtl">
              {report.label.ar}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg hover:bg-[#1F2937] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-[#64748B] hover:text-[#F8FAFC]" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Rows */}
          <section>
            <h4 className="text-xs uppercase tracking-wider text-[#64748B] mb-2">Lignes</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <button className={segment(rowsScope === "filtered")} onClick={() => setRowsScope("filtered")}>
                <div className="font-medium text-sm">Toute la liste filtrée</div>
                <div className="text-xs opacity-80 mt-0.5">{formatCount(totalCount)} lignes</div>
              </button>
              <button
                className={`${segment(rowsScope === "selection")} disabled:opacity-40 disabled:cursor-not-allowed`}
                onClick={() => setRowsScope("selection")}
                disabled={!hasSelection}
              >
                <div className="font-medium text-sm">Sélection</div>
                <div className="text-xs opacity-80 mt-0.5">
                  {hasSelection ? `${formatCount(selectedIds.length)} lignes cochées` : "Aucune ligne cochée"}
                </div>
              </button>
            </div>
            {rowsScope === "filtered" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {filterLabels.length ? (
                  filterLabels.map((f) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 rounded-full text-xs bg-[#182233] text-[#94A3B8] border border-[rgba(255,255,255,0.06)]"
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#64748B]">Aucun filtre : toutes les lignes que vous pouvez voir.</span>
                )}
              </div>
            )}
            {tooMany && (
              <p className="mt-3 text-sm text-rose-400">
                L'export est limité à {formatCount(EXPORT_MAX_ROWS)} lignes. Affinez les filtres.
              </p>
            )}
          </section>

          {/* Format + language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
              <h4 className="text-xs uppercase tracking-wider text-[#64748B] mb-2">Format</h4>
              <div className="flex gap-2">
                {FORMATS.map(({ value, label, icon, hint }) => (
                  <button key={value} className={segment(format === value)} onClick={() => setFormat(value)}>
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {icon} {label}
                    </div>
                    <div className="text-xs opacity-80 mt-0.5">{hint}</div>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h4 className="text-xs uppercase tracking-wider text-[#64748B] mb-2">Langue</h4>
              <div className="flex gap-2">
                {LANGS.map(({ value, label, hint }) => (
                  <button key={value} className={segment(lang === value)} onClick={() => setLang(value)}>
                    <div className={`font-medium text-sm ${value === "ar" ? "font-arabic" : ""}`}>{label}</div>
                    {hint && <div className="text-xs opacity-80 mt-0.5">{hint}</div>}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Columns */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className="text-xs uppercase tracking-wider text-[#64748B]">
                Colonnes{" "}
                <span className="normal-case tracking-normal text-[#94A3B8]">
                  ({columns.size} / {report.columns.length})
                </span>
              </h4>
              <div className="flex gap-2 text-xs">
                <button className="px-2.5 py-1 rounded-lg bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC]" onClick={() => setColumns(new Set(defaultKeys))}>
                  Par défaut
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC]" onClick={() => setColumns(new Set(offeredKeys))}>
                  Tout
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC]" onClick={() => setColumns(new Set())}>
                  Aucune
                </button>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher une colonne…"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {shown.map((c) => (
                <label
                  key={c.key}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                    columns.has(c.key)
                      ? "bg-emerald-500/10 border-emerald-500/25"
                      : "bg-[#0A0F1C] border-transparent hover:border-[rgba(255,255,255,0.08)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={columns.has(c.key)}
                    onChange={() => toggle(c.key)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-[#F8FAFC] truncate">{c.label.fr}</span>
                    {c.label.ar && c.label.ar !== c.label.fr && (
                      <span className="block text-xs text-[#64748B] truncate font-arabic" dir="rtl">
                        {c.label.ar}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {shown.length === 0 && <p className="text-sm text-[#64748B] col-span-full">Aucune colonne ne correspond.</p>}
            </div>
          </section>

          <p className="flex items-start gap-2 text-xs text-[#64748B]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Le fichier contient uniquement les lignes et les champs que votre rôle permet de voir. Une cellule vide peut
            signifier une valeur non visible pour vous sur cette ligne. Chaque export est journalisé.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-5 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
          >
            Annuler
          </button>
          <button
            onClick={run}
            disabled={busy || columns.size === 0 || rowCount === 0 || tooMany}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy ? "Export en cours…" : `Exporter ${formatCount(rowCount)} lignes`}
          </button>
        </div>
      </div>
    </div>
  );
}
