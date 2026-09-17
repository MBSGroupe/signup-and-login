import { useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import BackButton from "../../../Components/Buttons/BackButton";
import { Lock, Key, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

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

export default function ChangePassword() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

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

  // Client-side mirror of the backend rule: new password must differ from current.
  // Only meaningful once the user has typed something in both fields.
  const differsFromCurrent =
    formData.currentPassword.length === 0 ||
    formData.newPassword.length === 0 ||
    formData.newPassword !== formData.currentPassword;

  const showSamePasswordError =
    touched.newPassword &&
    formData.currentPassword.length > 0 &&
    formData.newPassword.length > 0 &&
    !differsFromCurrent;

  const passwordsMatch =
    formData.newPassword.length > 0 &&
    formData.newPassword === formData.confirmNewPassword;

  const showMatchError =
    touched.confirmNewPassword &&
    formData.confirmNewPassword.length > 0 &&
    !passwordsMatch;

  const canSubmit =
    !isSubmitting &&
    formData.currentPassword.length > 0 &&
    newPasswordValid &&
    differsFromCurrent &&
    passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      setMessage("⚠️ Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (formData.newPassword === formData.currentPassword) {
      setMessage("⚠️ Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }
    if (!newPasswordValid) {
      setMessage("⚠️ Le nouveau mot de passe ne respecte pas toutes les règles.");
      return;
    }
    if (!passwordsMatch) {
      setMessage("⚠️ Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      // fetchWithRefresh returns a Response only on 2xx.
      // On any non-ok status it throws an Error with .status / .code / .message.
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmNewPassword,
          }),
        },
        authData.token,
        setAuthData,
      );

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      setSuccessMessage("✅ Mot de passe mis à jour avec succès !");
      setFormData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTouched({});
      setAuthData({ user: null, token: null });
      localStorage.removeItem("authData");
      setTimeout(() => navigate("/?reason=password-changed"), 1500);
    } catch (err) {
      const status = err?.status;
      const code = err?.code;
      const serverMessage = err?.message;

      if (status === 429) {
        setMessage("⚠️ Trop de tentatives. Veuillez réessayer dans une minute.");
      } else if (status === 401) {
        if (code === "AUTH_ACCOUNT_LOCKED") {
          setMessage("⚠️ Compte temporairement verrouillé. Veuillez réessayer plus tard.");
        } else {
          setMessage("❌ Mot de passe actuel incorrect.");
        }
      } else if (status === 400) {
        setMessage(`❌ ${serverMessage || "Le mot de passe ne respecte pas les règles."}`);
      } else if (status) {
        setMessage(`❌ ${serverMessage || "Échec de la mise à jour."}`);
      } else {
        setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/auth/profile" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
                Changer le mot de passe
              </h1>
              <p className="text-[#94A3B8] text-sm mt-0.5">
                Mettez à jour votre mot de passe en toute sécurité
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current password */}
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
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            {/* New password */}
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
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  className={`w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    showSamePasswordError
                      ? "border-rose-500/40 focus:ring-rose-500/50 focus:border-rose-500"
                      : "border-[rgba(255,255,255,0.06)] focus:ring-emerald-500/50 focus:border-emerald-500"
                  }`}
                  required
                />
              </div>

              {showSamePasswordError && (
                <p className="text-xs text-rose-400 mt-1">
                  Le nouveau mot de passe doit être différent de l'actuel.
                </p>
              )}

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

            {/* Confirm new password */}
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
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  className={`w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    showMatchError
                      ? "border-rose-500/40 focus:ring-rose-500/50 focus:border-rose-500"
                      : "border-[rgba(255,255,255,0.06)] focus:ring-emerald-500/50 focus:border-emerald-500"
                  }`}
                  required
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
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
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
            <div
              className={`mt-5 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                message.startsWith("❌") || message.startsWith("⚠️")
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}