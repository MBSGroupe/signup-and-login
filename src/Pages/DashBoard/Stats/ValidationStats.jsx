// src/Components/ValidationStats.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import ScopeSummaryPanel from '../../../Components/ScopeSummaryPanel';
import {
  ListChecks,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Loader2,
  ShieldCheck,
  Fingerprint,
  FileText,
  User,
  CreditCard,
  Timer,
  Users,
  Layers,
  Activity,
  Gauge,
  AlertCircle,
  MapPin,
  Hourglass,
} from 'lucide-react';
import wilayasData from '../../../assets/data/wilayas.json';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import StatsExportButton from '../../../Components/Export/StatsExportButton';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens ────────────────────────────────────────────
const LABEL_CLS =
  'text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium';

const CARD_CLS =
  'bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]';

const CHART_COLORS = [
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#06b6d4',
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0F1623',
  borderColor: 'rgba(255,255,255,0.08)',
  borderRadius: '8px',
  fontFamily: 'ui-monospace, monospace',
  fontSize: '11px',
  color: '#F8FAFC',
};

const CHART_AXIS_TICK = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  partial: '#3b82f6',
  approved: '#22c55e',
  rejected: '#ef4444',
  cancelled: '#6b7280',
  expired: '#f97316',
};

const STATUS_LABELS = {
  pending: 'En attente',
  partial: 'Partielles',
  approved: 'Approuvées',
  rejected: 'Rejetées',
  cancelled: 'Annulées',
  expired: 'Expirées',
};

// CLOA code ("16") → "16 - Alger"
const REGION_LABELS = Object.fromEntries(
  wilayasData.map((w) => [w.code, `${w.code} - ${w.name}`]),
);

const CREATOR_LABELS = {
  admin: 'Administrateur',
  user: 'Membre',
  unknown: 'Non spécifié (migration)',
};

const STATUS_KEYS = [
  'pending',
  'partial',
  'approved',
  'rejected',
  'cancelled',
  'expired',
];

// ─── Metric tile ────────────────────────────────────────────────────
function MetricTile({
  icon: Icon,
  label,
  value,
  accent = 'emerald',
  hint = null,
}) {
  const accents = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    gray: 'text-[#94A3B8] bg-white/[0.04] border-[rgba(255,255,255,0.08)]',
  };
  const cls = accents[accent] || accents.emerald;

  return (
    <div className={`${CARD_CLS} p-4 flex items-start gap-3`}>
      <span className={`p-2 rounded-lg border shrink-0 ${cls}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={LABEL_CLS}>{label}</p>
        <p className="text-[#F8FAFC] text-base font-semibold mt-1 font-mono break-words">
          {value}
        </p>
        {hint && (
          <p className="text-[10px] font-mono text-[#64748B] mt-0.5 truncate">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle = null, children }) {
  return (
    <div className={CARD_CLS + ' p-5'}>
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] font-mono text-[#475569] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ icon: Icon = BarChart3, message }) {
  return (
    <div className="flex flex-col items-center justify-center h-72 text-[#64748B]">
      <Icon className="w-8 h-8 mb-2 opacity-40" />
      <p className="text-xs font-mono uppercase tracking-[0.15em]">
        {message || 'Aucune donnée'}
      </p>
    </div>
  );
}

// ─── Small stat cell for the detail tables ─────────────────────────
function StatusCell({ value, color }) {
  const show = value > 0;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[38px] px-2 py-0.5 rounded-md text-xs font-mono tabular-nums ${
        show
          ? 'text-[#F8FAFC] bg-white/[0.04] border border-[rgba(255,255,255,0.08)]'
          : 'text-[#475569]'
      }`}
      style={
        show
          ? {
              borderColor: `${color}55`,
              backgroundColor: `${color}1a`,
            }
          : undefined
      }
    >
      {value}
    </span>
  );
}

// ─── Horizontal bar row (label · bar · value) ──────────────────────
function BarRow({ label, sublabel = null, value, max, color = '#22c55e', extra = null }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <p className="text-xs text-[#F8FAFC] font-medium truncate">{label}</p>
          {sublabel && (
            <p className="text-[10px] font-mono text-[#64748B] truncate">{sublabel}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {extra}
          <span className="text-xs font-mono text-[#F8FAFC] tabular-nums">{value}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[#0A0F1C] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Model icon helper ──────────────────────────────────────────────
function modelIcon(type) {
  switch (type) {
    case 'User':
      return <User className="w-4 h-4" />;
    case 'File':
      return <FileText className="w-4 h-4" />;
    case 'Cotisation':
      return <CreditCard className="w-4 h-4" />;
    default:
      return <Layers className="w-4 h-4" />;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════════════

export default function ValidationStats() {
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/stats`,
          { method: 'GET' },
          authData.token,
          setAuthData,
        );
        const responseData = await res.json();
        if (res.ok && responseData.success !== false) {
          const data = responseData.data || responseData;
          setStats(data);
        } else {
          setError(
            responseData.message ||
              responseData.data?.message ||
              'Impossible de charger les statistiques',
          );
        }
      } catch (err) {
        console.error(err);
        setError('Erreur réseau');
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) fetchStats();
  }, [authData, setAuthData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-[#64748B] text-xs font-mono uppercase tracking-[0.15em]">
            Chargement des statistiques
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
        <div className="bg-[#0F1623] rounded-xl border border-rose-500/20 p-6 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p className="text-[#F8FAFC] text-sm font-medium">Erreur</p>
          <p className="text-[#94A3B8] text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const {
    totalRequests = 0,
    awaitingAction = 0,
    approved = 0,
    rejected = 0,
    cancelled = 0,
    expired = 0,
    pending = 0,
    partial = 0,
    byStatus = {},
    byTargetType = [],
    bySchema = [],
    byCreatorType = [],
    bySource = [],
    byRegion = [],
    byCurrentStep = [],
    pendingAge = { lt7: 0, d7to30: 0, gt30: 0, avgDays: 0 },
    byModelDetailed = [],
    bySchemaDetailed = [],
    monthlyRequests = [],
    dailyActivity = [],
    today = 0,
    last7 = 0,
    last30 = 0,
    approvalRate = 0,
    rejectionRate = 0,
    expirationRate = 0,
    avgApprovalHours = 0,
    avgRejectionHours = 0,
    avgStepsPerRequest = 0,
    topApprovers = [],
    topRequesters = [],
    totalActiveSchemas = 0,
    schemasWithGlobalTimeout = 0,
    scope = undefined,
  } = stats || {};

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'models', label: 'Modèles & Schémas', icon: Layers },
    { id: 'regions', label: 'Par CLOA', icon: MapPin },
    { id: 'workflow', label: 'Workflow', icon: Activity },
    { id: 'performance', label: 'Performance', icon: Gauge },
    { id: 'activity', label: 'Activité', icon: Timer },
  ];

  const preparePieData = (data, labelMap = null) => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name:
        item._id !== null && item._id !== undefined
          ? labelMap
            ? labelMap[item._id] || String(item._id)
            : String(item._id)
          : 'Non spécifié',
      value: item.count || 0,
    }));
  };

  const hasData = (data) =>
    data && data.length > 0 && data.some((item) => item.count > 0);

  const statusPieData = Object.entries(byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
      color: STATUS_COLORS[k] || '#6b7280',
    }));

  const formatHours = (h) => {
    if (h <= 0) return '—';
    if (h < 24) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} j`;
  };

  return (
    <div
      className="min-h-screen bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased relative ml-[30px] mt-16"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="relative max-w-7xl mx-auto p-6 md:p-8">
        {/* ═══ HEADER STRIP ═══════════════════════════════════════ */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ListChecks className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
                  Console · Statistiques
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                Statistiques des validations
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {authData?.user?.name || 'Administrateur'} ·{' '}
                {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Excel export of this page (only if allowed) */}
          <StatsExportButton statsKey="validation" />

          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <ListChecks className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {totalRequests}
              </span>
            </div>
            <span className="text-[#475569]">·</span>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {awaitingAction}
              </span>
            </div>
            <span className="text-[#475569]">·</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {approvalRate}%
              </span>
            </div>
          </div>
        </div>

        {/* ═══ SCOPE PANEL ═══════════════════════════════════════ */}
        <div className={`${CARD_CLS} p-5 mb-6`}>
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                Portée des données (scope)
              </h3>
              {scope !== undefined && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#475569]">
                  {scope === null
                    ? 'global'
                    : typeof scope === 'object' &&
                        Object.keys(scope).length === 0
                      ? 'vide'
                      : 'filtré'}
                </span>
              )}
            </div>
          </div>
          <ScopeSummaryPanel scope={scope} entityLabel="demandes" />
        </div>

        {/* ═══ TABS ═══════════════════════════════════════════════ */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-[rgba(255,255,255,0.06)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all border-b-2 -mb-px ${
                  active
                    ? 'text-emerald-400 border-emerald-400 bg-[#0F1623]/40'
                    : 'text-[#64748B] border-transparent hover:text-[#94A3B8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ OVERVIEW TAB ═══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetricTile
                icon={ListChecks}
                label="Total demandes"
                value={totalRequests}
                accent="emerald"
              />
              <MetricTile
                icon={Clock}
                label="En attente d'action"
                value={awaitingAction}
                accent="amber"
                hint={`${pending} en attente · ${partial} partielles`}
              />
              <MetricTile
                icon={CheckCircle2}
                label="Approuvées"
                value={approved}
                accent="emerald"
                hint={`${approvalRate}% des demandes traitées`}
              />
              <MetricTile
                icon={XCircle}
                label="Rejetées"
                value={rejected}
                accent="rose"
                hint={`${rejectionRate}% des demandes traitées`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetricTile
                icon={TrendingUp}
                label="Aujourd'hui"
                value={today}
                accent="blue"
              />
              <MetricTile
                icon={TrendingUp}
                label="7 derniers jours"
                value={last7}
                accent="teal"
              />
              <MetricTile
                icon={TrendingUp}
                label="30 derniers jours"
                value={last30}
                accent="cyan"
              />
              <MetricTile
                icon={Ban}
                label="Annulées"
                value={cancelled}
                accent="gray"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section
                icon={Activity}
                title="Flux mensuel"
                subtitle="12 derniers mois"
              >
                {hasData(monthlyRequests) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyRequests}>
                        <defs>
                          <linearGradient
                            id="allArea"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#22c55e"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="appArea"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#14b8a6"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#14b8a6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="rejArea"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#ef4444"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#ef4444"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          dataKey="month"
                          stroke="#64748B"
                          tick={CHART_AXIS_TICK}
                        />
                        <YAxis stroke="#64748B" tick={CHART_AXIS_TICK} />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={{ color: '#F8FAFC' }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '10px',
                            color: '#94A3B8',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Total"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#allArea)"
                        />
                        <Area
                          type="monotone"
                          dataKey="approved"
                          name="Approuvées"
                          stroke="#14b8a6"
                          strokeWidth={1.5}
                          fill="url(#appArea)"
                        />
                        <Area
                          type="monotone"
                          dataKey="rejected"
                          name="Rejetées"
                          stroke="#ef4444"
                          strokeWidth={1.5}
                          fill="url(#rejArea)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={Activity} message="Aucune activité" />
                )}
              </Section>

              <Section icon={PieIcon} title="Répartition par statut">
                {statusPieData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={{ color: '#F8FAFC' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={PieIcon} message="Aucun statut" />
                )}
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Section
                icon={Layers}
                title="Étape en cours"
                subtitle="où attendent les demandes en cours"
              >
                {byCurrentStep.length === 0 ? (
                  <EmptyChart icon={Layers} message="Aucune demande en cours" />
                ) : (
                  <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {byCurrentStep.map((s, i) => (
                      <BarRow
                        key={`${s.schema}-${s.step}-${i}`}
                        label={s.step}
                        sublabel={`${s.schema}${s.role ? ` · ${s.role}` : ''}`}
                        value={s.count}
                        max={byCurrentStep[0].count}
                        color="#f59e0b"
                      />
                    ))}
                  </div>
                )}
              </Section>

              <Section
                icon={Hourglass}
                title="Ancienneté des demandes en cours"
                subtitle={`attente moyenne : ${pendingAge.avgDays} j`}
              >
                {awaitingAction === 0 ? (
                  <EmptyChart icon={Hourglass} message="Aucune demande en cours" />
                ) : (
                  <div className="space-y-1 py-1">
                    {[
                      { label: 'Moins de 7 jours', value: pendingAge.lt7, color: '#22c55e' },
                      { label: '7 à 30 jours', value: pendingAge.d7to30, color: '#f59e0b' },
                      { label: 'Plus de 30 jours', value: pendingAge.gt30, color: '#ef4444' },
                    ].map((row) => (
                      <BarRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                        max={awaitingAction}
                        color={row.color}
                        extra={
                          <span className="text-[10px] font-mono text-[#475569]">
                            {Math.round((row.value / awaitingAction) * 100)}%
                          </span>
                        }
                      />
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}

        {/* ═══ REGIONS (CLOA) TAB ═════════════════════════════════ */}
        {activeTab === 'regions' && (
          <Section
            icon={MapPin}
            title="Demandes par CLOA"
            subtitle="CLOA d'exercice du membre concerné · demandes sur des membres uniquement"
          >
            {byRegion.length === 0 ? (
              <EmptyChart icon={MapPin} message="Aucune donnée" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 divide-y lg:divide-y-0 divide-[rgba(255,255,255,0.04)]">
                {byRegion.map((r) => (
                  <BarRow
                    key={r.region ?? 'none'}
                    label={
                      r.region
                        ? REGION_LABELS[r.region] || `CLOA ${r.region}`
                        : 'Non renseignée'
                    }
                    value={r.total}
                    max={byRegion[0].total}
                    extra={
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {r.open} en cours · {r.approved} appr. · {r.rejected} rej.
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ═══ MODELS & SCHEMAS TAB ══════════════════════════════ */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {byModelDetailed.slice(0, 4).map((m) => (
                <MetricTile
                  key={m.targetType}
                  icon={User}
                  label={m.targetType}
                  value={m.total}
                  accent="emerald"
                  hint={`${m.approved} appr. · ${m.pending + m.partial} en cours`}
                />
              ))}
            </div>

            <Section
              icon={Layers}
              title="Statistiques par modèle"
              subtitle="target type · toutes les demandes scopées"
            >
              {byModelDetailed.length === 0 ? (
                <EmptyChart icon={Layers} message="Aucun modèle" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {byModelDetailed.map((m) => {
                    const pieData = STATUS_KEYS.filter(
                      (k) => m[k] > 0,
                    ).map((k) => ({
                      name: STATUS_LABELS[k],
                      value: m[k],
                      color: STATUS_COLORS[k],
                    }));

                    return (
                      <div
                        key={m.targetType}
                        className="rounded-xl bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] p-4"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            {modelIcon(m.targetType)}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[#F8FAFC] font-mono">
                              {m.targetType}
                            </p>
                            <p className="text-[10px] font-mono text-[#64748B] mt-0.5">
                              {m.total} demande{m.total > 1 ? 's' : ''} au total
                            </p>
                          </div>
                          <span className="text-lg font-mono font-semibold text-[#F8FAFC]">
                            {m.total}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center">
                          {pieData.length > 0 ? (
                            <div className="h-[160px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={38}
                                    outerRadius={62}
                                    paddingAngle={2}
                                    dataKey="value"
                                  >
                                    {pieData.map((entry, i) => (
                                      <Cell
                                        key={`cell-${i}`}
                                        fill={entry.color}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={CHART_TOOLTIP_STYLE}
                                    itemStyle={{ color: '#F8FAFC' }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-[160px] flex items-center justify-center text-[#475569] text-xs font-mono">
                              Aucune donnée
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5">
                            {STATUS_KEYS.map((k) => (
                              <div
                                key={k}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: STATUS_COLORS[k],
                                    }}
                                  />
                                  <span className="text-[#94A3B8] font-mono truncate">
                                    {STATUS_LABELS[k]}
                                  </span>
                                </div>
                                <span className="text-[#F8FAFC] font-mono tabular-nums shrink-0">
                                  {m[k]}
                                  <span className="text-[#475569] ml-1.5">
                                    (
                                    {m.total > 0
                                      ? Math.round((m[k] / m.total) * 100)
                                      : 0}
                                    %)
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              icon={BarChart3}
              title="Matrice modèles × statuts"
              subtitle="vue tabulaire consolidée"
            >
              {byModelDetailed.length === 0 ? (
                <EmptyChart icon={BarChart3} message="Aucune donnée" />
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[#64748B] uppercase tracking-wider text-[10px]">
                        <th className="text-left p-2.5 font-medium">Modèle</th>
                        <th className="text-right p-2.5 font-medium">Total</th>
                        {STATUS_KEYS.map((k) => (
                          <th
                            key={k}
                            className="text-right p-2.5 font-medium whitespace-nowrap"
                          >
                            {STATUS_LABELS[k]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byModelDetailed.map((m) => (
                        <tr
                          key={m.targetType}
                          className="border-t border-[rgba(255,255,255,0.05)] hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400">
                                {modelIcon(m.targetType)}
                              </span>
                              <span className="text-[#F8FAFC] font-medium">
                                {m.targetType}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-right text-[#F8FAFC] font-semibold tabular-nums">
                            {m.total}
                          </td>
                          {STATUS_KEYS.map((k) => (
                            <td key={k} className="p-2.5 text-right">
                              <StatusCell
                                value={m[k]}
                                color={STATUS_COLORS[k]}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section
              icon={FileText}
              title="Détail par schéma de validation"
              subtitle="chaque schéma et sa distribution de statuts"
            >
              {bySchemaDetailed.length === 0 ? (
                <EmptyChart icon={FileText} message="Aucun schéma" />
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[#64748B] uppercase tracking-wider text-[10px]">
                        <th className="text-left p-2.5 font-medium">Schéma</th>
                        <th className="text-left p-2.5 font-medium">Cible</th>
                        <th className="text-right p-2.5 font-medium">Total</th>
                        {STATUS_KEYS.map((k) => (
                          <th
                            key={k}
                            className="text-right p-2.5 font-medium whitespace-nowrap"
                          >
                            {STATUS_LABELS[k]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bySchemaDetailed.map((s) => (
                        <tr
                          key={s.schemaId}
                          className="border-t border-[rgba(255,255,255,0.05)] hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400">
                                <FileText className="w-3.5 h-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[#F8FAFC] font-medium truncate">
                                  {s.name}
                                </p>
                                {s.versions?.length > 0 && (
                                  <p className="text-[10px] text-[#475569]">
                                    {s.versions.length > 1
                                      ? `v${s.versions.join(', v')}`
                                      : `v${s.versions[0]}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
                              {modelIcon(s.targetType)}
                              <span className="text-[11px]">
                                {s.targetType}
                              </span>
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-[#F8FAFC] font-semibold tabular-nums">
                            {s.total}
                          </td>
                          {STATUS_KEYS.map((k) => (
                            <td key={k} className="p-2.5 text-right">
                              <StatusCell
                                value={s[k]}
                                color={STATUS_COLORS[k]}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ═══ WORKFLOW TAB ══════════════════════════════════════ */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile
                icon={Layers}
                label="Schémas actifs"
                value={totalActiveSchemas}
                accent="emerald"
              />
              <MetricTile
                icon={Timer}
                label="Avec timeout global"
                value={schemasWithGlobalTimeout}
                accent="amber"
                hint={
                  totalActiveSchemas > 0
                    ? `${Math.round(
                        (schemasWithGlobalTimeout / totalActiveSchemas) * 100,
                      )}% des schémas`
                    : null
                }
              />
              <MetricTile
                icon={Layers}
                label="Étapes moyennes"
                value={avgStepsPerRequest}
                accent="blue"
                hint="par demande"
              />
              <MetricTile
                icon={AlertTriangle}
                label="Taux d'expiration"
                value={`${expirationRate}%`}
                accent="rose"
                hint={`${expired} expirées`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section
                icon={PieIcon}
                title="Type de cible"
                subtitle="User · File · Cotisation"
              >
                {hasData(byTargetType) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byTargetType)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          dataKey="value"
                        >
                          {preparePieData(byTargetType).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={{ color: '#F8FAFC' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={PieIcon} message="Aucune cible" />
                )}
              </Section>

              <Section icon={PieIcon} title="Type de créateur">
                {hasData(byCreatorType) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byCreatorType, CREATOR_LABELS)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          dataKey="value"
                        >
                          {preparePieData(byCreatorType).map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  CHART_COLORS[index % CHART_COLORS.length]
                                }
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={{ color: '#F8FAFC' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={PieIcon} message="Aucun créateur" />
                )}
              </Section>
            </div>

            <Section
              icon={Layers}
              title="Top schémas de validation"
              subtitle="10 plus utilisés"
            >
              {hasData(bySchema) ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bySchema} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        type="number"
                        stroke="#64748B"
                        tick={CHART_AXIS_TICK}
                      />
                      <YAxis
                        dataKey="_id"
                        type="category"
                        stroke="#64748B"
                        width={160}
                        tick={CHART_AXIS_TICK}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#22c55e"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart icon={Layers} message="Aucun schéma" />
              )}
            </Section>

            {hasData(bySource) && (
              <Section
                icon={FileText}
                title="Source de création"
                subtitle="client-type header"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bySource}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="_id"
                        stroke="#64748B"
                        tick={CHART_AXIS_TICK}
                      />
                      <YAxis stroke="#64748B" tick={CHART_AXIS_TICK} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ═══ PERFORMANCE TAB ═══════════════════════════════════ */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile
                icon={CheckCircle2}
                label="Taux d'approbation"
                value={`${approvalRate}%`}
                accent="emerald"
              />
              <MetricTile
                icon={XCircle}
                label="Taux de rejet"
                value={`${rejectionRate}%`}
                accent="rose"
              />
              <MetricTile
                icon={Timer}
                label="Délai moyen (approuvées)"
                value={formatHours(avgApprovalHours)}
                accent="teal"
                hint="création → approbation"
              />
              <MetricTile
                icon={Timer}
                label="Délai moyen (rejetées)"
                value={formatHours(avgRejectionHours)}
                accent="amber"
                hint="création → rejet"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section icon={Gauge} title="Ratios de décision">
                <div className="space-y-4 py-2">
                  {[
                    {
                      label: 'Approuvées',
                      value: approvalRate,
                      color: '#22c55e',
                    },
                    {
                      label: 'Rejetées',
                      value: rejectionRate,
                      color: '#ef4444',
                    },
                    {
                      label: 'Expirées',
                      value: expirationRate,
                      color: '#f97316',
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                          {row.label}
                        </span>
                        <span className="text-xs font-mono text-[#F8FAFC]">
                          {row.value.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#0A0F1C] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, row.value)}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section
                icon={Timer}
                title="Délais moyens"
                subtitle="échantillon 500 dernières"
              >
                <div className="grid grid-cols-1 gap-4 py-2">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                          Approbation
                        </p>
                        <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
                          {formatHours(avgApprovalHours)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <XCircle className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                          Rejet
                        </p>
                        <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
                          {formatHours(avgRejectionHours)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Layers className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                          Étapes / demande
                        </p>
                        <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
                          {avgStepsPerRequest.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section
                icon={Users}
                title="Top approbateurs"
                subtitle="décisions traitées"
              >
                {hasData(topApprovers) ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topApprovers} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          type="number"
                          stroke="#64748B"
                          tick={CHART_AXIS_TICK}
                        />
                        <YAxis
                          dataKey="_id"
                          type="category"
                          stroke="#64748B"
                          width={150}
                          tick={CHART_AXIS_TICK}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={{ color: '#F8FAFC' }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#14b8a6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={Users} message="Aucune donnée" />
                )}
              </Section>

              <Section
                icon={User}
                title="Top demandeurs"
                subtitle="créateurs les plus actifs"
              >
                {hasData(topRequesters) ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topRequesters} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          type="number"
                          stroke="#64748B"
                          tick={CHART_AXIS_TICK}
                        />
                        <YAxis
                          dataKey="_id"
                          type="category"
                          stroke="#64748B"
                          width={150}
                          tick={CHART_AXIS_TICK}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={{ color: '#F8FAFC' }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#8b5cf6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={User} message="Aucune donnée" />
                )}
              </Section>
            </div>
          </div>
        )}

        {/* ═══ ACTIVITY TAB ══════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricTile
                icon={Activity}
                label="Aujourd'hui"
                value={today}
                accent="emerald"
              />
              <MetricTile
                icon={Activity}
                label="7 derniers jours"
                value={last7}
                accent="blue"
              />
              <MetricTile
                icon={Activity}
                label="30 derniers jours"
                value={last30}
                accent="purple"
              />
            </div>

            <Section
              icon={Activity}
              title="Activité quotidienne"
              subtitle="30 derniers jours"
            >
              {hasData(dailyActivity) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyActivity}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="#64748B"
                        tick={CHART_AXIS_TICK}
                        interval="preserveStartEnd"
                      />
                      <YAxis stroke="#64748B" tick={CHART_AXIS_TICK} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart icon={Activity} message="Aucune activité" />
              )}
            </Section>

            <Section
              icon={ListChecks}
              title="Distribution complète des statuts"
              subtitle="toutes les valeurs possibles"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const count = byStatus[key] || 0;
                  const pct =
                    totalRequests > 0
                      ? ((count / totalRequests) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div
                        className="w-2 h-2 rounded-full mb-2"
                        style={{ backgroundColor: STATUS_COLORS[key] }}
                      />
                      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                        {label}
                      </p>
                      <p className="text-[#F8FAFC] text-lg font-semibold mt-1 font-mono">
                        {count}
                      </p>
                      <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}

        {/* ═══ BOTTOM META ════════════════════════════════════════ */}
        <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <Fingerprint className="w-3 h-3" />
            <span>CNOA · Console statistiques validations</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <ShieldCheck className="w-3 h-3" />
            <span>Vue scopée par rôle</span>
          </div>
        </div>
      </div>
    </div>
  );
}