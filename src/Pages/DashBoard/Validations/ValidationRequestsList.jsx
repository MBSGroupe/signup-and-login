import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useModal } from '../../../Context/ModalContext';
import BackButton from '../../../Components/Buttons/BackButton';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ValidationRequestsList() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { confirm } = useModal(); // centralized modal
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const getTargetDisplay = (targetType, target) => {
    if (!target) return 'N/A';
    switch (targetType) {
      case 'User':
        return target.fullName || `${target.name || ''} ${target.lastname || ''}`.trim() || target.id;
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return target.type || target.feeType || `Cotisation ${target.year || ''}` || target.id;
      default:
        return typeof target === 'object' ? target.id : target;
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/approver?status=${filter}`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      return res;
    }, { showSuccessMessage: false }); // no success toast for data fetching

    if (result) {
      // 'result' is the unwrapped data – expected to contain 'requests'
      setRequests(result.requests || []);
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authData?.token) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, authData?.token]);

  const handleCancel = async (requestId) => {
    // Replace native confirm with modal
    const confirmed = await confirm({
      title: 'Annuler la demande',
      message: 'Annuler cette demande de validation ?',
    });
    if (!confirmed) return;

    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/${requestId}/cancel`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Annulée par l\'utilisateur' })
        },
        authData.token,
        setAuthData
      );
      return res;
    }, {
      showSuccessMessage: true,
      successMessage: 'Demande annulée avec succès'
    });

    if (result) {
      // Refresh the list after successful cancellation
      fetchRequests();
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-600/20 text-yellow-300 border-yellow-500',
      partial: 'bg-blue-600/20 text-blue-300 border-blue-500',
      approved: 'bg-green-600/20 text-green-300 border-green-500',
      rejected: 'bg-red-600/20 text-red-300 border-red-500',
      cancelled: 'bg-gray-600/20 text-gray-300 border-gray-500',
      expired: 'bg-orange-600/20 text-orange-300 border-orange-500',
    };
    return colors[status] || 'bg-gray-600/20 text-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath="/dash" />
      </div>
      <Title title="Demandes de validation" />
      <div className="mb-6 flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-gray-900/40 border border-gray-700 text-yellow-300"
        >
          <option value="pending">En attente</option>
          <option value="partial">Partiellement approuvées</option>
          <option value="all">Toutes</option>
        </select>
      </div>
      <div className="space-y-4">
        {requests.length === 0 && <p className="text-gray-400">Aucune demande trouvée.</p>}
        {requests.map((req, idx) => (
          <div
            key={req.id || idx}
            className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition"
          >
            <div className="flex justify-between items-start">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/dash/validation/requests/${req.id}`)}
              >
                <h3 className="text-lg font-semibold">
                  {req.targetType} – {getTargetDisplay(req.targetType, req.targetId)}
                </h3>
                <p className="text-sm text-gray-400">Créée le {new Date(req.createdAt).toLocaleDateString()}</p>
                <div className="mt-2 flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(req.status)}`}>
                    {req.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {['pending', 'partial'].includes(req.status) && (
                  <button
                    onClick={() => handleCancel(req.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Annuler
                  </button>
                )}
                <span
                  className="text-gray-400 text-xl cursor-pointer"
                  onClick={() => navigate(`/dash/validation/requests/${req.id}`)}
                >
                  →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}