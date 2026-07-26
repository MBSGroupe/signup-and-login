import { useContext, useState } from "react";
import { UserContext } from "../../Context/dataCont";
import PDFPreviewModal from '../Modals/PdfPreviexModal';
import { Download, Eye, Mail, CreditCard, Calendar, AlertCircle } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function PaymentCard({ payment, handlePopup }) {
  const { authData } = useContext(UserContext);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
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
        downloadUrl: null,
      });
      setShowPreview(true);
    } catch (err) {
      console.error('❌ Preview error:', err);
      if (handlePopup) handlePopup('error', err.message || "Impossible de charger l'aperçu");
    }
  };

  // Send receipt by email
  const handleEmailReceipt = async () => {
    const defaultEmail = payment?.user?.email || '';
    const recipient = window.prompt('Adresse email du destinataire :', defaultEmail);
    if (!recipient) return;

    setIsSendingEmail(true);
    try {
      const res = await fetch(`${NEST_API_URL}/pdf/send-receipt-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({ paymentId, recipientEmail: recipient }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Échec de l\'envoi' }));
        throw new Error(err.message);
      }
      if (handlePopup) handlePopup('success', 'Reçu envoyé avec succès ✅');
    } catch (err) {
      console.error('❌ Email error:', err);
      if (handlePopup) handlePopup('error', err.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <div className="bg-[#111827] border border-[rgba(255,255,255,0.06)] shadow-xl shadow-black/50 rounded-xl p-5 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5">
        {/* Header: payment badge + date */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span className="text-emerald-400 font-medium text-sm">Paiement</span>
          </div>
          <span className="text-xs text-[#64748B] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateTime}
          </span>
        </div>

        {/* Payment details */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Montant :</span>
            <span className="font-mono text-white font-semibold">{payment.amount} DA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Mode :</span>
            <span className="capitalize text-[#F8FAFC]">{payment.type || payment.method || payment.paymentMethod || 'N/A'}</span>
          </div>
          {payment.fromCredit && (
            <div className="text-teal-400 text-xs flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Payé par crédit
            </div>
          )}
          {payment.notes && (
            <div className="text-[#64748B] text-xs mt-1">{payment.notes}</div>
          )}
          {isReversed && (
            <div className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Remboursé / Annulé
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                Chargement...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Télécharger
              </>
            )}
          </button>
          <button
            onClick={handlePreview}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1F2937] hover:bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-medium rounded-lg transition-all border border-[rgba(255,255,255,0.06)]"
          >
            <Eye className="w-4 h-4" />
            Aperçu
          </button>
          <button
            onClick={handleEmailReceipt}
            disabled={isSendingEmail}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingEmail ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                Envoi...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Email
              </>
            )}
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