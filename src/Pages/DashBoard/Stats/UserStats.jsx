// UserStats.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import {
  User,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  BarChart3,
  MapPin,
  Briefcase,
  FileText,
  Shield,
  Award,
  Wallet,
  TrendingUp,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Globe,
  Filter,
  Fingerprint,
  PieChart as PieIcon,
  Activity,
  UserCheck,
  UserX,
} from 'lucide-react';
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
} from 'recharts';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens (console / enterprise look) ────────────────
const LABEL_CLS =
  'text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium';

const CARD_CLS =
  'bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]';

// Chart palette — muted so it doesn't fight the console frame
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

// ─── Scope filter renderer ──────────────────────────────────────────
function ScopeValue({ value, depth = 0 }) {
  if (value === null) return <span className="text-[#475569] italic">null</span>;
  if (value === undefined)
    return <span className="text-[#475569] italic">undefined</span>;

  if (typeof value === 'string')
    return <span className="text-emerald-300">"{value}"</span>;
  if (typeof value === 'number')
    return <span className="text-blue-300">{value}</span>;
  if (typeof value === 'boolean')
    return <span className="text-amber-300">{String(value)}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#475569]">[]</span>;
    return (
      <span className="text-[#94A3B8]">
        [
        {value.map((v, i) => (
          <span key={i}>
            {i > 0 && <span className="text-[#475569]">, </span>}
            <ScopeValue value={v} depth={depth + 1} />
          </span>
        ))}
        ]
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0)
      return <span className="text-[#475569]">{'{}'}</span>;
    return (
      <div
        className="flex flex-col gap-0.5"
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <span className="text-[#94A3B8] shrink-0">{k}:</span>
            <ScopeValue value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-[#F8FAFC]">{String(value)}</span>;
}

function ScopeFilterPanel({ scope }) {
  if (scope === undefined) {
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-white/[0.04] border border-[rgba(255,255,255,0.08)] text-[#64748B] shrink-0">
          <AlertCircle className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des données</p>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Non fournie par l'API
          </p>
          <p className="text-[11px] font-mono text-[#475569] mt-0.5">
            Le backend n'a pas renvoyé de champ{' '}
            <code className="text-emerald-400">scope</code>.
          </p>
        </div>
      </div>
    );
  }

  if (scope === null) {
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <Globe className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des données</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Accès global — aucune restriction
          </p>
          <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
            Votre rôle autorise la lecture de l'ensemble des utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  const isEmptyObject =
    scope &&
    typeof scope === 'object' &&
    !Array.isArray(scope) &&
    Object.keys(scope).length === 0;

  if (isEmptyObject) {
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <Filter className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des données</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Aucune règle de portée applicable
          </p>
          <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
            Le filtre retourné est vide — aucune donnée ne sera visible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <Filter className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des données</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Filtres appliqués à votre vue
          </p>
          <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
            Résultat de{' '}
            <span className="text-emerald-400">getScopeFilter</span> pour votre
            rôle.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] p-4 font-mono text-xs overflow-x-auto">
        <ScopeValue value={scope} depth={0} />
      </div>
    </div>
  );
}

// ─── Metric tile ────────────────────────────────────────────────────
function MetricTile({ icon: Icon, label, value, accent = 'emerald', hint = null }) {
  const accents = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
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

// ─── Empty chart ────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════════════

export default function UserStats() {
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/users/stats`,
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

  // ─── Loading ────────────────────────────────────────────────────
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

  // ─── Error ──────────────────────────────────────────────────────
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

  // ─── Derived ────────────────────────────────────────────────────
  const {
    totalUsers = 0,
    activeUsers = 0,
    inactiveUsers = 0,
    newUsersToday = 0,
    newUsersLast7Days = 0,
    newUsersLast30Days = 0,
    byRole = [],
    byGrade = [],
    byStatus = [],
    byWilaya = [],
    byProfession = [],
    bySexe = [],
    byVerification = {},
    byCivility = [],
    byMaritalStatus = [],
    byNationality = [],
    byServiceNationalStatus = [],
    byProfessionalMode = [],
    byDiplomaType = [],
    byRegistrationStatus = [],
    byBenefitStateAid = [],
    byIsAccredited = [],
    creditStats = {},
    monthlyRegistrations = [],
    withRegistrationNumber = 0,
    withoutRegistrationNumber = 0,
    usersWithFiles = 0,
    usersWithoutFiles = 0,
    scope = undefined,
  } = stats || {};

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'demographics', label: 'Démographie', icon: Users },
    { id: 'cnoa', label: 'CNOA', icon: Award },
    { id: 'activity', label: 'Activité', icon: Activity },
  ];

  const preparePieData = (data) => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name:
        item._id !== null && item._id !== undefined
          ? String(item._id)
          : 'Non spécifié',
      value: item.count || 0,
    }));
  };

  const hasData = (data) =>
    data && data.length > 0 && data.some((item) => item.count > 0);

  // Support both 'Oui' string and boolean true for accredited / aid
  const findYes = (arr) =>
    arr.find((x) => x._id === true || x._id === 'Oui')?.count || 0;

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
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
                  Console · Statistiques
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                Statistiques des utilisateurs
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {authData?.user?.name || 'Administrateur'} ·{' '}
                {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Compact KPI summary on the right */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {totalUsers}
              </span>
            </div>
            <span className="text-[#475569]">·</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {activeUsers}
              </span>
            </div>
            <span className="text-[#475569]">·</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                +{newUsersLast30Days}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ SCOPE FILTER PANEL ═════════════════════════════════ */}
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
          <ScopeFilterPanel scope={scope} />
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
                icon={Users}
                label="Total utilisateurs"
                value={totalUsers}
                accent="emerald"
              />
              <MetricTile
                icon={UserCheck}
                label="Utilisateurs actifs"
                value={activeUsers}
                accent="teal"
                hint={`${inactiveUsers} inactifs`}
              />
              <MetricTile
                icon={Calendar}
                label="Nouveaux (30 jours)"
                value={newUsersLast30Days}
                accent="blue"
              />
              <MetricTile
                icon={Shield}
                label="Admin vérifiés"
                value={byVerification?.adminVerified || 0}
                accent="purple"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetricTile
                icon={Clock}
                label="Aujourd'hui"
                value={newUsersToday}
                accent="blue"
              />
              <MetricTile
                icon={TrendingUp}
                label="7 derniers jours"
                value={newUsersLast7Days}
                accent="teal"
              />
              <MetricTile
                icon={Wallet}
                label="Crédit total"
                value={`${(creditStats?.total || 0).toLocaleString('fr-DZ')} DA`}
                accent="amber"
              />
              <MetricTile
                icon={Wallet}
                label="Crédit moyen"
                value={`${(creditStats?.average || 0).toLocaleString('fr-DZ')} DA`}
                accent="amber"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section
                icon={TrendingUp}
                title="Inscriptions mensuelles"
                subtitle="12 derniers mois"
              >
                {hasData(monthlyRegistrations) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyRegistrations}>
                        <defs>
                          <linearGradient
                            id="usersArea"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#22c55e"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="#22c55e"
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
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#usersArea)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart
                    icon={TrendingUp}
                    message="Aucune inscription"
                  />
                )}
              </Section>

              <Section icon={PieIcon} title="Répartition par rôle">
                {hasData(byRole) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byRole)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preparePieData(byRole).map((entry, index) => (
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
                  <EmptyChart icon={PieIcon} message="Aucun rôle" />
                )}
              </Section>
            </div>
          </>
        )}

        {/* ═══ DEMOGRAPHICS TAB ══════════════════════════════════ */}
        {activeTab === 'demographics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile
                icon={User}
                label="Sexe masculin"
                value={bySexe.find((s) => s._id === 'M')?.count || 0}
                accent="blue"
              />
              <MetricTile
                icon={User}
                label="Sexe féminin"
                value={bySexe.find((s) => s._id === 'F')?.count || 0}
                accent="purple"
              />
              <MetricTile
                icon={FileText}
                label="Avec N° inscription"
                value={withRegistrationNumber}
                accent="teal"
              />
              <MetricTile
                icon={FileText}
                label="Sans N° inscription"
                value={withoutRegistrationNumber}
                accent="rose"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section icon={MapPin} title="Top wilayas">
                {hasData(byWilaya) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byWilaya.slice(0, 10)}
                        layout="vertical"
                      >
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
                          width={70}
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
                  <EmptyChart icon={MapPin} message="Aucune wilaya" />
                )}
              </Section>

              <Section icon={Briefcase} title="Top professions">
                {hasData(byProfession) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byProfession.slice(0, 10)}
                        layout="vertical"
                      >
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
                          width={90}
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
                  <EmptyChart icon={Briefcase} message="Aucune profession" />
                )}
              </Section>
            </div>

            <Section icon={CheckCircle2} title="Statut du compte">
              {hasData(byStatus) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byStatus}>
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
              ) : (
                <EmptyChart icon={CheckCircle2} message="Aucun statut" />
              )}
            </Section>
          </div>
        )}

        {/* ═══ CNOA TAB ══════════════════════════════════════════ */}
        {activeTab === 'cnoa' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricTile
                icon={Award}
                label="Architectes agréés"
                value={findYes(byIsAccredited)}
                accent="amber"
              />
              <MetricTile
                icon={Shield}
                label="Bénéficiaires aide d'État"
                value={findYes(byBenefitStateAid)}
                accent="emerald"
              />
              <MetricTile
                icon={FileText}
                label="Avec fichiers"
                value={usersWithFiles}
                accent="teal"
                hint={`${usersWithoutFiles} sans`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section icon={PieIcon} title="Mode d'exercice">
                {hasData(byProfessionalMode) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byProfessionalMode)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preparePieData(byProfessionalMode).map(
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
                  <EmptyChart
                    icon={PieIcon}
                    message="Aucun mode d'exercice"
                  />
                )}
              </Section>

              <Section icon={PieIcon} title="Type de diplôme">
                {hasData(byDiplomaType) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byDiplomaType)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preparePieData(byDiplomaType).map(
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
                  <EmptyChart icon={PieIcon} message="Aucun diplôme" />
                )}
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section icon={CheckCircle2} title="Statut d'inscription">
                {hasData(byRegistrationStatus) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byRegistrationStatus}>
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
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={CheckCircle2} message="Aucun statut" />
                )}
              </Section>

              <Section icon={PieIcon} title="Civilité">
                {hasData(byCivility) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byCivility)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preparePieData(byCivility).map((entry, index) => (
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
                  <EmptyChart icon={PieIcon} message="Aucune civilité" />
                )}
              </Section>
            </div>

            <Section icon={Users} title="Situation familiale">
              {hasData(byMaritalStatus) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byMaritalStatus}>
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
                        fill="#14b8a6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart icon={Users} message="Aucune situation familiale" />
              )}
            </Section>
          </div>
        )}

        {/* ═══ ACTIVITY TAB ══════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricTile
                icon={CheckCircle2}
                label="Utilisateurs vérifiés"
                value={byVerification?.verified || 0}
                accent="emerald"
              />
              <MetricTile
                icon={Clock}
                label="Non vérifiés"
                value={byVerification?.notVerified || 0}
                accent="amber"
              />
              <MetricTile
                icon={FileText}
                label="Avec fichiers"
                value={usersWithFiles}
                accent="teal"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section icon={Shield} title="Service national">
                {hasData(byServiceNationalStatus) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byServiceNationalStatus}>
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
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart icon={Shield} message="Aucune donnée" />
                )}
              </Section>

              <Section icon={PieIcon} title="Nationalité (top 5)">
                {hasData(byNationality) ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData(byNationality.slice(0, 5))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ''
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preparePieData(byNationality.slice(0, 5)).map(
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
                  <EmptyChart icon={PieIcon} message="Aucune nationalité" />
                )}
              </Section>
            </div>
          </div>
        )}

        {/* ═══ BOTTOM META ════════════════════════════════════════ */}
        <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <Fingerprint className="w-3 h-3" />
            <span>CNOA · Console statistiques utilisateurs</span>
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