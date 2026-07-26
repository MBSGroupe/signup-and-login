import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useModal } from '../../../Context/ModalContext';
import BackButton from '../../../Components/Buttons/BackButton';
import {
  Loader2,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Calendar,
  User,
  FileText,
  CreditCard,
  Eye,
  ChevronRight,
  X,
  ListChecks
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ValidationRequestsList() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { confirm } = useModal();
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
    }, { showSuccessMessage: false });

    if (result) {
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
      fetchRequests();
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      partial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      expired: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3.5 h-3.5" />;
      case 'partial':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'approved':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'cancelled':
        return <X className="w-3.5 h-3.5" />;
      case 'expired':
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getTargetIcon = (type) => {
    switch (type) {
      case 'User':
        return <User className="w-4 h-4" />;
      case 'File':
        return <FileText className="w-4 h-4" />;
      case 'Cotisation':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button and Title */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ListChecks className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Demandes de validation
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Demandes vous étant assignées en tant qu'approbateur
              </p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 mb-6 shadow-lg flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Filter className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">Filtrer</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-[160px] px-4 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          >
            <option value="pending">En attente</option>
            <option value="partial">Partiellement approuvées</option>
            <option value="all">Toutes</option>
          </select>
          <span className="text-xs text-[#64748B] ml-auto">
            {requests.length} demande{requests.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Request list */}
        {requests.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#94A3B8] text-lg font-medium">Aucune demande trouvée</p>
            <p className="text-[#64748B] text-sm mt-1">Modifiez les filtres ou revenez plus tard.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req, idx) => (
              <div
                key={req.id || idx}
                className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#182233] transition-all duration-200 shadow-lg group"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left side - clickable to navigate */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/dash/validation/requests/${req.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        {getTargetIcon(req.targetType)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-[#F8FAFC] truncate">
                          {req.targetType} – {getTargetDisplay(req.targetType, req.targetId)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span className="text-xs text-[#64748B] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="text-xs text-[#64748B] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {req.createdBy?.name || 'Inconnu'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(req.status)}`}>
                        {getStatusIcon(req.status)}
                        {req.status}
                      </span>
                      {req.step && (
                        <span className="text-xs text-[#64748B]">
                          Étape : {req.step}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side - actions */}
                  <div className="flex items-center gap-2">
                    {['pending', 'partial'].includes(req.status) && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all text-xs font-medium"
                      >
                        <X className="w-3.5 h-3.5" />
                        Annuler
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/dash/validation/requests/${req.id}`)}
                      className="text-[#64748B] hover:text-emerald-400 transition-colors p-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}