// src/Components/Export/StatsExportButton.jsx
import { useContext, useEffect, useRef, useState } from "react";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { UserContext } from "../../Context/dataCont";
import { useError } from "../../Context/ErrorContext";
import useExportCatalog from "../../Hooks/useExportCatalog";
import { downloadStatsExport } from "./exportApi";

const LANGS = [
  { value: "both", label: "Bilingue (FR + AR)" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

/**
 * "Exporter (Excel)" on a statistics page: one workbook with a summary sheet
 * and a sheet per breakdown. Rendered only when the catalog lists this page
 * (read_stats AND export allowed); the figures are the page's own, within
 * the viewer's scope.
 */
export default function StatsExportButton({ statsKey }) {
  const { authedFetch } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const { canExportStats } = useExportCatalog();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!canExportStats(statsKey)) return null;

  const run = async (lang) => {
    setOpen(false);
    setBusy(true);
    try {
      const fileName = await downloadStatsExport(authedFetch, statsKey, lang);
      showSuccess(`${fileName} téléchargé`);
    } catch (err) {
      showError(err?.message || "L'export a échoué");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] transition-all duration-200 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Exporter (Excel)
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 bg-[#182233] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
        >
          <p className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-[#64748B]">Langue du fichier</p>
          {LANGS.map((l) => (
            <button
              key={l.value}
              role="menuitem"
              onClick={() => run(l.value)}
              className={`w-full px-4 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-[#1F2937] transition-colors ${
                l.value === "ar" ? "font-arabic" : ""
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
