import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_MS = 60_000; // 1 minute between requests

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Tick while a cooldown is active so the button label counts down.
  // Uses a local interval rather than a global timer so it stops when done.
  useState(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  });

  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const isOnCooldown = cooldownRemaining > 0;
  const canSubmit = !isSubmitting && !isOnCooldown && EMAIL_REGEX.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Veuillez fournir une adresse email valide.");
      return;
    }
    if (isOnCooldown) {
      setError(`Veuillez patienter ${cooldownRemaining}s avant de réessayer.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${NEST_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      // Read once. If the body is not JSON (e.g. 429 HTML), fall back gracefully.
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok) {
        setMessage(
          data?.message ||
            data?.data?.message ||
            "Si cet email existe, un lien de réinitialisation a été envoyé.",
        );
        setCooldownUntil(Date.now() + COOLDOWN_MS);
      } else if (response.status === 429) {
        setError("Trop de tentatives. Veuillez réessayer dans une minute.");
        setCooldownUntil(Date.now() + COOLDOWN_MS);
      } else if (response.status === 400) {
        setError(data?.message || "Adresse email invalide.");
      } else {
        setError(data?.message || "Une erreur est survenue. Veuillez réessayer.");
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-emerald-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8">
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Mot de passe oublié</h1>
          <p className="text-[#94A3B8] text-sm mb-6">
            Entrez votre email et nous vous enverrons un lien de réinitialisation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : isOnCooldown ? (
                `Réessayer dans ${cooldownRemaining}s`
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}