import { useContext, useEffect, useState, useMemo } from 'react';
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
import wilayasData from '../../../assets/data/wilayas.json';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Static filter options ──────────────────────────────────────────
const SEXE_OPTIONS = ['M', 'F'];
const CIVILITY_OPTIONS = ['Mr', 'Mme', 'Mlle'];
const MARITAL_STATUS_OPTIONS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'];
const DIPLOMA_TYPE_OPTIONS = ['Classique', 'LMD'];
const REGISTRATION_STATUS_OPTIONS = ['Inscrit', 'Radié', 'Suspendu'];
const PROFESSIONAL_MODE_OPTIONS = ['Libéral', 'Associé', 'Salarié'];
const SERVICE_NATIONAL_OPTIONS = ['Ayant effectué', 'Exempté', 'En cours', 'Non concerné'];
const USER_STATUS_OPTIONS = ['pending', 'active', 'suspended', 'archived'];
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

// Helper: unwrap the ResponseInterceptor envelope
const unwrap = (body) => (body && typeof body === 'object' && 'data' in body && 'success' in body)
  ? body.data
  : body;

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
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Filter states ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('all');
  const [sexeFilter, setSexeFilter] = useState('all');
  const [civilityFilter, setCivilityFilter] = useState('all');
  const [maritalStatusFilter, setMaritalStatusFilter] = useState('all');
  const [diplomaTypeFilter, setDiplomaTypeFilter] = useState('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('all');
  const [professionalModeFilter, setProfessionalModeFilter] = useState('all');
  const [serviceNationalFilter, setServiceNationalFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // ─── Mass selection ─────────────────────────────────────────────
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [massApproving, setMassApproving] = useState(false);

  // Dynamic target-type / schema options derived from the fetched requests
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

      // Request status
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

      // User-specific filters
      const target = req.targetId;
      if (req.targetType === 'User' && target && typeof target === 'object') {
        if (wilayaFilter !== 'all' && target.wilaya !== wilayaFilter && target.region !== wilayaFilter) return false;
        if (sexeFilter !== 'all' && target.sexe !== sexeFilter) return false;
        if (civilityFilter !== 'all' && target.civility !== civilityFilter) return false;
        if (maritalStatusFilter !== 'all' && target.maritalStatus !== maritalStatusFilter) return false;
        if (diplomaTypeFilter !== 'all' && target.diplomaType !== diplomaTypeFilter) return false;
        if (registrationStatusFilter !== 'all' && target.registrationStatus !== registrationStatusFilter) return false;
        if (professionalModeFilter !== 'all' && target.professionalMode !== professionalModeFilter) return false;
        if (serviceNationalFilter !== 'all' && target.serviceNationalStatus !== serviceNationalFilter) return false;
        if (userStatusFilter !== 'all' && target.status !== userStatusFilter) return false;
      }

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
    wilayaFilter,
    sexeFilter,
    civilityFilter,
    maritalStatusFilter,
    diplomaTypeFilter,
    registrationStatusFilter,
    professionalModeFilter,
    serviceNationalFilter,
    userStatusFilter,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchTerm) n++;
    if (statusFilter !== 'all') n++;
    if (targetTypeFilter !== 'all') n++;
    if (periodFilter !== 'all') n++;
    if (wilayaFilter !== 'all') n++;
    if (sexeFilter !== 'all') n++;
    if (civilityFilter !== 'all') n++;
    if (maritalStatusFilter !== 'all') n++;
    if (diplomaTypeFilter !== 'all') n++;
    if (registrationStatusFilter !== 'all') n++;
    if (professionalModeFilter !== 'all') n++;
    if (serviceNationalFilter !== 'all') n++;
    if (userStatusFilter !== 'all') n++;
    return n;
  }, [
    searchTerm, statusFilter, targetTypeFilter, periodFilter,
    wilayaFilter, sexeFilter, civilityFilter, maritalStatusFilter,
    diplomaTypeFilter, registrationStatusFilter, professionalModeFilter,
    serviceNationalFilter, userStatusFilter
  ]);

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
    setError(null);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/approver?status=${statusFilter}`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      const payload = unwrap(body);
      const list = payload?.requests || (Array.isArray(payload) ? payload : []);
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load approver requests:', err);
      setError(err?.message || 'Erreur lors du chargement des demandes.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authData?.token) fetchRequests();
  }, [statusFilter, authData?.token, setAuthData]);

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
          body: JSON.stringify({ requestIds: selectedRequests, comments: 'Dossier Conforme aux exigences' }),
        },
        authData.token,
        setAuthData
      );
      const result = await res.json();
      if (result.success) {
        setSelectedRequests([]);
        fetchRequests();
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
          body: JSON.stringify({ reason: "Annulée par l'utilisateur" })
        },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      if (body?.success) {
        fetchRequests();
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTargetTypeFilter('all');
    setPeriodFilter('all');
    setCustomFrom('');
    setCustomTo('');
    setWilayaFilter('all');
    setSexeFilter('all');
    setCivilityFilter('all');
    setMaritalStatusFilter('all');
    setDiplomaTypeFilter('all');
    setRegistrationStatusFilter('all');
    setProfessionalModeFilter('all');
    setServiceNationalFilter('all');
    setUserStatusFilter('all');
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

        {/* SEARCH */}
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

        {/* QUICK ACTIONS */}
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

        {/* FILTERS PANEL */}
        {showFilters && (
          <div className="mb-6 p-5 bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  {REQUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  {availableTargetTypes.map(t => <option key={t} value={t}>{t}</option>)}
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

              {/* Wilaya */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Wilaya</label>
                <select value={wilayaFilter} onChange={(e) => setWilayaFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Toutes les wilayas</option>
                  {wilayasData?.map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
                </select>
              </div>

              {/* Sexe */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Sexe</label>
                <select value={sexeFilter} onChange={(e) => setSexeFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Tous les sexes</option>
                  {SEXE_OPTIONS.map(s => <option key={s} value={s}>{s === 'M' ? 'Homme' : 'Femme'}</option>)}
                </select>
              </div>

              {/* Civilité */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Civilité</label>
                <select value={civilityFilter} onChange={(e) => setCivilityFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Toutes les civilités</option>
                  {CIVILITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Situation familiale */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Situation familiale</label>
                <select value={maritalStatusFilter} onChange={(e) => setMaritalStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Toutes les situations</option>
                  {MARITAL_STATUS_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Type de diplôme */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Type de diplôme</label>
                <select value={diplomaTypeFilter} onChange={(e) => setDiplomaTypeFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Tous les types</option>
                  {DIPLOMA_TYPE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Statut d'inscription */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Statut d'inscription</label>
                <select value={registrationStatusFilter} onChange={(e) => setRegistrationStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Tous les statuts</option>
                  {REGISTRATION_STATUS_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Mode d'exercice */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Mode d'exercice</label>
                <select value={professionalModeFilter} onChange={(e) => setProfessionalModeFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Tous les modes</option>
                  {PROFESSIONAL_MODE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Service national */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Service national</label>
                <select value={serviceNationalFilter} onChange={(e) => setServiceNationalFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Toutes les situations</option>
                  {SERVICE_NATIONAL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Statut utilisateur */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Statut (utilisateur)</label>
                <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="all">Tous les statuts</option>
                  {USER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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

        {/* MASS ACTIONS */}
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

        {/* REQUEST LIST */}
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

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/dash/validation/requests/${req.id}`)}>
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