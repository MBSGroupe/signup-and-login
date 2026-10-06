import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../../Context/ModalContext';
import BackButton from '../../../Components/Buttons/BackButton';
import {
  Loader2,
  Inbox,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  XCircle,
  AlertCircle,
  AlertTriangle,
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

// Requests per page — backend clamps at 100
const PAGE_SIZE = 20;

const PERIOD_OPTIONS = [
  { value: 'all',      label: 'Toutes les périodes' },
  { value: 'today',    label: "Aujourd'hui" },
  { value: '7days',    label: '7 derniers jours' },
  { value: '30days',   label: '30 derniers jours' },
  { value: '3months',  label: '3 derniers mois' },
  { value: 'thisYear', label: 'Cette année' },
  { value: 'custom',   label: 'Période personnalisée' },
];

const unwrap = (body) =>
  body && typeof body === 'object' && 'data' in body && 'success' in body
    ? body.data
    : body;

function computeDateRange(period, customFrom, customTo) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  switch (period) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case '7days': {
      const f = new Date(now); f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case '30days': {
      const f = new Date(now); f.setDate(f.getDate() - 29);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case '3months': {
      const f = new Date(now); f.setMonth(f.getMonth() - 3);
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
    default: return { from: null, to: null };
  }
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function ValidationRequestsList() {
  const { authData, setAuthData } = useContext(UserContext);
  const { confirm } = useModal();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schemas, setSchemas] = useState([]);

  // ─── Pagination ─────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─── Filters ────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schemaFilter, setSchemaFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Debounce search so we don't fire on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 whenever a filter (not page) changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, schemaFilter, periodFilter, customFrom, customTo, debouncedSearch]);

  // ─── Mass selection ─────────────────────────────────────────────
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [massApproving, setMassApproving] = useState(false);

  // ─── Fetch schemas once for the type dropdown ───────────────────
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

  // ─── Fetch approver requests whenever any filter or page changes ─
  useEffect(() => {
    if (!authData?.token) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const { from, to } = computeDateRange(periodFilter, customFrom, customTo);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (schemaFilter !== 'all') params.set('schemaId', schemaFilter);
      if (debouncedSearch)        params.set('search', debouncedSearch);
      if (from)                   params.set('from', from.toISOString());
      if (to)                     params.set('to', to.toISOString());
      params.set('limit', String(PAGE_SIZE));
      params.set('skip', String((page - 1) * PAGE_SIZE));

      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/approver?${params.toString()}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const body = await res.json();
        const payload = unwrap(body);
        const list = payload?.requests || (Array.isArray(payload) ? payload : []);
        if (cancelled) return;
        setRequests(Array.isArray(list) ? list : []);
        setTotal(typeof payload?.total === 'number' ? payload.total : list.length);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load approver requests:', err);
        setError(err?.message || 'Erreur lors du chargement des demandes.');
        setRequests([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [
    statusFilter, schemaFilter, periodFilter, customFrom, customTo,
    debouncedSearch, page,
    authData?.token, setAuthData,
  ]);

  // ─── Actions ────────────────────────────────────────────────────
  const toggleRequestSelection = (requestId) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    const eligibleIds = requests
      .filter((req) => {
        const firstPendingStep = req.steps
          ?.filter((s) => s.status === 'pending')
          .sort((a, b) => a.order - b.order)[0];
        return (
          firstPendingStep &&
          firstPendingStep.massValidation &&
          firstPendingStep.allowedUserIds?.some((u) => (u.id || u) === authData.user?.id)
        );
      })
      .map((req) => req.id);
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
          body: JSON.stringify({
            requestIds: selectedRequests,
            comments: 'Dossier Conforme aux exigences',
          }),
        },
        authData.token,
        setAuthData
      );
      const result = await res.json();
      if (result.success) {
        setSelectedRequests([]);
        // Refetch by nudging page to itself → useEffect doesn't fire.
        // Simplest reliable refetch: re-trigger by resetting page then
        // forcing state change via a no-op fetch.
        setPage((p) => p);
        // Force a reload by simulating a filter change tick
        setStatusFilter((s) => s);
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

    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/${requestId}/cancel`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: "Annulée par l'utilisateur" }),
        },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      if (body?.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSchemaFilter('all');
    setPeriodFilter('all');
    setCustomFrom('');
    setCustomTo('');
    setPage(1);
  };

  // ─── UI helpers ─────────────────────────────────────────────────
  const getTargetDisplay = (targetType, target, fullReq = null) => {
    if (fullReq?.payload?.title || fullReq?.data?.title) {
      return fullReq.payload?.title || fullReq.data?.title;
    }
    if (!target) {
      return fullReq?.validationSchema?.name || fullReq?.schemaName || 'Demande';
    }
    switch (targetType) {
      case 'User':
        return (
          target.fullName ||
          `${target.name || ''} ${target.lastname || ''}`.trim() ||
          target.email ||
          target.id
        );
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return target.type || target.feeType || `Cotisation ${target.year || ''}` || target.id;
      default:
        if (typeof target === 'object') {
          return (
            target.name ||
            target.title ||
            target.fullName ||
            target.id ||
            fullReq?.validationSchema?.name ||
            'Demande'
          );
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

  const activeFilterCount = [
    searchTerm !== '',
    statusFilter !== 'all',
    schemaFilter !== 'all',
    periodFilter !== 'all',
  ].filter(Boolean).length;

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const pageNumbers = getPageNumbers(page, totalPages);

  // ─── Loading ────────────────────────────────────────────────────
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

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
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

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-300 font-medium">Erreur de chargement</p>
              <p className="text-rose-400/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, email, matricule..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        {/* FILTERS PANEL */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mb-6 shadow-lg">
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
              {total} demande{total > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilterCount === 0
                  ? 'bg-white/5 text-[#64748B] cursor-not-allowed'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Statut */}
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

            {/* Type de schéma */}
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

            {/* Période */}
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
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom date range */}
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

        {/* MASS ACTIONS */}
        {requests.some((req) => {
          const firstPending = req.steps
            ?.filter((s) => s.status === 'pending')
            .sort((a, b) => a.order - b.order)[0];
          return (
            firstPending &&
            firstPending.massValidation &&
            firstPending.allowedUserIds?.some((u) => (u.id || u) === authData.user?.id)
          );
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
                {massApproving
                  ? 'Approbation...'
                  : `Approuver la sélection (${selectedRequests.length})`}
              </button>
            )}
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl transition-all text-sm font-medium"
            >
              <CheckSquare className="w-4 h-4" />
              Tout sélectionner (page actuelle)
            </button>
          </div>
        )}

        {/* LIST */}
        {loading && requests.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#94A3B8] text-lg font-medium">Aucune demande trouvée</p>
            <p className="text-[#64748B] text-sm mt-1">
              {activeFilterCount > 0
                ? 'Essayez de modifier ou réinitialiser les filtres.'
                : 'Revenez plus tard.'}
            </p>
          </div>
        ) : (
          <>
            <div className={`space-y-4 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              {requests.map((req, idx) => {
                const firstPendingStep = req.steps
                  ?.filter((s) => s.status === 'pending')
                  .sort((a, b) => a.order - b.order)[0];

                const canMassValidate =
                  firstPendingStep &&
                  firstPendingStep.massValidation &&
                  firstPendingStep.allowedUserIds?.some((u) => (u.id || u) === authData.user?.id);

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
                              {req.validationSchema?.name ||
                                req.schemaName ||
                                `${req.targetType} – ${getTargetDisplay(req.targetType, req.targetId)}`}
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
                                  ? `${req.createdBy.name || ''} ${req.createdBy.lastname || ''}`.trim() ||
                                    req.createdBy.name ||
                                    req.createdBy.email ||
                                    'Inconnu'
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dash/validation/requests/${req.id}`);
                          }}
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

            {/* PAGINATION */}
            {total > PAGE_SIZE && (
              <div className="mt-6 bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] px-4 py-3 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-[#64748B]">
                    <span className="text-[#94A3B8] font-medium">{rangeStart}–{rangeEnd}</span> sur{' '}
                    <span className="text-[#94A3B8] font-medium">{total}</span> demande{total > 1 ? 's' : ''}
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Page précédente"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {pageNumbers.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-[#64748B] text-xs select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          disabled={loading}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all ${
                            p === page
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loading}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Page suivante"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}