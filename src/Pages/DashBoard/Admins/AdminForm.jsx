// pages/DashBoard/Admins/AdminForm.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import BackButton from "../../../Components/Buttons/BackButton";
import { fetchWithRefresh } from "../../../Components/api";
import DynamicField from "../../../Components/Forms/DynamicField";
import wilayasData from "../../../assets/data/wilayas.json";
import {
  UserPlus,
  UserCog,
  Shield,
  Loader2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
  IdCard,
  Lock,
  Award,
  Briefcase,
  MapPin,
  ToggleLeft,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ────────────────────────────────────────────────────────────────
//  Field catalog for admins — mirror of backend Admin model
// ────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super administrateur" },
];

const SECTION_CONFIG = {
  identity: {
    label: "Identité",
    icon: IdCard,
    fields: ["name", "lastname", "email"],
  },
  credentials: {
    label: "Authentification",
    icon: Lock,
    fields: ["password"],
    createOnly: true,
  },
  role: {
    label: "Rôle & Permissions",
    icon: Award,
    fields: ["grade", "roleId"],
  },
  location: {
    label: "Localisation",
    icon: MapPin,
    fields: ["region", "wilaya", "commune"],
  },
  status: {
    label: "Statut",
    icon: ToggleLeft,
    fields: ["isActive"],
  },
};

const FIELD_CONFIGS = {
  name: { label: "Nom", type: "text", ui: { placeholder: "Nom de famille" } },
  lastname: { label: "Prénom", type: "text", ui: { placeholder: "Prénom" } },
  email: { label: "Email", type: "email", ui: { placeholder: "adresse@cnoa.dz" } },
  password: { label: "Mot de passe", type: "password", ui: { placeholder: "Mot de passe initial" } },
  grade: {
    label: "Grade",
    type: "select",
    validation: { options: GRADE_OPTIONS },
  },
  roleId: {
    label: "Rôle",
    type: "select",
    validation: { options: [] }, // filled at runtime
  },
  region: {
    label: "CLOA / Région",
    type: "wilaya", // same select, uses wilaya list (code)
  },
  wilaya: { label: "Wilaya", type: "wilaya" },
  commune: { label: "Commune", type: "commune" },
  isActive: { label: "Compte actif", type: "boolean" },
};

const DEFAULT_CREATE_FIELDS = [
  "name", "lastname", "email", "password",
  "grade", "roleId", "region", "wilaya", "commune", "isActive",
];

const DEFAULT_EDIT_FIELDS = [
  "name", "lastname", "email",
  "grade", "roleId", "region", "wilaya", "commune", "isActive",
];

// ────────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────────

export default function AdminForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const viewerId = authData?.user?.id || authData?.user?._id;

  const isCreate = mode === "create" || !id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [can, setCan] = useState(false);
  const [permittedFields, setPermittedFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState(FIELD_CONFIGS);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    grade: "admin",
    roleId: "",
    region: "",
    wilaya: "",
    commune: "",
    isActive: true,
    viewerPassword: "",
  });

  // ── Load: permissions + field set + (edit) target admin + roles ──
  useEffect(() => {
    if (!authData?.token || !viewerId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        // 1. Check operation permission
        const op = isCreate ? "create" : "update";
        const canRes = await fetchWithRefresh(
          `${NEST_API_URL}/permissions/${viewerId}/check-operation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operation: op, model: "Admin" }),
          },
          authData.token,
          setAuthData,
        );
        const canBody = await canRes.json();
        const allowed = Boolean(canBody?.data?.canPerform);
        if (cancelled) return;
        setCan(allowed);
        if (!allowed) return;

        // 2. Fetch permitted fields
        const fieldsUrl = isCreate
          ? `${NEST_API_URL}/permissions/user/${viewerId}/creatable-fields?model=Admin`
          : `${NEST_API_URL}/permissions/user/${id}/editable-fields?model=Admin`;

        try {
          const fRes = await fetchWithRefresh(fieldsUrl, { method: "GET" }, authData.token, setAuthData);
          const fBody = await fRes.json();
          const data = fBody?.data || fBody || {};
          const fields = Array.isArray(data.fields) && data.fields.length > 0
            ? data.fields
            : (isCreate ? DEFAULT_CREATE_FIELDS : DEFAULT_EDIT_FIELDS);
          if (cancelled) return;
          setPermittedFields(fields);
          if (data.configs) {
            setFieldConfigs((prev) => ({ ...prev, ...data.configs }));
          }
        } catch {
          if (!cancelled) {
            setPermittedFields(isCreate ? DEFAULT_CREATE_FIELDS : DEFAULT_EDIT_FIELDS);
          }
        }

        // 3. Load available roles (best-effort)
        try {
          const rRes = await fetchWithRefresh(
            `${NEST_API_URL}/roles`,
            { method: "GET" },
            authData.token,
            setAuthData,
          );
          if (rRes.ok) {
            const rBody = await rRes.json();
            const roles = rBody?.data || rBody?.roles || rBody || [];
            if (Array.isArray(roles)) {
              if (!cancelled) setAvailableRoles(roles);
              setFieldConfigs((prev) => ({
                ...prev,
                roleId: {
                  ...prev.roleId,
                  validation: {
                    options: roles.map((r) => ({ value: r.id, label: r.name })),
                  },
                },
              }));
            }
          }
        } catch {
          // /roles endpoint optional
        }

        // 4. On edit, load the admin's current data
        if (!isCreate) {
          const aRes = await fetchWithRefresh(
            `${NEST_API_URL}/admins/${id}`,
            { method: "GET" },
            authData.token,
            setAuthData,
          );
          const aBody = await aRes.json();
          if (aRes.ok && aBody?.success) {
            const a = aBody.admin || aBody.data || {};
            setFormData((prev) => ({
              ...prev,
              name: a.name ?? "",
              lastname: a.lastname ?? "",
              email: a.email ?? "",
              grade: a.grade ?? "admin",
              roleId: a.roleId ?? a.role?.id ?? "",
              region: a.region ?? "",
              wilaya: a.wilaya ?? "",
              commune: a.commune ?? "",
              isActive: a.isActive !== false,
            }));
          }
        }
      } catch (err) {
        console.error("Admin form load failed:", err);
        if (!cancelled) {
          setIsError(true);
          setMessage("Erreur lors du chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authData?.token, viewerId, id, isCreate, setAuthData]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsError(false);
    setMessage("");

    // Validation
    if (!formData.name?.trim()) return fail("Le nom est requis.");
    if (!formData.lastname?.trim()) return fail("Le prénom est requis.");
    if (!formData.email?.trim()) return fail("L'email est requis.");
    if (isCreate) {
      if (!formData.password) return fail("Le mot de passe est requis.");
      if (formData.password !== formData.confirmPassword) {
        return fail("Les mots de passe ne correspondent pas.");
      }
    }
    if (!formData.viewerPassword) {
      return fail("Votre mot de passe est requis pour confirmer.");
    }

    const payload = {
      name: formData.name.trim(),
      lastname: formData.lastname.trim(),
      email: formData.email.trim(),
      grade: formData.grade || "admin",
      roleId: formData.roleId || null,
      region: formData.region || null,
      wilaya: formData.wilaya || null,
      commune: formData.commune || null,
      isActive: Boolean(formData.isActive),
      viewerPassword: formData.viewerPassword,
      viewerId,
    };

    if (isCreate) payload.password = formData.password;

    setSubmitting(true);
    try {
      const url = isCreate
        ? `${NEST_API_URL}/admins`
        : `${NEST_API_URL}/admins/${id}`;
      const method = isCreate ? "POST" : "PATCH";

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
        const code = body?.code;
        const msg = code === "AUTHZ_REAUTH_FAILED"
          ? "Mot de passe incorrect."
          : body?.message || body?.data?.message || "Échec de l'opération.";
        return fail(msg);
      }

      setIsError(false);
      setMessage(isCreate ? "✅ Administrateur créé avec succès." : "✅ Administrateur mis à jour.");

      // On success (create) — reset target fields, keep viewer password field
      if (isCreate) {
        setFormData({
          name: "", lastname: "", email: "",
          password: "", confirmPassword: "",
          grade: "admin", roleId: "",
          region: "", wilaya: "", commune: "",
          isActive: true,
          viewerPassword: "",
        });
      }
    } catch (err) {
      console.error(err);
      if (err?.code === "AUTHZ_REAUTH_FAILED") return fail("Mot de passe incorrect.");
      fail(err?.message || "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }

    function fail(msg) {
      setIsError(true);
      setMessage(msg);
    }
  };

  // ── Sections & fields ────────────────────────────────────────────
  const fieldList = useMemo(() => {
    if (!permittedFields.length) return [];
    // On create, also ensure confirmPassword and viewerPassword render properly
    return permittedFields;
  }, [permittedFields]);

  const visibleSections = useMemo(() => {
    return Object.entries(SECTION_CONFIG)
      .filter(([, cfg]) => !cfg.createOnly || isCreate)
      .filter(([, cfg]) => cfg.fields.some((f) => fieldList.includes(f)))
      .map(([key]) => key);
  }, [fieldList, isCreate]);

  const parentWilayaFor = (field) => {
    if (field === "commune") return formData.wilaya;
    return null;
  };

  // ── Render gates ─────────────────────────────────────────────────
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

  if (!can) {
    return (
      <Shell>
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center shadow-2xl shadow-black/50 max-w-md">
          <Shield className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#F8FAFC]">Accès non autorisé</h2>
          <p className="text-[#94A3B8] text-sm mt-2">
            Vous n'avez pas la permission de {isCreate ? "créer" : "modifier"} un administrateur.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            Retour
          </button>
        </div>
      </Shell>
    );
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <BackButton fallbackPath="/dash/admins" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              {isCreate ? (
                <UserPlus className="w-6 h-6 text-emerald-400" />
              ) : (
                <UserCog className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                {isCreate ? "Créer un administrateur" : "Modifier l'administrateur"}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                {isCreate
                  ? "Ajouter un nouveau compte administrateur"
                  : formData.email || "Mettre à jour le compte"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8 space-y-8"
        >
          {visibleSections.map((sectionKey) => {
            const section = SECTION_CONFIG[sectionKey];
            const Icon = section.icon;
            const fields = section.fields.filter((f) => fieldList.includes(f));
            if (fields.length === 0) return null;

            return (
              <section
                key={sectionKey}
                className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">
                    {section.label}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fields.map((field) => (
                    <div key={field} className={field === "email" ? "sm:col-span-2" : ""}>
                      <DynamicField
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        config={fieldConfigs[field] || {}}
                        wilayasData={wilayasData}
                        parentWilayaCode={parentWilayaFor(field)}
                        required={["name", "lastname", "email", "password"].includes(field)}
                      />
                    </div>
                  ))}
                </div>

                {/* Confirm password — only on create, only if password is in fields */}
                {isCreate && fieldList.includes("password") && (
                  <div className="mt-6 max-w-md">
                    <DynamicField
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      config={{ label: "Confirmer le mot de passe", type: "password", ui: { placeholder: "Répétez le mot de passe" } }}
                      required
                    />
                  </div>
                )}
              </section>
            );
          })}

          {/* Re-auth */}
          <section className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Confirmation</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DynamicField
                name="viewerPassword"
                value={formData.viewerPassword}
                onChange={handleChange}
                config={{
                  label: "Votre mot de passe",
                  type: "password",
                  ui: { placeholder: "Saisissez votre mot de passe pour confirmer" },
                }}
                required
              />
            </div>
            <p className="text-xs text-[#64748B] mt-3">
              Requis pour confirmer l'opération. Il s'agit de votre mot de passe, pas celui de l'administrateur {isCreate ? "créé" : "modifié"}.
            </p>
          </section>

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
                  {isCreate ? <UserPlus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {isCreate ? "Créer l'administrateur" : "Enregistrer les modifications"}
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

// ─── Layout helper ───────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
      {children}
    </div>
  );
}