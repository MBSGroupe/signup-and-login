import { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../Context/dataCont';
import { fetchWithRefresh } from '../../Components/api';
import {
  Users,
  CreditCard,
  Shield,
  ArrowUpRight,
  Activity,
  UserCog,
  LayoutDashboard,
  CheckCircle,
  Clock,
  ChevronRight,
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  XCircle,
  Ban,
  UserCheck,
  LogIn,
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens (match stat pages) ────────────────────────
const LABEL_CLS =
  'text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium';

const CARD_CLS =
  'bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]';

// pickCount — supports multiple candidate keys, returns first match
const pickCount = (arr, ...keys) => {
  if (!Array.isArray(arr)) return 0;
  for (const key of keys) {
    const row = arr.find((r) => r?._id === key);
    if (row) return row.count ?? 0;
  }
  return 0;
};

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

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

// ─── Ratio bar ──────────────────────────────────────────────────────
function RatioCard({ label, numerator, denominator, percent, icon: Icon }) {
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <div className={`${CARD_CLS} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
            {label}
          </span>
        </div>
        <span className="text-xs text-[#94A3B8] font-mono tabular-nums">
          {numerator} <span className="text-[#475569]">/ {denominator}</span>
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-[#F8FAFC] font-mono tabular-nums">
          {safePercent}%
        </span>
        <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">
          du total
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full bg-[#0A0F1C] rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500/70 rounded-full transition-all duration-500"
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Action link ────────────────────────────────────────────────────
function ActionLink({ icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group w-full text-left flex items-center gap-4
        px-4 py-3 rounded-xl
        bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]
        border-l-2 border-l-transparent
        hover:border-emerald-500/20 hover:border-l-emerald-500/60
        hover:bg-emerald-500/[0.04]
        transition-all duration-150
      "
    >
      <span className="p-2 rounded-lg bg-white/5 text-[#94A3B8] group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-[#F8FAFC]">
          {title}
        </span>
        <span className="block text-xs text-[#64748B] truncate">
          {subtitle}
        </span>
      </span>
      <ArrowUpRight className="w-4 h-4 text-[#475569] group-hover:text-emerald-400 transition-colors" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [validationStats, setValidationStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authData?.token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, validationRes, adminsRes] = await Promise.all([
          fetchWithRefresh(
            `${NEST_API_URL}/users/stats`,
            { method: 'GET' },
            authData.token,
            setAuthData,
          ),
          fetchWithRefresh(
            `${NEST_API_URL}/validation/requests/stats`,
            { method: 'GET' },
            authData.token,
            setAuthData,
          ),
          fetchWithRefresh(
            `${NEST_API_URL}/admins/stats`,
            { method: 'GET' },
            authData.token,
            setAuthData,
          ),
        ]);

        const usersBody = await usersRes.json();
        setStats(usersBody?.data ?? usersBody);

        if (validationRes.ok) {
          const validationBody = await validationRes.json();
          setValidationStats(validationBody?.data ?? validationBody);
        } else {
          setValidationStats(null);
        }

        if (adminsRes.ok) {
          const adminsBody = await adminsRes.json();
          setAdminStats(adminsBody?.data ?? adminsBody);
        } else {
          setAdminStats(null);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
        setError(
          err?.message || 'Erreur lors du chargement des statistiques',
        );
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authData?.token, setAuthData]);

  // ─── Derived user stats ────────────────────────────────────────
  const totalUsers = stats?.totalUsers ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const inactiveUsers =
    stats?.inactiveUsers ?? Math.max(0, totalUsers - activeUsers);

  const verifiedUsers = stats?.byVerification?.adminVerified ?? 0;
  const isVerifiedUsers = stats?.byVerification?.verified ?? 0;

  // Members = users with grade 'user' (from User table)
  const members = pickCount(stats?.byGrade, 'user');

  const newRegistrations = stats?.newUsersLast7Days ?? 0;
  const newRegistrations30 = stats?.newUsersLast30Days ?? 0;

  // ─── Derived admin stats (from /admins/stats) ──────────────────
  const totalAdmins = adminStats?.totalAdmins ?? adminStats?.total ?? 0;
  const activeAdmins = adminStats?.activeAdmins ?? adminStats?.active ?? 0;
  const inactiveAdmins =
    adminStats?.inactiveAdmins ?? Math.max(0, totalAdmins - activeAdmins);

  // Split admin vs super_admin — byGrade is on the Admin table
  const plainAdmins = pickCount(adminStats?.byGrade, 'admin');
  const superAdmins = pickCount(adminStats?.byGrade, 'super_admin');

  const adminsActiveLast24h = adminStats?.activeLast24h ?? 0;
  const adminsNeverLoggedIn = adminStats?.neverLoggedIn ?? 0;

  // ─── Derived validation stats ──────────────────────────────────
  const totalValidations = validationStats?.totalRequests ?? 0;
  const awaitingValidation =
    validationStats?.awaitingAction ?? validationStats?.pending ?? 0;
  const approvedValidations = validationStats?.approved ?? 0;
  const rejectedValidations = validationStats?.rejected ?? 0;
  const cancelledValidations = validationStats?.cancelled ?? 0;
  const approvalRate = validationStats?.approvalRate ?? 0;

  const activeRatio = pct(activeUsers, totalUsers);
  const verifiedRatio = pct(verifiedUsers, totalUsers);

  const isSuperAdmin =
    authData?.user?.role === 'super_admin' ||
    authData?.user?.grade === 'super_admin';

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
              <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
                  Console · Tableau de bord
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                Bienvenue, {authData?.user?.name || 'Admin'}{' '}
                {authData?.user?.lastname || ''}
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {authData?.user?.roleLabel ||
                  authData?.user?.role ||
                  authData?.user?.grade ||
                  'Administrateur'}{' '}
                · {today}
              </p>
            </div>
          </div>

          {/* Compact KPI on the right */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {totalUsers}
              </span>
            </div>
            <span className="text-[#475569]">·</span>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {totalAdmins}
              </span>
            </div>
            <span className="text-[#475569]">·</span>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {awaitingValidation}
              </span>
            </div>
          </div>
        </div>

        {/* error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {/* loading shimmer */}
        {loading && (
          <div className="mb-6 flex items-center gap-2 text-xs text-[#64748B] font-mono uppercase tracking-[0.15em]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Chargement des statistiques…
          </div>
        )}

        {/* ═══ ROW 1 — Validation attention + user tiles ══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Validation attention — big tile */}
          <button
            type="button"
            onClick={() => navigate('/dash/validation/all-requests')}
            className={`
              group relative text-left
              ${CARD_CLS}
              border-t-2 border-t-emerald-500/50
              hover:border-emerald-500/30
              p-6 transition-all duration-200 overflow-hidden
            `}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl"
            />
            <div className="relative flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                  Demandes en attente
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#64748B] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="relative">
              <div className="text-5xl font-bold text-emerald-400 leading-none font-mono tabular-nums">
                {awaitingValidation}
              </div>
              <p className="text-sm text-[#94A3B8] mt-3">
                {awaitingValidation === 0
                  ? 'Rien à traiter. Tout est à jour.'
                  : awaitingValidation === 1
                    ? 'Demande en attente de traitement'
                    : 'Demandes en attente de traitement'}
              </p>
              {totalValidations > 0 && (
                <p className="text-[10px] font-mono text-[#475569] mt-3 uppercase tracking-wider">
                  {totalValidations} au total
                </p>
              )}
            </div>
          </button>

          {/* User tiles — 2x2 grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            <MetricTile
              icon={Users}
              label="Utilisateurs"
              value={totalUsers}
              accent="emerald"
              hint={`${members} membres`}
            />
            <MetricTile
              icon={Activity}
              label="Actifs"
              value={activeUsers}
              accent="teal"
              hint={`${inactiveUsers} inactifs`}
            />
            <MetricTile
              icon={CheckCircle}
              label="Vérifiés"
              value={verifiedUsers}
              accent="purple"
              hint={`${isVerifiedUsers} vérifiés par système`}
            />
            <MetricTile
              icon={Shield}
              label="Administrateurs"
              value={totalAdmins}
              accent="blue"
              hint={`${plainAdmins} admins · ${superAdmins} super admins`}
            />
          </div>
        </div>

        {/* ═══ ROW 2 — Admin panel ═══════════════════════════════ */}
        <div className={`${CARD_CLS} p-5 mb-6`}>
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                Administration
              </h3>
              <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                état des comptes administrateurs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile
              icon={Shield}
              label="Admins actifs"
              value={activeAdmins}
              accent="emerald"
              hint={`${inactiveAdmins} inactifs`}
            />
            <MetricTile
              icon={UserCog}
              label="Admins standards"
              value={plainAdmins}
              accent="blue"
            />
            <MetricTile
              icon={ShieldCheck}
              label="Super admins"
              value={superAdmins}
              accent="purple"
            />
            <MetricTile
              icon={LogIn}
              label="Actifs (24 h)"
              value={adminsActiveLast24h}
              accent="teal"
              hint={`${adminsNeverLoggedIn} jamais connectés`}
            />
          </div>
        </div>

        {/* ═══ ROW 3 — Validation summary strip ══════════════════ */}
        <div className={`${CARD_CLS} p-5 mb-6`}>
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                Workflow de validation
              </h3>
              <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                état global · données scopées à votre rôle
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile
              icon={Clock}
              label="En attente"
              value={awaitingValidation}
              accent="amber"
            />
            <MetricTile
              icon={CheckCircle}
              label="Approuvées"
              value={approvedValidations}
              accent="emerald"
              hint={`${approvalRate}% du total`}
            />
            <MetricTile
              icon={XCircle}
              label="Rejetées"
              value={rejectedValidations}
              accent="rose"
            />
            <MetricTile
              icon={Ban}
              label="Annulées"
              value={cancelledValidations}
              accent="gray"
            />
          </div>
        </div>

        {/* ═══ ROW 4 — Ratio cards ═══════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <RatioCard
            label="Utilisateurs actifs"
            numerator={activeUsers}
            denominator={totalUsers}
            percent={activeRatio}
            icon={Activity}
          />
          <RatioCard
            label="Comptes vérifiés"
            numerator={verifiedUsers}
            denominator={totalUsers}
            percent={verifiedRatio}
            icon={CheckCircle}
          />
        </div>

        {/* ═══ ROW 5 — Registrations + Quick actions ═════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-1 space-y-3">
            <MetricTile
              icon={TrendingUp}
              label="Nouveaux membres · 7 jours"
              value={newRegistrations}
              accent="teal"
              hint="Inscriptions récentes"
            />
            <MetricTile
              icon={TrendingUp}
              label="Nouveaux membres · 30 jours"
              value={newRegistrations30}
              accent="cyan"
              hint="Inscriptions ce mois"
            />
          </div>

          <div className={`lg:col-span-2 ${CARD_CLS} p-5`}>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
              <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                  Actions rapides
                </h3>
                <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                  raccourcis d'administration
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isSuperAdmin && (
                <ActionLink
                  icon={<UserCog className="w-4 h-4" />}
                  title="Utilisateurs"
                  subtitle="Gérer les administrateurs"
                  onClick={() => navigate('/dash/allUsers')}
                />
              )}
              <ActionLink
                icon={<Users className="w-4 h-4" />}
                title="Membres"
                subtitle="Gérer les membres"
                onClick={() => navigate('/dash/allMembers')}
              />
              <ActionLink
                icon={<CreditCard className="w-4 h-4" />}
                title="Cotisations"
                subtitle="Gérer les cotisations"
                onClick={() => navigate('/dash/allCotisations')}
              />
              <ActionLink
                icon={<Shield className="w-4 h-4" />}
                title="Validations"
                subtitle="Consulter toutes les demandes"
                onClick={() => navigate('/dash/validation/all-requests')}
              />
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM META ═══════════════════════════════════════ */}
        <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <Fingerprint className="w-3 h-3" />
            <span>CNOA · Console d'administration</span>
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