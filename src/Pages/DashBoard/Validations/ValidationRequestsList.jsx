import { useContext, useEffect, useState, useMemo } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../Hooks/useApi';
import { useModal } from '../../../Context/ModalContext';
import BackButton from '../../../Components/Buttons/BackButton';
import {
  Loader2,
  Inbox,
  Clock,
  CheckCircle,
  ChevronRight,
  XCircle,
  AlertCircle,
  Filter,
  Calendar,
  User,
  FileText,
  CreditCard,
  X,
  ListChecks,
  CheckSquare,
  Check,
  Search,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Static filter options ──────────────────────────────────────────
const DEFAULT_TARGET_TYPES = ['User', 'File', 'Cotisation'];
const REQUEST_STATUS_OPTIONS = ['pending', 'partial', 'approved', 'rejected', 'cancelled', 'expired'];

const PERIOD_OPTIONS = [
  { value: 'all',      label: 'Toutes les périodes' },
  { value: 'today',    label: "Aujourd'hui" },
  { value: '7days',    label: '7 derniers jours' },
  { value: '30days',   label: '30 derniers jours' },
  { value: '3months',  label: '3 derniers mois' },
  { value: 'thisYear', label: 'Cette année' },
  { value: 'custom',   label: 'Période personnalisée' },
];

// Compute { from, to } Date objects from the selected preset.
function computeDateRange(period, customFrom, customTo) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

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
      const to   = customTo   ? endOfDay(new Date(customTo))     : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export default function ValidationRequestsList() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Filter states ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');       // sent to API
  const [targetTypeFilter, setTargetTypeFilter] = useState('all'); // client-side
  const [periodFilter, setPeriodFilter] = useState('all');         // client-side
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // ─── Mass selection ─────────────────────────────────────────────
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [massApproving, setMassApproving] = useState(false);

  // 🟢 Dynamic target-type / schema options derived from the fetched requests
  const availableTargetTypes = useMemo(() => {
    return Array.from(
      new Set([
        ...DEFAULT_TARGET_TYPES,
        ...requests.map(r => r.targetType).filter(Boolean),
        ...requests.map(r => r.validationSchema?.name || r.schemaName).filter(Boolean),
      ])
    );
  }, [requests]);

  // ─── Client-side filter logic ───────────────────────────────────
  const filteredRequests = useMemo(() => {
    const { from, to } = computeDateRange(periodFilter, customFrom, customTo);

    return requests.filter(req => {
      // Search
      if (searchTerm) {
        const targetDisplay = String(
          getTargetDisplay(req.targetType, req.targetId, req)
        ).toLowerCase();
        const schemaName = (req.validationSchema?.name || req.schemaName || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        if (
          !targetDisplay.includes(searchLower) &&
          !schemaName.includes(searchLower) &&
          !req.id?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Request status (redundant with API, kept for safety when API filter is 'all')
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;

      // Target type OR schema name
      if (targetTypeFilter !== 'all') {
        const currentSchema = req.validationSchema?.name || req.schemaName;
        if (req.targetType !== targetTypeFilter && currentSchema !== targetTypeFilter) {
          return false;
        }
      }

      // Period
      if (from && new Date(req.createdAt) < from) return false;
      if (to   && new Date(req.createdAt) > to)   return false;

      return true;
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
    targetTypeFilter,
    periodFilter,
    customFrom,
    customTo,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchTerm) n++;
    if (statusFilter !== 'all') n++;
    if (targetTypeFilter !== 'all') n++;
    if (periodFilter !== 'all') n++;
    return n;
  }, [searchTerm, statusFilter, targetTypeFilter, periodFilter]);

  // ─── Helpers ────────────────────────────────────────────────────
  const getTargetDisplay = (targetType, target, fullReq = null) => {
    if (fullReq?.payload?.title || fullReq?.data?.title) {
      return fullReq.payload?.title || fullReq.data?.title;
    }
    if (!target) {
      return fullReq?.validationSchema?.name || fullReq?.schemaName || 'Demande';
    }
    switch (targetType) {
      case 'User':
        return target.fullName || `${target.name || ''} ${target.lastname || ''}`.trim() || target.id;
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return target.type || target.feeType || `Cotisation ${target.year || ''}` || target.id;
      default:
        if (typeof target === 'object') {
          return target.name || target.title || target.fullName || target.id || fullReq?.validationSchema?.name || 'Demande';
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

  const getStatusBadge = (status) => {
    const colors = {
      pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      partial:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
      approved:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
      cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      expired:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':   return <Clock className="w-3.5 h-3.5" />;
      case 'partial':   return <AlertCircle className="w-3.5 h-3.5" />;
      case 'approved':  return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected':  return <XCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <X className="w-3.5 h-3.5" />;
      case 'expired':   return <AlertCircle className="w-3.5 h-3.5" />;
      default:          return null;
    }
  };

  // ─── API calls ──────────────────────────────────────────────────
  const fetchRequests = async () => {
    setLoading(true);
    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/approver?status=${statusFilter}`,
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
  }, [statusFilter, authData?.token]);

  // ─── Actions ────────────────────────────────────────────────────
  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    const eligibleIds = filteredRequests
      .filter(req => {
        const firstPendingStep = req.steps
          ?.filter(s => s.status === 'pending')
          .sort((a, b) => a.order - b.order)[0];
        return (
          firstPendingStep &&
          firstPendingStep.massValidation &&
          firstPendingStep.allowedUserIds?.some(u => (u.id || u) === authData.user?.id)
        );
      })
      .map(req => req.id);
    setSelectedRequests(eligibleIds);
  };

  const handleMassApprove = async () => {
    if (selectedRequests.length === 0) return;
    setMassApproving(true);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/mass-approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestIds: selectedRequests, comments: 'Validation en masse' }),
        },
        authData.token,
        setAuthData
      );
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setSelectedRequests([]);
          fetchRequests();
        }
      }
    } catch (err) {
      console.error('Mass approve error:', err);
    } finally {
      setMassApproving(false);
    }
  };

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
          body: JSON.stringify({ reason: "Annulée par l'utilisateur" })
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

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTargetTypeFilter('all');
    setPeriodFilter('all');
    setCustomFrom('');
    setCustomTo('');
  };

  // ─── Loading ────────────────────────────────────────────────────
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

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* ===== HEADER ===== */}
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

        {/* ===== SEARCH BAR ===== */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, prénom, email, ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 ${
              showFilters || activeFilterCount > 0
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 ${
              activeFilterCount === 0
                ? 'bg-white/5 text-[#64748B] cursor-not-allowed'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
            }`}
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>

        {/* ===== FILTERS PANEL ===== */}
        {showFilters && (
          <div className="mb-6 p-5 bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Statut (demande) */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous les statuts</option>
                  {REQUEST_STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Type / Schéma */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                  Type de demande
                </label>
                <select
                  value={targetTypeFilter}
                  onChange={(e) => setTargetTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous les types & schémas</option>
                  {availableTargetTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Période */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                  Période
                </label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom date range */}
            {periodFilter === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                    Du
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                    Au
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MASS ACTIONS ===== */}
        {filteredRequests.some(req => {
          const firstPending = req.steps?.filter(s => s.status === 'pending').sort((a, b) => a.order - b.order)[0];
          return firstPending && firstPending.massValidation && firstPending.allowedUserIds?.some(u => (u.id || u) === authData.user?.id);
        }) && (
          <div className="flex items-center gap-3 mb-4">
            {selectedRequests.length > 0 && (
              <button
                onClick={handleMassApprove}
                disabled={massApproving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                {massApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckSquare className="w-4 h-4" />
                )}
                {massApproving ? 'Approbation...' : `Approuver la sélection (${selectedRequests.length})`}
              </button>
            )}
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl transition-all text-sm font-medium"
            >
              <CheckSquare className="w-4 h-4" />
              Tout sélectionner (mass validation)
            </button>
          </div>
        )}

        {/* ===== REQUEST LIST ===== */}
        {filteredRequests.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#94A3B8] text-lg font-medium">Aucune demande trouvée</p>
            <p className="text-[#64748B] text-sm mt-1">
              {activeFilterCount > 0
                ? 'Modifiez ou réinitialisez les filtres.'
                : 'Revenez plus tard.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req, idx) => {
              const firstPendingStep = req.steps
                ?.filter(s => s.status === 'pending')
                .sort((a, b) => a.order - b.order)[0];

              const canMassValidate =
                firstPendingStep &&
                firstPendingStep.massValidation &&
                firstPendingStep.allowedUserIds?.some(u => (u.id || u) === authData.user?.id);

              const isSelected = selectedRequests.includes(req.id);

              return (
                <div
                  key={req.id || idx}
                  className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#182233] transition-all duration-200 shadow-lg group"
                >
                  <div className="flex items-center gap-4">
                    {canMassValidate && (
                      <div className="flex-shrink-0">
                        <div
                          onClick={() => toggleRequestSelection(req.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'bg-[#0A0F1C] border-[#64748B] hover:border-[#94A3B8]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    )}

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/dash/validation/requests/${req.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                          {getTargetIcon(req.targetType)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-[#F8FAFC] truncate">
                            {req.validationSchema?.name || req.schemaName || `${req.targetType} – ${getTargetDisplay(req.targetType, req.targetId)}`}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            <span className="text-xs text-[#64748B] bg-[#0A0F1C] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.06)]">
                              {getTargetDisplay(req.targetType, req.targetId)}
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
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 ml-12">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(req.status)}`}>
                          {getStatusIcon(req.status)}
                          {req.status}
                        </span>
                        {canMassValidate && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Validation en masse
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {['pending', 'partial'].includes(req.status) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all text-xs font-medium"
                        >
                          <X className="w-3.5 h-3.5" />
                          Annuler
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dash/validation/requests/${req.id}`); }}
                        className="text-[#64748B] hover:text-emerald-400 transition-colors p-1"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}