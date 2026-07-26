import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../Context/dataCont';
import { fetchWithRefresh } from '../Components/api';
import Title from '../Components/Title';
import BackButton from '../Components/Buttons/BackButton';
import { Globe, Bell, Check, Loader2, X, Shield, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function PreferencesPage() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const user = authData.user;

  const [language, setLanguage] = useState(user?.preferences?.language || 'fr');
  const [emailNotifications, setEmailNotifications] = useState(user?.preferences?.notifications?.email ?? true);
  const [message, setMessage] = useState(null);
  
  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowPasswordModal(true);
    setPassword('');
  };

  const confirmUpdate = async () => {
    if (!password) {
      setMessage({ type: 'error', text: 'Mot de passe requis' });
      return;
    }
    setModalLoading(true);
    setMessage(null);

    try {
    
      const body = {
        language,
        notifications: { email: emailNotifications },
      };
      const res = await fetchWithRefresh(
        `${API_URL}/users/${user.id}/preferences`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),   // ✅ no wrapping `preferences` object
        },
        authData.token,
        setAuthData,
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setAuthData(prev => ({
        ...prev,
        user: data.user,
        token: data.token || prev.token
      }));

      setMessage({ type: 'success', text: 'Préférences mises à jour avec succès !' });
      setTimeout(() => setMessage(null), 3000);
      
      setShowPasswordModal(false);
      setPassword('');
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Échec de la mise à jour' });
    } finally {
      setModalLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <BackButton fallbackPath="/auth/profile" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Globe className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Préférences
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Personnalisez vos paramètres
              </p>
            </div>
          </div>
        </div>

        {/* Preferences card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {message.type === 'success' ? (
                <Check className="w-5 h-5 flex-shrink-0" />
              ) : (
                <X className="w-5 h-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Language */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                <Globe className="w-4 h-4 text-emerald-400" />
                Langue
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Email notifications toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between max-w-md">
                <div className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  Notifications par email
                </div>
                <div
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                    emailNotifications ? 'bg-emerald-500' : 'bg-[#1F2937]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">Confirmez votre mot de passe</h3>
            </div>
            <p className="text-sm text-[#94A3B8] mb-4">
              Veuillez entrer votre mot de passe pour enregistrer les modifications.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]"
              placeholder="Votre mot de passe"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmUpdate();
              }}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
              >
                Annuler
              </button>
              <button
                onClick={confirmUpdate}
                disabled={modalLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {modalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}