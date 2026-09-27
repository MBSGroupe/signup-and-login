// pages/DashBoard/Roles/RoleDetails.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Award,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Edit,
  Loader2,
  Lock,
  Shield,
  Users,
  UserCog,
  Info,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

const GRADE_LABELS = {
  user: "Utilisateur",
  admin: "Administrateur",
  super_admin: "Super administrateur",
};

const GRADE_BADGE = {
  user: "bg-gray-500/10 text-gray-300 border border-gray-500/20",
  admin: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  super_admin: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

// ─── Page ────────────────────────────────────────────────────────────

export default function RoleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!authData?.token || !id) return;
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
          if (!cancelled) setRole(r);
        } else {
          if (!cancelled) setError("Rôle introuvable");
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
  }, [authData?.token, id, setAuthData]);

  const handleEdit = () => navigate(`/dash/roles/edit/${id}`);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement du rôle…</p>
        </div>
      </Shell>
    );
  }

  if (error || !role) {
    return (
      <Shell>
        <div className="bg-[#111827] rounded-2xl border border-rose-500/20 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-lg font-medium">Erreur</p>
          <p className="text-[#94A3B8] text-sm mt-1">{error || "Rôle introuvable"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </Shell>
    );
  }

  const users = role.users || [];
  const admins = role.admins || [];

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/roles" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                {role.label}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1 font-mono">
                {role.name}
              </p>
            </div>
          </div>
        </div>

        {/* Header card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 mb-6 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetaItem icon={Shield} label="Grade">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  GRADE_BADGE[role.grade] || GRADE_BADGE.user
                }`}
              >
                {GRADE_LABELS[role.grade] || role.grade}
              </span>
            </MetaItem>

            <MetaItem icon={Shield} label="Type">
              {role.isSystem ? (
                <span className="inline-flex items-center gap-1 text-sm text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                  Système
                </span>
              ) : (
                <span className="text-[#F8FAFC] text-sm">Personnalisé</span>
              )}
            </MetaItem>

            <MetaItem icon={Calendar} label="Créé le">
              <p className="text-[#F8FAFC] text-sm">
                {role.createdAt
                  ? new Date(role.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </MetaItem>

            <MetaItem icon={Users} label="Utilisateurs assignés">
              <p className="text-[#F8FAFC] text-sm font-mono">
                {users.length + admins.length}
              </p>
            </MetaItem>
          </div>

          {role.isActive !== false && !role.isSystem && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap gap-3">
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-sm font-medium"
              >
                <Edit className="w-4 h-4" /> Modifier
              </button>
            </div>
          )}

          {role.isActive !== false && role.isSystem && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-amber-300/80">
                Ce rôle système est verrouillé — seul le libellé et la description
                peuvent être modifiés.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 border-b border-[rgba(255,255,255,0.06)] pb-px">
          {[
            { key: "info", label: "Métadonnées", icon: Info, count: null },
            { key: "users", label: "Utilisateurs", icon: Users, count: users.length },
            { key: "admins", label: "Administrateurs", icon: UserCog, count: admins.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== null && (
                <span className="text-xs text-[#64748B]">({count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-[#111827] rounded-b-2xl border-x border-b border-[rgba(255,255,255,0.06)] p-6">
          {activeTab === "info" && <InfoTab role={role} />}
          {activeTab === "users" && <UsersTab users={users} kind="user" />}
          {activeTab === "admins" && <UsersTab users={admins} kind="admin" />}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function MetaItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-xs text-[#64748B] uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}

function InfoTab({ role }) {
  const entries = [
    ["Nom", role.name],
    ["Libellé", role.label],
    ["Description", role.description || "—"],
    ["Grade", GRADE_LABELS[role.grade] || role.grade],
    ["Type", role.isSystem ? "Système" : "Personnalisé"],
    ["Statut", role.isActive !== false ? "Actif" : "Inactif"],
    ["Tenant", role.tenantId || "Global"],
    ["Créé le", role.createdAt ? new Date(role.createdAt).toLocaleString("fr-FR") : "—"],
    ["Modifié le", role.updatedAt ? new Date(role.updatedAt).toLocaleString("fr-FR") : "—"],
    ["Créé par", role.createdBy || "—"],
    ["Modifié par", role.updatedBy || "—"],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      {entries.map(([label, value], i) => (
        <div
          key={i}
          className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]"
        >
          <span className="text-[#64748B] block text-xs uppercase tracking-wider mb-1">
            {label}
          </span>
          <span className="text-[#F8FAFC] break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ users, kind }) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center text-[#64748B] py-12 text-sm">
        Aucun {kind === "admin" ? "administrateur" : "utilisateur"} assigné à ce rôle.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            {["Nom", "Prénom", "Email", "Grade"].map((h) => (
              <th
                key={h}
                className="pb-3 px-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors"
            >
              <td className="py-3 px-3 text-[#F8FAFC] font-medium">{u.name}</td>
              <td className="py-3 px-3 text-[#F8FAFC]">{u.lastname}</td>
              <td className="py-3 px-3 text-[#94A3B8]">{u.email}</td>
              <td className="py-3 px-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    GRADE_BADGE[u.grade] || GRADE_BADGE.user
                  }`}
                >
                  {GRADE_LABELS[u.grade] || u.grade}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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