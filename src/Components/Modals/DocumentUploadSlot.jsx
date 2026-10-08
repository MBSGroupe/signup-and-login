// src/Components/Modals/DocumentUploadSlot.jsx
import { Upload, CheckCircle, Trash2 } from 'lucide-react';

/**
 * A single file-upload slot with three visual states:
 *   - empty        → "Choisir" button
 *   - new file     → filename + delete button
 *   - existing     → "Déjà joint" badge + optional "Retirer"
 *
 * Reused by SchemaFormModal for every file-typed payload field.
 */
export default function DocumentUploadSlot({
  title,
  subtitle,
  icon,
  docKey,
  file,
  fileInputRef,
  isLoading,
  onFileChange,
  onRemove,
  formatSize,
  existingFile = null,
  onClearExisting = null,
  disableSelect = false,
}) {
  const id = `file-${docKey}`;
  const hasExisting = !!existingFile;

  const stateClass = file
    ? 'bg-emerald-500/5 border-emerald-500/30'
    : hasExisting
      ? 'bg-emerald-500/5 border-emerald-500/20'
      : 'bg-[#0A0F1C] border-white/10 hover:border-white/20';

  return (
    <div className={`p-3.5 rounded-xl border transition-all ${stateClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-white/5 shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate flex items-center gap-2">
              {title}
              {file ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" /> Nouveau
                </span>
              ) : hasExisting ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" /> Déjà joint
                </span>
              ) : (
                <span className="text-rose-400 font-bold text-xs">*</span>
              )}
            </p>
            <p className="text-xs text-[#94A3B8] truncate">
              {file
                ? `${file.name} (${formatSize(file.size)})`
                : hasExisting
                  ? existingFile?.name || 'Fichier déjà téléversé'
                  : subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            id={id}
            type="file"
            ref={fileInputRef}
            onChange={(e) => onFileChange(e.target.files?.[0])}
            accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={isLoading || disableSelect}
          />

          {file ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={isLoading}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
              title="Supprimer le fichier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : hasExisting && onClearExisting ? (
            <button
              type="button"
              onClick={onClearExisting}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Retirer le fichier existant"
            >
              <Trash2 className="w-3.5 h-3.5" /> Retirer
            </button>
          ) : !disableSelect ? (
            <label
              htmlFor={id}
              className={`px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer select-none active:scale-95 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Choisir
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}