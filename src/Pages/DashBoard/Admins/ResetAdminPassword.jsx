// pages/DashBoard/Admins/ResetAdminPassword.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import { useError } from "../../../Context/ErrorContext";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Lock,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  Briefcase,
  Mail,
  MapPin,
  User,
  Crown,
  Shield,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { wilayaLabel } from '../../../Utils/wilayas';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens (match console pages) ──────────────────────
const LABEL_CLS =
  "text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium";

const CARD_CLS =
  "bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]";

const INPUT_CLS =
  "w-full pl-9 pr-10 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border rounded-xl font-mono text-sm focus:outline-none focus:ring-2 transition-all placeholder-[#475569] disabled:opacity-50 disabled:cursor-not-allowed";

// ─── Password rules — mirror of src/auth/dto/password-rules.ts ─────
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

// ─── Wilaya lookup ─────────────────────────────────────────────────
const regionLabel = (code) => wilayaLabel(code);

// ─── Grade metadata ────────────────────────────────────────────────
const GRADE_META = {
  user: {
    label: "Utilisateur",
    tint: "bg-gray-500/10 text-gray-300 border-gray-500/20",
    icon: User,
  },
  admin: {
    label: "Administrateur",
    tint: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Shield,
  },
  super_admin: {
    label: "Super administrateur",
    tint: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Crown,
  },
};

const unwrap = (body) => {
  if (body && typeof body === "object" && "data" in body && "success" in body) {
    return body.data;
  }
  return body;
};

// ─── Field with eye toggle ─────────────────────────────────────────
function PasswordField({
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  icon: Icon = Lock,
  show,
  onToggle,
  disabled,
  invalid,
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="new-password"
        className={`${INPUT_CLS} ${
          invalid
            ? "border-rose-500/40 focus:ring-rose-500/50 focus:border-rose-500"
            : "border-[rgba(255,255,255,0.06)] focus:ring-emerald-500/50 focus:border-emerald-500"
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function ResetAdminPassword() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { showError, showSuccess } = useError();

  const viewerId = authData?.user?.id;
  const isSelf = Boolean(viewerId && id && viewerId === id);

  // ─── Target admin ─────────────────────────────────────────────
  const [target, setTarget] = useState(null);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ─── Permission gate ─────────────────────────────────────────
  const [canReset, setCanReset] = useState(null); // null = pending

  // ─── Form ─────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
    viewerPassword: "",
  });
  const [showPw, setShowPw] = useState({
    new: false,
    confirm: false,
    viewer: false,
  });
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ─── Load target admin ────────────────────────────────────────
  useEffect(() => {
    if (!authData?.token || !id) return;
    let cancelled = false;

    (async () => {
      setLoadingTarget(true);
      setLoadError("");
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/admins/${id}`,
          { method: "GET" },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        const data = unwrap(body);
        const found = data?.admin || data;
        if (cancelled) return;
        if (res.ok && found?.id) setTarget(found);
        else setLoadError(body?.message || "Administrateur introuvable");
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || "Erreur réseau");
      } finally {
        if (!cancelled) setLoadingTarget(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, authData?.token, setAuthData]);

  // ─── Permission check ─────────────────────────────────────────
  useEffect(() => {
    if (!authData?.token || !viewerId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/permissions/${viewerId}/check-operation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operation: "reset_password", model: "Admin" }),
          },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        const payload = body?.data || body;
        if (!cancelled) setCanReset(Boolean(payload?.canPerform));
      } catch {
        if (!cancelled) setCanReset(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authData?.token, viewerId, setAuthData]);

  // ─── Validation ───────────────────────────────────────────────
  const ruleResults = useMemo(
    () => RULES.map((r) => ({ ...r, passed: r.test(formData.newPassword) })),
    [formData.newPassword],
  );
  const newPasswordValid = allRulesPass(formData.newPassword);

  const passwordsMatch =
    formData.newPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const showMatchError =
    touched.confirmPassword &&
    formData.confirmPassword.length > 0 &&
    !passwordsMatch;

  const canSubmit =
    !isSubmitting &&
    canReset === true &&
    !!target?.id &&
    newPasswordValid &&
    passwordsMatch &&
    formData.viewerPassword.length > 0;

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleBlur = (e) =>
    setTouched((p) => ({ ...p, [e.target.name]: true }));

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!target?.id) return;
    if (!newPasswordValid) {
      setMessage("⚠️ Le nouveau mot de passe ne respecte pas toutes les règles.");
      return;
    }
    if (!passwordsMatch) {
      setMessage("⚠️ Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (!formData.viewerPassword) {
      setMessage("⚠️ Votre mot de passe est requis pour confirmer.");
      return;
    }

    setMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/${target.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPassword: formData.newPassword,
            viewerPassword: formData.viewerPassword,
          }),
        },
        authData.token,
        setAuthData,
      );

      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      const email = body?.email ?? body?.admin?.email ?? target.email;
      const msg = `Mot de passe réinitialisé pour ${email}`;
      showSuccess(msg);
      setSuccessMessage(`✅ ${msg}.`);

      setFormData({ newPassword: "", confirmPassword: "", viewerPassword: "" });
      setTouched({});

      // If you reset your own password, session is invalidated — same
      // pattern as your user ChangePassword page.
      if (isSelf) {
        setAuthData({ user: null, token: null });
        localStorage.removeItem("authData");
        setTimeout(
          () => navigate("/auth/admin/login?reason=password-reset"),
          1500,
        );
      } else {
        setTimeout(() => navigate(`/dash/admins/${target.id}`), 1500);
      }
    } catch (err) {
      const status = err?.status;
      const serverMessage = err?.message;

      if (status === 429) {
        setMessage("⚠️ Trop de tentatives. Veuillez réessayer dans une minute.");
      } else if (status === 401) {
        setMessage("⚠️ Session expirée. Reconnectez-vous.");
      } else if (status === 403) {
        setMessage("❌ Votre mot de passe est incorrect ou action non autorisée.");
      } else if (status === 404) {
        setMessage("❌ Administrateur introuvable.");
      } else if (status === 400) {
        setMessage(`❌ ${serverMessage || "Le mot de passe ne respecte pas les règles."}`);
      } else if (status) {
        setMessage(`❌ ${serverMessage || "Échec de la réinitialisation."}`);
      } else {
        setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
      }
      showError(serverMessage || "Échec de la réinitialisation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isError = message.startsWith("❌") || message.startsWith("⚠️");

  // ─── Loading ──────────────────────────────────────────────────
  if (loadingTarget || canReset === null) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-[#64748B] text-xs font-mono uppercase tracking-[0.15em]">
            Chargement
          </p>
        </div>
      </div>
    );
  }

  // ─── Permission / load error ──────────────────────────────────
  if (loadError || !target || canReset === false) {
    const reason =
      loadError ||
      (!target ? "Administrateur introuvable" : "") ||
      (canReset === false
        ? "Vous n'êtes pas autorisé à réinitialiser un mot de passe."
        : "");
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#0F1623] rounded-xl border border-rose-500/20 p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-base font-medium">Accès refusé</p>
          <p className="text-[#94A3B8] text-sm mt-1">{reason}</p>
          <button
            onClick={() => navigate("/dash/admins")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0A0F1C] bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
          >
            Retour aux administrateurs
          </button>
        </div>
      </div>
    );
  }

  // ─── Derived for header ───────────────────────────────────────
  const gradeMeta = GRADE_META[target.grade] || GRADE_META.admin;
  const GradeIcon = gradeMeta.icon;
  const fullName =
    [target.name, target.lastname].filter(Boolean).join(" ").trim() || "—";
  const initial = (target.name || target.email || "A")
    .charAt(0)
    .toUpperCase();
  const targetIsActive = target.isActive !== false;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased relative"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative max-w-3xl mx-auto p-6 md:p-8">
        {/* ═══ HEADER ═══════════════════════════════════════════ */}
        <div className="mb-6 flex items-center gap-4">
          <BackButton fallbackPath={`/dash/admins/${target.id}`} />
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
                  Console · Sécurité
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-0.5">
                Réinitialiser le mot de passe
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {isSelf
                  ? "Vous modifiez votre propre mot de passe"
                  : "Définir un nouveau mot de passe pour cet administrateur"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ SUCCESS BANNER ══════════════════════════════════ */}
        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* ═══ TARGET (locked — id-bound) ══════════════════════ */}
        <div className={`${CARD_CLS} p-5 mb-5`}>
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                Administrateur cible
              </h3>
              <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                identifié par son ID — non modifiable sur cette page
              </p>
            </div>
            {isSelf && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Vous
              </span>
            )}
          </div>

          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold font-mono shrink-0">
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-base font-semibold text-[#F8FAFC] tracking-tight">
                  {fullName}
                </h2>

                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${gradeMeta.tint}`}
                >
                  <GradeIcon className="w-3 h-3" />
                  {gradeMeta.label}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                    targetIsActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      targetIsActive ? "bg-emerald-400" : "bg-gray-500"
                    }`}
                  />
                  {targetIsActive ? "actif" : "inactif"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#64748B] font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {target.email || "—"}
                </span>
                {(target.role?.label || target.role?.name) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {target.role.label || target.role.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {regionLabel(target.region)}
                </span>
              </div>
            </div>
          </div>

          {!targetIsActive && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Ce compte est <strong>inactif</strong>. Réinitialiser le mot de
                passe ne le réactivera pas.
              </span>
            </div>
          )}
        </div>

        {/* ═══ PASSWORD FORM ═══════════════════════════════════ */}
        <div className={`${CARD_CLS} p-5 md:p-6`}>
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
                Nouveau mot de passe
              </h3>
              <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                définition et confirmation sécurisées
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New password */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Nouveau mot de passe</label>
              <PasswordField
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••••"
                icon={Lock}
                show={showPw.new}
                onToggle={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                disabled={isSubmitting}
              />

              {formData.newPassword.length > 0 && (
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
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

            {/* Confirm */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Confirmer le mot de passe</label>
              <PasswordField
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••••"
                icon={Lock}
                show={showPw.confirm}
                onToggle={() =>
                  setShowPw((p) => ({ ...p, confirm: !p.confirm }))
                }
                disabled={isSubmitting}
                invalid={showMatchError}
              />
              {showMatchError && (
                <p className="text-xs text-rose-400 mt-1">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            {/* Viewer password */}
            <div className="space-y-1.5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <label className={LABEL_CLS}>
                {isSelf
                  ? "Votre mot de passe actuel"
                  : "Votre mot de passe (confirmation)"}
              </label>
              <PasswordField
                name="viewerPassword"
                value={formData.viewerPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={
                  isSelf
                    ? "Votre mot de passe actuel"
                    : "Votre mot de passe administrateur"
                }
                icon={Fingerprint}
                show={showPw.viewer}
                onToggle={() =>
                  setShowPw((p) => ({ ...p, viewer: !p.viewer }))
                }
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-[#64748B] font-mono mt-1">
                Requis par le serveur pour valider l'opération.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-emerald-400 hover:bg-emerald-300 text-[#0A0F1C] rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Réinitialiser le mot de passe
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/dash/admins/${target.id}`)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-transparent hover:bg-[#1F2937] border border-[rgba(255,255,255,0.08)] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </form>

          {/* Feedback */}
          {message && (
            <div
              className={`mt-5 p-4 rounded-xl text-sm font-medium flex items-start gap-2 border ${
                isError
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{message}</span>
            </div>
          )}
        </div>

        {/* ═══ FOOTER META ═════════════════════════════════════ */}
        <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <Fingerprint className="w-3 h-3" />
            <span>CNOA · Console d'administration</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <ShieldCheck className="w-3 h-3" />
            <span>Action journalisée</span>
          </div>
        </div>
      </div>
    </div>
  );
}