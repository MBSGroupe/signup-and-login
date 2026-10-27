import { useContext, useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../../Context/dataCont";
import { fetchWithRefresh } from "../../Components/api";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  User,
  CreditCard,
  PlusCircle,
  CheckSquare,
  ClipboardList,
  BarChart3,
  Settings,
  Shield,
  FileText,
  UserCog,
  ChevronDown,
  ChevronRight,
  Home,
  Wallet,
  Activity,
  Database,
  Layers,
  Award,
  Download,
} from "lucide-react";
import useExportCatalog from "../../Hooks/useExportCatalog";
import cnoaLogo from "../../assets/LOGOCLOA.png";

const API_URL = import.meta.env.VITE_NEST_API_URL;
const STORAGE_KEY = "validation_last_seen_at";

const isValidationType = (type) =>
  typeof type === "string" && type.startsWith("validation.");

/* ────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH
 * Every sidebar entry is gated by a permission, read from the cached
 * GET /permissions/me (UserContext.canDo) — no request per entry.
 * Each entry is gated by the operation its page actually calls.
 * ──────────────────────────────────────────────────────────────────── */
const PERMISSION_MAP = {
  // Tableau de bord
  dashboard: { operation: "read", model: "Dashboard" },

  // Administrateurs — the list page calls GET /admins (read_list)
  adminsRead: { operation: "read_list", model: "Admin" },
  adminsCreate: { operation: "create", model: "Admin" },

  // Membres
  membersRead: { operation: "read", model: "User" },

  // Cotisations
  cotisationsRead: { operation: "read", model: "Fee" },
  cotisationsCreate: { operation: "create", model: "Fee" },

  // Validations
  // "Demandes à valider" is for approvers only → read_approver_requests
  validationsRead: {
    operation: "read_approver_requests",
    model: "ValidationRequest",
  },
  validationsReadAll: {
    operation: "read_all_requests",
    model: "ValidationRequest",
  },

  // Statistiques
  statsFees: { operation: "read_stats", model: "Fee" },
  statsUsers: { operation: "read_stats", model: "User" },
  statsAdmins: { operation: "read_stats", model: "Admin" },
  statsRequests: { operation: "read_stats", model: "ValidationRequest" },

  // Mon profil
  profileRead: { operation: "read", model: "Admin" },
};

export default function SideBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authData, setAuthData, canDo } = useContext(UserContext);
  // "Exports" only when the backend lists at least one report for this viewer.
  const { reports: exportReports } = useExportCatalog();

  // ⚠️ Kept ONLY for the "Configuration" board (per your request).
  const isSuperAdmin = authData?.user?.grade === "super_admin";

  const [usersOpen, setUsersOpen] = useState(false);
  const [adminsOpen, setAdminsOpen] = useState(false);
  const [cotisationsOpen, setCotisationsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // ─── Permissions ───────────────────────────────────────────────────
  // Everything stays hidden until GET /permissions/me has answered (and
  // stays hidden if it failed).
  const permissions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(PERMISSION_MAP).map(([key, { operation, model }]) => [
          key,
          canDo(model, operation),
        ]),
      ),
    [canDo],
  );

  // ─── Validation unread state ───────────────────────────────────────
  const [validationNotifications, setValidationNotifications] = useState([]);
  const [validationLastSeenAt, setValidationLastSeenAt] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setUsersOpen(false);
        setAdminsOpen(false);
        setCotisationsOpen(false);
        setStatsOpen(false);
        setValidationOpen(false);
        setConfigOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Derived visibility flags ──────────────────────────────────────
  // A dropdown group is only rendered when AT LEAST ONE of its
  // sub-items is permitted. If every sub-item is denied, the group
  // button itself disappears.

  // Administrateurs
  const showAdminsGroup =
    permissions.adminsRead || permissions.adminsCreate;

  // Cotisations
  const showCotisationsGroup =
    permissions.cotisationsRead || permissions.cotisationsCreate;

  // Validations — "Mes demandes" for every admin (their own requests),
  // plus "Demandes à valider" (read_approver_requests) and
  // "Toutes les demandes" (read_all) when allowed.
  const showValidationsGroup = true;

  // Statistiques
  const hasAnyStatsItem =
    permissions.statsFees ||
    permissions.statsUsers ||
    permissions.statsAdmins ||
    permissions.statsRequests;

  // ─── Poll unread validation notifications ──────────────────────────
  useEffect(() => {
    if (!authData?.token || !showValidationsGroup) return;
    let cancelled = false;

    const fetchValidationNotifications = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/notifications?limit=50&unreadOnly=true`,
          { method: "GET" },
          authData.token,
          setAuthData,
          { type: authData.user?.type },
        );
        const body = await res.json();
        const list = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.data?.data)
            ? body.data.data
            : [];
        const validationOnly = list.filter((n) => isValidationType(n.type));
        if (!cancelled) setValidationNotifications(validationOnly);
      } catch (err) {
        console.error("Failed to fetch validation notifications", err);
      }
    };

    fetchValidationNotifications();
    const interval = setInterval(fetchValidationNotifications, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    authData?.token,
    authData?.user?.type,
    setAuthData,
    showValidationsGroup,
  ]);

  // Highlight when at least one unread validation notification is
  // newer than the last time the user acknowledged.
  const hasNewValidation = useMemo(
    () =>
      validationNotifications.some(
        (n) => new Date(n.createdAt).getTime() > validationLastSeenAt,
      ),
    [validationNotifications, validationLastSeenAt],
  );

  const acknowledgeValidation = () => {
    const now = Date.now();
    setValidationLastSeenAt(now);
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      /* ignore quota / privacy mode */
    }
  };

  const toggleDropdown = (setter, otherSetters = []) => {
    setter((prev) => !prev);
    otherSetters.forEach((s) => s(false));
  };

  // Validations toggle — no acknowledge here anymore, just opens
  const openValidationDropdown = () => {
    toggleDropdown(setValidationOpen, [
      setUsersOpen,
      setAdminsOpen,
      setCotisationsOpen,
      setStatsOpen,
      setConfigOpen,
    ]);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setUsersOpen(false);
    setAdminsOpen(false);
    setCotisationsOpen(false);
    setStatsOpen(false);
    setValidationOpen(false);
    setConfigOpen(false);
  };

  // Acknowledge ONLY when the user goes to "Demandes à valider"
  const goToValidationRequests = () => {
    acknowledgeValidation();
    handleNavigation("/dash/validation/requests");
  };

  const isActive = (path) => location.pathname === path;

  // ─── Nav components ────────────────────────────────────────────────
  const NavItem = ({ icon: Icon, label, onClick, active, className = "" }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
          : "text-[#94A3B8] hover:bg-[#1F2937] hover:text-[#F8FAFC]"
      } ${className}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  const DropdownToggle = ({
    icon: Icon,
    label,
    isOpen,
    onClick,
    highlight = false,
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${
        isOpen
          ? "bg-[#182233] text-[#F8FAFC]"
          : highlight
            ? "text-emerald-400 hover:bg-[#1F2937]"
            : "text-[#94A3B8] hover:bg-[#1F2937] hover:text-[#F8FAFC]"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${
            highlight ? "text-emerald-400 validation-pop" : ""
          }`}
        />
        <span>{label}</span>
      </span>
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-[#64748B]" />
      ) : (
        <ChevronRight className="w-4 h-4 text-[#64748B]" />
      )}
    </button>
  );

  const SubItem = ({ label, onClick, active, showDot = false }) => (
    <button
      onClick={onClick}
      className={`w-full text-left pl-9 pr-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-2 ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-[#94A3B8] hover:bg-[#1F2937] hover:text-[#F8FAFC]"
      }`}
    >
      <span>{label}</span>
      {showDot && (
        <span className="relative inline-flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.9)]" />
        </span>
      )}
    </button>
  );

  return (
    <nav
      ref={sidebarRef}
      className="fixed top-0 left-0 h-full w-[260px] bg-[#0A0F1C] border-r border-[rgba(255,255,255,0.06)] flex flex-col shadow-2xl z-40"
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <img
          src={cnoaLogo}
          alt="CNOA - Conseil National de l'Ordre des Architectes"
          className="w-12 h-12 object-contain flex-shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-lg font-bold text-[#F8FAFC] tracking-tight leading-tight">
            CNOA
          </span>
          <span className="text-[9px] text-[#94A3B8] leading-tight">
            Conseil National de l'Ordre<br />des Architectes
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="flex flex-col gap-1">
          {/* ── Tableau de bord ─────────────────────────────────────── */}
          {permissions.dashboard && (
            <NavItem
              icon={LayoutDashboard}
              label="Tableau de bord"
              onClick={() => handleNavigation("/dash")}
              active={isActive("/dash")}
            />
          )}

          {/* ── Administrateurs ─────────────────────────────────────── */}
          {showAdminsGroup && (
            <div>
              <DropdownToggle
                icon={Shield}
                label="Administrateurs"
                isOpen={adminsOpen}
                onClick={() =>
                  toggleDropdown(setAdminsOpen, [
                    setUsersOpen,
                    setCotisationsOpen,
                    setStatsOpen,
                    setValidationOpen,
                    setConfigOpen,
                  ])
                }
              />
              {adminsOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  {permissions.adminsRead && (
                    <SubItem
                      label="Tous les administrateurs"
                      onClick={() => handleNavigation("/dash/admins")}
                      active={isActive("/dash/admins")}
                    />
                  )}
                  {permissions.adminsCreate && (
                    <SubItem
                      label="Ajouter un administrateur"
                      onClick={() => handleNavigation("/dash/admins/create")}
                      active={isActive("/dash/admins/create")}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Membres ─────────────────────────────────────────────── */}
          {permissions.membersRead && (
            <NavItem
              icon={User}
              label="Membres"
              onClick={() => handleNavigation("/dash/allMembers")}
              active={isActive("/dash/allMembers")}
            />
          )}

          {/* ── Cotisations ─────────────────────────────────────────── */}
          {showCotisationsGroup && (
            <div>
              <DropdownToggle
                icon={CreditCard}
                label="Cotisations"
                isOpen={cotisationsOpen}
                onClick={() =>
                  toggleDropdown(setCotisationsOpen, [
                    setUsersOpen,
                    setAdminsOpen,
                    setStatsOpen,
                    setValidationOpen,
                    setConfigOpen,
                  ])
                }
              />
              {cotisationsOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  {permissions.cotisationsRead && (
                    <SubItem
                      label="Toutes les cotisations"
                      onClick={() => handleNavigation("/dash/allCotisations")}
                      active={isActive("/dash/allCotisations")}
                    />
                  )}
                  {permissions.cotisationsCreate && (
                    <SubItem
                      label="Ajouter une cotisation"
                      onClick={() => handleNavigation("/dash/ajouterCotisation")}
                      active={isActive("/dash/ajouterCotisation")}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Validations ─────────────────────────────────────────── */}
          {showValidationsGroup && (
            <div>
              <DropdownToggle
                icon={CheckSquare}
                label="Validations"
                isOpen={validationOpen}
                onClick={openValidationDropdown}
                highlight={hasNewValidation}
              />
              {validationOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  {permissions.validationsRead && (
                    <SubItem
                      label="Demandes à valider"
                      onClick={goToValidationRequests}
                      active={isActive("/dash/validation/requests")}
                      showDot={hasNewValidation}
                    />
                  )}
                  {permissions.validationsReadAll && (
                    <SubItem
                      label="Toutes les demandes"
                      onClick={() =>
                        handleNavigation("/dash/validation/all-requests")
                      }
                      active={isActive("/dash/validation/all-requests")}
                    />
                  )}
                  <SubItem
                    label="Mes demandes"
                    onClick={() => handleNavigation("/dash/validation/my-requests")}
                    active={isActive("/dash/validation/my-requests")}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Statistiques ────────────────────────────────────────── */}
          {hasAnyStatsItem && (
            <div>
              <DropdownToggle
                icon={BarChart3}
                label="Statistiques"
                isOpen={statsOpen}
                onClick={() =>
                  toggleDropdown(setStatsOpen, [
                    setUsersOpen,
                    setAdminsOpen,
                    setCotisationsOpen,
                    setValidationOpen,
                    setConfigOpen,
                  ])
                }
              />
              {statsOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  {permissions.statsFees && (
                    <SubItem
                      label="Cotisations"
                      onClick={() => handleNavigation("/dash/feeStats")}
                      active={isActive("/dash/feeStats")}
                    />
                  )}
                  {permissions.statsUsers && (
                    <SubItem
                      label="Utilisateurs"
                      onClick={() => handleNavigation("/dash/userStats")}
                      active={isActive("/dash/userStats")}
                    />
                  )}
                  {permissions.statsAdmins && (
                    <SubItem
                      label="Administrateurs"
                      onClick={() => handleNavigation("/dash/adminStats")}
                      active={isActive("/dash/adminStats")}
                    />
                  )}
                  {permissions.statsRequests && (
                    <SubItem
                      label=" Validations"
                      onClick={() => handleNavigation("/dash/validationStats")}
                      active={isActive("/dash/validationStats")}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Exports ─────────────────────────────────────────────── */}
          {exportReports.length > 0 && (
            <NavItem
              icon={Download}
              label="Exports"
              onClick={() => handleNavigation("/dash/exports")}
              active={isActive("/dash/exports")}
            />
          )}

          {/* ── Configuration — INTENTIONALLY super_admin only ──────── */}
          {isSuperAdmin && (
            <div>
              <DropdownToggle
                icon={Settings}
                label="Configuration"
                isOpen={configOpen}
                onClick={() =>
                  toggleDropdown(setConfigOpen, [
                    setUsersOpen,
                    setAdminsOpen,
                    setCotisationsOpen,
                    setStatsOpen,
                    setValidationOpen,
                  ])
                }
              />
              {configOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  <SubItem
                    label="Permissions"
                    onClick={() => handleNavigation("/dash/permissions")}
                    active={isActive("/dash/permissions")}
                  />
                  <SubItem
                    label="Rôles"
                    onClick={() => handleNavigation("/dash/roles")}
                    active={isActive("/dash/roles")}
                  />
                  <SubItem
                    label="Validations"
                    onClick={() => handleNavigation("/dash/validation/schemas")}
                    active={isActive("/dash/validation/schemas")}
                  />
                  <SubItem
                    label="PDF Templates"
                    onClick={() => handleNavigation("/dash/template/background")}
                    active={isActive("/dash/template/background")}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Mon profil ──────────────────────────────────────────── */}
          {permissions.profileRead && (
            <NavItem
              icon={UserCog}
              label="Mon profil"
              onClick={() =>
                handleNavigation(`/dash/admins/${authData?.user?.id}`)
              }
              active={isActive(`/dash/admins/${authData?.user?.id}`)}
            />
          )}
        </div>
      </div>

      {/* Footer / user info */}
      <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
            {authData?.user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#F8FAFC] truncate">
              {authData?.user?.name || "Utilisateur"}
            </p>
            <p className="text-xs text-[#64748B] truncate capitalize">
              {authData?.user?.grade === "admin"
                ? "Administrateur"
                : authData?.user?.grade === "super_admin"
                  ? "Super administrateur"
                  : authData?.user?.roleLabel ||
                    authData?.user?.roleName ||
                    "Utilisateur"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.2s;
        }
        .custom-scrollbar:hover {
          scrollbar-color: #4b5563 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #374151;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-track {
          background-color: transparent;
        }

        @keyframes validationPop {
          0%, 100% {
            filter: drop-shadow(0 0 3px rgba(52, 211, 153, 0.6));
            transform: scale(1);
            opacity: 0.95;
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(52, 211, 153, 1));
            transform: scale(1.12);
            opacity: 1;
          }
        }
        .validation-pop {
          animation: validationPop 1.8s ease-in-out infinite;
        }
      `}</style>
    </nav>
  );
}