import { useContext, useState } from "react";
import { UserContext } from "../../Context/dataCont";
import PDFPreviewModal from '../Modals/PdfPreviexModal';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Design Tokens (Banking Theme) ──────────────────────────────────────────

const CARD_BASE =
  "bg-[#111827] border border-white/5 shadow-xl rounded-xl p-4 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20";
const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-white text-sm font-medium rounded-lg transition-colors border border-white/5";
const BTN_WARNING =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-amber-600/20";
const BTN_INFO =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20";

export default function PaymentCard({ payment, handlePopup }) {
  const { authData } = useContext(UserContext);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfData, setPdfData] = useState(null);

  const paymentId = payment._id || payment.id;
  const dateTime = new Date(payment.date || payment.createdAt).toLocaleString('fr-FR');
  const isReversed = payment.reversed === true;

  // Common function: fetch PDF preview blob from the backend
  const fetchReceiptBlob = async () => {
    const response = await fetch(`${NEST_API_URL}/pdf/preview/receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify({ paymentId }),
    });

    if (!response.ok) {
      let errorMsg = 'Échec de la génération du reçu';
      try { const err = await response.json(); errorMsg = err.message || errorMsg; } catch (_) {}
      throw new Error(errorMsg);
    }

    return await response.blob();
  };

  // Download the receipt directly (no modal)
  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      const blob = await fetchReceiptBlob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `recu_paiement_${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      if (handlePopup) handlePopup('success', 'Reçu téléchargé avec succès');
    } catch (err) {
      console.error('❌ Download error:', err);
      if (handlePopup) handlePopup('error', err.message || 'Impossible de télécharger le reçu');
    } finally {
      setIsDownloading(false);
    }
  };

  // Preview the receipt in modal
  const handlePreview = async () => {
    try {
      const blob = await fetchReceiptBlob();
      const blobUrl = URL.createObjectURL(blob);

      setPdfData({
        blobUrl,
        title: `Reçu de paiement #${paymentId}`,
        downloadUrl: null,   // no permanent downloadUrl from preview
      });
      setShowPreview(true);
    } catch (err) {
      console.error('❌ Preview error:', err);
      if (handlePopup) handlePopup('error', err.message || "Impossible de charger l'aperçu");
    }
  };

  return (
    <>
      <div className={CARD_BASE}>
        <div className="flex justify-between items-start mb-3">
          <span className="text-emerald-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            Paiement
          </span>
          <span className="text-xs text-[#64748B]">{dateTime}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Montant :</span>
            <span className="font-mono text-white font-semibold">{payment.amount} DA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Mode :</span>
            <span className="capitalize text-[#F8FAFC]">{payment.type || payment.method || payment.paymentMethod || 'N/A'}</span>
          </div>
          {payment.fromCredit && <div className="text-teal-400 text-xs">Payé par crédit</div>}
          {payment.notes && <div className="text-[#64748B] text-xs mt-1">{payment.notes}</div>}
          {isReversed && (
            <div className="text-red-400 text-xs font-semibold mt-1">⚠️ Remboursé / Annulé</div>
          )}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className={`${BTN_PRIMARY} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isDownloading ? 'Téléchargement...' : 'Télécharger'}
          </button>
          <button
            onClick={handlePreview}
            className={BTN_WARNING}
          >
            Aperçu
          </button>
        </div>
      </div>

      {showPreview && pdfData && (
        <PDFPreviewModal
          type="payment"
          data={pdfData}
          onClose={() => {
            setShowPreview(false);
            setPdfData(null);
          }}
        />
      )}
    </>
  );
}