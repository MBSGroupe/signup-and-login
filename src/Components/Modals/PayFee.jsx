import { useState } from "react";
import { createPortal } from "react-dom";
import { fetchWithRefresh } from "../api";

export default function MarkFeePaidModal({
  cotisation,
  onClose,
  onSuccess,
  authData,
  setAuthData
}) {
  const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
  // Use computed data (dynamic penalty)
  const computed = cotisation.computed || {};
  const totalDue = computed.totalDue || cotisation.amount;
  const alreadyPaid = computed.totalPaid || 0;
  const remainingDue = computed.remaining || totalDue;
  const penalty = computed.penalty || 0;
  const userCredit = cotisation.user?.credit || 0;

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [creditToUse, setCreditToUse] = useState(0);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectivePaid = paidAmount + (useCredit ? creditToUse : 0);
  const newTotalPaid = alreadyPaid + effectivePaid;
  const balance = newTotalPaid - totalDue;
  const remainingAfter = balance < 0 ? Math.abs(balance) : 0;
  const creditAfter = balance > 0 ? balance : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      paymentDate,
      paymentMethod,
      amount: paidAmount,
      notes: notes || cotisation.notes,
      creditUsed: useCredit ? creditToUse : 0
    };

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/fee/pay/${cotisation._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        },
        authData.token,
        setAuthData
      );

      const data = await response.json();

      if (response.ok) {
        onSuccess?.(data.cotisation || data);
        onClose();
      } else {
        setError(data.message || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9999]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 border border-yellow-400/20 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-yellow-300 mb-4">
          {alreadyPaid > 0 ? "Modifier le paiement" : "Enregistrer un paiement"}
        </h2>
        <p className="text-gray-300 mb-2">Cotisation {cotisation.year}</p>
        <p className="text-gray-300 mb-1">Montant de base : {cotisation.amount} DA</p>
        {penalty > 0 && (
          <p className="text-red-400 text-sm mb-1">Pénalité : {penalty} DA</p>
        )}
        <p className="text-yellow-300 font-semibold mb-2">Total dû : {totalDue} DA</p>
        {alreadyPaid > 0 && (
          <p className="text-green-400 text-sm mb-4">Déjà payé : {alreadyPaid} DA</p>
        )}
        {remainingDue > 0 && alreadyPaid > 0 && (
          <p className="text-blue-400 text-sm mb-4">Reste à payer : {remainingDue} DA</p>
        )}

        {userCredit > 0 && (
          <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-3 mb-4">
            <p className="text-blue-300 text-sm">
              Crédit disponible : <span className="font-bold">{userCredit} DA</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Montant payé (espèces, virement, chèque)</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              min="0"
              step="1"
              required
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {userCredit > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                />
                <label className="text-sm text-gray-300">Utiliser mon crédit</label>
              </div>
              {useCredit && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Crédit à utiliser</label>
                  <input
                    type="number"
                    value={creditToUse}
                    onChange={(e) => setCreditToUse(Math.min(Number(e.target.value), userCredit, remainingDue))}
                    min="0"
                    max={Math.min(userCredit, remainingDue)}
                    step="1"
                    className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum : {Math.min(userCredit, remainingDue)} DA</p>
                </div>
              )}
            </div>
          )}

          {effectivePaid > 0 && (
            <div className="bg-gray-700/50 p-3 rounded-lg space-y-1">
              <p className="text-sm text-gray-300">
                Paiement effectif : <span className="font-mono">{effectivePaid} DA</span>
              </p>
              {remainingAfter > 0 && (
                <p className="text-yellow-400 text-xs">Créance restante : {remainingAfter} DA</p>
              )}
              {creditAfter > 0 && (
                <p className="text-blue-400 text-xs">Crédit généré : {creditAfter} DA</p>
              )}
              {balance === 0 && (
                <p className="text-green-400 text-xs">✓ Cotisation soldée</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-1">Date de paiement</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Mode de paiement</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Sélectionner</option>
              <option value="cash">Espèces</option>
              <option value="bank_transfer">Virement</option>
              <option value="check">Chèque</option>
              <option value="online">En ligne</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Confirmer le paiement"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}