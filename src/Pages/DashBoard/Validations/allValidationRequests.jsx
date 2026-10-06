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
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Inbox,
  X,
  Search,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// Requests per page — must stay ≤ 100 (backend clamps)
const PAGE_SIZE = 20;

// ─── Period presets ──────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { value: 'all',      label: 'Toutes les périodes' },
  { value: 'today',    label: "Aujourd'hui" },
  { value: '7days',    label: '7 derniers jours' },
  { value: '30days',   label: '30 derniers jours' },
  { value: '3months',  label: '3 derniers mois' },
  { value: 'thisYear', label: 'Cette année' },
  { value: 'custom',   label: 'Période personnalisée' },
];

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

function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

function getTargetDisplayFor(req) {
  if (!req) return 'Demande';

  if (req.payload?.title || req.data?.title) {
    return req.payload?.title || req.data?.title;
  }

  const target = req.targetId;
  const targetType = req.targetType;

  if (!target) {
    return req.validationSchema?.name || req.schemaName || 'Demande';
  }

  if (typeof target === 'string') {
    return `Utilisateur #${target.slice(-6)}`;
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
      return (
        target.name ||
        target.title ||
        target.fullName ||
        target.id ||
        req.validationSchema?.name ||
        'Demande'
      );
  }
}

export default function AllValidationRequests() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemas, setSchemas] = useState([]);

  // ─── Pagination state ────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─── Filter state ────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schemaFilter, setSchemaFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, schemaFilter, periodFilter, customFrom, customTo, debouncedSearch]);

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

  // ─── Fetch requests whenever any filter or page changes ──────
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);

      const { from, to } = computeDateRange(periodFilter, customFrom, customTo);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (schemaFilter !== 'all') params.set('schemaId', schemaFilter);
      if (debouncedSearch)        params.set('search', debouncedSearch);
      if (from) params.set('from', from.toISOString());
      if (to)   params.set('to', to.toISOString());
      params.set('limit', String(PAGE_SIZE));
      params.set('skip', String((page - 1) * PAGE_SIZE));

      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/all?${params.toString()}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const body = await res.json();

        const data = body?.data ?? body;

        const list =
          (Array.isArray(data?.requests) && data.requests) ||
          (Array.isArray(data) && data) ||
          [];

        setRequests(list);
        setTotal(
          typeof data?.total === 'number' ? data.total : list.length,
        );
      } catch (err) {
        console.error('Failed to load validation requests:', err);
        setRequests([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    if (authData?.token) fetchRequests();
  }, [
    statusFilter,
    schemaFilter,
    periodFilter,
    customFrom,
    customTo,
    debouncedSearch,
    page,
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

  const getTargetIcon = (type) => {
    switch (type) {
      case 'User':       return <User className="w-4 h-4" />;
      case 'File':       return <FileText className="w-4 h-4" />;
      case 'Cotisation': return <CreditCard className="w-4 h-4" />;
      default:           return <FileText className="w-4 h-4" />;
    }
  };

  // ─── Active filter count & reset ─────────────────────────────
  const activeFilterCount = [
    searchTerm !== '',
    statusFilter !== 'all',
    schemaFilter !== 'all',
    periodFilter !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSchemaFilter('all');
    setPeriodFilter('all');
    setCustomFrom('');
    setCustomTo('');
  };

  // ─── Loading screen (only first load) ────────────────────────
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

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const pageNumbers = getPageNumbers(page, totalPages);

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

        {/* ─── Search bar ─────────────────────────────────────── */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, email, matricule..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        {/* ─── Filters panel ──────────────────────────────────── */}
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
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
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

        {/* ─── List ───────────────────────────────────────────── */}
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
                : 'Aucune demande enregistrée pour le moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className={`space-y-4 transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#182233] transition-all duration-200 shadow-lg cursor-pointer group"
                  onClick={() => navigate(`/dash/validation/progress/${req.id}`)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Row 1: name */}
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                          {getTargetIcon(req.targetType)}
                        </span>
                        <h3 className="text-lg font-semibold text-[#F8FAFC] truncate">
                          {getTargetDisplayFor(req)}
                        </h3>
                      </div>

                      {/* Row 2: schema + meta */}
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

                      {/* Row 3: status */}
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

            {/* ─── Pagination ──────────────────────────────────── */}
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
                        <span
                          key={`ellipsis-${i}`}
                          className="px-2 text-[#64748B] text-xs select-none"
                        >
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