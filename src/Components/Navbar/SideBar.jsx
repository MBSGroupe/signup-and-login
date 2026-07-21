import { useContext, useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../../Context/dataCont";
import SectionTitle from '../Title';

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

  return (
    <nav
      ref={sidebarRef}
      className="fixed top-0 left-0 h-full w-[250px] bg-[#111827] border-r border-white/5 flex flex-col py-6 px-4 shadow-2xl z-40"
    >
      <div className="mb-8 text-center flex-shrink-0">
        <SectionTitle title="GestOrg" />
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => handleNavigation("/dash")}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
              isActive("/dash") 
                ? "bg-[#22C55E] text-[#0A0F1C] shadow-lg shadow-[#22C55E]/20" 
                : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
            }`}
          >
            Dashboard
          </button>

          {isSuperAdmin && (
            <div>
              <button
                onClick={() => toggleDropdown(setUsersOpen, [setCotisationsOpen, setStatsOpen, setValidationOpen, setConfigOpen])}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                  usersOpen ? "bg-[#182233] text-[#F8FAFC]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                }`}
              >
                Utilisateurs
              </button>
              {usersOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-3">
                  <button
                    onClick={() => handleNavigation("/dash/allUsers")}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive("/dash/allUsers") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                    }`}
                  >
                    Tous les utilisateurs
                  </button>
                  <button
                    onClick={() => handleNavigation("/dash/createUser")}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive("/dash/createUser") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                    }`}
                  >
                    Créer utilisateur
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => handleNavigation("/dash/allMembers")}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
              isActive("/dash/allMembers") 
                ? "bg-[#22C55E] text-[#0A0F1C] shadow-lg shadow-[#22C55E]/20" 
                : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
            }`}
          >
            Membres
          </button>

          <div>
            <button
              onClick={() => toggleDropdown(setCotisationsOpen, [setUsersOpen, setStatsOpen, setValidationOpen, setConfigOpen])}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                cotisationsOpen ? "bg-[#182233] text-[#F8FAFC]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
              }`}
            >
              Cotisation
            </button>
            {cotisationsOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-3">
                <button
                  onClick={() => handleNavigation("/dash/allCotisations")}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                    isActive("/dash/allCotisations") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                  }`}
                >
                  Toutes les cotisations
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleNavigation("/dash/ajouterCotisation")}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive("/dash/ajouterCotisation") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                    }`}
                  >
                    Ajouter nouveau
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => toggleDropdown(setValidationOpen, [setUsersOpen, setCotisationsOpen, setStatsOpen, setConfigOpen])}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                validationOpen ? "bg-[#182233] text-[#F8FAFC]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
              }`}
            >
              Validation
            </button>
            {validationOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-3">
                <button
                  onClick={() => handleNavigation("/dash/validation/requests")}
                  className="block w-full text-left px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC] transition-all"
                >
                  Demandes à valider
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleNavigation("/dash/validation/all-requests")}
                    className="block w-full text-left px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC] transition-all"
                  >
                    Toutes les demandes
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => toggleDropdown(setStatsOpen, [setUsersOpen, setCotisationsOpen, setValidationOpen, setConfigOpen])}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                statsOpen ? "bg-[#182233] text-[#F8FAFC]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
              }`}
            >
              Statistiques
            </button>
            {statsOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-3">
                <button
                  onClick={() => handleNavigation("/dash/feeStats")}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                    isActive("/dash/feeStats") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                  }`}
                >
                  Cotisations
                </button>
                <button
                  onClick={() => handleNavigation("/dash/userStats")}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                    isActive("/dash/userStats") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                  }`}
                >
                  Utilisateurs
                </button>
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div>
              <button
                onClick={() => toggleDropdown(setConfigOpen, [setUsersOpen, setCotisationsOpen, setStatsOpen, setValidationOpen])}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                  configOpen ? "bg-[#182233] text-[#F8FAFC]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                }`}
              >
                Configuration
              </button>
              {configOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-3">
                  <button
                    onClick={() => handleNavigation("/dash/permissions")}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive("/dash/permissions") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                    }`}
                  >
                    Permissions
                  </button>
                  <button
                    onClick={() => handleNavigation("/dash/validation/schemas")}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive("/dash/validation/schemas") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                    }`}
                  >
                    Schémas de validation
                  </button>
                  <button
                    onClick={() => handleNavigation("/dash/template/background")}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                      isActive("/dash/template/background") ? "bg-[#22C55E] text-[#0A0F1C]" : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
                    }`}
                  >
                    Templates
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => handleNavigation("/auth/profile")}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
              isActive("/auth/profile") 
                ? "bg-[#22C55E] text-[#0A0F1C] shadow-lg shadow-[#22C55E]/20" 
                : "text-[#94A3B8] hover:bg-[#22C55E]/10 hover:text-[#F8FAFC]"
            }`}
          >
            Mon profil
          </button>
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
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #4b5563;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-track {
          background-color: transparent;
        }
      `}</style>
    </nav>
  );
}