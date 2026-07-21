// AllValidationRequests.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { useApi } from '../../../hooks/useApi';
import { fetchWithRefresh } from '../../../Components/api';
import Title from '../../../Components/Title';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function AllValidationRequests() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/all?status=${filter}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        return res;
      }, { showSuccessMessage: false }); 

      if (result) {
        setRequests(result.requests || []);
      }
      setLoading(false);
    };

    if (authData?.token) fetchRequests();
  }, [filter, authData?.token, setAuthData]);

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

  const getTargetDisplay = (req) => {
    const target = req.targetId;
    if (!target) return req.targetId?._id || req.targetId;
    switch (req.targetType) {
      case 'User':
        return target.fullName || `${target.name || ''} ${target.lastname || ''}`.trim() || target._id;
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return `Cotisation ${target.year}`;
      default:
        return typeof target === 'object' ? target._id : target;
    }
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
      <Title title="Toutes les demandes de validation" />
      <div className="mb-6 flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-gray-900/40 border border-gray-700 text-yellow-300"
        >
          <option value="all">Toutes</option>
          <option value="pending">En attente</option>
          <option value="partial">Partielles</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
          <option value="cancelled">Annulées</option>
          <option value="expired">Expirées</option>
        </select>
      </div>
      <div className="space-y-4">
        {requests.length === 0 && <p className="text-gray-400">Aucune demande trouvée.</p>}
        {requests.map((req) => (
          <div
            key={req.id}
            className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition cursor-pointer"
            onClick={() => navigate(`/dash/validation/progress/${req.id}`)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {req.targetType} – {getTargetDisplay(req)}
                </h3>
                <p className="text-sm text-gray-400">
                  Créé par : {req.createdBy?.name || req.createdBy} le {new Date(req.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(req.status)}`}>
                    {req.status}
                  </span>
                </div>
              </div>
              <div className="text-gray-400 text-xl">→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}