// components/DeleteItem.jsx
import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from '../Context/dataCont';
import { fetchWithRefresh } from './api';

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
      redirect: "/dash/allUsers",
      successMsg: "✅ Utilisateur supprimé avec succès.",
      confirmMsg: "Êtes-vous sûr de vouloir supprimer cet utilisateur ?",
      title: "Suppression d'utilisateur"
    },
    cotisation: {
      endpoint: `${NEST_API_URL}/fee/cancel/${id}`,
      method : 'PATCH',
      redirect: "/dash/allCotisations",
      successMsg: "✅ Cotisation annulée avec succès.",
      confirmMsg: "Êtes-vous sûr de vouloir annuler cette cotisation ?",
      title: "Annulation de cotisation"
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
        setTimeout(() => navigate(current.redirect), 2000);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-300 font-urbanist p-8">
      <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/40 rounded-2xl shadow-xl shadow-black/30 p-10 w-[450px] text-center animate-fadeIn">
        <h2 className="text-xl font-bold mb-4 text-yellow-300">
          {message ? "Statut" : current.title}
        </h2>

        {message ? (
          <p className="text-yellow-200">{message}</p>
        ) : !confirmed ? (
          <>
            <p className="mb-6 text-yellow-200">{current.confirmMsg}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmed(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all"
              >
                Oui
              </button>
              <button
                onClick={() => navigate(current.redirect)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-all"
              >
                Annuler
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-yellow-200">Operation en cours...</p>
            <button
              onClick={handleDelete}
              disabled={loading}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {loading ? "Loading..." : "Confirmer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}