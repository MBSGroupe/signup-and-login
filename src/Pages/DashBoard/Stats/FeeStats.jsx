// FeeStats.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import {
  Wallet,
  Banknote,
  CreditCard,
  Calendar,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart as PieIcon,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Globe,
  Filter,
  Fingerprint,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens (console / enterprise look) ────────────────
const LABEL_CLS =
  'text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium';

const CARD_CLS =
  'bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]';

// Colors for charts — keep the banking palette, mute slightly
const CHART_PIE = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#14b8a6'];

// ─── Format helpers ─────────────────────────────────────────────────
const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '0 DA';
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// ─── Scope filter renderer ──────────────────────────────────────────
// Renders whatever getScopeFilter returned:
//   - null            → "Accès global" (no scope restrictions)
//   - {}              → "Aucune règle applicable"
//   - {key: value,..} → indent tree of the filter
function ScopeValue({ value, depth = 0 }) {
  const indent = { paddingLeft: `${depth * 14}px` };

  if (value === null) {
    return <span className="text-[#475569] italic">null</span>;
  }
  if (value === undefined) {
    return <span className="text-[#475569] italic">undefined</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-emerald-300">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-blue-300">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-amber-300">{String(value)}</span>;
  }

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
    if (entries.length === 0) return <span className="text-[#475569]">{'{}'}</span>;
    return (
      <div className="flex flex-col gap-0.5" style={indent}>
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
  // Case 1 — no scope restrictions (global access)
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
            Votre rôle autorise la lecture de l'ensemble des cotisations.
          </p>
        </div>
      </div>
    );
  }

  // Case 2 — empty object (no matching rule)
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

  // Case 3 — actual filter object
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
            Résultat de <span className="text-emerald-400">getScopeFilter</span>
            {' '}pour votre rôle et cette opération.
          </p>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] p-4 font-mono text-xs overflow-x-auto">
        <ScopeValue value={scope} depth={0} />
      </div>
    </div>
  );
}

// ─── Metric tile ────────────────────────────────────────────────────
function MetricTile({ icon: Icon, label, value, accent = 'emerald', hint = null }) {
  const accents = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
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

// ═══════════════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════════════

export default function FeeStats() {
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/fees/stats`,
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
    totalFees = 0,
    totalProjected = 0,
    totalPaid = 0,
    totalRemaining = 0,
    totalPaidByCredit = 0,
    totalPaidByCash = 0,
    totalVersements = 0,
    totalRepayments = 0,
    netCreditAdded = 0,
    byStatus = {},
    scope = undefined, // ← backend should add this
  } = stats || {};

  const paymentRate =
    totalProjected > 0
      ? ((totalPaid / totalProjected) * 100).toFixed(1)
      : '0.0';

  const statusData = [
    { name: 'Payées', value: byStatus.paid || 0, color: '#22c55e' },
    { name: 'Partielles', value: byStatus.partial || 0, color: '#3b82f6' },
    { name: 'En attente', value: byStatus.pending || 0, color: '#f59e0b' },
    { name: 'En retard', value: byStatus.overdue || 0, color: '#ef4444' },
    { name: 'Annulées', value: byStatus.cancelled || 0, color: '#6b7280' },
  ].filter((item) => item.value > 0);

  const paymentMethodData = [
    { name: 'Par crédit', value: totalPaidByCredit, color: '#8b5cf6' },
    { name: 'Espèces / autre', value: totalPaidByCash, color: '#14b8a6' },
  ].filter((item) => item.value > 0);

  const chartTooltipStyle = {
    backgroundColor: '#0F1623',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '11px',
    color: '#F8FAFC',
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
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
                  Console · Statistiques
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                Statistiques des cotisations
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {authData?.user?.name || 'Administrateur'} ·{' '}
                {new Date().toLocaleDateString('fr-FR')}
              </p>
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

          {scope === undefined ? (
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
                  Le backend n'a pas renvoyé de champ <code className="text-emerald-400">scope</code>.
                </p>
              </div>
            </div>
          ) : (
            <ScopeFilterPanel scope={scope} />
          )}
        </div>

        {/* ═══ KEY METRICS ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricTile
            icon={Wallet}
            label="Total collecté"
            value={formatAmount(totalPaid)}
            accent="emerald"
          />
          <MetricTile
            icon={Clock}
            label="Total restant dû"
            value={formatAmount(totalRemaining)}
            accent="amber"
          />
          <MetricTile
            icon={BarChart3}
            label="Nombre de cotisations"
            value={totalFees}
            accent="blue"
          />
          <MetricTile
            icon={CheckCircle2}
            label="Taux de paiement"
            value={`${paymentRate}%`}
            accent="purple"
          />
        </div>

        {/* ═══ FINANCIAL BREAKDOWN ════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricTile
            icon={CreditCard}
            label="Payé par crédit"
            value={formatAmount(totalPaidByCredit)}
            accent="purple"
          />
          <MetricTile
            icon={Banknote}
            label="Payé par espèces"
            value={formatAmount(totalPaidByCash)}
            accent="cyan"
          />
          <MetricTile
            icon={TrendingUp}
            label="Total versements"
            value={formatAmount(totalVersements)}
            accent="emerald"
          />
          <MetricTile
            icon={TrendingDown}
            label="Total retraits"
            value={formatAmount(totalRepayments)}
            accent="rose"
          />
        </div>

        {/* ═══ NET CREDIT + PROJECTED ═════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <MetricTile
            icon={RefreshCw}
            label="Net crédit ajouté"
            value={formatAmount(netCreditAdded)}
            accent={netCreditAdded >= 0 ? 'emerald' : 'rose'}
            hint="versements − retraits"
          />
          <MetricTile
            icon={Calendar}
            label="Total projeté"
            value={formatAmount(totalProjected)}
            accent="gray"
          />
        </div>

        {/* ═══ CHARTS ═════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status distribution */}
          <Section icon={PieIcon} title="Répartition par statut">
            {statusData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ color: '#F8FAFC' }}
                      formatter={(value) => formatAmount(value)}
                    />
                    <Legend
                      wrapperStyle={{
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '11px',
                        color: '#94A3B8',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-[#64748B]">
                <PieIcon className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-mono uppercase tracking-[0.15em]">
                  Aucune donnée
                </p>
              </div>
            )}
          </Section>

          {/* Payment methods */}
          <Section icon={Wallet} title="Méthodes de paiement">
            {paymentMethodData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ color: '#F8FAFC' }}
                      formatter={(value) => formatAmount(value)}
                    />
                    <Legend
                      wrapperStyle={{
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '11px',
                        color: '#94A3B8',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-[#64748B]">
                <Wallet className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-mono uppercase tracking-[0.15em]">
                  Aucune donnée
                </p>
              </div>
            )}
          </Section>
        </div>

        {/* ═══ BOTTOM META ════════════════════════════════════════ */}
        <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <Fingerprint className="w-3 h-3" />
            <span>CNOA · Console statistiques</span>
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