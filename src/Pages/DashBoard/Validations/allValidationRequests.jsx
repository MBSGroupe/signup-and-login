// AllValidationRequests.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../../Components/Buttons/BackButton';
import {
  Loader2,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  FileText,
  CreditCard,
  Eye,
  ChevronRight,
  ListChecks,
  Inbox,
  RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function AllValidationRequests() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/all?status=${filter}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const body = await res.json();
        const list =
          (Array.isArray(body) && body) ||
          body?.data?.requests ||
          (Array.isArray(body?.data) && body.data) ||
          body?.requests ||
          body?.data ||
          [];
        setRequests(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load validation requests:', err);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    if (authData?.token) fetchRequests();
  }, [filter, authData?.token, setAuthData]);

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
      case 'pending': return <Clock className="w-3.5 h-3.5" />;
      case 'partial': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'approved': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      case 'expired': return <AlertCircle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  // ✅ Rewritten to handle: full object, partial object, raw string, or nothing
  const getTargetDisplay = (req) => {
    if (req.payload?.title) return req.payload.title;
    if (req.data?.title) return req.data.title;

    const target = req.targetId;

    if (!target) {
      return req.validationSchema?.name || req.schemaName || 'Demande';
    }

    if (typeof target === 'string') {
      return `Utilisateur #${target.slice(-6)}`;
    }

    if (target.fullName) return target.fullName;
    const nameParts = [target.name, target.lastname].filter(Boolean).join(' ').trim();
    if (nameParts) return nameParts;
    if (target.email) return target.email;
    if (target.fileName) return target.fileName;
    if (target.title) return target.title;
    if (target.type) return target.type;

    const id = target.id || target._id;
    if (id) return `Utilisateur #${String(id).slice(-6)}`;

    return req.validationSchema?.name || req.schemaName || 'Demande';
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
          <p className="text-[#94A3B8] text-sm">Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/validation/requests" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ListChecks className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Toutes les demandes de validation
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Consultez et gérez l'ensemble des demandes
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 mb-6 shadow-lg flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Filter className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">Filtrer</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-[140px] px-4 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          >
            <option value="all">Toutes</option>
            <option value="pending">En attente</option>
            <option value="partial">Partielles</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Rejetées</option>
            <option value="cancelled">Annulées</option>
            <option value="expired">Expirées</option>
          </select>
          <span className="text-xs text-[#64748B] ml-auto">
            {requests.length} demande{requests.length > 1 ? 's' : ''}
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#94A3B8] text-lg font-medium">Aucune demande trouvée</p>
            <p className="text-[#64748B] text-sm mt-1">Essayez de modifier les filtres.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
            <div
              key={req.id}
              className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#182233] transition-all duration-200 shadow-lg cursor-pointer group"
              onClick={() => navigate(`/dash/validation/progress/${req.id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">

                  {/* ── Row 1: name (primary) ───────────────────────────────── */}
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      {getTargetIcon(req.targetType)}
                    </span>
                    <h3 className="text-lg font-semibold text-[#F8FAFC] truncate">
                      {getTargetDisplay(req)}
                    </h3>
                  </div>

                  {/* ── Row 2: request type + meta ──────────────────────────── */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 ml-12">
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {req.validationSchema?.name || req.schemaName || `${req.targetType}`}
                    </span>
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {typeof req.createdBy === 'object' && req.createdBy !== null
                        ? `${req.createdBy.name || ''} ${req.createdBy.lastname || ''}`.trim() || req.createdBy.name || req.createdBy.email || 'Inconnu'
                        : (req.createdBy || 'Inconnu')}
                    </span>
                  </div>

                  {/* ── Row 3: status ───────────────────────────────────────── */}
                  <div className="mt-2 flex items-center gap-3 ml-12">
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

                <div className="flex items-center gap-2 text-[#64748B] group-hover:text-emerald-400 transition-colors">
                  <span className="text-sm font-medium">Voir</span>
                  <ChevronRight className="w-5 h-5" />
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