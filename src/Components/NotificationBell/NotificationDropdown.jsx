import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../Context/dataCont';
import { fetchWithRefresh } from '../../Components/api';

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
      setNotifications(data.data);
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

  if (loading) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
        <div className="p-4 text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-yellow-300">Notifications</h3>
        {notifications.some(n => !n.readAt) && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {markingAll ? '...' : 'Mark all read'}
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No notifications</div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-3 border-b border-gray-700 cursor-pointer transition hover:bg-gray-700 ${
                !notif.readAt ? 'bg-gray-700/50' : ''
              }`}
              onClick={() => markAsRead(notif)}
            >
              <div className="font-medium text-white">{notif.title}</div>
              <div className="text-sm text-gray-300 mt-1">{notif.message}</div>
              <div className="text-xs text-gray-500 mt-1">{formatDate(notif.createdAt)}</div>
            </div>
          ))
        )}
      </div>
      <div className="p-2 text-center border-t border-gray-700">
        <a href="/auth/notifications" className="text-sm text-yellow-400 hover:underline">
          See all notifications
        </a>
      </div>
    </div>
  );
};

export default NotificationDropdown;