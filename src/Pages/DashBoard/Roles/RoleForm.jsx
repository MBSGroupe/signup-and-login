// pages/DashBoard/Roles/RoleForm.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import BackButton from "../../../Components/Buttons/BackButton";
import { fetchWithRefresh } from "../../../Components/api";
import {
  Award,
  Plus,
  Save,
  X,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle,
  Lock,
  Info,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Constants ───────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: "user", label: "Utilisateur" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super administrateur" },
];

const EMPTY_FORM = {
  name: "",
  label: "",
  description: "",
  grade: "user",
  isActive: true,
  isSystem: false,
};

// ─── Styles ──────────────────────────────────────────────────────────

const INPUT =
  "w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

const LABEL =
  "block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5";

// ─── Page ────────────────────────────────────────────────────────────

export default function RoleForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);

  const isCreate = mode === "create" || !id;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(!isCreate);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  // ── Load on edit ──────────────────────────────────────────────────
  useEffect(() => {
    if (isCreate || !authData?.token || !id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/roles/${id}`,
          { method: "GET" },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        const r = Array.isArray(body) ? body[0] : body?.data || body;

        if (res.ok && r) {
          if (cancelled) return;
          setFormData({
            name: r.name ?? "",
            label: r.label ?? "",
            description: r.description ?? "",
            grade: r.grade ?? "user",
            isActive: r.isActive !== false,
            isSystem: r.isSystem === true,
          });
          setIsSystemRole(r.isSystem === true);
        } else {
          setIsError(true);
          setMessage("Impossible de charger le rôle");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setIsError(true);
          setMessage("Erreur réseau");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isCreate, authData?.token, setAuthData]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsError(false);
    setMessage("");

    if (!formData.name?.trim()) return fail("Le nom est requis.");
    if (!formData.label?.trim()) return fail("Le libellé est requis.");
    if (!formData.grade) return fail("Le grade est requis.");

    setSubmitting(true);
    try {
      const url = isCreate
        ? `${NEST_API_URL}/roles`
        : `${NEST_API_URL}/roles/${id}`;
      const method = isCreate ? "POST" : "PATCH";

      // On edit, don't send isSystem; and don't send grade if system role
      const payload = isCreate
        ? {
            name: formData.name.trim(),
            label: formData.label.trim(),
            description: formData.description?.trim() || undefined,
            grade: formData.grade,
            isActive: formData.isActive,
            isSystem: formData.isSystem,
          }
        : {
            name: formData.name.trim(),
            label: formData.label.trim(),
            description: formData.description?.trim() || undefined,
            isActive: formData.isActive,
            ...(isSystemRole ? {} : { grade: formData.grade }),
          };

      const res = await fetchWithRefresh(
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        authData.token,
        setAuthData,
      );
      const body = await res.json();

      if (!res.ok) {
        const msg =
          body?.message ||
          (Array.isArray(body?.message) ? body.message[0] : null) ||
          "Échec de l'opération.";
        return fail(msg);
      }

      setIsError(false);
      setMessage(isCreate ? "✅ Rôle créé avec succès." : "✅ Rôle mis à jour.");

      if (isCreate) setFormData(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      fail(err?.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }

    function fail(msg) {
      setIsError(true);
      setMessage(msg);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement…</p>
        </div>
      </Shell>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <BackButton fallbackPath="/dash/roles" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                {isCreate ? "Créer un rôle" : "Modifier le rôle"}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                {isCreate
                  ? "Définir un nouveau rôle pour le tenant"
                  : formData.label || "Mettre à jour le rôle"}
              </p>
            </div>
          </div>
        </div>

        {/* System role notice */}
        {isSystemRole && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium">Rôle système</p>
              <p className="text-amber-300/80 text-xs mt-0.5">
                Ce rôle est verrouillé par le système. Le grade ne peut pas être modifié.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8 space-y-6"
        >
          {/* Name + Label */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={LABEL}>
                Nom <span className="text-rose-400 ml-1">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="ex: region_manager"
                className={INPUT + " font-mono"}
                disabled={isSystemRole}
              />
              <p className="text-xs text-[#64748B] mt-1.5">
                Identifiant technique unique par tenant.
              </p>
            </div>

            <div>
              <label className={LABEL}>
                Libellé <span className="text-rose-400 ml-1">*</span>
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                placeholder="ex: Responsable régional"
                className={INPUT}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={LABEL}>Description</label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Décrivez le rôle et son usage..."
              className={INPUT + " resize-none"}
            />
          </div>

          {/* Grade + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={LABEL}>
                Grade <span className="text-rose-400 ml-1">*</span>
              </label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className={INPUT}
                disabled={isSystemRole}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Statut</label>
              <div className="flex items-center gap-4 py-2.5">
                <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC] cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === true}
                    onChange={() =>
                      setFormData((p) => ({ ...p, isActive: true }))
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                  Actif
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC] cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === false}
                    onChange={() =>
                      setFormData((p) => ({ ...p, isActive: false }))
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                  Inactif
                </label>
              </div>
            </div>
          </div>

          {/* isSystem — create only */}
          {isCreate && (
            <div className="p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#64748B] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC] cursor-pointer">
                  <input
                    type="checkbox"
                    name="isSystem"
                    checked={formData.isSystem}
                    onChange={handleChange}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  Marquer comme rôle système
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Un rôle système ne peut pas être supprimé ni désactivé.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isCreate ? "Création..." : "Enregistrement..."}
                </>
              ) : (
                <>
                  {isCreate ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {isCreate ? "Créer le rôle" : "Enregistrer"}
                </>
              )}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                isError
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {isError ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              )}
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
      {children}
    </div>
  );
}