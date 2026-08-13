import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../Context/dataCont";
import MarkFeePaidModal from "../Modals/PayFee";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Design Tokens (Banking Theme) ──────────────────────────────────────────

const CARD_BASE =
  "bg-[#111827] border border-white/5 shadow-xl rounded-xl p-4 transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5";
const BADGE_BASE =
  "px-2.5 py-0.5 rounded-full text-xs font-medium border";
const MENU_BUTTON =
  "p-1.5 text-[#64748B] hover:text-white rounded-lg transition-colors hover:bg-white/5";

const statusColors = {
  pending: `${BADGE_BASE} bg-amber-500/10 text-amber-400 border-amber-500/20`,
  paid: `${BADGE_BASE} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`,
  partial: `${BADGE_BASE} bg-blue-500/10 text-blue-400 border-blue-500/20`,
  overdue: `${BADGE_BASE} bg-red-500/10 text-red-400 border-red-500/20`,
  cancelled: `${BADGE_BASE} bg-gray-500/10 text-gray-400 border-gray-500/20`,
};

const statusLabels = {
  pending: "En attente",
  paid: "Payée",
  partial: "Partielle",
  overdue: "En retard",
  cancelled: "Annulée",
};

export default function CotisationCard({ cotisation, onCotisationUpdated, isOwner }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const { authData, setAuthData } = useContext(UserContext);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dueDate = new Date(cotisation.dueDate).toLocaleDateString("fr-FR");

  // Use computed data (provided by backend)
  const computed = cotisation.computed || {};
  const status = computed.status || "pending";
  const totalPaid = computed.totalPaid || 0;
  const totalDue = computed.totalDue || cotisation.amount;
  const remaining = computed.remaining || totalDue;
  const penalty = computed.penalty || 0;
  const lastPaymentDate = computed.lastPaymentDate
    ? new Date(computed.lastPaymentDate).toLocaleDateString("fr-FR")
    : null;

  const handleEdit = () => {
    navigate(`/auth/edit/fee/${cotisation.id}`);
    setMenuOpen(false);
  };

  const handleCancel = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/fees/${cotisation.id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      if (response.ok) {
        if (onCotisationUpdated) onCotisationUpdated();
      } else {
        const error = await response.json();
        console.error(error);
      }
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(false);
  };

  const handleReactivate = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/fees/${cotisation.id}/reactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      if (response.ok) {
        if (onCotisationUpdated) onCotisationUpdated();
      } else {
        const error = await response.json();
        console.error(error);
      }
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(false);
  };

  return (
    <div className={CARD_BASE}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            Cotisation {cotisation.year}
          </span>
          <span className={statusColors[status] || statusColors.pending}>
            {statusLabels[status] || status}
          </span>
        </div>

        {!isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={MENU_BUTTON}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#182233] border border-white/10 rounded-lg shadow-2xl z-10 overflow-hidden">
                <ul className="py-1 text-sm text-[#94A3B8]">
                  <li
                    onClick={handleEdit}
                    className="px-4 py-2 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                  >
                    Modifier
                  </li>
                  {status === 'cancelled' ? (
                    <li
                      onClick={handleReactivate}
                      className="px-4 py-2 hover:bg-white/5 hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                      Réactiver
                    </li>
                  ) : (
                    <li
                      onClick={handleCancel}
                      className="px-4 py-2 hover:bg-white/5 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      Annuler
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Montant :</span>
          <span className="font-mono text-white font-semibold">{cotisation.amount} DA</span>
        </div>

        {penalty > 0 && (
          <div className="flex justify-between text-red-400">
            <span>Pénalité :</span>
            <span className="font-mono">{penalty} DA</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Total dû :</span>
          <span className="font-mono text-white font-semibold">{totalDue} DA</span>
        </div>

        {totalPaid > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Payé :</span>
            <span className="font-mono">{Math.min(totalPaid, totalDue)} DA</span>
          </div>
        )}

        {remaining > 0 && status !== 'paid' && (
          <div className="flex justify-between text-amber-400 font-medium">
            <span>Reste à payer :</span>
            <span className="font-mono">{remaining} DA</span>
          </div>
        )}

        {status === 'paid' && (
          <div className="flex justify-between text-emerald-400 font-medium">
            <span>Statut :</span>
            <span>Soldé</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Échéance :</span>
          <span className="text-[#F8FAFC]">{dueDate}</span>
        </div>

        {lastPaymentDate && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Dernier paiement :</span>
            <span className="text-[#F8FAFC]">{lastPaymentDate}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Type :</span>
          <span className="capitalize text-[#F8FAFC]">{cotisation.feeType}</span>
        </div>

        {cotisation.user?.fullName && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Membre :</span>
            <span className="text-[#F8FAFC]">{cotisation.user.fullName || `${cotisation.user.name} ${cotisation.user.lastname}`}</span>
          </div>
        )}
      </div>

      {cotisation.notes && (
        <div className="mt-3 pt-2 border-t border-white/5 text-sm text-[#64748B]">
          {cotisation.notes}
        </div>
      )}
    </div>
  );
}