// AllValidationRequests.jsx
import { useContext, useEffect, useState, useMemo } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { useApi } from '../../../Hooks/useApi';
import { fetchWithRefresh } from '../../../Components/api';
import Title from '../../../Components/Title';
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
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Period presets ──────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { value: 'all',     label: 'Toutes les périodes' },
  { value: 'today',   label: "Aujourd'hui" },
  { value: '7days',   label: '7 derniers jours' },
  { value: '30days',  label: '30 derniers jours' },
  { value: '3months', label: '3 derniers mois' },
  { value: 'thisYear',label: 'Cette année' },
  { value: 'custom',  label: 'Période personnalisée' },
];

// Compute { from, to } Date objects from the selected preset.
function computeDateRange(period, customFrom, customTo) {
  const now = new Date();
  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7days': {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case '30days': {
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case '3months': {
      const f = new Date(now);
      f.setMonth(f.getMonth() - 3);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case 'thisYear': {
      const f = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case 'custom': {
      const from = customFrom ? startOfDay(new Date(customFrom)) : null;
      const to = customTo ? endOfDay(new Date(customTo)) : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export default function AllValidationRequests() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemas, setSchemas] = useState([]);

  // ─── Filter state ────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('all');
  const [schemaFilter, setSchemaFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // ─── Fetch available schemas once (for the schema filter dropdown) ──
  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/schemas`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        if (!res.ok) return;
        const data = await res.json();
        const list = data?.schemas || data?.data || data || [];
        setSchemas(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error fetching schemas:', err);
      }
    };
    if (authData?.token) fetchSchemas();
  }, [authData?.token, setAuthData]);

  // ─── Fetch requests whenever any filter changes ──────────────
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);

      const { from, to } = computeDateRange(periodFilter, customFrom, customTo);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (schemaFilter !== 'all') params.set('schemaId', schemaFilter);
      if (from) params.set('from', from.toISOString());
      if (to)   params.set('to', to.toISOString());

      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/all?${params.toString()}`,
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
  }, [
    statusFilter,
    schemaFilter,
    periodFilter,
    customFrom,
    customTo,
    authData?.token,
    setAuthData,
  ]);

  // ─── Helpers ─────────────────────────────────────────────────
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
      case 'pending':   return <Clock className="w-3.5 h-3.5" />;
      case 'partial':   return <AlertCircle className="w-3.5 h-3.5" />;
      case 'approved':  return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected':  return <XCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      case 'expired':   return <AlertCircle className="w-3.5 h-3.5" />;
      default:          return null;
    }
  };

  const getTargetDisplay = (req) => {
    if (req.payload?.title || req.data?.title) {
      return req.payload?.title || req.data?.title;
    }
    const target = req.targetId;
    if (!target) return req.validationSchema?.name || req.schemaName || req.targetId?._id || req.targetId || 'Demande';
    switch (req.targetType) {
      case 'User':
        return target.fullName || `${target.name || ''} ${target.lastname || ''}`.trim() || target._id;
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return target.type || target.feeType || `Cotisation ${target.year || ''}` || target._id;
      default:
        if (typeof target === 'object') {
          return target.name || target.title || target.fullName || target._id || req.validationSchema?.name || 'Demande';
        }
        return target;
    }
  };

  const getTargetIcon = (type) => {
    switch (type) {
      case 'User':       return <User className="w-4 h-4" />;
      case 'File':       return <FileText className="w-4 h-4" />;
      case 'Cotisation': return <CreditCard className="w-4 h-4" />;
      default:           return <FileText className="w-4 h-4" />;
    }
  };

  // ─── Active filter count & reset ─────────────────────────────
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n++;
    if (schemaFilter !== 'all') n++;
    if (periodFilter !== 'all') n++;
    return n;
  }, [statusFilter, schemaFilter, periodFilter]);

  const resetFilters = () => {
    setStatusFilter('all');
    setSchemaFilter('all');
    setPeriodFilter('all');
    setCustomFrom('');
    setCustomTo('');
  };

  // ─── Loading screen ──────────────────────────────────────────
  if (loading && requests.length === 0) {
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
        {/* ─── Header ─────────────────────────────────────────── */}
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

        {/* ─── Filters panel ──────────────────────────────────── */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 mb-6 shadow-lg">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Filter className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Filtres</span>
            </div>
            {activeFilterCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                {activeFilterCount}
              </span>
            )}
            <span className="text-xs text-[#64748B] ml-auto">
              {requests.length} demande{requests.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* ── Statut ── */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="partial">Partielles</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
                <option value="cancelled">Annulées</option>
                <option value="expired">Expirées</option>
              </select>
            </div>

            {/* ── Type de schéma ── */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">
                Type de demande
              </label>
              <select
                value={schemaFilter}
                onChange={(e) => setSchemaFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              >
                <option value="all">Tous les types</option>
                {schemas.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name || s.title || 'Sans nom'}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Période ── */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">
                Période
              </label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Reset ── */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeFilterCount === 0
                    ? 'bg-white/5 text-[#64748B] cursor-not-allowed'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                }`}
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>
          </div>

          {/* ── Custom date range ── */}
          {periodFilter === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">
                  Du
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">
                  Au
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── List ───────────────────────────────────────────── */}
        {requests.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#94A3B8] text-lg font-medium">Aucune demande trouvée</p>
            <p className="text-[#64748B] text-sm mt-1">
              {activeFilterCount > 0
                ? 'Essayez de modifier ou réinitialiser les filtres.'
                : 'Aucune demande enregistrée pour le moment.'}
            </p>
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
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        {getTargetIcon(req.targetType)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-[#F8FAFC] truncate">
                          {req.validationSchema?.name || req.schemaName || `${req.targetType} – ${getTargetDisplay(req)}`}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span className="text-xs text-[#64748B] bg-[#0A0F1C] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.06)]">
                            {getTargetDisplay(req)}
                          </span>
                          <span className="text-xs text-[#64748B] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {typeof req.createdBy === 'object' && req.createdBy !== null
                              ? `${req.createdBy.name || ''} ${req.createdBy.lastname || ''}`.trim() || req.createdBy.name || req.createdBy.email || 'Inconnu'
                              : (req.createdBy || 'Inconnu')}
                          </span>
                          <span className="text-xs text-[#64748B] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
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