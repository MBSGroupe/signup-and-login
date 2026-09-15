import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Password rules — mirror of src/auth/dto/password-rules.ts ─────────
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

const RULES = [
  { key: "min",       label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "max",       label: `Au plus ${PASSWORD_MAX_LENGTH} caractères`, test: (p) => p.length <= PASSWORD_MAX_LENGTH },
  { key: "uppercase", label: "Au moins une lettre majuscule",             test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "Au moins une lettre minuscule",             test: (p) => /[a-z]/.test(p) },
  { key: "number",    label: "Au moins un chiffre",                       test: (p) => /[0-9]/.test(p) },
  { key: "special",   label: "Au moins un caractère spécial",             test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const allRulesPass = (password) => RULES.every((r) => r.test(password));

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!token) {
      setMessage("Jeton invalide ou manquant.");
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const ruleResults = useMemo(
    () => RULES.map((r) => ({ ...r, passed: r.test(formData.newPassword) })),
    [formData.newPassword],
  );
  const newPasswordValid = allRulesPass(formData.newPassword);
  const passwordsMatch =
    formData.newPassword.length > 0 &&
    formData.newPassword === formData.confirmNewPassword;

  const showMatchError =
    touched.confirmNewPassword &&
    formData.confirmNewPassword.length > 0 &&
    !passwordsMatch;

  const canSubmit = Boolean(token) && !isSubmitting && newPasswordValid && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setMessage("Jeton invalide ou manquant.");
      return;
    }
    if (!newPasswordValid) {
      setMessage("⚠️ Le nouveau mot de passe ne respecte pas toutes les règles.");
      return;
    }
    if (!passwordsMatch) {
      setMessage("⚠️ Les mots de passe ne correspondent pas.");
      return;
    }

    setMessage("");
    setIsSubmitting(true);

    try {
      // Raw fetch here (not fetchWithRefresh): reset-password is unauthenticated —
      // no access token, no refresh needed. So we inspect response.status directly.
      const response = await fetch(`${NEST_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmNewPassword,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok && (data?.success ?? true)) {
        setSuccess(true);
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const rawMessage = data?.message;
      const flatMessage = Array.isArray(rawMessage)
        ? rawMessage.join(" • ")
        : rawMessage;

      if (response.status === 429) {
        setMessage("Trop de tentatives. Veuillez réessayer dans une minute.");
      } else if (response.status === 400) {
        setMessage(`❌ ${flatMessage || "Lien invalide ou expiré."}`);
      } else {
        setMessage(`❌ ${flatMessage || "Échec de la réinitialisation du mot de passe."}`);
      }
    } catch (err) {
      // Reached only if fetch itself failed (network, DNS, CORS, offline).
      console.error("reset-password request failed:", err);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
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
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">
            Définir un nouveau mot de passe
          </h1>
          <p className="text-[#94A3B8] text-sm mb-6">
            Entrez votre nouveau mot de passe ci-dessous.
          </p>

          {success ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-4">
              <CheckCircle className="w-5 h-5" />
              Mot de passe réinitialisé avec succès ! Redirection...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {formData.newPassword.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {ruleResults.map((r) => (
                      <li
                        key={r.key}
                        className={`flex items-center gap-1.5 ${
                          r.passed ? "text-emerald-400" : "text-[#64748B]"
                        }`}
                      >
                        {r.passed ? (
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}
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
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    required
                    className={`w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      showMatchError
                        ? "border-rose-500/40 focus:ring-rose-500/50 focus:border-rose-500"
                        : "border-[rgba(255,255,255,0.06)] focus:ring-emerald-500/50 focus:border-emerald-500"
                    }`}
                  />
                </div>
                {showMatchError && (
                  <p className="text-xs text-rose-400 mt-1">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  "Réinitialiser le mot de passe"
                )}
              </button>
            </form>
          )}

          {message && !success && (
            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}