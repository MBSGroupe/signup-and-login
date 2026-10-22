// pages/DashBoard/Admins/ChangeAdminRole.jsx
// Dedicated page for changing an admin's role. The role list is limited to
// the admin's own grade — the grade itself never changes here.
import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import { useError } from "../../../Context/ErrorContext";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Briefcase,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Crown,
  Shield,
  User,
  Save,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

const CARD_CLS =
  "bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)]";
const LABEL_CLS =
  "text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium";

const GRADE_META = {
  user: { label: "Utilisateur", tint: "bg-gray-500/10 text-gray-300 border-gray-500/20", icon: User },
  admin: { label: "Administrateur", tint: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Shield },
  super_admin: { label: "Super administrateur", tint: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Crown },
};

const unwrap = (body) => {
  if (body && typeof body === "object" && "data" in body && "success" in body) {
    return body.data;
  }
  return body;
};

const extractRoles = (body) => {
  const data = unwrap(body);
  const list =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.roles) && data.roles) ||
    [];
  return list.filter((r) => r && r.id);
};

export default function ChangeAdminRole() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const viewerId = authData?.user?.id;

  const [target, setTarget] = useState(null);
  const [roles, setRoles] = useState([]);
  const [canChange, setCanChange] = useState(null); // null = pending
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [roleId, setRoleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // ─── Load target, roles and permission ───────────────────────
  useEffect(() => {
    if (!authData?.token || !id || !viewerId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [aRes, rRes, pRes] = await Promise.all([
          fetchWithRefresh(`${NEST_API_URL}/admins/${id}`, { method: "GET" }, authData.token, setAuthData),
          fetchWithRefresh(`${NEST_API_URL}/roles`, { method: "GET" }, authData.token, setAuthData),
          fetchWithRefresh(
            `${NEST_API_URL}/permissions/${viewerId}/check-operation`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operation: "change_role", model: "Admin" }),
            },
            authData.token,
            setAuthData,
          ),
        ]);
        const [aBody, rBody, pBody] = await Promise.all([aRes.json(), rRes.json(), pRes.json()]);
        if (cancelled) return;

        const a = unwrap(aBody);
        const found = a?.admin || a;
        if (!aRes.ok || !found?.id) {
          setLoadError(aBody?.message || "Administrateur introuvable");
          return;
        }
        setTarget(found);
        setRoleId(found.roleId ?? found.role?.id ?? "");
        setRoles(extractRoles(rBody));
        setCanChange(Boolean((pBody?.data || pBody)?.canPerform));
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || "Erreur réseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, viewerId, authData?.token, setAuthData]);

  // Roles of the admin's own grade only (also enforced server side).
  const gradeRoles = useMemo(
    () => roles.filter((r) => r.grade === target?.grade && r.isActive !== false),
    [roles, target?.grade],
  );

  const currentRoleId = target?.roleId ?? target?.role?.id ?? "";
  const canSubmit =
    !isSubmitting && canChange === true && !!roleId && roleId !== currentRoleId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setMessage("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/${target.id}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId }),
        },
        authData.token,
        setAuthData,
      );
      const body = await res.json().catch(() => null);
      const updated = unwrap(body);
      if (updated?.id) setTarget(updated);

      const label = gradeRoles.find((r) => r.id === roleId);
      const msg = `Rôle changé en « ${label?.label || label?.name || roleId} »`;
      showSuccess(msg);
      setSuccess(true);
      setMessage(`✅ ${msg}.`);
      setTimeout(() => navigate(`/dash/admins/${target.id}`), 1500);
    } catch (err) {
      const status = err?.status;
      const serverMessage = err?.message;
      if (status === 403) setMessage("❌ Action non autorisée.");
      else if (status === 404) setMessage("❌ Administrateur ou rôle introuvable.");
      else if (status) setMessage(`❌ ${serverMessage || "Échec du changement de rôle."}`);
      else setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
      showError(serverMessage || "Échec du changement de rôle");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-[#64748B] text-xs font-mono uppercase tracking-[0.15em]">Chargement</p>
        </div>
      </div>
    );
  }

  // ─── Permission / load error ──────────────────────────────────
  if (loadError || !target || canChange === false) {
    const reason =
      loadError ||
      (!target ? "Administrateur introuvable" : "") ||
      "Vous n'êtes pas autorisé à changer le rôle d'un administrateur.";
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

  const gradeMeta = GRADE_META[target.grade] || GRADE_META.admin;
  const GradeIcon = gradeMeta.icon;
  const fullName = [target.name, target.lastname].filter(Boolean).join(" ").trim() || "—";
  const currentRole = target.role?.label || target.role?.name || "Sans rôle";

  return (
    <div
      className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <BackButton fallbackPath={`/dash/admins/${target.id}`} />
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400">
                Console · Rôles
              </span>
              <h1 className="text-xl font-bold tracking-tight mt-0.5">Changer le rôle</h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                Seuls les rôles du grade de l'administrateur sont proposés
              </p>
            </div>
          </div>
        </div>

        {/* Target */}
        <div className={`${CARD_CLS} p-5 mb-5`}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-base font-semibold">{fullName}</h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${gradeMeta.tint}`}
            >
              <GradeIcon className="w-3 h-3" />
              {gradeMeta.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#64748B] font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {target.email || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Rôle actuel : {currentRole}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`${CARD_CLS} p-5 md:p-6 space-y-5`}>
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Nouveau rôle ({gradeMeta.label})</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isSubmitting || gradeRoles.length === 0}
              className="w-full px-3 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
            >
              <option value="">
                {gradeRoles.length === 0 ? "Aucun rôle disponible pour ce grade" : "Sélectionner un rôle"}
              </option>
              {gradeRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.name}
                  {r.id === currentRoleId ? " (actuel)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-emerald-400 hover:bg-emerald-300 text-[#0A0F1C] rounded-lg shadow-lg shadow-emerald-500/20 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Changer le rôle
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/dash/admins/${target.id}`)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.08)] rounded-lg transition-all disabled:opacity-50"
            >
              Annuler
            </button>
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2 border ${
                success
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{message}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
