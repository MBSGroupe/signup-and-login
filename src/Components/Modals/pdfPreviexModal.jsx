import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { FileText, Loader2 } from 'lucide-react';

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20";
const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-white text-sm font-medium rounded-lg transition-colors border border-white/5";
const BTN_DANGER =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-600/20";

const CARD_BASE =
  "relative bg-[#182233] border border-white/10 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col";

export default function PDFPreviewModal({
  type,
  data,
  onClose,
  onEmail,
  isGenerating = false,
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  let title = 'Aperçu du document';
  if (type === 'payment') title = data?.title || 'Aperçu du reçu de paiement';
  else if (type === 'situation') title = data?.title || 'Situation du membre';
  else if (type === 'degree') title = data?.title || 'Aperçu du Diplôme';

  // Sync local blob with incoming data. When the parent swaps the blob in,
  // this re-runs and replaces the loading state with the actual PDF.
  useEffect(() => {
    if (data?.blobUrl) {
      setBlobUrl(data.blobUrl);
      setError(null);
    } else {
      setBlobUrl(null);
    }
  }, [data]);

  // If the parent stops generating and there's still no blob, it's an error.
  useEffect(() => {
    if (!isGenerating && !data?.blobUrl) {
      setError("Impossible de générer le document.");
    }
  }, [isGenerating, data]);

  // ── Derived view state ────────────────────────────────────────────
  // While generating OR before a blob arrives → spinner
  // If we have a blob → PDF
  // Otherwise → error
  const showLoading = isGenerating || (!blobUrl && !error);
  const showError = !showLoading && !!error;
  const showPdf = !showLoading && !showError && !!blobUrl;

  const handleDownload = () => {
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEmail = async () => {
    if (!onEmail || !data?.userId) return;
    const defaultEmail = data?.memberEmail || '';
    const recipient = window.prompt('Adresse email du destinataire :', defaultEmail);
    if (!recipient) return;
    setSendingEmail(true);
    try {
      await onEmail(data.userId, recipient);
      alert('Email envoyé avec succès ✅');
    } catch (err) {
      console.error('Email sending failed:', err);
      alert("Échec de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
      <div
        className="absolute inset-0 bg-[#0A0F1C]/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className={CARD_BASE}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-[#111827]/50 rounded-t-2xl">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="truncate">{title}</span>
            </h3>

            {isGenerating && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Génération en cours…
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showPdf && (
              <button onClick={handleDownload} className={BTN_PRIMARY}>
                💾 Télécharger
              </button>
            )}

            {showPdf && data?.downloadUrl && onEmail && (
              <button
                onClick={handleEmail}
                disabled={sendingEmail}
                className={BTN_SECONDARY}
              >
                {sendingEmail ? '📧 Envoi...' : '📧 Email'}
              </button>
            )}

            <button onClick={onClose} className={BTN_DANGER}>
              Fermer
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 w-full p-3 bg-[#0A0F1C] rounded-b-2xl overflow-hidden">
          {showLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-emerald-400/10 border-b-emerald-400 rounded-full animate-spin" />
                </div>
              </div>
              <p className="mt-4 text-[#64748B] text-sm font-medium">
                Génération du document en cours…
              </p>
              <p className="mt-1 text-[#475569] text-xs">
                Cela peut prendre quelques secondes.
              </p>
            </div>
          ) : showError ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-[#64748B]">
              <div className="p-4 rounded-full bg-red-500/10 text-red-400 mb-4">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-red-300">❌ {error}</p>
              <button
                onClick={onClose}
                className="mt-6 px-5 py-2.5 bg-[#1F2937] hover:bg-[#2A3A4A] text-white rounded-lg transition-colors border border-white/5"
              >
                Fermer
              </button>
            </div>
          ) : (
            <iframe
              key={blobUrl}
              src={blobUrl}
              className="w-full h-[calc(90vh-120px)] rounded-xl border border-white/5 bg-[#111827]"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}