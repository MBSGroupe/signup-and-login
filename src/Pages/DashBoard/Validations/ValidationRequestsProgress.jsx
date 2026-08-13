import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useApi } from '../../../Hooks/useApi';
import BackButton from '../../../Components/Buttons/BackButton';
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  CreditCard,
  Calendar,
  MessageSquare,
  Eye,
  ArrowRight,
  Check,
  X,
  SkipForward,
  History,
  GitBranch,
  Users,
  Timer,
  Info
} from 'lucide-react';

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
      }, { showSuccessMessage: false });

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
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      expired: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      skipped: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStepStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5" />;
      case 'approved': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
      case 'expired': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'skipped': return <SkipForward className="w-3.5 h-3.5" />;
      case 'cancelled': return <X className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getTargetIcon = (type) => {
    switch (type) {
      case 'User': return <User className="w-4 h-4" />;
      case 'File': return <FileText className="w-4 h-4" />;
      case 'Cotisation': return <CreditCard className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement du progrès...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-lg font-medium">Demande non trouvée</p>
          <p className="text-[#94A3B8] text-sm mt-1">Cette demande n'existe pas ou a été supprimée.</p>
          <button
            onClick={() => navigate('/dash/validation/requests')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            <ArrowRight className="w-4 h-4" />
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  const sortedSteps = [...(request.steps || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button and Title */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/validation/requests" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <History className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Progrès de la demande #{request.id?.slice(-6)}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Suivi détaillé du workflow de validation
              </p>
            </div>
          </div>
        </div>

        {/* Request info card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 mb-6 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                {getTargetIcon(request.targetType)}
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Cible</p>
                <p className="text-[#F8FAFC] font-medium text-sm">{request.targetType} – {getTargetDisplay(request.targetType, request.targetId)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Info className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Statut global</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStepStatusBadge(request.status)}`}>
                  {getStepStatusIcon(request.status)}
                  {request.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <User className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Créée par</p>
                <p className="text-[#F8FAFC] font-medium text-sm">{request.createdBy?.name || request.createdBy?.email || request.createdBy || 'Inconnu'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Créée le</p>
                <p className="text-[#F8FAFC] font-medium text-sm">{new Date(request.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
          {request.expiresAt && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-3">
              <Timer className="w-4 h-4 text-orange-400" />
              <p className="text-sm text-[#94A3B8]">
                <span className="text-orange-400 font-medium">Expire le :</span> {new Date(request.expiresAt).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </div>

        {/* Steps timeline */}
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-emerald-400" />
          Détail des étapes
        </h3>
        <div className="space-y-4 mb-6">
          {sortedSteps.map((step, idx) => (
            <div
              key={idx}
              className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] transition-all shadow-lg"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                        {step.order}
                      </span>
                      <h4 className="text-lg font-semibold text-[#F8FAFC]">
                        {step.stepName}
                      </h4>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStepStatusBadge(step.status)}`}>
                      {getStepStatusIcon(step.status)}
                      {step.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#94A3B8] mt-1">
                    <span className="text-[#64748B]">Rôle requis :</span> {step.requiredRole}
                  </p>
                  {step.description && (
                    <p className="text-sm text-[#94A3B8] mt-1">{step.description}</p>
                  )}
                  {step.allowedUserIds && step.allowedUserIds.length > 0 && (
                    <div className="mt-2 flex items-start gap-2">
                      <Users className="w-3.5 h-3.5 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[#94A3B8]">
                        <span className="text-[#64748B]">Assignée à :</span>{' '}
                        {step.allowedUserIds.map(u => u.name || u.email || u.id).join(', ')}
                      </p>
                    </div>
                  )}
                  {step.approvedBy && (
                    <div className="mt-2 p-3 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-[#94A3B8]">
                          <span className="text-[#64748B]">Traitée par :</span>{' '}
                          <span className="text-[#F8FAFC]">{step.approvedBy.name || step.approvedBy.email || step.approvedBy}</span>
                        </span>
                        {step.approvedAt && (
                          <span className="text-[#94A3B8]">
                            <span className="text-[#64748B]">Date :</span>{' '}
                            <span className="text-[#F8FAFC]">{new Date(step.approvedAt).toLocaleString('fr-FR')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {step.comments && (
                    <div className="mt-2 p-3 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                      <p className="text-xs text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Commentaire
                      </p>
                      <p className="text-[#F8FAFC] text-sm mt-0.5">{step.comments}</p>
                    </div>
                  )}
                  {step.timeout && step.timeout.duration > 0 && step.status === 'pending' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-orange-400">
                      <Timer className="w-3.5 h-3.5" />
                      <span>Délai : {step.timeout.duration} heures – Action en cas de dépassement : {step.timeout.action}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}