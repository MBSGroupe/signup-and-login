// pages/DashBoard/Admins/AdminProfile.jsx
import { useContext, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import { useError } from "../../../Context/ErrorContext";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";
import wilayasData from "../../../assets/data/wilayas.json";
import {
  Mail,
  MapPin,
  Shield,
  Crown,
  Calendar,
  KeyRound,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Briefcase,
  Activity,
  Loader2,
  AlertCircle,
  MoreVertical,
  IdCard,
  Lock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  LogIn,
  User,
  Fingerprint,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Shared style tokens (console / enterprise look) ────────────────
const LABEL_CLS =
  "text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium";

const BTN_GHOST_CLS =
  "inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-transparent hover:bg-[#1F2937] border border-[rgba(255,255,255,0.08)] rounded-lg transition-all duration-200";

const BTN_DANGER_CLS =
  "inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-all duration-200";

// ─── Wilaya lookup ──────────────────────────────────────────────
const WILAYA_BY_CODE = new Map(
  (wilayasData || []).map((w) => [String(w.code), w.name]),
);

const regionLabel = (code) => {
  if (code === null || code === undefined || code === "") return "—";
  return WILAYA_BY_CODE.get(String(code)) || String(code);
};

// ─── Grade metadata ─────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────
const formatDate = (v, withTime = false) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return withTime
    ? d.toLocaleString("fr-FR")
    : d.toLocaleDateString("fr-FR");
};

const unwrap = (body) => {
  if (body && typeof body === "object" && "data" in body && "success" in body) {
    return body.data;
  }
  return body;
};

export default function AdminProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const { confirm } = useModal();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [can, setCan] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const viewerId = authData?.user?.id;
  const isSelf = Boolean(viewerId && admin && viewerId === admin.id);

  // ─── Fetch admin ──────────────────────────────────────────────
  useEffect(() => {
    if (!authData?.token || !id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
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
        if (res.ok && found) {
          if (!cancelled) setAdmin(found);
        } else {
          if (!cancelled) setError(body?.message || "Administrateur introuvable");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Erreur réseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, authData?.token, setAuthData]);

  // ─── Permission checks ────────────────────────────────────────
  useEffect(() => {
    if (!authData?.token || !viewerId) return;
    let cancelled = false;

    const ops = [
      "update",
      "delete",
      "activate",
      "deactivate",
      "reset_password",
      "change_role",
    ];

    (async () => {
      const results = await Promise.all(
        ops.map(async (op) => {
          try {
            const res = await fetchWithRefresh(
              `${NEST_API_URL}/permissions/${viewerId}/check-operation`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ operation: op, model: "Admin" }),
              },
              authData.token,
              setAuthData,
            );
            const body = await res.json();
            const payload = body?.data || body;
            return Boolean(payload?.canPerform);
          } catch {
            return false;
          }
        }),
      );
      if (cancelled) return;
      const next = {};
      ops.forEach((op, i) => (next[op] = results[i]));
      setCan(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [authData?.token, viewerId, setAuthData]);

  // ─── Close menu on outside click ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────
  const handleEdit = () => navigate(`/dash/admins/edit/${admin.id}`);
  const handleChangeRole = () =>
    navigate(`/dash/admins/edit/${admin.id}?focus=role`);
  const handleResetPassword = () =>
    navigate(`/dash/admins/${admin.id}/reset-password`);

  const handleToggleStatus = async () => {
    const isActive = admin.isActive !== false;
    const action = isActive ? "deactivate" : "activate";
    const label = isActive ? "désactiver" : "activer";

    const ok = await confirm({
      title: `${isActive ? "Désactiver" : "Activer"} l'administrateur`,
      message: `Voulez-vous vraiment ${label} ${admin.name} ${admin.lastname} ?`,
    });
    if (!ok) return;

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/${admin.id}/${action}`,
        { method: "PATCH" },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      if (!res.ok) {
        showError(body?.message || "Action impossible");
        return;
      }
      showSuccess(`Administrateur ${isActive ? "désactivé" : "activé"}`);
      setAdmin((prev) => ({ ...prev, isActive: !isActive }));
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Supprimer l'administrateur",
      message: `Cette action est irréversible. Supprimer ${admin.name} ${admin.lastname} ?`,
    });
    if (!ok) return;

    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/admins/${admin.id}`,
        { method: "DELETE" },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      if (!res.ok) {
        showError(body?.message || "Suppression impossible");
        return;
      }
      showSuccess("Administrateur supprimé");
      navigate("/dash/admins");
    } catch (err) {
      console.error(err);
      showError("Erreur réseau");
    }
  };

  // ─── Derived ──────────────────────────────────────────────────
  const gradeMeta = GRADE_META[admin?.grade] || GRADE_META.admin;
  const GradeIcon = gradeMeta.icon;
  const isActive = admin?.isActive !== false;
  const fullName = admin
    ? [admin.name, admin.lastname].filter(Boolean).join(" ").trim() || "—"
    : "—";
  const initial = (admin?.name || admin?.email || "A").charAt(0).toUpperCase();

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-[#64748B] text-xs font-mono uppercase tracking-[0.15em]">
            Chargement du profil
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (error || !admin) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#0F1623] rounded-xl border border-rose-500/20 p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-base font-medium">Erreur</p>
          <p className="text-[#94A3B8] text-sm mt-1">
            {error || "Administrateur introuvable"}
          </p>
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
      <div className="relative max-w-6xl mx-auto p-6 md:p-8">
        {/* ═══ HEADER STRIP ═══════════════════════════════════════ */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackPath="/dash/admins" />
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
                  Console · Profil
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                {fullName}
              </h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5 truncate max-w-xs">
                {admin.email || "—"}
              </p>
            </div>
          </div>

          {/* Actions menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={BTN_GHOST_CLS}
            >
              <MoreVertical className="w-4 h-4" />
              Actions
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0F1623] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl shadow-black/60 z-50 py-1 overflow-hidden">
                {can.update && (
                  <MenuItem
                    icon={Edit}
                    label="Modifier le profil"
                    onClick={() => {
                      setMenuOpen(false);
                      handleEdit();
                    }}
                  />
                )}

                {can.change_role && (
                  <MenuItem
                    icon={Briefcase}
                    label="Changer le rôle"
                    onClick={() => {
                      setMenuOpen(false);
                      handleChangeRole();
                    }}
                  />
                )}

                {can.reset_password && (
                  <MenuItem
                    icon={KeyRound}
                    label="Réinitialiser le mot de passe"
                    onClick={() => {
                      setMenuOpen(false);
                      handleResetPassword();
                    }}
                  />
                )}

                {(can.activate || can.deactivate) && !isSelf && (
                  <div className="border-t border-[rgba(255,255,255,0.06)] my-1">
                    {isActive && can.deactivate && (
                      <MenuItem
                        icon={UserX}
                        label="Désactiver"
                        onClick={() => {
                          setMenuOpen(false);
                          handleToggleStatus();
                        }}
                      />
                    )}
                    {!isActive && can.activate && (
                      <MenuItem
                        icon={UserCheck}
                        label="Activer"
                        onClick={() => {
                          setMenuOpen(false);
                          handleToggleStatus();
                        }}
                      />
                    )}
                  </div>
                )}

                {can.delete && !isSelf && (
                  <div className="border-t border-[rgba(255,255,255,0.06)] my-1">
                    <MenuItem
                      icon={Trash2}
                      label="Supprimer"
                      danger
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ IDENTITY STRIP ═════════════════════════════════════ */}
        <div className="bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)] p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            {/* Square initial tile */}
            <div className="h-16 w-16 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-bold font-mono shrink-0">
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">
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
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-emerald-400" : "bg-gray-500"
                    }`}
                  />
                  {isActive ? "actif" : "inactif"}
                </span>

                {isSelf && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Vous
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#64748B] font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {admin.email || "—"}
                </span>

                {(admin.role?.label || admin.role?.name) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {admin.role.label || admin.role.name}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {regionLabel(admin.region)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ STATS STRIP ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={LogIn}
            label="Dernière connexion"
            value={admin.lastLogin ? formatDate(admin.lastLogin, true) : "Jamais"}
          />
          <StatCard
            icon={Calendar}
            label="Compte créé le"
            value={formatDate(admin.createdAt)}
          />
          <StatCard
            icon={Activity}
            label="Dernière mise à jour"
            value={formatDate(admin.updatedAt, true)}
          />
        </div>

        {/* ═══ TWO-COLUMN LAYOUT ══════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main content */}
          <div className="lg:col-span-2 space-y-6">
            <Section icon={IdCard} title="Identité">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Nom" value={admin.name} />
                <Field label="Prénom" value={admin.lastname} />
                <Field label="Email" value={admin.email} mono />
                <Field label="ID" value={admin.id} mono small />
              </div>
            </Section>

            <Section icon={ShieldCheck} title="Rôle & Accès">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field
                  label="Grade"
                  value={
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${gradeMeta.tint}`}
                    >
                      <GradeIcon className="w-3 h-3" />
                      {gradeMeta.label}
                    </span>
                  }
                />
                <Field
                  label="Rôle"
                  value={
                    admin.role?.label ||
                    admin.role?.name ||
                    (admin.roleId ? "Rôle assigné" : "Aucun rôle assigné")
                  }
                />
                <Field label="Role ID" value={admin.roleId} mono small />
                <Field
                  label="Tenant ID"
                  value={admin.tenantId || "Global"}
                  mono
                  small
                />
              </div>
            </Section>

            <Section icon={MapPin} title="Localisation">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="CLOA / Région" value={regionLabel(admin.region)} />
                <Field label="Wilaya" value={admin.wilaya} />
                <Field label="Commune" value={admin.commune} />
              </div>
            </Section>
          </div>

          {/* Right column — security & activity */}
          <div className="space-y-6">
            <Section icon={Lock} title="Sécurité">
              <div className="space-y-4">
                <Field
                  label="Mot de passe changé le"
                  value={formatDate(admin.passwordChangedAt, true)}
                />
                <Field
                  label="Dernière connexion"
                  value={
                    admin.lastLogin
                      ? formatDate(admin.lastLogin, true)
                      : "Jamais"
                  }
                />
                {can.reset_password && (
                  <button
                    onClick={handleResetPassword}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Réinitialiser le mot de passe
                  </button>
                )}
              </div>
            </Section>

            <Section icon={Activity} title="Activité">
              <div className="space-y-4">
                <Field
                  label="Créé le"
                  value={formatDate(admin.createdAt, true)}
                />
                <Field
                  label="Mis à jour le"
                  value={formatDate(admin.updatedAt, true)}
                />
                <Field
                  label="Statut du compte"
                  value={
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-emerald-400" : "bg-gray-500"
                        }`}
                      />
                      {isActive ? "actif" : "inactif"}
                    </span>
                  }
                />
              </div>
            </Section>
          </div>
        </div>

        {/* ═══ BOTTOM META STRIP ══════════════════════════════════ */}
        <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <Fingerprint className="w-3 h-3" />
            <span>Profil administrateur · Console CNOA</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#475569]">
            <ShieldCheck className="w-3 h-3" />
            <span>Accès vérifié</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#0F1623] rounded-xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <h2 className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#94A3B8] font-medium">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, mono = false, small = false }) {
  const isEmpty = value === null || value === undefined || value === "";
  const isTextValue = typeof value === "string" || typeof value === "number";
  const display = isEmpty ? "—" : value;

  return (
    <div>
      <p className={LABEL_CLS + " mb-1"}>{label}</p>
      {isTextValue ? (
        <div
          className={[
            "text-[#F8FAFC]",
            small ? "text-xs" : "text-sm",
            mono ? "font-mono break-all" : "font-medium",
            isEmpty ? "text-[#475569]" : "",
          ].join(" ")}
        >
          {display}
        </div>
      ) : (
        <div>{display}</div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#0F1623] rounded-lg border border-[rgba(255,255,255,0.06)] p-3.5 flex items-center gap-3">
      <span className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium">
          {label}
        </p>
        <p className="text-[#F8FAFC] text-xs font-mono mt-0.5 truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3.5 py-2 text-left transition-colors flex items-center gap-2.5 text-xs font-medium ${
        danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-[#F8FAFC] hover:bg-[#1F2937]"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${danger ? "" : "text-[#64748B]"}`} />
      {label}
    </button>
  );
}