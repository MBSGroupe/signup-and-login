import { useContext } from 'react';
import { UserContext } from '../../Context/dataCont';
import { logoutContext } from '../../Context/logoutContext';
import NotificationBell from '../NotificationBell/NotificationBell';
import { LogOut, User, Bell, LayoutDashboard } from 'lucide-react';

export default function AdminHeader() {
  const { authData } = useContext(UserContext);
  const { handleLogout } = useContext(logoutContext);

  // Get initials for avatar
  const getInitials = () => {
    if (!authData?.user?.name) return 'U';
    const nameParts = authData.user.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return authData.user.name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-[260px] right-0 h-20 bg-[#0A0F1C] border-b border-[rgba(255,255,255,0.06)] px-6 flex items-center justify-between z-30">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-5 h-5 text-emerald-400" />
        <span className="text-lg font-bold text-[#F8FAFC] tracking-tight">Admin Dashboard</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        {/* User avatar and name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
            {getInitials()}
          </div>
          <span className="text-sm font-medium text-[#F8FAFC] hidden sm:inline-block">
            {authData?.user?.name || 'User'}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-[#1F2937] hover:bg-[#22C55E] hover:text-[#0A0F1C] rounded-lg transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}