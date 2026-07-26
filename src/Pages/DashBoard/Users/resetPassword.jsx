import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Title from "../../../Components/Title";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import BackButton from "../../../Components/Buttons/BackButton";
import { Lock, Key, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ResetPassword() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const id = authData?.user?.id || authData?.user?._id;

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(null);

  useEffect(() => {
    if (authData?.user?.passwordChangedAt) {
      const lastChange = new Date(authData.user.passwordChangedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - lastChange) / 1000;
      const remaining = 24 * 3600 - elapsedSeconds;
      if (remaining > 0) {
        setLockSeconds(Math.ceil(remaining));
      }
    }
  }, [authData]);

  useEffect(() => {
    let interval;
    if (lockSeconds > 0) {
      interval = setInterval(() => {
        setLockSeconds((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockSeconds]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmNewPassword) {
      setMessage("⚠️ Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${NEST_API_URL}/users/${id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage("✅ Mot de passe mis à jour avec succès !");
        setFormData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });

        if (data.data?.user) {
          setAuthData((prev) => ({ ...prev, user: data.data.user }));
        }
        setLockSeconds(24 * 3600);
      } else if (response.status === 429) {
        const remainingTime = data.data?.remainingTime;
        if (remainingTime) {
          setLockSeconds(remainingTime);
        } else {
          const match = data.message?.match(/(\d+)\s*secondes?/);
          const seconds = match ? parseInt(match[1], 10) : 60;
          setLockSeconds(seconds);
        }
        setMessage(data.message || data.data?.message || "Trop de tentatives. Veuillez patienter.");
      } else {
        setMessage(data.message || data.data?.message || "❌ Échec de la mise à jour.");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    if (mins > 0) return `${mins}min ${secs}s`;
    return `${secs}s`;
  };

  const isLocked = lockSeconds > 0;

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-md mx-auto">
        {/* Back button & header */}
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/auth/profile" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">Change Password</h1>
              <p className="text-[#94A3B8] text-sm mt-0.5">
                {isLocked
                  ? "Modification temporairement bloquée"
                  : "Update your account password securely"}
              </p>
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 mb-6 text-center">
            <p className="text-[#94A3B8] text-sm">Temps restant avant la prochaine tentative</p>
            <p className="text-2xl font-mono text-emerald-400 mt-1">{formatTime(lockSeconds)}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Mot de passe actuel
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  name="currentPassword"
                  placeholder="Entrez votre mot de passe actuel"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  disabled={isLocked || isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Nouveau mot de passe"
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={isLocked || isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  name="confirmNewPassword"
                  placeholder="Confirmez le nouveau mot de passe"
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  disabled={isLocked || isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocked || isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLocked ? (
                `Bloqué (${formatTime(lockSeconds)})`
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  En cours...
                </>
              ) : (
                "Changer le mot de passe"
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-5 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.includes('Trop de tentatives') || message.includes('Échec') || message.includes('Erreur')
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}