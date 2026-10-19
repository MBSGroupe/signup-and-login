import { useContext, useState } from "react";
import { UserContext } from "../../Context/dataCont";
import { previewDocument, emailDocument, downloadBlob } from "../documents";
import PDFPreviewModal from '../Modals/pdfPreviexModal';

// DocumentTemplate key of the credit-transaction receipt.
const VERSEMENT_TEMPLATE = 'versement';

// ─── Design Tokens (Banking Theme) ──────────────────────────────────────────

const CARD_BASE =
  "bg-[#111827] border border-white/5 shadow-xl rounded-xl p-4 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20";
const BTN_WARNING =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-amber-600/20";
const BTN_INFO =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20";

export default function CreditTransactionCard({ transaction, handlePopup }) {
  const { authData, setAuthData } = useContext(UserContext);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

  const auth = { token: authData.token, setAuthData };

  const handleDownloadVersementReceipt = async () => {
    if (transaction.amount <= 0) return;
    setIsDownloading(true);
    try {
      const blob = await previewDocument(VERSEMENT_TEMPLATE, transaction.id, auth);
      downloadBlob(blob, `recu_versement_${transaction.id}.pdf`);
    } catch (err) {
      console.error(err);
      if (handlePopup) handlePopup('error', err.message || 'Impossible de télécharger le reçu');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (transaction.amount <= 0) return;
    setPreviewData({ title: 'Reçu de versement' });
    setShowPreview(true);
    try {
      const blob = await previewDocument(VERSEMENT_TEMPLATE, transaction.id, auth);
      setPreviewData({ title: 'Reçu de versement', blobUrl: URL.createObjectURL(blob) });
    } catch (err) {
      console.error(err);
      setShowPreview(false);
      if (handlePopup) handlePopup('error', err.message || "Impossible de charger l'aperçu");
    }
  };

  const closePreview = () => {
    if (previewData?.blobUrl) URL.revokeObjectURL(previewData.blobUrl);
    setPreviewData(null);
    setShowPreview(false);
  };

  const handleEmailVersementReceipt = async () => {
    if (transaction.amount <= 0) return;
    const defaultEmail = authData?.user?.email || '';
    const recipient = window.prompt('Adresse email du destinataire :', defaultEmail);
    if (!recipient) return;

    setIsSendingEmail(true);
    try {
      await emailDocument(VERSEMENT_TEMPLATE, transaction.id, recipient, auth);
      if (handlePopup) handlePopup('success', 'Reçu envoyé par email avec succès');
    } catch (err) {
      console.error(err);
      if (handlePopup) handlePopup('error', err.message || 'Impossible d\'envoyer le reçu');
    } finally {
      setIsSendingEmail(false);
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

        {/* ─── Button Grid (3 equal columns) ────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button
            onClick={handleDownloadVersementReceipt}
            disabled={isDownloading}
            className={`${BTN_PRIMARY} w-full disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isDownloading ? 'Téléchargement...' : 'Télécharger'}
          </button>
          <button
            onClick={handlePreview}
            className={`${BTN_WARNING} w-full`}
          >
            Aperçu
          </button>
          <button
            onClick={handleEmailVersementReceipt}
            disabled={isSendingEmail}
            className={`${BTN_INFO} w-full disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isSendingEmail ? 'Envoi...' : '📧 Email'}
          </button>
        </div>

        {showPreview && (
          <PDFPreviewModal
            type="versement"
            data={previewData}
            isGenerating={!previewData?.blobUrl}
            onClose={closePreview}
          />
        )}
      </div>
    </>
  );
}