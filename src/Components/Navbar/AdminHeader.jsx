import { useContext } from 'react';
import { UserContext } from '../../Context/dataCont';
import { logoutContext } from '../../Context/logoutContext';
import NotificationBell from '../NotificationBell/NotificationBell';

export default function AdminHeader() {
  const { authData } = useContext(UserContext);
  const { handleLogout } = useContext(logoutContext);

  return (
    <header className="bg-[#111827] border-b border-white/5 px-6 py-4 flex justify-between items-center ml-[250px]">
      <div className="text-[#F8FAFC] font-bold text-xl tracking-tight">Admin Dashboard</div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="text-[#94A3B8] font-medium">{authData?.user?.name}</span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-[#1F2937] hover:bg-[#22C55E] hover:text-[#0A0F1C] text-[#F8FAFC] rounded-lg transition-all border border-white/5 text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  );
}