// src/Pages/SchemaSignup.jsx
// Signup page built from a validation schema: /inscription/:slug.
// The account block (CLOA, personal and family information, contact,
// diplomas) is the same on every page; the schema adds its own fields and
// documents. Open or closed with the schema (active or not).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  GraduationCap,
  Home,
  Loader2,
  Lock,
  MapPin,
  Paperclip,
  Phone,
  Shield,
  Upload,
  User,
  X,
  ClipboardList,
} from "lucide-react";
import cnoaLogo from "../assets/LOGOCLOA.png";
import { WILAYA_OPTIONS, wilayaLabel } from "../Utils/wilayas";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const PASSWORD_RULES = [
  { key: "min", label: "Au moins 8 caractères", test: (p) => p.length >= 8 },
  { key: "max", label: "Au plus 64 caractères", test: (p) => p.length <= 64 },
  { key: "uppercase", label: "Au moins une lettre majuscule", test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "Au moins une lettre minuscule", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "Au moins un chiffre", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Au moins un caractère spécial", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const SESSIONS_CLASSIQUE = ["Juin", "Juillet", "Septembre"].map((v) => ({ value: v, label: v }));
const SESSIONS_LMD = ["Juin", "Septembre", "Décembre"].map((v) => ({ value: v, label: v }));

// ── Account block: same rules as the server (src/auth/signup-account.ts) ──
const ACCOUNT_SECTIONS = [
  {
    key: "cloa",
    title: "CLOA d'inscription",
    icon: MapPin,
    fields: [{ name: "region", label: "CLOA d'inscription", type: "select", options: WILAYA_OPTIONS }],
  },
  {
    key: "personal",
    title: "Informations personnelles",
    icon: User,
    fields: [
      { name: "nin", label: "NIN", placeholder: "18 chiffres", digits: 18 },
      { name: "sexe", label: "Civilité", type: "select", options: [{ value: "M", label: "Masculin" }, { value: "F", label: "Féminin" }] },
      {
        name: "serviceNationalStatus",
        label: "Service national",
        type: "select",
        options: ["Ayant effectué", "Dégagé", "Dispensé", "Exempté", "En cours"].map((v) => ({ value: v, label: v })),
        show: (f) => f.sexe !== "F",
      },
      { name: "name", label: "Nom" },
      { name: "lastname", label: "Prénom" },
      { name: "nomArabe", label: "Nom (arabe)", arabic: true, placeholder: "اللقب" },
      { name: "prenomArabe", label: "Prénom (arabe)", arabic: true, placeholder: "الاسم" },
      { name: "dateOfBirth", label: "Date de naissance", type: "date" },
      { name: "lieuNaissance", label: "Lieu de naissance" },
      { name: "numeroActeNaissance", label: "N° d'acte de naissance" },
      { name: "adressePersonnelle", label: "Adresse personnelle" },
      { name: "adressePersonnelleArabe", label: "Adresse personnelle (arabe)", arabic: true, placeholder: "العنوان الشخصي" },
      { name: "commune", label: "Commune de résidence" },
      { name: "wilaya", label: "Wilaya de résidence", type: "select", options: WILAYA_OPTIONS },
      {
        name: "maritalStatus",
        label: "Situation familiale",
        type: "select",
        options: ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"].map((v) => ({ value: v, label: v })),
      },
      { name: "enfants", label: "Nombre d'enfants", type: "number", optional: true, show: (f) => f.maritalStatus !== "Célibataire" },
    ],
  },
  {
    key: "family",
    title: "Informations familiales",
    icon: Home,
    fields: [
      { name: "prenomPere", label: "Prénom du père" },
      { name: "prenomPereArabe", label: "Prénom du père (arabe)", arabic: true, placeholder: "اسم الأب" },
      { name: "nomPrenomMere", label: "Nom et prénom de la mère" },
      { name: "nomPrenomMereArabe", label: "Nom et prénom de la mère (arabe)", arabic: true, placeholder: "لقب واسم الأم" },
      { name: "nationality", label: "Nationalité", placeholder: "Algérienne" },
    ],
  },
  {
    key: "contact",
    title: "Contact",
    icon: Phone,
    fields: [
      { name: "phone", label: "Téléphone mobile", placeholder: "0555 55 55 55", phone: true },
      { name: "fixe", label: "Téléphone fixe", placeholder: "023 45 67 89", optional: true, digitsOnly: true },
      { name: "email", label: "Email", type: "email", placeholder: "exemple@domaine.dz" },
    ],
  },
  {
    key: "diplomas",
    title: "Diplômes universitaires",
    icon: GraduationCap,
    fields: [
      { name: "diplomaType", label: "Type de diplôme", type: "select", options: [{ value: "Classique", label: "Classique" }, { value: "LMD", label: "LMD" }] },
      { name: "sessionClassique", label: "Session", type: "select", options: SESSIONS_CLASSIQUE, show: (f) => f.diplomaType === "Classique" },
      { name: "anneeClassique", label: "Année", placeholder: "AAAA", show: (f) => f.diplomaType === "Classique" },
      { name: "universiteClassique", label: "Université", show: (f) => f.diplomaType === "Classique" },
      { name: "sessionLMDL", label: "Licence — session", type: "select", options: SESSIONS_LMD, show: (f) => f.diplomaType === "LMD" },
      { name: "anneeLMDL", label: "Licence — année", placeholder: "AAAA", show: (f) => f.diplomaType === "LMD" },
      { name: "universiteLMDL", label: "Licence — université", show: (f) => f.diplomaType === "LMD" },
      { name: "sessionLMDM", label: "Master — session", type: "select", options: SESSIONS_LMD, show: (f) => f.diplomaType === "LMD" },
      { name: "anneeLMDM", label: "Master — année", placeholder: "AAAA", show: (f) => f.diplomaType === "LMD" },
      { name: "universiteLMDM", label: "Master — université", show: (f) => f.diplomaType === "LMD" },
    ],
  },
];
const ACCOUNT_FIELDS = ACCOUNT_SECTIONS.flatMap((s) => s.fields);

// Section titles for the schema's own field groups (ui.group).
const GROUP_TITLES = {
  stage: "Périodes de stage précédentes",
  documents: "Documents",
};

const isFileField = (f) => f?.type === "file" || f?.type === "image" || ["file", "image"].includes(f?.ui?.widget);
const isMultiFile = (f) => isFileField(f) && (f?.ui?.multiple === true || f?.validation?.multiple === true);
const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
const messageOf = (data, fallback) => {
  const m = data?.message;
  if (Array.isArray(m)) return m.join(" • ");
  return m ? String(m) : fallback;
};

/** Same rules as the server payload check (ValidationService._validatePayload). */
const schemaFieldError = (field, value) => {
  const v = field.validation || {};
  const label = field.label || field.name;
  if (isEmpty(value)) return v.required ? `« ${label} » est requis` : null;
  if (isFileField(field)) return null;
  const s = String(value);
  if (field.type === "number" && !/^-?\d+(\.\d+)?$/.test(s.trim())) return `« ${label} » doit être un nombre`;
  if (field.type === "number" && v.min !== undefined && Number(s) < v.min) return `« ${label} » doit être ≥ ${v.min}`;
  if (field.type === "number" && v.max !== undefined && Number(s) > v.max) return `« ${label} » doit être ≤ ${v.max}`;
  if (v.minLength && s.length < v.minLength) return `« ${label} » : au moins ${v.minLength} caractères`;
  if (v.maxLength && s.length > v.maxLength) return `« ${label} » : au plus ${v.maxLength} caractères`;
  if (v.pattern) {
    try {
      if (!new RegExp(v.pattern).test(s)) return `« ${label} » ne respecte pas le format attendu`;
    } catch {
      /* malformed pattern: the server decides */
    }
  }
  if (Array.isArray(v.enum) && v.enum.length && !v.enum.includes(value)) return `« ${label} » : valeur non autorisée`;
  return null;
};

const inputClass = (invalid) =>
  `w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-200 ${
    invalid
      ? "border-rose-500 ring-2 ring-rose-500/50"
      : "border-[rgba(255,255,255,0.06)] focus:border-emerald-500 hover:border-[rgba(255,255,255,0.12)]"
  }`;

function Section({ icon, title, children, dataName }) {
  const Icon = icon;
  return (
    <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]" data-field-name={dataName}>
      <div className="flex items-center gap-3 mb-6">
        <Icon className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-[#F8FAFC]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ label, required }) {
  return (
    <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
      <span className={required ? "text-[#CBD5E1]" : "text-[#94A3B8]"}>
        {label}
        {required && <span className="text-rose-400 ml-1 font-bold">*</span>}
      </span>
      {!required && (
        <span className="text-[10px] font-semibold normal-case tracking-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
          optionnel
        </span>
      )}
    </label>
  );
}

function Centered({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center">
        <img src={cnoaLogo} alt="CNOA" className="w-20 h-20 object-contain mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

export default function SchemaSignup() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(null); // { name, description, isOpen, fields }
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ password: "", secondPassword: "", loi: false });
  const [files, setFiles] = useState({});
  const [invalid, setInvalid] = useState({});
  const [message, setMessage] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${NEST_API_URL}/auth/signup-forms/${encodeURIComponent(slug)}`);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(res.status === 404 ? "notfound" : messageOf(body, "Erreur de chargement"));
          return;
        }
        setPage(body?.data ?? body);
      } catch {
        if (!cancelled) setLoadError("Erreur réseau. Veuillez réessayer.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const schemaFields = useMemo(() => page?.fields || [], [page]);
  const schemaGroups = useMemo(() => {
    const groups = new Map();
    for (const f of schemaFields) {
      const key = isFileField(f) ? "documents" : f.ui?.group && f.ui.group !== "custom" ? f.ui.group : "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    // Documents last, like the CNOA form.
    return [...groups.entries()].sort(([a], [b]) => (a === "documents") - (b === "documents"));
  }, [schemaFields]);

  const shown = (f) => !f.show || f.show(form);
  const visibleAccountFields = ACCOUNT_FIELDS.filter(shown);
  const passwordRules = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(form.password) }));

  const setValue = (field, raw) => {
    let value = raw;
    if (field.digits || field.digitsOnly) value = value.replace(/\D/g, "").slice(0, field.digits || undefined);
    if (field.phone) value = value.startsWith("+") ? `+${value.replace(/\D/g, "")}` : value.replace(/\D/g, "");
    if (field.name === "enfants") value = value.replace(/\D/g, "").slice(0, 2);
    setInvalid((prev) => ({ ...prev, [field.name]: false }));
    setForm((prev) => ({ ...prev, [field.name]: value }));
  };

  const pickFile = (field, file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setMessage(`« ${file.name} » dépasse 10 Mo.`);
      return;
    }
    setInvalid((prev) => ({ ...prev, [field.name]: false }));
    setFiles((prev) => ({
      ...prev,
      [field.name]: isMultiFile(field) ? [...(prev[field.name] || []), file] : file,
    }));
  };
  const removeFile = (field, idx = null) =>
    setFiles((prev) => ({
      ...prev,
      [field.name]: idx === null ? null : (prev[field.name] || []).filter((_, i) => i !== idx),
    }));

  const validate = () => {
    const bad = {};
    const errors = [];
    for (const f of visibleAccountFields) {
      if (!f.optional && isEmpty(form[f.name])) bad[f.name] = true;
    }
    if (form.nin && !/^\d{18}$/.test(form.nin)) {
      bad.nin = true;
      errors.push("Le NIN doit comporter exactement 18 chiffres.");
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      bad.email = true;
      errors.push("Format de l'email invalide.");
    }
    if (!passwordRules.every((r) => r.passed)) {
      bad.password = true;
      errors.push("Le mot de passe ne respecte pas les règles.");
    }
    if (form.password !== form.secondPassword) {
      bad.secondPassword = true;
      errors.push("Les mots de passe ne correspondent pas.");
    }
    for (const f of schemaFields) {
      const err = schemaFieldError(f, isFileField(f) ? files[f.name] : form[f.name]);
      if (err) {
        bad[f.name] = true;
        errors.push(err);
      }
    }
    if (!form.loi) errors.push("Vous devez accepter la déclaration sur l'honneur.");
    if (Object.keys(bad).length && !errors.length) errors.push("Veuillez remplir tous les champs obligatoires en rouge.");
    setInvalid(bad);
    const first = Object.keys(bad)[0];
    if (first) document.querySelector(`[data-field-name="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return errors;
  };

  const handleReview = (e) => {
    e.preventDefault();
    const errors = validate();
    if (errors.length) {
      setMessage(errors.slice(0, 4).join(" • "));
      return;
    }
    setMessage("");
    setShowReview(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const body = new FormData();
      for (const f of visibleAccountFields) {
        if (!isEmpty(form[f.name])) body.append(f.name, String(form[f.name]).trim());
      }
      body.append("password", form.password);
      body.append("loi", String(!!form.loi));
      for (const f of schemaFields) {
        if (isFileField(f)) {
          const value = files[f.name];
          for (const file of Array.isArray(value) ? value : value ? [value] : []) {
            body.append(`files[${f.name}]`, file, file.name);
          }
        } else if (!isEmpty(form[f.name])) {
          body.append(f.name, String(form[f.name]));
        }
      }
      const res = await fetch(`${NEST_API_URL}/auth/signup/${encodeURIComponent(slug)}`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      setShowReview(false);
      if (!res.ok) {
        setMessage(messageOf(data, "Erreur lors de l'inscription. Votre inscription n'a pas été enregistrée."));
        return;
      }
      setMessage("");
      navigate("/verify-pending");
    } catch {
      setShowReview(false);
      setMessage("Erreur réseau. Votre inscription n'a pas été enregistrée, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── render helpers ──
  const renderAccountField = (f) => {
    if (!shown(f)) return null;
    const required = !f.optional;
    const value = form[f.name] ?? "";
    return (
      <div key={f.name} className="space-y-1.5" data-field-name={f.name}>
        <FieldLabel label={f.label} required={required} />
        {f.type === "select" ? (
          <select value={value} onChange={(e) => setValue(f, e.target.value)} className={inputClass(invalid[f.name])}>
            <option value="">Sélectionnez</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
            inputMode={f.type === "number" || f.digits ? "numeric" : undefined}
            value={value}
            placeholder={f.placeholder || ""}
            max={f.type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
            dir={f.arabic ? "rtl" : "ltr"}
            onChange={(e) => setValue(f, e.target.value)}
            className={`${inputClass(invalid[f.name])} ${f.arabic ? "text-right" : ""}`}
          />
        )}
        {f.digits && (
          <p className={`text-[11px] font-mono ${value.length === f.digits ? "text-emerald-400" : "text-[#64748B]"}`}>
            {value.length}/{f.digits}
          </p>
        )}
      </div>
    );
  };

  const renderSchemaField = (f) => {
    const required = !!f.validation?.required;
    const label = f.label || f.name;
    if (isFileField(f)) {
      const value = files[f.name];
      const list = Array.isArray(value) ? value : value ? [value] : [];
      return (
        <div
          key={f.name}
          data-field-name={f.name}
          className={`bg-[#111827] p-3 rounded-xl border ${invalid[f.name] ? "border-rose-500 ring-2 ring-rose-500/40" : "border-[rgba(255,255,255,0.06)]"}`}
        >
          <FieldLabel label={label} required={required} />
          {f.ui?.help && <p className="text-[11px] text-[#64748B] mt-1">{f.ui.help}</p>}
          <div className="mt-2 space-y-2">
            {list.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-[#F8FAFC] truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => removeFile(f, isMultiFile(f) ? idx : null)} className="text-rose-400 hover:text-rose-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(isMultiFile(f) || list.length === 0) && (
              <label className="block text-center py-2 border-2 border-dashed border-[rgba(255,255,255,0.06)] rounded-lg cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all">
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,.pdf,image/jpeg,image/png"
                  onChange={(e) => {
                    pickFile(f, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Upload className="w-5 h-5 mx-auto text-[#64748B]" />
                <span className="text-xs text-[#64748B] mt-1 block">PDF, JPG ou PNG — 10 Mo max</span>
              </label>
            )}
          </div>
        </div>
      );
    }
    const options = Array.isArray(f.validation?.enum) ? f.validation.enum : null;
    const value = form[f.name] ?? "";
    return (
      <div key={f.name} className="space-y-1.5" data-field-name={f.name}>
        <FieldLabel label={label} required={required} />
        {options ? (
          <select value={value} onChange={(e) => setValue(f, e.target.value)} className={inputClass(invalid[f.name])}>
            <option value="">Sélectionnez</option>
            {options.map((o) => (
              <option key={String(o)} value={o}>{String(o)}</option>
            ))}
          </select>
        ) : f.name === "region" || f.name === "wilaya" ? (
          <select value={value} onChange={(e) => setValue(f, e.target.value)} className={inputClass(invalid[f.name])}>
            <option value="">Sélectionnez</option>
            {WILAYA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={f.type === "date" ? "date" : "text"}
            inputMode={f.type === "number" ? "numeric" : undefined}
            value={value}
            placeholder={f.ui?.placeholder || ""}
            onChange={(e) => setValue(f, e.target.value)}
            className={inputClass(invalid[f.name])}
          />
        )}
        {f.ui?.help && <p className="text-[11px] text-[#64748B]">{f.ui.help}</p>}
      </div>
    );
  };

  // ── states ──
  if (loadError === "notfound") {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-[#F8FAFC]">Page introuvable</h1>
        <p className="text-sm text-[#94A3B8] mt-2">Cette page d'inscription n'existe pas.</p>
        <a href="/" className="inline-block mt-6 text-emerald-400 hover:underline">Retour à l'accueil</a>
      </Centered>
    );
  }
  if (loadError) {
    return (
      <Centered>
        <p className="text-rose-400">{loadError}</p>
      </Centered>
    );
  }
  if (!page) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }
  if (!page.isOpen) {
    return (
      <Centered>
        <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-[#F8FAFC]">Inscriptions fermées</h1>
        <p className="text-sm text-[#94A3B8] mt-2">
          Les inscriptions « {page.name} » sont actuellement fermées.
        </p>
        <a href="/" className="inline-block mt-6 text-emerald-400 hover:underline">Retour à l'accueil</a>
      </Centered>
    );
  }

  // ── review rows ──
  const reviewValue = (f, v) =>
    f.type === "select" ? f.options.find((o) => o.value === v)?.label ?? v : f.name === "region" || f.name === "wilaya" ? wilayaLabel(v) : v;

  return (
    <div className="min-h-screen bg-[#0A0F1C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={cnoaLogo} alt="CNOA" className="w-24 h-24 object-contain mb-2" />
          <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Ordre National des Architectes</h1>
          <h2 className="text-2xl font-bold text-[#F8FAFC] tracking-tight mt-1">{page.name}</h2>
          {page.description && <p className="text-[#94A3B8] mt-2 max-w-2xl">{page.description}</p>}
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 sm:p-8 lg:p-10">
          <form className="space-y-10" onSubmit={handleReview} noValidate>
            {ACCOUNT_SECTIONS.map((s) => (
              <Section key={s.key} icon={s.icon} title={s.title}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{s.fields.map(renderAccountField)}</div>
              </Section>
            ))}

            {schemaGroups.map(([group, fields]) => (
              <Section
                key={group}
                icon={group === "documents" ? Paperclip : ClipboardList}
                title={GROUP_TITLES[group] || "Informations complémentaires"}
              >
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${group === "documents" ? "lg:grid-cols-3 gap-4" : "lg:grid-cols-3 gap-6"}`}>
                  {fields.map(renderSchemaField)}
                </div>
              </Section>
            ))}

            <Section icon={Shield} title="Sécurité">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5" data-field-name="password">
                  <FieldLabel label="Mot de passe" required />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setValue({ name: "password" }, e.target.value)}
                    className={inputClass(invalid.password)}
                    autoComplete="new-password"
                  />
                  {form.password && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {passwordRules.map((r) => (
                        <li key={r.key} className={`flex items-center gap-1.5 ${r.passed ? "text-emerald-400" : "text-[#64748B]"}`}>
                          {r.passed ? <CheckCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1.5" data-field-name="secondPassword">
                  <FieldLabel label="Confirmer le mot de passe" required />
                  <input
                    type="password"
                    value={form.secondPassword}
                    onChange={(e) => setValue({ name: "secondPassword" }, e.target.value)}
                    className={inputClass(invalid.secondPassword)}
                    autoComplete="new-password"
                  />
                  {form.secondPassword && form.secondPassword !== form.password && (
                    <p className="text-xs text-rose-400">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>
              </div>
            </Section>

            <Section icon={Shield} title="Déclaration sur l'honneur">
              <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                Je déclare vouloir effectuer mon inscription « {page.name} », je déclare sur l'honneur que les
                renseignements ci-dessus sont exacts et j'autorise l'Ordre des Architectes à utiliser mes
                renseignements dans le respect des lois en vigueur et des règlements de l'Ordre des Architectes.
              </p>
              <label className="flex items-center gap-3 text-sm text-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.loi}
                  onChange={(e) => setForm((prev) => ({ ...prev, loi: e.target.checked }))}
                  className="w-5 h-5 rounded bg-[#111827] text-emerald-500 focus:ring-emerald-500"
                />
                J'accepte les termes de la déclaration ci-dessus.
              </label>
            </Section>

            <button
              type="submit"
              disabled={submitting || !form.loi}
              className="w-full py-4 text-lg font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-3">
                <Eye className="w-6 h-6" />
                Vérifier avant d'envoyer
              </span>
            </button>
          </form>

          {message && (
            <div className="mt-6 p-4 rounded-xl font-medium flex items-start gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[#64748B]">
          Vous avez déjà un compte ? <a href="/" className="text-emerald-400 hover:underline font-medium">Se connecter</a>
        </p>
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1C]/85 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.06)]">
              <h2 className="text-lg font-semibold text-[#F8FAFC]">Vérifiez vos informations</h2>
              <p className="text-xs text-[#94A3B8] mt-1">{page.name}</p>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {ACCOUNT_SECTIONS.map((s) => (
                <div key={s.key}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-2">{s.title}</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {s.fields.filter((f) => shown(f) && !isEmpty(form[f.name])).map((f) => (
                      <div key={f.name} className="flex justify-between gap-3 border-b border-white/5 py-1">
                        <dt className="text-[#94A3B8]">{f.label}</dt>
                        <dd className="text-[#F8FAFC] text-right" dir={f.arabic ? "rtl" : "ltr"}>{reviewValue(f, form[f.name])}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {schemaGroups.map(([group, fields]) => (
                <div key={group}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                    {GROUP_TITLES[group] || "Informations complémentaires"}
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {fields.map((f) => {
                      const v = isFileField(f) ? files[f.name] : form[f.name];
                      if (isEmpty(v)) return null;
                      const shownValue = isFileField(f) ? (Array.isArray(v) ? v.map((x) => x.name).join(", ") : v.name) : String(v);
                      return (
                        <div key={f.name} className="flex justify-between gap-3 border-b border-white/5 py-1">
                          <dt className="text-[#94A3B8]">{f.label || f.name}</dt>
                          <dd className="text-[#F8FAFC] text-right break-all">{shownValue}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-5 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#CBD5E1] bg-[#1F2937] hover:bg-[#182233] rounded-xl border border-[rgba(255,255,255,0.06)] disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour et modifier
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? "Envoi en cours…" : "Confirmer l'inscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
