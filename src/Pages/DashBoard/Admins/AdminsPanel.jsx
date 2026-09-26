// pages/DashBoard/Admins/AdminsPanel.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { useError } from "../../../Context/ErrorContext";
import { useModal } from "../../../Context/ModalContext";
import { SearchBarContext } from "../../../Context/searchContext";
import { fetchWithRefresh } from "../../../Components/api";
import wilayasData from "../../../assets/data/wilayas.json";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Shield,
  Calendar,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  KeyRound,
  Award,
  Briefcase,
  Loader2,
  Crown,
  Users,
  UserCog,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─────────────────────────────────────────────────
//  Constants — mirror backend enum
// ─────────────────────────────────────────────────
const GRADE_OPTIONS = [
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super administrateur" },
];

const STATUS_OPTIONS = [
  { value: "true", label: "Actif" },
  { value: "false", label: "Inactif" },
];

const GRADE_BADGE = {
  admin: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  super_admin: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  user: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

const gradeLabel = (g) =>
  GRADE_OPTIONS.find((o) => o.value === g)?.label || g || "—";

// ─────────────────────────────────────────────────
//  Permission operations used by this panel
// ─────────────────────────────────────────────────
const OPS = [
  "read_stats",
  "create",
  "update",
  "delete",
  "activate",
  "deactivate",
  "reset_password",
  "change_grade",
  "change_role",
];

export default function AdminsPanel() {
  const { authData, setAuthData } = useContext(UserContext);
  const { keyWord, handleChange } = useContext(SearchBarContext);
  const { showError, showWarning, showSuccess } = useError();
  const { confirm, alert } = useModal();
  const navigate = useNavigate();

  // ─── Pagination ─────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ─── Data / UI ──────────────────────────────────────────────────────
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Filters ────────────────────────────────────────────────────────
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // ─── Sort ───────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // ─── Single floating dropdown menu ──────────────────────────────────
  const [openMenu, setOpenMenu] = useState(null); // { rect, admin } | null

  // ─── Permission flags ───────────────────────────────────────────────
  const [can, setCan] = useState({});

  // ─────────────────────────────────────────────────────────────────
  //  Fetch admins (paginated)
  // ─────────────────────────────────────────────────────────────────
  const fetchAdmins = async () => {
    if (!authData?.token) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", pageSize);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      if (keyWord) params.append("search", keyWord);
      if (selectedGrade !== "all") params.append("grade", selectedGrade);
      if (selectedRegion !== "all") params.append("region", selectedRegion);
      if (selectedStatus !== "all") params.append("isActive", selectedStatus);

      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/all?${params.toString()}`,
        { method: "GET" },
        authData.token,
        setAuthData,
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.json();
      // Shape: { success, data: [...], pagination: {...} }
      const list = body?.data.data || [];
      const pagination = body?.pagination || {};

      setAdmins(list);
      setTotalAdmins(pagination.total ?? list.length);
      setTotalPages(
        pagination.totalPages ?? Math.ceil((pagination.total ?? list.length) / pageSize),
      );
    } catch (err) {
      console.error("Error fetching admins:", err);
      showError("Impossible de charger les administrateurs.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  //  Fetch stats
  // ─────────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    if (!authData?.token) return;
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/stats`,
        { method: "GET" },
        authData.token,
        setAuthData,
      );
      if (!res.ok) return;
      const body = await res.json();
      setStats(body);
    } catch (err) {
      // Silent — stats are optional chrome
      console.warn("Stats unavailable:", err?.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  //  Check operations for the current viewer (model: Admin)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authData?.token || !authData?.user?.id) return;
    const viewerId = authData.user.id;
    let cancelled = false;

    const check = async (operation) => {
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/permissions/${viewerId}/check-operation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operation, model: "Admin" }),
          },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        return Boolean(body?.data?.canPerform);
      } catch {
        return false;
      }
    };

    (async () => {
      const results = await Promise.all(OPS.map((op) => check(op)));
      if (cancelled) return;
      const next = {};
      OPS.forEach((op, i) => (next[op] = results[i]));
      setCan(next);
      // Stats fetched only if permitted
      if (next.read_stats) fetchStats();
    })();

    return () => {
      cancelled = true;
    };
  }, [authData?.token, authData?.user?.id, setAuthData]);

  // ─────────────────────────────────────────────────────────────────
  //  Refetch on dependency changes
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authData?.token) fetchAdmins();
  }, [
    authData?.token,
    currentPage,
    pageSize,
    keyWord,
    selectedGrade,
    selectedRegion,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  // ─────────────────────────────────────────────────────────────────
  //  Close dropdown on scroll / resize / outside click
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", close);
    };
  }, [openMenu]);

  const toggleMenuAt = (e, admin) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu((prev) => {
      if (prev && (prev.admin.id === admin.id)) return null;
      return { rect, admin };
    });
  };
  const closeMenu = () => setOpenMenu(null);

  // ─────────────────────────────────────────────────────────────────
  //  Actions
  // ─────────────────────────────────────────────────────────────────
  const handleView = (admin) => navigate(`/dash/admins/${admin.id}`);
  const handleEdit = (admin) => navigate(`/dash/admins/edit/${admin.id}`);
  const handleCreate = () => navigate(`/dash/admins/create`);

  const handleToggleStatus = async (admin) => {
    const isActive = admin.isActive !== false;
    const action = isActive ? "deactivate" : "activate";
    const label = isActive ? "désactiver" : "activer";

    const ok = await confirm({
      title: isActive ? "Désactiver l'administrateur" : "Activer l'administrateur",
      message: `Voulez-vous vraiment ${label} ${admin.name} ${admin.lastname} ?`,
    });
    if (!ok) return;

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/${admin.id}/${action}`,
        { method: "PATCH" },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      if (!res.ok) {
        showError(body?.message || "Action impossible");
        return;
      }
      showSuccess(`Administrateur ${isActive ? "désactivé" : "activé"}`);
      fetchAdmins();
      fetchStats();
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  const handleDelete = async (admin) => {
    const ok = await confirm({
      title: "Supprimer l'administrateur",
      message: `Cette action est irréversible. Supprimer ${admin.name} ${admin.lastname} ?`,
    });
    if (!ok) return;

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/${admin.id}`,
        { method: "DELETE" },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      if (!res.ok) {
        showError(body?.message || "Suppression impossible");
        return;
      }
      showSuccess("Administrateur supprimé");
      fetchAdmins();
      fetchStats();
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  const handleChangeGrade = async (admin) => {
    // Simple prompt-style modal via alert is not ideal — navigate to edit where grade is editable.
    // Keeping the route approach so all admin mutations happen in one place.
    navigate(`/dash/admins/edit/${admin.id}?focus=grade`);
  };

  const handleChangeRole = (admin) => {
    navigate(`/dash/admins/edit/${admin.id}?focus=role`);
  };

  const handleResetPassword = (admin) => {
    navigate(`/dash/admins/${admin.id}/reset-password`);
  };

  // ─────────────────────────────────────────────────────────────────
  //  Filters
  // ─────────────────────────────────────────────────────────────────
  const activeFilterCount = [selectedGrade, selectedRegion, selectedStatus].filter(
    (f) => f !== "all",
  ).length;

  const resetFilters = () => {
    setSelectedGrade("all");
    setSelectedRegion("all");
    setSelectedStatus("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
    handleChange({ target: { name: "search", value: "" } });
  };

  // ─────────────────────────────────────────────────────────────────
  //  Pagination helpers
  // ─────────────────────────────────────────────────────────────────
  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const pageNumbers = useMemo(() => {
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    const end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [currentPage, totalPages]);

  // ─────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ===== HEADER ===== */}
        <div className="bg-[#111827] rounded-2xl p-6 md:p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <UserCog className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                  Gestion des administrateurs
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Shield className="w-3 h-3 mr-1" />
                    {authData?.user?.roleLabel || authData?.user?.grade || "Administrateur"}
                  </span>
                  <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date().toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <StatTile icon={Users} label="Total" value={stats.total ?? 0} accent="emerald" />
              <StatTile icon={UserCheck} label="Actifs" value={stats.active ?? 0} accent="emerald" />
              <StatTile icon={UserX} label="Inactifs" value={stats.inactive ?? 0} accent="rose" />
              <StatTile
                icon={Crown}
                label="Super admins"
                value={
                  (stats.byGrade || []).find((g) => g._id === "super_admin")?.count ?? 0
                }
                accent="blue"
              />
            </div>
          )}
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <div className="mt-6 flex flex-wrap gap-3">
          {can.create && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              Ajouter un administrateur
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 ${
              showFilters || activeFilterCount > 0
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)]"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all duration-200"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>

        {/* ===== SEARCH + PAGE SIZE ===== */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              name="search"
              onChange={handleChange}
              value={keyWord}
              placeholder="Rechercher un administrateur par nom, prénom, email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>

        {/* ===== FILTER PANEL ===== */}
        {showFilters && (
          <div className="mt-4 p-5 bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Grade */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                  Grade
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous les grades</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region */}
              {wilayasData?.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                    CLOA
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Toutes les CLOA</option>
                    {wilayasData.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
                  Statut
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tous les statuts</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ===== DATA TABLE ===== */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        {[
                          { key: "name", label: "Nom" },
                          { key: "lastname", label: "Prénom" },
                        ].map(({ key, label }) => (
                          <th
                            key={key}
                            onClick={() => {
                              setSortBy(key);
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                              setCurrentPage(1);
                            }}
                            className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold cursor-pointer hover:text-[#F8FAFC] transition"
                          >
                            {label} {sortBy === key && (sortOrder === "asc" ? "↑" : "↓")}
                          </th>
                        ))}
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                          Email
                        </th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                          Grade
                        </th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                          Rôle
                        </th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                          CLOA
                        </th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                          Statut
                        </th>
                        <th className="py-4 px-6 text-right text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.length > 0 ? (
                        admins.map((admin) => {
                          const isActive = admin.isActive !== false;
                          return (
                            <tr
                              key={admin.id}
                              className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors group"
                            >
                              <td className="py-3 px-6 text-[#F8FAFC] font-medium">
                                {admin.name || "-"}
                              </td>
                              <td className="py-3 px-6 text-[#F8FAFC]">
                                {admin.lastname || "-"}
                              </td>
                              <td className="py-3 px-6 text-[#94A3B8] truncate max-w-[180px]">
                                {admin.email || "-"}
                              </td>
                              <td className="py-3 px-6">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    GRADE_BADGE[admin.grade] || GRADE_BADGE.user
                                  }`}
                                >
                                  {gradeLabel(admin.grade)}
                                </span>
                              </td>
                              <td className="py-3 px-6 text-[#F8FAFC]">
                                {admin.role?.name || "—"}
                              </td>
                              <td className="py-3 px-6 text-[#F8FAFC]">
                                {admin.region || "-"}
                              </td>
                              <td className="py-3 px-6">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    isActive
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                  }`}
                                >
                                  {isActive ? "Actif" : "Inactif"}
                                </span>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <button
                                  onClick={(e) => toggleMenuAt(e, admin)}
                                  className="p-1.5 rounded-lg hover:bg-[#1F2937] transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5 text-[#64748B] group-hover:text-[#F8FAFC]" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center py-12 text-[#64748B]">
                            Aucun administrateur trouvé avec ces critères
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ===== PAGINATION ===== */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-[#64748B]">
                    Affichage de {(currentPage - 1) * pageSize + 1} à{" "}
                    {Math.min(currentPage * pageSize, totalAdmins)} sur {totalAdmins}{" "}
                    administrateurs
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition ${
                        currentPage === 1
                          ? "bg-[#111827] text-[#64748B] cursor-not-allowed opacity-50"
                          : "bg-[#111827] text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-lg transition ${
                          currentPage === page
                            ? "bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20"
                            : "bg-[#111827] text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition ${
                        currentPage === totalPages
                          ? "bg-[#111827] text-[#64748B] cursor-not-allowed opacity-50"
                          : "bg-[#111827] text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== SINGLE FLOATING DROPDOWN ===== */}
      {openMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={(e) => {
              e.stopPropagation();
              closeMenu();
            }}
          />
          <div
            className="fixed w-60 bg-[#182233] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
            style={{
              top: openMenu.rect.bottom + 4,
              left: Math.max(8, openMenu.rect.right - 240),
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <MenuItem
              icon={Eye}
              label="Voir le détail"
              onClick={() => {
                const a = openMenu.admin;
                closeMenu();
                handleView(a);
              }}
            />

            {can.update && (
              <MenuItem
                icon={Edit}
                label="Modifier"
                onClick={() => {
                  const a = openMenu.admin;
                  closeMenu();
                  handleEdit(a);
                }}
              />
            )}

            {(can.change_grade || can.change_role || can.reset_password) && (
              <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
            )}

            {can.change_grade && (
              <MenuItem
                icon={Award}
                label="Changer le grade"
                onClick={() => {
                  const a = openMenu.admin;
                  closeMenu();
                  handleChangeGrade(a);
                }}
              />
            )}

            {can.change_role && (
              <MenuItem
                icon={Briefcase}
                label="Changer le rôle"
                onClick={() => {
                  const a = openMenu.admin;
                  closeMenu();
                  handleChangeRole(a);
                }}
              />
            )}

            {can.reset_password && (
              <MenuItem
                icon={KeyRound}
                label="Réinitialiser le mot de passe"
                onClick={() => {
                  const a = openMenu.admin;
                  closeMenu();
                  handleResetPassword(a);
                }}
              />
            )}

            {(can.activate || can.deactivate) && (
              <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
            )}

            {openMenu.admin.isActive !== false && can.deactivate && (
              <MenuItem
                icon={UserX}
                label="Désactiver"
                onClick={() => {
                  const a = openMenu.admin;
                  closeMenu();
                  handleToggleStatus(a);
                }}
              />
            )}

            {openMenu.admin.isActive === false && can.activate && (
              <MenuItem
                icon={UserCheck}
                label="Activer"
                onClick={() => {
                  const a = openMenu.admin;
                  closeMenu();
                  handleToggleStatus(a);
                }}
              />
            )}

            {can.delete && (
              <>
                <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
                <MenuItem
                  icon={Trash2}
                  label="Supprimer"
                  danger
                  onClick={() => {
                    const a = openMenu.admin;
                    closeMenu();
                    handleDelete(a);
                  }}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Small presentational helpers
// ─────────────────────────────────────────────────────────────────────

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3 text-sm ${
        danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-[#F8FAFC] hover:bg-[#1F2937]"
      }`}
    >
      <Icon className={`w-4 h-4 ${danger ? "" : "text-[#64748B]"}`} />
      {label}
    </button>
  );
}

function StatTile({ icon: Icon, label, value, accent = "emerald" }) {
  const accents = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  const cls = accents[accent] || accents.emerald;
  return (
    <div className="flex items-center gap-3">
      <span className={`p-2 rounded-lg border ${cls}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-xs text-[#64748B] uppercase tracking-wider">{label}</p>
        <p className="text-[#F8FAFC] text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}