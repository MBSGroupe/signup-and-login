import { useEffect, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from '../../Context/dataCont';
import { fetchWithRefresh } from '../../Components/api';
import {
  Users,
  UserX,
  CreditCard,
  Shield,
  ArrowUpRight,
  Activity,
  UserCog,
  LayoutDashboard,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

const pickCount = (arr, key) => {
  if (!Array.isArray(arr)) return 0;
  const row = arr.find(r => r?._id === key);
  return row?.count ?? 0;
};

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100000) / 1000 : 0);

export default function AdminDashboard() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [validationStats, setValidationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authData?.token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, validationRes] = await Promise.all([
          fetchWithRefresh(
            `${NEST_API_URL}/users/stats`,
            { method: "GET" },
            authData.token,
            setAuthData
          ),
          fetchWithRefresh(
            `${NEST_API_URL}/validation/requests/stats`,
            { method: "GET" },
            authData.token,
            setAuthData
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
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
        setError(err?.message || "Erreur lors du chargement des statistiques");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authData.token, setAuthData]);

  // ─── Derived user stats ───────────────────────────────────────────
  const totalUsers = stats?.totalUsers ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const pendingUsers = pickCount(stats?.byStatus, 'pending');
  const verifiedUsers = stats?.byVerification?.adminVerified ?? 0;

  const members = pickCount(stats?.byRole, 'user');
  const admins = pickCount(stats?.byRole, 'admin');
  const superAdmins = pickCount(stats?.byRole, 'super_admin');
  const newRegistrations = stats?.newUsersLast30Days ?? 0;

  // ─── Derived validation stats ────────────────────────────────────
  const pendingValidations =
    validationStats?.awaitingAction ??
    validationStats?.pending ??
    0;
  const totalValidations = validationStats?.total ?? 0;

  const activeRatio = pct(activeUsers, totalUsers);
  const verifiedRatio = pct(verifiedUsers, totalUsers);

  const isSuperAdmin = authData?.user?.role === 'super_admin';
  const adminCount = admins + superAdmins;

  return (
    <div className="min-h-screen ml-[30px] mt-20 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ═══════════════════════════════════════════════════════════
            ROW 1 — Identity + Validation attention panel
           ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: identity + core counts */}
          <div className="lg:col-span-2 bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 md:p-8 relative overflow-hidden">
            {/* soft emerald halo behind the identity block */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl"
            />

            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center text-2xl font-semibold text-emerald-300">
                    {authData?.user?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#111827]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#64748B] mb-1">
                    Bienvenue
                  </p>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                    {authData?.user?.name || 'Admin'} {authData?.user?.lastname || ''}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-[#94A3B8] border border-[rgba(255,255,255,0.08)]">
                      <Shield className="w-3 h-3 mr-1" />
                      {authData?.user?.roleLabel || authData?.user?.role || 'Administrateur'}
                    </span>
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Tableau de bord
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact 4-up count strip inside the same card */}
            <div className="relative mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MiniStat label="Utilisateurs" value={totalUsers} />
              <MiniStat label="Actifs" value={activeUsers} accent />
              <MiniStat label="En attente" value={pendingUsers} />
              <MiniStat label="Vérifiés" value={verifiedUsers} />
            </div>
          </div>

          {/* Right: validation attention panel */}
          <button
            type="button"
            onClick={() => navigate("/dash/validation/all-requests")}
            className="
              group relative text-left
              bg-[#111827] rounded-2xl p-6
              border border-[rgba(255,255,255,0.06)]
              border-t-2 border-t-emerald-500/50
              hover:border-emerald-500/30
              transition-all duration-200
              overflow-hidden
            "
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl"
            />
            <div className="relative flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <Clock className="w-4 h-4" />
                </span>
                <span className="text-xs uppercase tracking-wider text-[#64748B]">
                  Demandes de validation
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#64748B] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="relative">
              <div className="text-5xl font-bold text-emerald-400 leading-none">
                {pendingValidations}
              </div>
              <p className="text-sm text-[#94A3B8] mt-2">
                {pendingValidations === 0
                  ? 'Rien à traiter. Tout est à jour.'
                  : pendingValidations === 1
                    ? 'Demande en attente de traitement'
                    : 'Demandes en attente de traitement'}
              </p>
              {totalValidations > 0 && (
                <p className="text-xs text-[#64748B] mt-3">
                  {totalValidations} demande{totalValidations > 1 ? 's' : ''} au total
                </p>
              )}
            </div>
          </button>
        </div>

        {/* error banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-center text-sm text-[#64748B]">
            Chargement des statistiques…
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ROW 2 — Three-column summary strip
           ═══════════════════════════════════════════════════════════ */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(255,255,255,0.06)]">
            <SummaryColumn
              label="Membres"
              value={members}
              hint="Comptes enregistrés"
              icon={<Users className="w-4 h-4" />}
            />
            <SummaryColumn
              label="Administrateurs"
              value={adminCount}
              hint={isSuperAdmin ? 'Admins et super admins' : 'Comptes administrateurs'}
              icon={<Shield className="w-4 h-4" />}
            />
            <SummaryColumn
              label="Nouveaux (7 jours)"
              value={newRegistrations}
              hint="Inscriptions récentes"
              icon={<Activity className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ROW 3 — Two-up ratio cards
           ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RatioCard
            label="Utilisateurs actifs"
            numerator={activeUsers}
            denominator={totalUsers}
            percent={activeRatio}
            icon={<Activity className="w-4 h-4" />}
          />
          <RatioCard
            label="Comptes vérifiés"
            numerator={verifiedUsers}
            denominator={totalUsers}
            percent={verifiedRatio}
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ROW 4 — Quick actions (slim row)
           ═══════════════════════════════════════════════════════════ */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
              Actions rapides
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isSuperAdmin && (
              <ActionLink
                icon={<UserCog className="w-4 h-4" />}
                title="Utilisateurs"
                subtitle="Gérer les administrateurs"
                onClick={() => navigate("/dash/allUsers")}
              />
            )}
            <ActionLink
              icon={<Users className="w-4 h-4" />}
              title="Membres"
              subtitle="Gérer les membres"
              onClick={() => navigate("/dash/allMembers")}
            />
            <ActionLink
              icon={<CreditCard className="w-4 h-4" />}
              title="Cotisations"
              subtitle="Gérer les cotisations"
              onClick={() => navigate("/dash/allCotisations")}
            />
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-[#475569]">
          © {new Date().getFullYear()} · CNOA · Tous droits réservés
        </div>
      </div>
    </div>
  );
}

/* ─── Presentational pieces ───────────────────────────────────────── */

function MiniStat({ label, value, accent = false }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[#64748B] mb-1">
        {label}
      </div>
      <div className={`text-2xl font-semibold ${accent ? 'text-emerald-400' : 'text-[#F8FAFC]'}`}>
        {value}
      </div>
    </div>
  );
}

function SummaryColumn({ label, value, hint, icon }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-[#64748B]">
          {label}
        </span>
        <span className="text-[#64748B]">{icon}</span>
      </div>
      <div className="text-3xl font-semibold text-[#F8FAFC]">{value}</div>
      <div className="mt-1 text-xs text-[#64748B]">{hint}</div>
    </div>
  );
}

function RatioCard({ label, numerator, denominator, percent, icon }) {
  return (
    <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#64748B]">
          <span>{icon}</span>
          <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-sm text-[#94A3B8] tabular-nums">
          {numerator} <span className="text-[#475569]">/ {denominator}</span>
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-[#F8FAFC]">{percent}%</span>
        <span className="text-xs text-[#64748B]">du total</span>
      </div>

      <div className="mt-3 h-1.5 w-full bg-[#1F2937] rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500/70 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ActionLink({ icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group w-full text-left flex items-center gap-4
        px-4 py-3 rounded-xl
        border border-[rgba(255,255,255,0.06)]
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
        <span className="block text-sm font-medium text-[#F8FAFC]">{title}</span>
        <span className="block text-xs text-[#64748B] truncate">{subtitle}</span>
      </span>
      <ArrowUpRight className="w-4 h-4 text-[#475569] group-hover:text-emerald-400 transition-colors" />
    </button>
  );
}