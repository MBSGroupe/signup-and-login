// pages/Auth/AdminLogin.jsx
import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
import {
  Mail,
  Lock,
  LogIn,
  Shield,
  AlertCircle,
  ShieldCheck,
  Activity,
  Server,
  Lock as LockIcon,
  Fingerprint,
} from "lucide-react";
import CNOALOGO from "../assets/LOGOCLOA.png";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
const LOCK_STORAGE_KEY = "adminLoginLockUntil"; // separate from the user lock

const REASON_MESSAGES = {
  "password-changed":
    "Votre mot de passe a été modifié. Veuillez vous reconnecter avec vos nouveaux identifiants.",
  "password-reset":
    "Votre mot de passe a été réinitialisé. Veuillez vous reconnecter.",
  "logged-out": "Vous avez été déconnecté. À bientôt !",

  "session-expired": "Votre session a expiré. Veuillez vous reconnecter.",
  "session-revoked": "Votre session a été révoquée. Veuillez vous reconnecter.",
  "session-not-found": "Session introuvable. Veuillez vous reconnecter.",
  "session-invalid": "Session invalide. Veuillez vous reconnecter.",

  "account-inactive":
    "Votre compte n'est pas actif. Veuillez contacter un super administrateur.",
  "account-locked":
    "Votre compte est temporairement bloqué. Veuillez réessayer plus tard.",
};

// Small stat shown in the left panel
function TrustStat({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-sm font-medium text-[#F8FAFC]">{title}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

const AdminLogin = () => {
  const { setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [message, setMessage] = useState(() => {
    const reason = searchParams.get("reason");
    if (reason && REASON_MESSAGES[reason]) return REASON_MESSAGES[reason];
    return "";
  });

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [lockTime, setLockTime] = useState(null);

  // Restore a persisted lock on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!stored) return;
    const lockUntil = parseInt(stored, 10);
    const now = Date.now();
    if (lockUntil > now) {
      setLockTime(Math.ceil((lockUntil - now) / 1000));
    } else {
      localStorage.removeItem(LOCK_STORAGE_KEY);
    }
  }, []);

  // Countdown
  useEffect(() => {
    let interval;
    if (lockTime > 0) {
      interval = setInterval(() => {
        setLockTime((prev) => {
          if (prev <= 1) {
            localStorage.removeItem(LOCK_STORAGE_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockTime]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setFormData((prev) => ({ ...prev, password: "" }));

    try {
      const response = await fetch(`${NEST_API_URL}/auth/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const respData = await response.json();

      if (response.ok && respData.success) {
        const innerData = respData.data?.data || respData.data;
        const user = innerData?.user || respData.user;
        const accessToken = innerData?.accessToken || respData.accessToken;

        // Safety check — an admin login must return an admin-grade account
        if (user?.grade !== "admin" && user?.grade !== "super_admin") {
          setMessage(
            "Ce compte n'a pas les droits d'administration requis.",
          );
          return;
        }

        setAuthData({ user, token: accessToken });
        navigate("/dash");
        return;
      }

      if (response.status === 429) {
        const remaining = respData.data?.remainingTime || 60;
        const lockUntil = Date.now() + remaining * 1000;
        localStorage.setItem(LOCK_STORAGE_KEY, lockUntil);
        setLockTime(remaining);
        setMessage(
          respData.message ||
            respData.data?.message ||
            "Trop de tentatives. Veuillez patienter.",
        );
        return;
      }

      if (response.status === 401) {
        const backendMessage =
          respData.message || respData.data?.message || "";
        let remaining = 0;

        let lockMatch = backendMessage.match(
          /locked for (\d+)\s*(s|second|seconds|minute|minutes)/i,
        );
        if (lockMatch) {
          const value = parseInt(lockMatch[1], 10);
          const unit = lockMatch[2].toLowerCase();
          remaining = unit.includes("minute") ? value * 60 : value;
        } else {
          lockMatch = backendMessage.match(
            /(\d+)\s*(seconde|secondes|minute|minutes)/i,
          );
          if (lockMatch) {
            const value = parseInt(lockMatch[1], 10);
            const unit = lockMatch[2].toLowerCase();
            remaining = unit.includes("minute") ? value * 60 : value;
          }
        }

        if (remaining > 0) {
          const lockUntil = Date.now() + remaining * 1000;
          localStorage.setItem(LOCK_STORAGE_KEY, lockUntil);
          setLockTime(remaining);
          setMessage(
            backendMessage ||
              "Compte bloqué temporairement. Veuillez patienter.",
          );
        } else {
          setMessage(backendMessage || "Erreur de connexion.");
        }
        return;
      }

      setMessage(
        respData.message ||
          respData.data?.message ||
          "Erreur de connexion.",
      );
    } catch (err) {
      console.error("Network error:", err);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isError =
    message.includes("Trop de tentatives") ||
    message.includes("Erreur") ||
    message.includes("réseau") ||
    message.includes("invalide") ||
    message.includes("incorrect") ||
    message.includes("droits");

  return (
    <div
      className="min-h-screen bg-[#0A0F1C] font-sans antialiased relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Subtle top gradient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-emerald-500/[0.06] to-transparent" />

      <div className="relative min-h-screen flex items-center justify-center p-6">
        {/* Split card */}
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 rounded-3xl border border-[rgba(255,255,255,0.06)] bg-[#111827] shadow-2xl shadow-black/50 overflow-hidden">
          {/* ─── LEFT PANEL — brand + trust ─────────────────────────── */}
          <div className="lg:col-span-2 relative p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#0F1623] to-[#0A0F1C]">
            {/* Top: brand */}
            <div className="flex items-center gap-3 mb-10">
              <img
                src={CNOALOGO}
                alt="CNOA Logo"
                className="w-12 h-12 object-contain"
              />
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-mono">
                  CNOA
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Conseil National de l'Ordre
                </p>
              </div>
            </div>

            {/* Middle: headline */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-emerald-400">
                  Secure Console
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#F8FAFC] tracking-tight leading-snug">
                Console
                <br />
                d'administration
              </h1>
              <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
                Espace réservé aux administrateurs de l'Ordre National des
                Architectes.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              <TrustStat
                icon={ShieldCheck}
                title="Accès vérifié"
                subtitle="Authentification à deux niveaux de confiance"
              />
              <TrustStat
                icon={Activity}
                title="Journalisé"
                subtitle="Toutes les actions sont tracées"
              />
              <TrustStat
                icon={Server}
                title="Infrastructure dédiée"
                subtitle="Session isolée par rôle et tenant"
              />
            </div>

            {/* Bottom: footer note */}
            <div className="mt-10 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-[10px] font-mono text-[#475569] uppercase tracking-[0.15em]">
                v1.0 · CNOA Platform
              </p>
            </div>
          </div>

          {/* ─── RIGHT PANEL — form ─────────────────────────────────── */}
          <div className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B]">
                    Identification
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-[#F8FAFC] tracking-tight">
                  Connexion administrateur
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Fournissez vos identifiants pour accéder à la console.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                    Email administratif
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <input
                      type="email"
                      name="email"
                      placeholder="admin@cnoa.dz"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={lockTime > 0}
                      autoComplete="username"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.08)] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#475569] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B]">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={lockTime > 0}
                      autoComplete="current-password"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.08)] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#475569] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={lockTime > 0}
                  className="w-full py-2.5 text-sm font-medium text-[#0A0F1C] bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lockTime > 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Bloqué — {formatTime(lockTime)}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Se connecter
                    </>
                  )}
                </button>
              </form>

              {/* Message */}
              {message && (
                <div
                  className={`mt-5 p-3 rounded-lg text-xs flex items-start gap-2 border ${
                    isError
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{message}</span>
                </div>
              )}

              {/* Footer note inside form column */}
              <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
                  <Lock className="w-3 h-3" />
                  <span>Session chiffrée · TLS 1.3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;