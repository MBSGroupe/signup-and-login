import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../Context/dataCont';
import { fetchWithRefresh } from '../Components/api';
import Title from '../Components/Title';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Info,
  ExternalLink
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function NotificationsPage() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

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
      setNotifications(data.data.data);
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

  const handleNotificationClick = async (notif) => {
    const { id, type, data } = notif;
    let navigateUrl = null;

    // Determine the target URL based on type (same logic as dropdown)
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

    // Mark as read if unread
    if (!notif.readAt) {
      await markAsRead(id);
    }

    // Navigate if we have a URL
    if (navigateUrl) {
      navigate(navigateUrl);
    }
  };

  const getTypeIcon = (type) => {
    const iconClass = 'w-5 h-5 flex-shrink-0';
    switch (type) {
      case 'validation.request':
        return <Bell className={`${iconClass} text-emerald-400`} />;
      case 'validation.rejected':
        return <XCircle className={`${iconClass} text-rose-400`} />;
      case 'validation.cancelled':
        return <AlertCircle className={`${iconClass} text-yellow-400`} />;
      case 'fee.late_warning':
        return <AlertTriangle className={`${iconClass} text-orange-400`} />;
      default:
        return <Mail className={`${iconClass} text-[#64748B]`} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Bell className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Mes notifications
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              {total} notification{total > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>

        {/* Notifications list */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
              <Bell className="w-12 h-12 text-[#64748B] opacity-30 mx-auto mb-4" />
              <p className="text-[#94A3B8] text-lg font-medium">Aucune notification</p>
              <p className="text-[#64748B] text-sm mt-1">Vous êtes à jour.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`group bg-[#111827] rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg hover:border-[rgba(255,255,255,0.12)] ${
                  !notif.readAt
                    ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                    : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className={`text-base font-semibold truncate ${
                        !notif.readAt ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
                      }`}>
                        {notif.title}
                      </h3>
                      <span className="text-xs text-[#64748B] flex items-center gap-1.5 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(notif.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.data && notif.data.stepName && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Info className="w-3 h-3" />
                        Étape: {notif.data.stepName}
                      </div>
                    )}
                  </div>
                  {!notif.readAt ? (
                    <div className="flex-shrink-0 mt-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-4 h-4 text-[#64748B]" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                page === 0
                  ? 'bg-[#1F2937] text-[#64748B] cursor-not-allowed opacity-50'
                  : 'bg-[#1F2937] text-[#F8FAFC] hover:bg-[#22C55E] hover:text-[#0A0F1C] border border-[rgba(255,255,255,0.06)]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
            <span className="text-sm text-[#94A3B8]">
              Page {page + 1} sur {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                (page + 1) * limit >= total
                  ? 'bg-[#1F2937] text-[#64748B] cursor-not-allowed opacity-50'
                  : 'bg-[#1F2937] text-[#F8FAFC] hover:bg-[#22C55E] hover:text-[#0A0F1C] border border-[rgba(255,255,255,0.06)]'
              }`}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}