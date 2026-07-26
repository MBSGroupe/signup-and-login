import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../Context/dataCont';
import { fetchWithRefresh } from '../../Components/api';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Clock,
  Mail,
  CheckCheck,
  ChevronRight,
  Loader2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

const NotificationDropdown = ({ onClose, onRead }) => {
  const { authData, setAuthData } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/notifications?limit=10&unreadOnly=false`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      console.log(data.data);
      setNotifications(data.data.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notif) => {
    const { id, type, data } = notif;
    let navigateUrl = null;

    // Determine the target URL without navigating yet
    switch (type) {
      case 'validation.request':
      case 'validation.rejected':
      case 'validation.cancelled':
      case 'validation.rejection_noted':
        if (data?.validationRequestId) {
          navigateUrl = `/dash/validation/requests/${data.validationRequestId}`;
        }
        break;
      default:
        navigateUrl = '/auth/notifications';
    }

    try {
      // Mark as read first (await the fetch)
      await fetchWithRefresh(
        `${API_URL}/notifications/${id}/read`,
        { method: 'PATCH' },
        authData.token,
        setAuthData
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }

    // Navigate after the request completes (or even if it fails)
    if (navigateUrl) {
      window.location.href = navigateUrl;
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await fetchWithRefresh(
        `${API_URL}/notifications/read-all`,
        { method: 'PATCH' },
        authData.token,
        setAuthData
      );
      setNotifications(prev =>
        prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
      );
      onRead();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'validation.request':
        return <Bell className="w-4 h-4 text-emerald-400" />;
      case 'validation.rejected':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'validation.cancelled':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'validation.rejection_noted':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <Mail className="w-4 h-4 text-[#64748B]" />;
    }
  };

  if (loading) {
    return (
      <div className="absolute right-0 mt-2 w-[360px] bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden z-50">
        <div className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="absolute right-0 mt-2 w-[360px] bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Bell className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-[#F8FAFC]">Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-white bg-emerald-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-emerald-400 transition-colors"
          >
            {markingAll ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[#64748B]">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-sm">No notifications</span>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`group flex items-start gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] cursor-pointer transition-all duration-150 hover:bg-[#1F2937] ${
                !notif.readAt ? 'bg-emerald-500/5' : ''
              }`}
              onClick={() => markAsRead(notif)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8FAFC] truncate">
                  {notif.title}
                </p>
                <p className="text-sm text-[#94A3B8] line-clamp-2 leading-relaxed mt-0.5">
                  {notif.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-[#64748B]" />
                  <span className="text-xs text-[#64748B]">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
              </div>
              {!notif.readAt && (
                <div className="flex-shrink-0 mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 text-center border-t border-[rgba(255,255,255,0.06)]">
        <a
          href="/auth/notifications"
          className="inline-flex items-center gap-1 text-sm text-[#94A3B8] hover:text-emerald-400 transition-colors"
        >
          See all notifications
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      <style >{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
      `}</style>
    </div>
  );
};

export default NotificationDropdown;