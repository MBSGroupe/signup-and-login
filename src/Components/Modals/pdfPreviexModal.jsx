import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { FileText } from 'lucide-react';

// ─── Design System Constants (Banking Theme) ────────────────────────────────

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20";
const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-white text-sm font-medium rounded-lg transition-colors border border-white/5";
const BTN_DANGER =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-600/20";
const BTN_SUCCESS =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-transparent hover:bg-white/5 text-[#94A3B8] hover:text-white text-sm font-medium rounded-lg transition-colors";

const CARD_BASE =
  "relative bg-[#182233] border border-white/10 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col";

// ─── Component ──────────────────────────────────────────────────────────────

export default function PDFPreviewModal({ type, data, onClose, onGenerate, onEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  let title = 'Aperçu du document';
  if (type === 'payment') {
    title = data?.title || 'Aperçu du reçu de paiement';
  } else if (type === 'situation') {
    title = data?.title || 'Situation du membre';
  } else if (type === 'degree') {
    title = data?.title || 'Aperçu du Agrément';
  }

  // Set the blob URL when data changes
  useEffect(() => {
    if (data?.blobUrl) {
      setBlobUrl(data.blobUrl);
      setLoading(false);
      setError(null);
    } else {
      setError('No PDF data available');
      setLoading(false);
    }
  }, [data]);

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

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setGenerating(true);
    try {
      await onGenerate();
      // onGenerate should update the parent's data.blobUrl -> this modal will re-render with new blob
    } catch (err) {
      console.error('Generation failed:', err);
      setError('Échec de la génération finale');
    } finally {
      setGenerating(false);
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
      alert('Échec de l\'envoi de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0A0F1C]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal container */}
      <div className={CARD_BASE}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-[#111827]/50 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {blobUrl && (
              <button onClick={handleDownload} className={BTN_PRIMARY}>
                💾 Télécharger
              </button>
            )}
            {onGenerate && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={BTN_SUCCESS}
              >
                {generating ? '⏳ Génération...' : '🔄 Générer'}
              </button>
            )}
            {data?.downloadUrl && onEmail && (
                <button onClick={handleEmail} disabled={sendingEmail} className={BTN_SECONDARY}>
                  {sendingEmail ? '📧 Envoi...' : '📧 Email'}
                </button>
              )}
            <button onClick={onClose} className={BTN_DANGER}>
              Fermer
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 w-full p-3 bg-[#0A0F1C] rounded-b-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-emerald-400/10 border-b-emerald-400 rounded-full animate-spin" />
                </div>
              </div>
              <p className="mt-4 text-[#64748B] text-sm font-medium">Chargement du PDF…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-[#64748B]">
              <div className="p-4 rounded-full bg-red-500/10 text-red-400 mb-4">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-red-300">❌ {error}</p>
              <button onClick={onClose} className="mt-6 px-5 py-2.5 bg-[#1F2937] hover:bg-[#2A3A4A] text-white rounded-lg transition-colors border border-white/5">
                Fermer
              </button>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-[calc(90vh-120px)] rounded-xl border border-white/5 bg-[#111827]"
              title="PDF Preview"
              onLoad={() => console.log('✅ PDF loaded successfully')}
              onError={(e) => {
                console.error('❌ Iframe error:', e);
                setError('Failed to load PDF in iframe');
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-[#64748B]">
              <FileText className="w-12 h-12 text-[#1F2937] mb-3" />
              <p>Aucun PDF à afficher</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}