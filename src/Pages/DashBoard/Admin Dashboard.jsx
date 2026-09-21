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
  LayoutDashboard
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Helper: pull a count out of an array shaped [{ _id, count }, ...]
const pickCount = (arr, key) => {
  if (!Array.isArray(arr)) return 0;
  const row = arr.find(r => r?._id === key);
  return row?.count ?? 0;
};

export default function AdminDashboard() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authData?.token) return;

    const getStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithRefresh(
          `${NEST_API_URL}/users/stats`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
        const body = await response.json();
        // ResponseInterceptor wraps as { success, data }
        setStats(body?.data ?? body);
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
        setError(err?.message || "Erreur lors du chargement des statistiques");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    getStats();
  }, [authData.token, setAuthData]);

  // Derived values (defensive against missing data)
  const totalUsers = stats?.totalUsers ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const pendingUsers = pickCount(stats?.byStatus, 'pending');
  const verifiedUsers = stats?.byVerification?.adminVerified ?? 0;

  const members = pickCount(stats?.byGrade, 'user');
  const admins = pickCount(stats?.byGrade, 'admin');
  const superAdmins = pickCount(stats?.byGrade, 'super_admin');

  const cards = (() => {
    const base = [
      {
        title: "Membres",
        subtitle: "Gérer les membres",
        icon: Users,
        color: "emerald",
        onClick: () => navigate("/dash/allMembers"),
        count: members,
      },
      {
        title: "Cotisations",
        subtitle: "Gérer les cotisations",
        icon: CreditCard,
        color: "blue",
        onClick: () => navigate("/dash/allCotisations"),
        count: null,
      },
    ];

    if (authData?.user?.grade === 'super_admin') {
      return [
        {
          title: "Utilisateurs",
          subtitle: "Gérer les administrateurs",
          icon: UserCog,
          color: "purple",
          onClick: () => navigate("/dash/allUsers"),
          count: admins + superAdmins,
        },
        ...base,
      ];
    }
    return base;
  })();

  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald':
        return {
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
          hover: 'hover:border-emerald-500/40 hover:bg-emerald-500/20',
          iconBg: 'bg-emerald-500/20',
        };
      case 'blue':
        return {
          border: 'border-blue-500/20',
          text: 'text-blue-400',
          hover: 'hover:border-blue-500/40 hover:bg-blue-500/20',
          iconBg: 'bg-blue-500/20',
        };
      case 'purple':
        return {
          border: 'border-purple-500/20',
          text: 'text-purple-400',
          hover: 'hover:border-purple-500/40 hover:bg-purple-500/20',
          iconBg: 'bg-purple-500/20',
        };
      default:
        return {
          border: 'border-gray-500/20',
          text: 'text-gray-400',
          hover: 'hover:border-gray-500/40 hover:bg-gray-500/20',
          iconBg: 'bg-gray-500/20',
        };
    }
  };

  return (
    <div className="min-h-screen ml-[30px] mt-20 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-[#111827] rounded-2xl p-6 md:p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-emerald-500/20">
                {authData?.user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                  {authData?.user?.name || 'Admin'} {authData?.user?.lastname || ''}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Shield className="w-3 h-3 mr-1" />
                    {authData?.user?.roleLabel || authData?.user?.grade || 'Administrator'}
                  </span>
                  <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Admin Dashboard
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 md:gap-8 items-center">
              <div className="text-right">
                <div className="text-2xl font-bold text-[#F8FAFC]">{totalUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Total Users</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">{activeUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Active</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-400">{pendingUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Pending</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400">{verifiedUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* error / loading banners */}
        {error && (
          <div className="mt-6 bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {loading && (
          <div className="mt-6 text-center text-sm text-[#64748B]">Chargement des statistiques…</div>
        )}

        {/* METRICS OVERVIEW */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Total Members</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{members}</div>
            <div className="mt-1 text-xs text-[#94A3B8]">All registered members</div>
          </div>
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Administrators</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{admins + superAdmins}</div>
            <div className="mt-1 text-xs text-[#94A3B8]">Including super admins</div>
          </div>
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Active Users</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{activeUsers}</div>
            <div className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% of total
            </div>
          </div>
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Pending Validations</span>
              <UserX className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{pendingUsers}</div>
            <div className="mt-1 text-xs text-yellow-400">Awaiting approval</div>
          </div>
        </div>

        {/* QUICK ACTION CARDS */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card, index) => {
              const color = getColorClasses(card.color);
              return (
                <div
                  key={index}
                  onClick={card.onClick}
                  className={`
                    group relative bg-[#111827] rounded-2xl p-6 border ${color.border}
                    shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer
                    hover:-translate-y-1 hover:${color.hover}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#F8FAFC]">{card.title}</h3>
                      <p className="text-sm text-[#94A3B8]">{card.subtitle}</p>
                      {card.count !== null && card.count !== undefined && (
                        <div className="mt-3">
                          <span className="text-3xl font-bold text-[#F8FAFC]">{card.count}</span>
                          <span className="ml-2 text-xs text-[#64748B] uppercase">items</span>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl ${color.iconBg} ${color.text} group-hover:scale-110 transition-transform duration-200`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowUpRight className="w-5 h-5 text-[#64748B]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.06)] text-center text-sm text-[#64748B]">
          <p>© {new Date().getFullYear()} - Admin Dashboard • All rights reserved</p>
        </div>
      </div>
    </div>
  );
}