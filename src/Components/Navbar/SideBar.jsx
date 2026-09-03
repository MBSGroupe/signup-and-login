import { useContext, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../../Context/dataCont";
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
  Layers
} from "lucide-react";

export default function SideBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authData } = useContext(UserContext);
  const userRole = authData?.user?.role;
  const isSuperAdmin = userRole === 'super_admin';

  const [usersOpen, setUsersOpen] = useState(false);
  const [cotisationsOpen, setCotisationsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setUsersOpen(false);
        setCotisationsOpen(false);
        setStatsOpen(false);
        setValidationOpen(false);
        setConfigOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (setter, otherSetters = []) => {
    setter(prev => !prev);
    otherSetters.forEach(s => s(false));
  };

  const handleNavigation = (path) => {
    navigate(path);
    setUsersOpen(false);
    setCotisationsOpen(false);
    setStatsOpen(false);
    setValidationOpen(false);
    setConfigOpen(false);
  };

  const isActive = (path) => location.pathname === path;
  const isValidationActive = () => location.pathname.startsWith('/dash/validation');
  const isConfigActive = () => location.pathname === '/dash/permissions' || location.pathname === '/dash/validation/schemas';

  // Helper to render a nav item with icon
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

  // Dropdown toggle button
  const DropdownToggle = ({ icon: Icon, label, isOpen, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${
        isOpen
          ? "bg-[#182233] text-[#F8FAFC]"
          : "text-[#94A3B8] hover:bg-[#1F2937] hover:text-[#F8FAFC]"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
      </span>
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-[#64748B]" />
      ) : (
        <ChevronRight className="w-4 h-4 text-[#64748B]" />
      )}
    </button>
  );

  // Sub-item
  const SubItem = ({ label, onClick, active }) => (
    <button
      onClick={onClick}
      className={`w-full text-left pl-9 pr-4 py-2 rounded-lg text-sm transition-all duration-200 ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-[#94A3B8] hover:bg-[#1F2937] hover:text-[#F8FAFC]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav
      ref={sidebarRef}
      className="fixed top-0 left-0 h-full w-[260px] bg-[#0A0F1C] border-r border-[rgba(255,255,255,0.06)] flex flex-col shadow-2xl z-40"
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-xl font-bold text-[#F8FAFC] tracking-tight">GestOrg</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="flex flex-col gap-1">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            onClick={() => handleNavigation("/dash")}
            active={isActive("/dash")}
          />

          {isSuperAdmin && (
            <div>
              <DropdownToggle
                icon={Users}
                label="Utilisateurs"
                isOpen={usersOpen}
                onClick={() => toggleDropdown(setUsersOpen, [setCotisationsOpen, setStatsOpen, setValidationOpen, setConfigOpen])}
              />
              {usersOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  <SubItem
                    label="Tous les utilisateurs"
                    onClick={() => handleNavigation("/dash/allUsers")}
                    active={isActive("/dash/allUsers")}
                  />

                </div>
              )}
            </div>
          )}

          <NavItem
            icon={User}
            label="Membres"
            onClick={() => handleNavigation("/dash/allMembers")}
            active={isActive("/dash/allMembers")}
          />

          <div>
            <DropdownToggle
              icon={CreditCard}
              label="Cotisation"
              isOpen={cotisationsOpen}
              onClick={() => toggleDropdown(setCotisationsOpen, [setUsersOpen, setStatsOpen, setValidationOpen, setConfigOpen])}
            />
            {cotisationsOpen && (
              <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                <SubItem
                  label="Toutes les cotisations"
                  onClick={() => handleNavigation("/dash/allCotisations")}
                  active={isActive("/dash/allCotisations")}
                />
                {isSuperAdmin && (
                  <SubItem
                    label="Ajouter nouveau"
                    onClick={() => handleNavigation("/dash/ajouterCotisation")}
                    active={isActive("/dash/ajouterCotisation")}
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <DropdownToggle
              icon={CheckSquare}
              label="Validation"
              isOpen={validationOpen}
              onClick={() => toggleDropdown(setValidationOpen, [setUsersOpen, setCotisationsOpen, setStatsOpen, setConfigOpen])}
            />
            {validationOpen && (
              <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                <SubItem
                  label="Demandes à valider"
                  onClick={() => handleNavigation("/dash/validation/requests")}
                  active={isActive("/dash/validation/requests")}
                />
                {isSuperAdmin && (
                  <SubItem
                    label="Toutes les demandes"
                    onClick={() => handleNavigation("/dash/validation/all-requests")}
                    active={isActive("/dash/validation/all-requests")}
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <DropdownToggle
              icon={BarChart3}
              label="Statistiques"
              isOpen={statsOpen}
              onClick={() => toggleDropdown(setStatsOpen, [setUsersOpen, setCotisationsOpen, setValidationOpen, setConfigOpen])}
            />
            {statsOpen && (
              <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                <SubItem
                  label="Cotisations"
                  onClick={() => handleNavigation("/dash/feeStats")}
                  active={isActive("/dash/feeStats")}
                />
                <SubItem
                  label="Utilisateurs"
                  onClick={() => handleNavigation("/dash/userStats")}
                  active={isActive("/dash/userStats")}
                />
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div>
              <DropdownToggle
                icon={Settings}
                label="Configuration"
                isOpen={configOpen}
                onClick={() => toggleDropdown(setConfigOpen, [setUsersOpen, setCotisationsOpen, setStatsOpen, setValidationOpen])}
              />
              {configOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] pl-2">
                  <SubItem
                    label="Permissions"
                    onClick={() => handleNavigation("/dash/permissions")}
                    active={isActive("/dash/permissions")}
                  />
                  <SubItem
                    label="Schémas de validation"
                    onClick={() => handleNavigation("/dash/validation/schemas")}
                    active={isActive("/dash/validation/schemas")}
                  />
                  <SubItem
                    label="Templates"
                    onClick={() => handleNavigation("/dash/template/background")}
                    active={isActive("/dash/template/background")}
                  />
                </div>
              )}
            </div>
          )}

          <NavItem
            icon={UserCog}
            label="Mon profil"
            onClick={() => handleNavigation("/auth/profile")}
            active={isActive("/auth/profile")}
          />
        </div>
      </div>

      {/* Footer / user info (optional) */}
      <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
            {authData?.user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#F8FAFC] truncate">
              {authData?.user?.name || 'Utilisateur'}
            </p>
            <p className="text-xs text-[#64748B] truncate capitalize">
              {authData?.user?.role || 'user'}
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
      `}</style>
    </nav>
  );
}