import { useState, useRef } from "react";

// ─── Design Tokens (Banking Theme) ──────────────────────────────────────────

const FILE_CARD_BASE =
  "group relative w-full aspect-square rounded-xl overflow-hidden bg-[#111827] border border-white/5 shadow-xl transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5";
const OVERLAY_BASE =
  "absolute inset-0 bg-[#0A0F1C]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3";
const BTN_PREVIEW =
  "w-28 h-9 text-sm rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center justify-center";
const BTN_REPLACE =
  "w-28 h-9 text-sm rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition flex items-center justify-center";
const BTN_DELETE =
  "w-28 h-9 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition flex items-center justify-center";
const BTN_CONFIRM_CANCEL =
  "w-24 h-9 text-sm rounded-lg bg-[#1F2937] hover:bg-[#2A3A4A] text-white transition flex items-center justify-center";
const BTN_CONFIRM_DELETE =
  "w-24 h-9 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center shadow-lg shadow-red-600/20";

export default function FileCard({ file, handleDelete, handleReplace }) {
  const isImage = file.type?.startsWith("image");
  const inputRef = useRef(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  function FileIcon({ type }) {
    if (type?.includes("pdf")) return <span className="text-4xl">📄</span>;
    if (type?.includes("zip")) return <span className="text-4xl">📦</span>;
    if (type?.includes("video")) return <span className="text-4xl">🎥</span>;
    return <span className="text-4xl">📁</span>;
  }

  const handlePreview = () => {
    window.open(file.url, "_blank");
  };

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleChange = (e) => {
    const newFile = e.target.files[0];
    if (newFile) {
      handleReplace(file, newFile);
      e.target.value = null;
    }
  };

  const confirmAndDelete = () => {
    handleDelete(file);
    setConfirmDelete(false);
  };

  return (
    <div className={FILE_CARD_BASE}>
      {/* Preview */}
      {isImage ? (
        <img
          src={file.url}
          alt={file.fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-[#94A3B8]">
          <FileIcon type={file.type} />
          <p className="mt-2 text-sm text-center px-2 truncate max-w-full">
            {file.fileName}
          </p>
        </div>
      )}

      {/* Actions Overlay */}
      <div className={OVERLAY_BASE}>
        <button onClick={handlePreview} className={BTN_PREVIEW}>
          Aperçu
        </button>

        <div>
          <button onClick={handleClick} className={BTN_REPLACE}>
            Remplacer
          </button>
          <input ref={inputRef} type="file" hidden onChange={handleChange} />
        </div>

        <button onClick={() => setConfirmDelete(true)} className={BTN_DELETE}>
          Supprimer
        </button>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="absolute inset-0 z-20 bg-[#0A0F1C]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-4">
          <p className="text-sm text-[#F8FAFC] text-center font-medium">
            Supprimer ce fichier ?
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className={BTN_CONFIRM_CANCEL}
            >
              Annuler
            </button>

            <button
              onClick={confirmAndDelete}
              className={BTN_CONFIRM_DELETE}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}