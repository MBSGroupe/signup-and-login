import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../Context/dataCont';
import { fetchWithRefresh } from '../Components/api';
import Title from '../Components/Title';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function NotificationsPage() {
  const { authData, setAuthData } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10; // fewer per page for better UX

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      const skip = page * limit;
      const res = await fetchWithRefresh(
        `${API_URL}/notifications?limit=${limit}&skip=${skip}`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      setNotifications(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetchWithRefresh(
        `${API_URL}/notifications/${id}/read`,
        { method: 'PATCH' },
        authData.token,
        setAuthData
      );
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type) => {
    // You can customize icons per notification type
    switch (type) {
      case 'validation.request':
        return '📋';
      case 'validation.rejected':
        return '❌';
      case 'validation.cancelled':
        return '🚫';
      case 'fee.late_warning':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-16">
      {/* Gold cover (like profile page) */}
      <div className="h-32 bg-yellow-400/80 shadow-md"></div>

      {/* Main content container */}
      <div className="w-3/4 mx-auto -mt-16">
        {/* Card container */}
        <div className="bg-gray-800/80 backdrop-blur-xl border border-yellow-400/30 rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <Title title="Mes notifications" textColor="text-yellow-300" />
            <div className="text-sm text-gray-400">
              Total: {total}
            </div>
          </div>

          {/* Notifications list */}
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer
                    ${!notif.readAt 
                      ? 'bg-gray-700/40 border-yellow-400/40 shadow-md hover:shadow-yellow-400/10' 
                      : 'bg-gray-800/40 border-gray-700 hover:border-yellow-400/20'
                    }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className={`text-lg font-semibold ${!notif.readAt ? 'text-yellow-300' : 'text-gray-200'}`}>
                          {notif.title}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(notif.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-300 mt-1">{notif.message}</p>
                      {notif.data && notif.data.stepName && (
                        <div className="mt-2 text-sm text-yellow-400/70">
                          Étape: {notif.data.stepName}
                        </div>
                      )}
                      {!notif.readAt && (
                        <div className="mt-2 text-xs text-blue-400">
                          Cliquez pour marquer comme lu
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination (styled like their buttons) */}
          {total > limit && (
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-700">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className={`px-5 py-2 rounded-lg font-medium transition
                  ${page === 0 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 text-gray-200 hover:bg-yellow-400 hover:text-gray-900'
                  }`}
              >
                ← Précédent
              </button>
              <span className="text-yellow-300 text-sm">
                Page {page + 1} sur {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className={`px-5 py-2 rounded-lg font-medium transition
                  ${(page + 1) * limit >= total 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 text-gray-200 hover:bg-yellow-400 hover:text-gray-900'
                  }`}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}