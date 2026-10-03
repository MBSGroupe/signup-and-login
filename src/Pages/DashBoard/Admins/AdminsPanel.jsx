// pages/DashBoard/Admins/AdminsPanel.jsx
import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
  Plus,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  KeyRound,
  Briefcase,
  Loader2,
  User,
  ShieldCheck,
  Activity,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens (console / enterprise look) ────────────────
const LABEL_CLS =
  "block text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] mb-1.5";

const INPUT_CLS =
  "w-full px-3 py-2 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all placeholder-[#475569]";

const MONO_INPUT_CLS = INPUT_CLS + " font-mono";

const BTN_PRIMARY_CLS =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0A0F1C] bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200";

const BTN_GHOST_CLS =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-transparent hover:bg-[#1F2937] border border-[rgba(255,255,255,0.08)] rounded-lg transition-all duration-200";

const BTN_DANGER_CLS =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-all duration-200";

// ─── Lookups ────────────────────────────────────────────────────────
const WILAYA_BY_CODE = new Map(
  (wilayasData || []).map((w) => [String(w.code), w.name]),
);

const regionLabel = (code) => {
  if (code === null || code === undefined || code === "") return "—";
  return WILAYA_BY_CODE.get(String(code)) || String(code);
};

// ─── Constants ──────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "true", label: "Actif" },
  { value: "false", label: "Inactif" },
];

const OPS = [
  "create",
  "update",
  "delete",
  "activate",
  "deactivate",
  "reset_password",
  "change_role",
];

// Menu dimensions used for flip-up / flip-left logic
const MENU_WIDTH = 240;
const MENU_HEIGHT_ESTIMATE = 320;

// ─── Envelope unwrapping ────────────────────────────────────────────
function unwrapList(body) {
  const inner =
    body?.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? body.data
      : body;

  const list = Array.isArray(inner?.data)
    ? inner.data
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(inner)
        ? inner
        : [];

  const pagination = inner?.pagination || body?.pagination || {};
  return { list, pagination };
}

function unwrapRoles(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.data)) return body.data.data;
  return [];
}

export default function AdminsPanel() {
  const { authData, setAuthData } = useContext(UserContext);
  const { keyWord, handleChange } = useContext(SearchBarContext);
  const { showError, showSuccess } = useError();
  const { confirm } = useModal();
  const navigate = useNavigate();

  // ─── Pagination ───────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ─── Data / UI ────────────────────────────────────────────────────
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Roles (for the filter dropdown) ──────────────────────────────
  const [roleOptions, setRoleOptions] = useState([]);

  // ─── Filters ──────────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // ─── Sort ─────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // ─── Floating menu ────────────────────────────────────────────────
  // Shape: { rect, admin, openUpward, alignLeft } | null
  const [openMenu, setOpenMenu] = useState(null);

  // ─── Permission flags ─────────────────────────────────────────────
  const [can, setCan] = useState({});

  // ─── Fetch roles once (filter dropdown only) ──────────────────────
  useEffect(() => {
    if (!authData?.token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/roles`,
          { method: "GET" },
          authData.token,
          setAuthData,
        );
        if (!res.ok) return;
        const body = await res.json();
        const list = unwrapRoles(body);
        if (cancelled) return;
        const opts = list
          .filter((r) => r && (r.id || r._id))
          .map((r) => ({
            value: r.id || r._id,
            label: r.label || r.name || "—",
          }));
        setRoleOptions(opts);
      } catch (err) {
        console.warn("Failed to fetch roles for filter:", err?.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authData?.token, setAuthData]);

  // ─── Fetch admins ─────────────────────────────────────────────────
  const fetchAdmins = async () => {
    if (!authData?.token) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("limit", String(pageSize));
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      if (keyWord) params.append("search", keyWord);
      if (selectedRole !== "all") params.append("roleId", selectedRole);
      if (selectedRegion !== "all") params.append("region", selectedRegion);
      if (selectedStatus !== "all") params.append("isActive", selectedStatus);

      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins?${params.toString()}`,
        { method: "GET" },
        authData.token,
        setAuthData,
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.json();
      const { list, pagination } = unwrapList(body);

      setAdmins(list);
      setTotalAdmins(pagination.total ?? list.length);
      setTotalPages(
        pagination.totalPages ??
          Math.max(1, Math.ceil((pagination.total ?? list.length) / pageSize)),
      );
    } catch (err) {
      console.error("Error fetching admins:", err);
      showError("Impossible de charger les administrateurs.");
      setAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Permission checks ────────────────────────────────────────────
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
        const payload = body?.data || body;
        return Boolean(payload?.canPerform);
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
    })();

    return () => {
      cancelled = true;
    };
  }, [authData?.token, authData?.user?.id, setAuthData]);

  // ─── Refetch on dependency changes ────────────────────────────────
  useEffect(() => {
    if (authData?.token) fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authData?.token,
    currentPage,
    pageSize,
    keyWord,
    selectedRole,
    selectedRegion,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  // ─── Close menu on scroll / resize / outside click ────────────────
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

  // ─── Flip-up / flip-left aware opener ─────────────────────────────
  const toggleMenuAt = (e, admin) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    // Vertical: prefer below, flip up if there isn't room and there's
    // more room above.
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward =
      spaceBelow < MENU_HEIGHT_ESTIMATE && spaceAbove > spaceBelow;

    // Horizontal: prefer left-aligned to the button's right edge;
    // flip to left-aligned if there isn't room.
    const naturalLeft = rect.right - MENU_WIDTH;
    const alignLeft = naturalLeft < 8;

    setOpenMenu((prev) => {
      if (prev && prev.admin.id === admin.id) return null;
      return { rect, admin, openUpward, alignLeft };
    });
  };
  const closeMenu = () => setOpenMenu(null);

  // ─── Menu positioning style ───────────────────────────────────────
  const menuStyle = useMemo(() => {
    if (!openMenu) return {};
    const { rect, openUpward, alignLeft } = openMenu;

    const top = openUpward ? rect.top - 4 : rect.bottom + 4;
    const left = alignLeft
      ? Math.max(8, rect.left)
      : Math.max(8, rect.right - MENU_WIDTH);

    return {
      top,
      left,
      width: MENU_WIDTH,
      ...(openUpward ? { transform: "translateY(-100%)" } : {}),
    };
  }, [openMenu]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleVisitProfile = (admin) => navigate(`/dash/admins/${admin.id}`);
  const handleEdit = (admin) => navigate(`/dash/admins/edit/${admin.id}`);
  const handleCreate = () => navigate(`/dash/admins/create`);

  const handleToggleStatus = async (admin) => {
    const isActive = admin.isActive !== false;
    const action = isActive ? "deactivate" : "activate";
    const label = isActive ? "désactiver" : "activer";

    const ok = await confirm({
      title: isActive
        ? "Désactiver l'administrateur"
        : "Activer l'administrateur",
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
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  const handleChangeRole = (admin) => {
    navigate(`/dash/admins/edit/${admin.id}?focus=role`);
  };

  const handleResetPassword = (admin) => {
    navigate(`/dash/admins/${admin.id}/reset-password`);
  };

  // ─── Filters ──────────────────────────────────────────────────────
  const activeFilterCount = [
    selectedRole,
    selectedRegion,
    selectedStatus,
  ].filter((f) => f !== "all").length;

  const resetFilters = () => {
    setSelectedRole("all");
    setSelectedRegion("all");
    setSelectedStatus("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
    handleChange({ target: { name: "search", value: "" } });
  };

  // ─── Pagination helpers ───────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased relative"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative max-w-6xl mx-auto p-6 md:p-8">
        {/* ═══ HEADER ══════════════════════════════════════════════ */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
                  Console · Administration
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                Gestion des administrateurs
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {authData?.user?.roleLabel ||
                  authData?.user?.grade ||
                  "Administrateur"}{" "}
                · {new Date().toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>

          {/* Small right-side info */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)]">
            <Activity className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="text-[11px] font-mono text-[#64748B]">
              {totalAdmins} enregistrement{totalAdmins > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ═══ ACTIONS ═════════════════════════════════════════════ */}
        <div className="flex flex-wrap gap-2 mb-4">
          {can.create && (
            <button onClick={handleCreate} className={BTN_PRIMARY_CLS}>
              <Plus className="w-4 h-4" />
              Ajouter un administrateur
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showFilters || activeFilterCount > 0
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.08)]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-emerald-400 text-[#0A0F1C] text-[10px] font-mono w-4 h-4 rounded flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button onClick={resetFilters} className={BTN_DANGER_CLS}>
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>

        {/* ═══ SEARCH + PAGE SIZE ══════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              name="search"
              onChange={handleChange}
              value={keyWord}
              placeholder="Rechercher par nom, prénom, email…"
              className={MONO_INPUT_CLS + " pl-9 pr-3"}
            />
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={MONO_INPUT_CLS + " md:w-32"}
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>

        {/* ═══ FILTER PANEL ════════════════════════════════════════ */}
        {showFilters && (
          <div className="mb-4 p-5 bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Role */}
              <div>
                <label className={LABEL_CLS}>Rôle</label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={INPUT_CLS}
                >
                  <option value="all">Tous les rôles</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region */}
              {wilayasData?.length > 0 && (
                <div>
                  <label className={LABEL_CLS}>CLOA</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={INPUT_CLS}
                  >
                    <option value="all">Toutes les CLOA</option>
                    {wilayasData.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label className={LABEL_CLS}>Statut</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={INPUT_CLS}
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

        {/* ═══ TABLE ═══════════════════════════════════════════════ */}
        <div className="mb-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#0A0F1C]/40">
                        <th
                          onClick={() => {
                            setSortBy("name");
                            setSortOrder(
                              sortOrder === "asc" ? "desc" : "asc",
                            );
                            setCurrentPage(1);
                          }}
                          className="py-3 px-5 text-left text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium cursor-pointer hover:text-[#F8FAFC] transition select-none"
                        >
                          Administrateur{" "}
                          {sortBy === "name" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="py-3 px-5 text-left text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium">
                          Email
                        </th>
                        <th className="py-3 px-5 text-left text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium">
                          Rôle
                        </th>
                        <th className="py-3 px-5 text-left text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium">
                          CLOA
                        </th>
                        <th className="py-3 px-5 text-left text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium">
                          Statut
                        </th>
                        <th className="py-3 px-5 text-right text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.length > 0 ? (
                        admins.map((admin) => {
                          const isActive = admin.isActive !== false;
                          const fullName =
                            [admin.name, admin.lastname]
                              .filter(Boolean)
                              .join(" ")
                              .trim() || "-";
                          return (
                            <tr
                              key={admin.id}
                              className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#0A0F1C]/60 transition-colors group"
                            >
                              <td className="py-2.5 px-5 text-[#F8FAFC] text-sm font-medium">
                                {fullName}
                              </td>
                              <td className="py-2.5 px-5 text-[#94A3B8] font-mono text-xs truncate max-w-[220px]">
                                {admin.email || "-"}
                              </td>
                              <td className="py-2.5 px-5 text-[#F8FAFC] text-sm">
                                {admin.role?.label ||
                                  admin.role?.name ||
                                  "—"}
                              </td>
                              <td className="py-2.5 px-5 text-[#F8FAFC] text-sm">
                                {regionLabel(admin.region)}
                              </td>
                              <td className="py-2.5 px-5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                                    isActive
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isActive
                                        ? "bg-emerald-400"
                                        : "bg-gray-500"
                                    }`}
                                  />
                                  {isActive ? "actif" : "inactif"}
                                </span>
                              </td>
                              <td className="py-2.5 px-5 text-right">
                                <button
                                  onClick={(e) => toggleMenuAt(e, admin)}
                                  className="p-1.5 rounded-lg hover:bg-[#1F2937] transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-[#64748B] group-hover:text-[#F8FAFC]" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center py-14 text-[#64748B] text-sm font-mono"
                          >
                            Aucun administrateur trouvé
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══ PAGINATION ═════════════════════════════════════ */}
              {totalPages > 1 && (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] font-mono text-[#64748B]">
                    <span className="text-[#94A3B8]">
                      {(currentPage - 1) * pageSize + 1}–
                      {Math.min(currentPage * pageSize, totalAdmins)}
                    </span>{" "}
                    / {totalAdmins}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-1.5 rounded-lg transition ${
                        currentPage === 1
                          ? "text-[#475569] cursor-not-allowed"
                          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`min-w-[30px] h-8 px-2 rounded-lg text-xs font-mono transition ${
                          currentPage === page
                            ? "bg-emerald-400 text-[#0A0F1C] font-semibold"
                            : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 rounded-lg transition ${
                        currentPage === totalPages
                          ? "text-[#475569] cursor-not-allowed"
                          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
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

      {/* ═══ FLOATING MENU (flip-up / flip-left aware) ═══════════ */}
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
            className="fixed bg-[#0F1623] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl shadow-black/60 z-50 py-1 overflow-hidden"
            style={menuStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <MenuItem
              icon={User}
              label="Visiter le profil"
              onClick={() => {
                const a = openMenu.admin;
                closeMenu();
                handleVisitProfile(a);
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

            {(can.change_role || can.reset_password) && (
              <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
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

// ─── Menu item ──────────────────────────────────────────────────────
function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3.5 py-2 text-left transition-colors flex items-center gap-2.5 text-xs font-medium ${
        danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-[#F8FAFC] hover:bg-[#1F2937]"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${danger ? "" : "text-[#64748B]"}`} />
      {label}
    </button>
  );
}