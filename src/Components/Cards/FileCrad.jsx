import { useState, useRef, useContext } from "react";
import { UserContext } from "../../Context/dataCont";
import { useProtectedFileUrl, openProtectedFile } from "../../Hooks/useProtectedFileUrl";

// ─── Design Tokens ──────────────────────────────────────────────────────────

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
const BTN_REVOKE =
  "w-28 h-9 text-sm rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center justify-center";
const BTN_CONFIRM_CANCEL =
  "w-24 h-9 text-sm rounded-lg bg-[#1F2937] hover:bg-[#2A3A4A] text-white transition flex items-center justify-center";
const BTN_CONFIRM_DELETE =
  "w-24 h-9 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center shadow-lg shadow-red-600/20";

// ─── Mapping: type → display label ─────────────────────────────────────

const TYPE_LABELS = {
  photo: "Photo",
  CNRC: "Carte Nationale",
  recu2026: "Reçu 2026",
  ACTENAISSANCE: "Acte de naissance",
  DIPLOMES: "Diplôme",
  c20: "Certificat d'existence",
  nonAffiliationcnas: "Non-affiliation CNAS",
  affiliationcnas: "Affiliation CNAS",
  contrattravail: "Contrat de travail",
  PIECEIDENTITE: "Pièce d'identité",
  SERMENTTABLE: "Serment",
  statut: "Statut",
  RECUDUS: "Reçu",
  default: "Document",
};

// ─── Certified documents (QR) ───────────────────────────────────────────

/** Status of a certified document as the public verify page reports it, or null. */
const certificationStatus = (file) => {
  if (!file?.certificateNumber) return null;
  if (file.revokedAt) return { label: "Révoqué", className: "text-red-400 border-red-500/30" };
  if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
    return { label: "Expiré", className: "text-amber-400 border-amber-500/30" };
  }
  return { label: "Certifié", className: "text-emerald-400 border-emerald-500/30" };
};

// ─── Helper: get file extension ────────────────────────────────────────

const getExtension = (fileName) => {
  if (!fileName) return "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

// ─── Component ──────────────────────────────────────────────────────────

export default function FileCard({
  file,
  handleDelete,
  handleReplace,
  canReplace = false,
  canDelete = false,
  canPreview = true,
  canRevoke = false,
  onRevoke,
  onReinstate,
}) {
  const inputRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const certification = certificationStatus(file);
  const revocable = canRevoke && !!certification;

  // Determine if file is an image
  const extension = getExtension(file.fileName) || getExtension(file.url);
  const imageFormats = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"];
  const isImage = imageFormats.includes(extension);

  const { authData, setAuthData } = useContext(UserContext);
  const { src: imageSrc } = useProtectedFileUrl(file.url, isImage);

  const typeLabel = TYPE_LABELS[file.type] || TYPE_LABELS.default;

  function FileIcon({ ext }) {
    if (["pdf"].includes(ext)) return <span className="text-4xl">📄</span>;
    if (["zip", "rar", "7z"].includes(ext)) return <span className="text-4xl">📦</span>;
    if (["mp4", "mov", "avi"].includes(ext)) return <span className="text-4xl">🎥</span>;
    if (["doc", "docx"].includes(ext)) return <span className="text-4xl">📝</span>;
    return <span className="text-4xl">📁</span>;
  }

  const handlePreview = () =>
    openProtectedFile(file.url, authData, setAuthData).catch((err) => alert(err.message));
  const handleClick = () => inputRef.current.click();
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

  const submitRevoke = async () => {
    setBusy(true);
    try {
      await onRevoke?.(file, revokeReason.trim());
      setRevoking(false);
      setRevokeReason("");
    } finally {
      setBusy(false);
    }
  };
  const submitReinstate = async () => {
    setBusy(true);
    try {
      await onReinstate?.(file);
    } finally {
      setBusy(false);
    }
  };

  // Only show the overlay if at least one action is allowed
  const canManage = canPreview || canReplace || canDelete || revocable;

  return (
    <div className={FILE_CARD_BASE}>
      {/* Preview */}
      {isImage ? (
        imageSrc ? (
          <img
            src={imageSrc}
            alt={file.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full animate-pulse bg-[#1F2937]" />
        )
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-[#94A3B8]">
          <FileIcon ext={extension} />
          <p className="mt-2 text-sm text-center px-2 truncate max-w-full">
            {file.fileName || "Sans nom"}
          </p>
          <span className="mt-1 text-xs bg-[#1F2937] px-2 py-0.5 rounded-full text-[#64748B] border border-white/5">
            {typeLabel}
          </span>
        </div>
      )}

      {/* Type badge */}
      <div className="absolute top-2 left-2 z-10 bg-[#0A0F1C]/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
        {typeLabel}
      </div>

      {/* Certification badge (documents with a verification QR) */}
      {certification && (
        <div
          className={`absolute top-2 right-2 z-10 bg-[#0A0F1C]/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-semibold border ${certification.className}`}
          title={file.certificateNumber}
        >
          {certification.label}
        </div>
      )}

      {/* ─── Actions Overlay (only if canManage) ─────────────────────── */}
      {canManage && (
        <div className={OVERLAY_BASE}>
          {canPreview && (
            <button onClick={handlePreview} className={BTN_PREVIEW}>
              Aperçu
            </button>
          )}
          {canReplace && (
            <div>
              <button onClick={handleClick} className={BTN_REPLACE}>
                Remplacer
              </button>
              <input ref={inputRef} type="file" hidden onChange={handleChange} />
            </div>
          )}
          {canDelete && (
            <button onClick={() => setConfirmDelete(true)} className={BTN_DELETE}>
              Supprimer
            </button>
          )}
          {revocable && !file.revokedAt && (
            <button onClick={() => setRevoking(true)} className={BTN_REVOKE}>
              Révoquer
            </button>
          )}
          {revocable && file.revokedAt && (
            <button onClick={submitReinstate} disabled={busy} className={BTN_PREVIEW}>
              {busy ? "…" : "Rétablir"}
            </button>
          )}
        </div>
      )}

      {/* ─── Revocation (reason required, kept internally) ──────────── */}
      {revocable && revoking && (
        <div className="absolute inset-0 z-20 bg-[#0A0F1C]/95 backdrop-blur-sm flex flex-col justify-center gap-3 p-3">
          <p className="text-xs text-[#F8FAFC] font-medium">
            Révoquer ce document ? Son QR code affichera « révoqué ».
          </p>
          <textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Motif (obligatoire)"
            rows={3}
            maxLength={500}
            className="w-full text-xs rounded-lg bg-[#1F2937] border border-white/10 text-white p-2 resize-none focus:outline-none focus:border-amber-500/40"
          />
          <div className="flex gap-2 justify-center">
            <button onClick={() => setRevoking(false)} disabled={busy} className={BTN_CONFIRM_CANCEL}>
              Annuler
            </button>
            <button
              onClick={submitRevoke}
              disabled={busy || revokeReason.trim().length < 3}
              className={`${BTN_CONFIRM_DELETE} disabled:opacity-40`}
            >
              {busy ? "…" : "Révoquer"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation (only if canDelete) ────────────────── */}
      {canDelete && confirmDelete && (
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