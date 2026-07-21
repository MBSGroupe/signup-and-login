import { useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserDataContext } from '../../Context/userDataCont';
import { UserContext } from '../../Context/dataCont';
import SectionTitle from '../../Components/Title';
import { 
  Users, 
  UserCheck, 
  UserX, 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  Shield, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Building2,
  UserCog,
  LayoutDashboard
} from "lucide-react";

export default function AdminDashboard() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { data, setData } = useContext(UserDataContext);
  const { authData } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authData?.token) return;

    const getElements = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/allUsers`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.token}`,
          },
        });
        const results = await response.json();
        setData(results);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    getElements();
  }, [authData.token, setData]);

  // Compute statistics from the data
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return {
        totalUsers: 0,
        totalMembers: 0,
        totalAdmins: 0,
        activeUsers: 0,
        pendingUsers: 0,
        verifiedUsers: 0,
        superAdmins: 0,
      };
    }

    const total = data.length;
    const members = data.filter(u => u.role === 'member' || u.role === 'user').length;
    const admins = data.filter(u => u.role === 'admin').length;
    const superAdmins = data.filter(u => u.role === 'super_admin').length;
    const active = data.filter(u => u.status === 'active').length;
    const pending = data.filter(u => u.status === 'pending').length;
    const verified = data.filter(u => u.isAdminVerified).length;

    return {
      totalUsers: total,
      totalMembers: members,
      totalAdmins: admins,
      superAdmins,
      activeUsers: active,
      pendingUsers: pending,
      verifiedUsers: verified,
    };
  }, [data]);

  // Construction des cartes en fonction du rôle
  const cards = useMemo(() => {
    const baseCards = [
      { 
        title: "Membres", 
        subtitle: "Gérer les membres",
        icon: Users,
        color: "emerald",
        onClick: () => navigate("/dash/allMembers"),
        count: stats.totalMembers,
      },
      { 
        title: "Cotisations", 
        subtitle: "Gérer les cotisations",
        icon: CreditCard,
        color: "blue",
        onClick: () => navigate("/dash/allCotisations"),
        count: null, // We don't have this count from current data
      },
    ];

    // La carte "Utilisateurs" n'est visible que pour les super admins
    if (authData?.user?.role === 'super_admin') {
      return [
        { 
          title: "Utilisateurs", 
          subtitle: "Gérer les administrateurs",
          icon: UserCog,
          color: "purple",
          onClick: () => navigate("/dash/allUsers"),
          count: stats.totalAdmins + stats.superAdmins,
        },
        ...baseCards
      ];
    }
    return baseCards;
  }, [authData?.user?.role, navigate, stats]);

  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
          hover: 'hover:border-emerald-500/40 hover:bg-emerald-500/20',
          iconBg: 'bg-emerald-500/20',
        };
      case 'blue':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          text: 'text-blue-400',
          hover: 'hover:border-blue-500/40 hover:bg-blue-500/20',
          iconBg: 'bg-blue-500/20',
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          text: 'text-purple-400',
          hover: 'hover:border-purple-500/40 hover:bg-purple-500/20',
          iconBg: 'bg-purple-500/20',
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          text: 'text-gray-400',
          hover: 'hover:border-gray-500/40 hover:bg-gray-500/20',
          iconBg: 'bg-gray-500/20',
        };
    }
  };

  return (
    <div className="min-h-screen ml-[30px] bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ===== HEADER / ACCOUNT SUMMARY ===== */}
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
                    {authData?.user?.role || 'Administrator'}
                  </span>
                  <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Admin Dashboard
                  </span>
                </div>
              </div>
            </div>
            {/* Quick stats in header */}
            <div className="flex flex-wrap gap-6 md:gap-8 items-center">
              <div className="text-right">
                <div className="text-2xl font-bold text-[#F8FAFC]">{stats.totalUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Total Users</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">{stats.activeUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Active</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-400">{stats.pendingUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Pending</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400">{stats.verifiedUsers}</div>
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== METRICS OVERVIEW ===== */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Total Members</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{stats.totalMembers}</div>
            <div className="mt-1 text-xs text-[#94A3B8]">All registered members</div>
          </div>
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Administrators</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{stats.totalAdmins + stats.superAdmins}</div>
            <div className="mt-1 text-xs text-[#94A3B8]">Including super admins</div>
          </div>
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Active Users</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{stats.activeUsers}</div>
            <div className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> {stats.activeUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total
            </div>
          </div>
          <div className="bg-[#111827] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#64748B]">Pending Validations</span>
              <UserX className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-[#F8FAFC]">{stats.pendingUsers}</div>
            <div className="mt-1 text-xs text-yellow-400">Awaiting approval</div>
          </div>
        </div>

        {/* ===== QUICK ACTION CARDS ===== */}
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
                    <div className={`
                      p-3 rounded-xl ${color.iconBg} ${color.text} 
                      group-hover:scale-110 transition-transform duration-200
                    `}>
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

        {/* ===== FOOTER / ADDITIONAL INFO ===== */}
        <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.06)] text-center text-sm text-[#64748B]">
          <p>© {new Date().getFullYear()} - Admin Dashboard • All rights reserved</p>
        </div>
      </div>
    </div>
  );
}