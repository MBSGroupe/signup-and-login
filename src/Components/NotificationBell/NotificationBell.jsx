import { useState, useEffect, useRef, useContext } from 'react';
import { UserContext } from '../../Context/dataCont';
import { fetchWithRefresh } from '../../Components/api';
import NotificationDropdown from './NotificationDropdown';

const API_URL = import.meta.env.VITE_API_URL;

const NotificationBell = () => {
  const { authData, setAuthData } = useContext(UserContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/notifications/unread/count`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  // useEffect(() => {
  //   if (!authData?.token) return;
  //   fetchUnreadCount();
  //   const interval = setInterval(fetchUnreadCount, 30000);
  //   return () => clearInterval(interval);
  // }, [authData?.token]);

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-gray-800 transition-colors focus:outline-none"
      >
        {/* Thin SVG Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-5 h-5 text-yellow-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.75 18h16.5"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <NotificationDropdown
          onClose={() => setShowDropdown(false)}
          onRead={fetchUnreadCount}
        />
      )}
    </div>
  );
};

export default NotificationBell;