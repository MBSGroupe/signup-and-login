// pages/DashBoard/Roles/RolesPanel.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { useError } from "../../../Context/ErrorContext";
import { useModal } from "../../../Context/ModalContext";
import { SearchBarContext } from "../../../Context/searchContext";
import { fetchWithRefresh } from "../../../Components/api";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  PowerOff,
  Power,
  Loader2,
  Award,
  Lock,
  ShieldCheck,
  Crown,
  User as UserIcon,
  Layers,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────

const GRADE_META = {
  super_admin: {
    label: "Super administrateur",
    plural: "Super administrateurs",
    icon: Crown,
    accent: "bg-emerald-400",
    text: "text-emerald-400",
    tint: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  admin: {
    label: "Administrateur",
    plural: "Administrateurs",
    icon: ShieldCheck,
    accent: "bg-blue-400",
    text: "text-blue-400",
    tint: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  user: {
    label: "Utilisateur",
    plural: "Utilisateurs",
    icon: UserIcon,
    accent: "bg-gray-400",
    text: "text-gray-300",
    tint: "bg-gray-500/10",
    border: "border-gray-500/20",
  },
};

const GRADE_ORDER = ["super_admin", "admin", "user"];

const GRADE_OPTIONS = GRADE_ORDER.map((g) => ({
  value: g,
  label: GRADE_META[g].label,
}));

// ─────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────

export default function RolesPanel() {
  const { authData, setAuthData } = useContext(UserContext);
  const { keyWord, handleChange } = useContext(SearchBarContext);
  const { showError, showSuccess } = useError();
  const { confirm } = useModal();
  const navigate = useNavigate();

  const viewerGrade = authData?.user?.grade;
  const isSuperAdmin = viewerGrade === "super_admin";
  const isAdminOrSuper = ["admin", "super_admin"].includes(viewerGrade);

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [openMenu, setOpenMenu] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    if (!authData?.token) return;
    setLoading(true);
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/roles/all`,
        { method: "GET" },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      const list = Array.isArray(body) ? body : body?.data || [];
      setRoles(list);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      showError("Impossible de charger les rôles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [authData?.token]);

  // Close dropdown on scroll/resize/outside
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

  const toggleMenuAt = (e, role) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu((prev) => {
      if (prev && prev.role.id === role.id) return null;
      return { rect, role };
    });
  };
  const closeMenu = () => setOpenMenu(null);

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = roles.length;
    const active = roles.filter((r) => r.isActive !== false).length;
    const system = roles.filter((r) => r.isSystem).length;
    return {
      total,
      active,
      inactive: total - active,
      system,
      custom: total - system,
    };
  }, [roles]);

  // ── Filter ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = (keyWord || "").trim().toLowerCase();
    return roles.filter((r) => {
      if (gradeFilter !== "all" && r.grade !== gradeFilter) return false;
      if (statusFilter === "active" && r.isActive === false) return false;
      if (statusFilter === "inactive" && r.isActive !== false) return false;
      if (typeFilter === "system" && !r.isSystem) return false;
      if (typeFilter === "custom" && r.isSystem) return false;
      if (q) {
        const hay = `${r.name || ""} ${r.label || ""} ${r.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [roles, gradeFilter, statusFilter, typeFilter, keyWord]);

  // Group filtered roles by grade — this is the key "system" visual
  const grouped = useMemo(() => {
    const map = {};
    GRADE_ORDER.forEach((g) => {
      map[g] = filtered.filter((r) => r.grade === g);
    });
    // Any roles with an unknown grade still get shown under "user" fallback
    const known = new Set(GRADE_ORDER);
    const unknown = filtered.filter((r) => !known.has(r.grade));
    if (unknown.length) {
      map.user = [...map.user, ...unknown];
    }
    return map;
  }, [filtered]);

  const visibleGroups = GRADE_ORDER.filter((g) => grouped[g]?.length > 0);

  const activeFilterCount = [
    gradeFilter !== "all",
    statusFilter !== "all",
    typeFilter !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setGradeFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    handleChange({ target: { name: "search", value: "" } });
  };

  // ── Actions ───────────────────────────────────────────────────────
  const handleView = (role) => navigate(`/dash/roles/${role.id}`);
  const handleEdit = (role) => navigate(`/dash/roles/edit/${role.id}`);
  const handleCreate = () => navigate(`/dash/roles/create`);

  const handleToggleStatus = async (role) => {
    const isActive = role.isActive !== false;
    const verb = isActive ? "désactiver" : "activer";
    const ok = await confirm({
      title: isActive ? "Désactiver le rôle" : "Activer le rôle",
      message: `Voulez-vous vraiment ${verb} le rôle « ${role.label} » ?`,
    });
    if (!ok) return;

    try {
      const url = isActive
        ? `${NEST_API_URL}/roles/${role.id}/deactivate`
        : `${NEST_API_URL}/roles/${role.id}/activate`;
      const method = isActive ? "DELETE" : "POST";

      const res = await fetchWithRefresh(url, { method }, authData.token, setAuthData);
      const body = await res.json();
      if (!res.ok) {
        showError(body?.message || "Action impossible");
        return;
      }
      showSuccess(`Rôle ${isActive ? "désactivé" : "activé"}`);
      fetchRoles();
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  const handleDelete = async (role) => {
    const ok = await confirm({
      title: "Supprimer le rôle",
      message: `Cette action est irréversible. Supprimer le rôle « ${role.label} » ?`,
    });
    if (!ok) return;

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/roles/${role.id}`,
        { method: "DELETE" },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      if (!res.ok) {
        showError(body?.message || "Suppression impossible");
        return;
      }
      showSuccess("Rôle supprimé");
      fetchRoles();
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <BackButton fallbackPath="/dash" />
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h1 className="text-xl md:text-2xl font-semibold text-[#F8FAFC] tracking-tight">
                  Rôles & permissions
                </h1>
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-mono">
                {stats.total} rôles · {stats.system} système · {stats.custom} personnalisés
              </p>
            </div>
          </div>

          {isAdminOrSuper && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              Nouveau rôle
            </button>
          )}
        </div>

        {/* ─── Toolbar ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              name="search"
              onChange={handleChange}
              value={keyWord}
              placeholder="Filtrer par nom, libellé, description…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] text-sm placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              showFilters || activeFilterCount > 0
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-[#182233] hover:bg-[#1F2937] text-[#94A3B8] border border-[rgba(255,255,255,0.06)]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all duration-200"
            >
              <X className="w-3.5 h-3.5" />
              Effacer
            </button>
          )}
        </div>

        {/* ─── Filter row (inline, no panel) ──────────────────────── */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 mb-4 bg-[#111827] rounded-lg border border-[rgba(255,255,255,0.06)]">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#64748B] mb-1.5 font-semibold">
                Grade
              </label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Tous les grades</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#64748B] mb-1.5 font-semibold">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Tous</option>
                <option value="system">Système</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#64748B] mb-1.5 font-semibold">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>
        )}

        {/* ─── Grouped list ────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.06)] py-16 text-center">
            <Award className="w-8 h-8 text-[#475569] mx-auto mb-3" />
            <p className="text-[#94A3B8] text-sm">
              Aucun rôle ne correspond à ces critères
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((grade) => (
              <GradeGroup
                key={grade}
                grade={grade}
                roles={grouped[grade]}
                onMenu={toggleMenuAt}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Floating dropdown ──────────────────────────────────────── */}
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
                const r = openMenu.role;
                closeMenu();
                handleView(r);
              }}
            />

            {isAdminOrSuper && (
              <MenuItem
                icon={Edit}
                label="Modifier"
                onClick={() => {
                  const r = openMenu.role;
                  closeMenu();
                  handleEdit(r);
                }}
              />
            )}

            {!openMenu.role.isSystem && isAdminOrSuper && (
              <>
                <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
                {openMenu.role.isActive !== false ? (
                  <MenuItem
                    icon={PowerOff}
                    label="Désactiver"
                    onClick={() => {
                      const r = openMenu.role;
                      closeMenu();
                      handleToggleStatus(r);
                    }}
                  />
                ) : (
                  <MenuItem
                    icon={Power}
                    label="Activer"
                    onClick={() => {
                      const r = openMenu.role;
                      closeMenu();
                      handleToggleStatus(r);
                    }}
                  />
                )}
              </>
            )}

            {!openMenu.role.isSystem && isSuperAdmin && (
              <>
                <div className="border-t border-[rgba(255,255,255,0.06)] my-1" />
                <MenuItem
                  icon={Trash2}
                  label="Supprimer"
                  danger
                  onClick={() => {
                    const r = openMenu.role;
                    closeMenu();
                    handleDelete(r);
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
//  Grade group (section header + compact rows)
// ─────────────────────────────────────────────────────────────────────

function GradeGroup({ grade, roles, onMenu, onView }) {
  const meta = GRADE_META[grade] || GRADE_META.user;
  const Icon = meta.icon;
  const activeCount = roles.filter((r) => r.isActive !== false).length;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2 px-1">
        <span className={`w-1 h-4 rounded-full ${meta.accent}`} />
        <Icon className={`w-4 h-4 ${meta.text}`} />
        <h2 className="text-sm font-semibold text-[#F8FAFC] tracking-tight">
          {meta.plural}
        </h2>
        <span className="text-[11px] font-mono text-[#64748B]">
          {roles.length}
        </span>
        {activeCount !== roles.length && (
          <span className="text-[11px] font-mono text-amber-400/70">
            {activeCount}/{roles.length} actifs
          </span>
        )}
      </div>

      {/* Rows */}
      <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0F1522] overflow-hidden divide-y divide-[rgba(255,255,255,0.04)]">
        {roles.map((role) => (
          <RoleRow
            key={role.id}
            role={role}
            gradeMeta={meta}
            onMenu={onMenu}
            onView={onView}
          />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Role row — the "system" bar
// ─────────────────────────────────────────────────────────────────────

function RoleRow({ role, gradeMeta, onMenu, onView }) {
  const isActive = role.isActive !== false;
  const isSystem = role.isSystem === true;

  return (
    <div
      className="group flex items-center gap-3 pl-3 pr-2 py-2.5 hover:bg-[#1F2937]/40 transition-colors cursor-pointer"
      onClick={() => onView(role)}
    >
      {/* Left accent bar */}
      <span
        className={`w-0.5 h-8 rounded-full ${
          isActive ? gradeMeta.accent : "bg-[#3f3f46]"
        } opacity-70`}
      />

      {/* Icon */}
      <span
        className={`p-1.5 rounded border ${
          isSystem
            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
            : "bg-[#182233] border-[rgba(255,255,255,0.06)] text-[#94A3B8]"
        }`}
      >
        {isSystem ? <Lock className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
      </span>

      {/* Identity — label + mono name inline */}
      <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-sm font-medium text-[#F8FAFC] truncate">
          {role.label || "—"}
        </span>
        <span className="text-[11px] font-mono text-[#64748B] truncate">
          {role.name}
        </span>
        {role.description && (
          <span className="hidden lg:inline text-[11px] text-[#475569] truncate max-w-md">
            — {role.description}
          </span>
        )}
      </div>

      {/* Tags — system / status */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {isSystem && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            SYS
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
            isActive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
          }`}
        >
          <span
            className={`w-1 h-1 rounded-full ${
              isActive ? "bg-emerald-400" : "bg-gray-500"
            }`}
          />
          {isActive ? "Actif" : "Inactif"}
        </span>
      </div>

      {/* Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e, role);
        }}
        className="shrink-0 p-1.5 rounded-lg hover:bg-[#1F2937] transition-colors"
        aria-label="Actions"
      >
        <MoreVertical className="w-4 h-4 text-[#64748B] group-hover:text-[#F8FAFC]" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  MenuItem
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