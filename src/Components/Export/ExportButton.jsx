// src/Components/Export/ExportButton.jsx
import { useState } from "react";
import { Download } from "lucide-react";
import useExportCatalog from "../../Hooks/useExportCatalog";
import ExportModal from "./ExportModal";

// Matches the page's own buttons: "md" (members list), "sm" (admins list).
const SIZES = {
  md: "px-5 py-2.5 rounded-xl",
  sm: "px-4 py-2 text-sm font-medium rounded-lg",
};

/**
 * "Exporter" button for a list. Renders nothing unless the backend catalog
 * lists `reportKey` for this viewer (export allowed and at least one column
 * visible): no button that would end in a refusal.
 * Other props go to ExportModal (filters, filterLabels, totalCount, selectedIds).
 */
export default function ExportButton({ reportKey, size = "md", className = "", ...modalProps }) {
  const { getReport } = useExportCatalog();
  const [open, setOpen] = useState(false);
  const report = getReport(reportKey);
  if (!report) return null;

  const selected = modalProps.selectedIds?.length || 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 ${SIZES[size] ?? SIZES.md} bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] transition-all duration-200 ${className}`}
      >
        <Download className="w-4 h-4" />
        Exporter
        {selected > 0 && (
          <span className="ml-1 bg-emerald-500 text-white text-xs min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
            {selected}
          </span>
        )}
      </button>
      {open && <ExportModal report={report} onClose={() => setOpen(false)} {...modalProps} />}
    </>
  );
}
