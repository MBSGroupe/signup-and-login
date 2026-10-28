// src/Components/Modals/DocumentViewerModal.jsx
//
// In-app viewer for stored files. A member's upload seen by anyone else
// arrives as a watermarked image (viewOnly): it is shown with zoom only —
// no download, no new tab, no context menu. The owner sees the file itself
// and may open it in a tab.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Maximize, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import { useProtectedFileUrl } from "../../Hooks/useProtectedFileUrl";

const ICON_BTN =
  "p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors";

export default function DocumentViewerModal({ file, onClose }) {
  const { src, loading, error, viewOnly, type } = useProtectedFileUrl(file?.url);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isPdf = !viewOnly && (type === "application/pdf" || /\.pdf$/i.test(file?.fileName || file?.url || ""));
  const block = (e) => e.preventDefault();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative bg-[#182233] border border-white/10 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{file?.fileName || "Document"}</p>
            {viewOnly && (
              <p className="flex items-center gap-1.5 text-xs text-amber-300 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Consultation protégée : document filigrané à votre nom, consultation enregistrée.
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {viewOnly && src && (
              <>
                <button className={ICON_BTN} title="Zoom arrière" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#94A3B8] min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                <button className={ICON_BTN} title="Zoom avant" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button className={ICON_BTN} title="Réinitialiser" onClick={() => setZoom(1)}>
                  <Maximize className="w-4 h-4" />
                </button>
              </>
            )}
            {!viewOnly && src && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir dans un onglet
              </a>
            )}
            <button className={`${ICON_BTN} ml-2`} title="Fermer" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#0A0F1C] rounded-b-2xl min-h-[300px]">
          {loading || (!src && !error) ? (
            <div className="flex items-center justify-center h-[60vh] text-[#64748B] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-sm">Chargement du document…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[40vh] px-6 text-center text-sm text-rose-400">{error}</div>
          ) : viewOnly ? (
            <div className="p-4 flex justify-center select-none" onContextMenu={block}>
              <img
                src={src}
                alt={file?.fileName || "Document"}
                draggable={false}
                onContextMenu={block}
                onDragStart={block}
                style={{ width: `${zoom * 100}%`, maxWidth: "none", height: "auto" }}
                className="rounded shadow-lg"
              />
            </div>
          ) : isPdf ? (
            <iframe src={src} title={file?.fileName || "Document"} className="w-full h-[80vh]" frameBorder="0" />
          ) : (
            <div className="p-4 flex justify-center">
              <img src={src} alt={file?.fileName || "Document"} className="max-w-full h-auto rounded" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
