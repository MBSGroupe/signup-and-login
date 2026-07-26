// components/DeleteItem.jsx
import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from '../Context/dataCont';
import { fetchWithRefresh } from './api';
import { AlertTriangle, Trash2, X, Check, Loader2, ArrowLeft } from "lucide-react";

export default function DeleteItem({ mode }) { // mode = "user" ou "cotisation"
  const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
  const { authData, setAuthData } = useContext(UserContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Définir l'URL et les libellés selon le mode
  const config = {
    user: {
      endpoint: `${NEST_API_URL}/users/${id}`,
      method : 'DELETE',
      redirect: -1,
      successMsg: "✅ Utilisateur supprimé avec succès.",
      confirmMsg: "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.",
      title: "Suppression d'utilisateur",
      icon: Trash2,
      actionLabel: "Supprimer",
      cancelLabel: "Annuler",
    },
    cotisation: {
      endpoint: `${NEST_API_URL}/fee/cancel/${id}`,
      method : 'PATCH',
      redirect: "/dash/allCotisations",
      successMsg: "✅ Cotisation annulée avec succès.",
      confirmMsg: "Êtes-vous sûr de vouloir annuler cette cotisation ? Cette action est irréversible.",
      title: "Annulation de cotisation",
      icon: AlertTriangle,
      actionLabel: "Annuler",
      cancelLabel: "Retour",
    }
  };

  const current = config[mode];

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetchWithRefresh(
        current.endpoint,
        {
          method: current.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.token}`,
          },
        },
        authData.token,
        setAuthData
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(current.successMsg);
        setTimeout(() => {
          if (typeof current.redirect === 'number') {
            navigate(current.redirect);
          } else {
            navigate(current.redirect);
          }
        }, 2000);
      } else {
        setMessage(data.message || "❌ Échec de la suppression.");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-8 text-center">
          {message ? (
            // RESULT STATE
            <>
              <div className="flex justify-center mb-4">
                {message.includes("succès") ? (
                  <Check className="w-12 h-12 text-emerald-400" />
                ) : (
                  <X className="w-12 h-12 text-rose-400" />
                )}
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
                {message.includes("succès") ? "Succès" : "Erreur"}
              </h2>
              <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
                {message}
              </p>
              <button
                onClick={() => {
                  if (typeof current.redirect === 'number') {
                    navigate(current.redirect);
                  } else {
                    navigate(current.redirect);
                  }
                }}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </>
          ) : !confirmed ? (
            // CONFIRMATION STATE
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <current.icon className="w-8 h-8 text-rose-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
                {current.title}
              </h2>
              <p className="mt-3 text-[#94A3B8] text-sm leading-relaxed">
                {current.confirmMsg}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setConfirmed(true)}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/20 flex items-center gap-2"
                >
                  <current.icon className="w-4 h-4" />
                  {current.actionLabel}
                </button>
                <button
                  onClick={() => {
                    if (typeof current.redirect === 'number') {
                      navigate(current.redirect);
                    } else {
                      navigate(current.redirect);
                    }
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
                >
                  {current.cancelLabel}
                </button>
              </div>
            </>
          ) : (
            // ACTION STATE (confirmed, waiting for delete)
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
                Opération en cours...
              </h2>
              <p className="mt-2 text-[#64748B] text-sm">
                Veuillez patienter un instant.
              </p>
              <button
                onClick={handleDelete}
                disabled={loading}
                className={`mt-6 px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 w-full ${
                  loading
                    ? "bg-[#1F2937] text-[#64748B] cursor-not-allowed"
                    : "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <current.icon className="w-4 h-4" />
                    Confirmer
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}