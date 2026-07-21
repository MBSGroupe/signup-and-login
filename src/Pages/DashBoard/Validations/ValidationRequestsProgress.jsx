import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useApi } from '../../../hooks/useApi';
import BackButton from '../../../Components/Buttons/BackButton';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ValidationRequestProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/request/${id}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        return res;
      }, { showSuccessMessage: false }); // no success toast for data fetch

      if (result) {
        console.log(result);
        setRequest(result);
      }
      setLoading(false);
    };

    if (authData?.token) fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authData.token, setAuthData]);

  const getStepStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-600/20 text-yellow-300',
      approved: 'bg-green-600/20 text-green-300',
      rejected: 'bg-red-600/20 text-red-300',
      expired: 'bg-orange-600/20 text-orange-300',
      skipped: 'bg-gray-600/20 text-gray-300',
      cancelled: 'bg-gray-600/20 text-gray-300',
    };
    return colors[status] || 'bg-gray-600/20';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-yellow-300">Chargement...</div>;
  if (!request) return <div className="min-h-screen flex items-center justify-center text-red-400">Demande non trouvée</div>;

  const sortedSteps = [...(request.steps || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath="/dash/validation/requests" />
      </div>

      <Title title={`Progrès de la demande #${request.id?.slice(-6)}`} />

      <div className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6 mb-6">
        <p><span className="text-gray-400">Cible :</span> {request.targetType} – {getTargetDisplay(request.targetType, request.targetId)}</p>
        <p><span className="text-gray-400">Statut global :</span> 
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStepStatusBadge(request.status)}`}>
            {request.status}
          </span>
        </p>
        <p><span className="text-gray-400">Créée par :</span> {request.createdBy?.name || request.createdBy?.email || request.createdBy}</p>
        <p><span className="text-gray-400">Créée le :</span> {new Date(request.createdAt).toLocaleString()}</p>
        {request.expiresAt && <p><span className="text-gray-400">Expire le :</span> {new Date(request.expiresAt).toLocaleString()}</p>}
      </div>

      <h3 className="text-lg font-semibold mb-4">Détail des étapes</h3>
      <div className="space-y-4 mb-6">
        {sortedSteps.map((step, idx) => (
          <div key={idx} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">Étape {step.order} – {step.stepName}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStepStatusBadge(step.status)}`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Rôle requis : {step.requiredRole}</p>
                {step.allowedUserIds && step.allowedUserIds.length > 0 && (
                  <p className="text-sm text-gray-400">
                    Assignée à : {step.allowedUserIds.map(u => u.name || u.email || u.id).join(', ')}
                  </p>
                )}
                {step.approvedBy && (
                  <p className="text-sm text-gray-300 mt-1">
                    Traitée par : {step.approvedBy.name || step.approvedBy.email || step.approvedBy}
                  </p>
                )}
                {step.approvedAt && (
                  <p className="text-sm text-gray-300">
                    Date : {new Date(step.approvedAt).toLocaleString()}
                  </p>
                )}
                {step.comments && (
                  <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700">
                    <p className="text-sm text-gray-200">Commentaire :</p>
                    <p className="text-sm text-gray-300">{step.comments}</p>
                  </div>
                )}
                {step.timeout && step.timeout.duration > 0 && step.status === 'pending' && (
                  <p className="text-xs text-orange-400 mt-1">
                    ⏳ Délai : {step.timeout.duration} heures – Action en cas de dépassement : {step.timeout.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}