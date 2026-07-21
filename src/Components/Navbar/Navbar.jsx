import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../../Context/dataCont";
import { logoutContext } from "../../Context/logoutContext";
import NotificationBell from "../NotificationBell/NotificationBell";
import sabAvatar from '../../assets/SabrinaAvatar.jpg';
import Title from '../Title';

export default function Navbar() {
  const { authData } = useContext(UserContext);
  const { handleLogout } = useContext(logoutContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const user = authData.user;
  const id = user?._id || user?.id;
  const role = user?.role;
  const PROFILE_URL = user?.profilePicture || sabAvatar;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-[#111827] border-b border-white/5 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo / Brand */}
          <div className="flex-shrink-0">
            <Link to="#">
              <Title title="Gest Org" />
            </Link>
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            {(role === "admin" || role === "super_admin") && (
              <Link to="/dash" className="text-[#94A3B8] hover:text-[#22C55E] transition-colors font-medium">
                Dashboard
              </Link>
            )}
            <Link to="/auth/profile" className="text-[#94A3B8] hover:text-[#22C55E] transition-colors font-medium">
              Profile
            </Link>
          </div>

          {/* Right side: Bell + Profile Dropdown */}
          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#182233] transition-all"
              >
                <span className="text-[#F8FAFC] font-medium text-sm">{user?.name}</span>
                <img
                  src={PROFILE_URL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border-2 border-[#22C55E]/30 object-cover"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#182233] border border-white/10 rounded-xl shadow-2xl py-1 z-50">
                  <button
                    onClick={() => { navigate(`/auth/update/${id}`); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-[#F8FAFC] hover:bg-[#22C55E]/10 hover:text-[#22C55E] transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => { navigate("/auth/resetPsw"); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-[#F8FAFC] hover:bg-[#22C55E]/10 hover:text-[#22C55E] transition-colors"
                  >
                    Edit Password
                  </button>
                  <button
                    onClick={() => { navigate("/auth/preferences"); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-[#F8FAFC] hover:bg-[#22C55E]/10 hover:text-[#22C55E] transition-colors"
                  >
                    Preferences
                  </button>
                  <div className="border-t border-white/5 my-1"></div>
                  <button
                    onClick={() => { handleLogout(); setDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Placeholder */}
          <div className="md:hidden flex items-center">
            {/* Hamburger menu can go here */}
          </div>

        </div>
      </div>
    </nav>
  );
} 