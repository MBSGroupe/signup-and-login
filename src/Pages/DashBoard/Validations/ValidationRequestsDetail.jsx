import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useApi } from '../../../hooks/useApi';
import { useError } from '../../../Context/ErrorContext';
import BackButton from '../../../Components/Buttons/BackButton';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ValidationRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { showWarning } = useError(); // ✅ Already destructured at top level
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState({});

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
      }, { showSuccessMessage: false });

      if (result) {
        setRequest(result);
      }
      setLoading(false);
    };

    if (authData?.token) {
      fetchRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authData?.token, setAuthData]);

  const handleStepAction = async (stepOrder, action) => {
    const comment = comments[stepOrder] || '';
    if (!comment && action !== 'skip') {
      showWarning('Veuillez ajouter un commentaire'); // ✅ Use the top-level function
      return;
    }

    setActionLoading(true);

    let body;
    if (action === 'approve') {
      body = { comments: comment };
    } else {
      body = { reason: comment };
    }

    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/${id}/${action}/${stepOrder}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        authData.token,
        setAuthData
      );
      return res;
    }, {
      showSuccessMessage: true,
      successMessage: `Étape ${action}ée avec succès`,
    });

    console.log('API result after action:', result);

    if (result) {
      const updatedRequest = result.request || result;
      console.log('Setting request to:', updatedRequest);
      setRequest(updatedRequest);
      setComments(prev => ({ ...prev, [stepOrder]: '' }));
    }

    setActionLoading(false);
  };

  const updateComment = (stepOrder, value) => {
    setComments(prev => ({ ...prev, [stepOrder]: value }));
  };

  const getStepStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-600/20 text-yellow-300',
      approved: 'bg-green-600/20 text-green-300',
      rejected: 'bg-red-600/20 text-red-300',
      expired: 'bg-orange-600/20 text-orange-300',
      skipped: 'bg-gray-600/20 text-gray-300',
    };
    return colors[status] || 'bg-gray-600/20';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-yellow-300">Chargement...</div>;
  if (!request) return <div className="min-h-screen flex items-center justify-center text-red-400">Demande non trouvée</div>;

  const userId = authData.user?.id;

  const userSteps = request.steps?.filter(step =>
    step.isActive === true &&
    step.allowedUserIds?.some(user => user.id.toString() === userId?.toString())
  ) || [];

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath="/dash/validation/requests" />
      </div>

      <Title title={`Demande #${request.id?.slice(-6)}`} />
      <div className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6 mb-6">
        <p><span className="text-gray-400">Cible :</span> {request.targetType} – {getTargetDisplay(request.targetType, request.targetId)}</p>
        <p><span className="text-gray-400">Statut :</span> {request.status}</p>
        {request.expiresAt && <p><span className="text-gray-400">Expire le :</span> {new Date(request.expiresAt).toLocaleString()}</p>}
      </div>

      <h3 className="text-lg font-semibold mb-4">Étapes à valider</h3>
      <div className="space-y-4 mb-6">
        {userSteps.length === 0 && (
          <p className="text-gray-400 text-center py-8">Aucune étape en attente pour vous.</p>
        )}
        {userSteps.map((step, idx) => (
          <div key={idx} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">Étape {step.order} – {step.stepName}</h4>
                <p className="text-sm text-gray-400">Rôle requis : {step.requiredRole}</p>
                {step.comments && <p className="text-sm text-gray-300 mt-1">Commentaire : {step.comments}</p>}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStepStatusBadge(step.status)}`}>
                {step.status}
              </span>
            </div>
            {step.status === 'pending' && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <textarea
                  value={comments[step.order] || ''}
                  onChange={(e) => updateComment(step.order, e.target.value)}
                  placeholder="Commentaire (obligatoire pour approbation/rejet)"
                  className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-gray-200"
                  rows="2"
                />
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleStepAction(step.order, 'approve')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => handleStepAction(step.order, 'reject')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                  {(authData.user?.role === 'admin' || authData.user?.role === 'super_admin') && (
                    <button
                      onClick={() => handleStepAction(step.order, 'skip')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Ignorer (admin)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}