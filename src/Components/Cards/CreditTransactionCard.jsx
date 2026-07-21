import { useContext, useState } from "react";
import { UserContext } from "../../Context/dataCont";
import PDFPreviewModal from '../Modals/pdfPreviexModal';

const API_URL = import.meta.env.VITE_API_URL;

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

export default function CreditTransactionCard({ transaction, handlePopup }) {
  const { authData } = useContext(UserContext);
  const [showPreview, setShowPreview] = useState(false);
  const dateTime = new Date(transaction.date).toLocaleString('fr-FR');
  const isPositive = transaction.amount > 0;
  const amountColor = isPositive ? 'text-emerald-400' : 'text-red-400';
  const amountPrefix = isPositive ? '+' : '';

  const typeLabels = {
    deposit: 'Dépôt',
    used_for_fee: 'Utilisé pour cotisation',
    excess_from_fee: 'Remboursement (excedent)',
    versement: 'Versement',
    repayment: 'Retrait'
  };

  const handleDownloadVersementReceipt = async () => {
    if (transaction.amount <= 0) return;
    try {
      const response = await fetch(`${API_URL}/pdf/versement/${transaction._id}/receipt`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erreur lors du téléchargement');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_versement_${transaction._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      if (handlePopup) handlePopup('error', 'Impossible de télécharger le reçu');
    }
  };

  const handleEmailVersementReceipt = async () => {
    if (transaction.amount <= 0) return;
    try {
      const response = await fetch(`${API_URL}/pdf/versement/${transaction._id}/email`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        if (handlePopup) handlePopup('success', 'Reçu envoyé par email avec succès');
      } else {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      console.error(err);
      if (handlePopup) handlePopup('error', 'Impossible d\'envoyer le reçu par email');
    }
  };

  return (
    <>
      <div className={CARD_BASE}>
        <div className="flex justify-between items-start mb-3">
          <span className="text-blue-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
            Crédit
          </span>
          <span className="text-xs text-[#64748B]">{dateTime}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Montant :</span>
            <span className={`font-mono font-semibold ${amountColor}`}>
              {amountPrefix}{transaction.amount} DA
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Type :</span>
            <span className="capitalize text-[#F8FAFC]">{typeLabels[transaction.type] || transaction.type}</span>
          </div>
          {transaction.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Mode :</span>
              <span className="capitalize text-[#F8FAFC]">{transaction.paymentMethod}</span>
            </div>
          )}
          {transaction.notes && <div className="text-[#64748B] text-xs mt-1">{transaction.notes}</div>}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={handleDownloadVersementReceipt}
            className={BTN_PRIMARY}
          >
            Télécharger
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={BTN_WARNING}
          >
            Aperçu
          </button>
          <button
            onClick={handleEmailVersementReceipt}
            className={BTN_INFO}
          >
            Email
          </button>
        </div>
        {showPreview && (
          <PDFPreviewModal
            type="versement"
            data={transaction}
            onClose={() => setShowPreview(false)}
            authData={authData}
          />
        )}
      </div>
    </>
  );
}