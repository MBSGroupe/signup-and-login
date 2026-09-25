// pages/DashBoard/Permissions/PermissionDetails.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Shield, AlertCircle, Calendar, User, GitBranch, History,
  Table, List, Info, ArrowLeft, RefreshCw, Edit, Loader2,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Constants ─────────────────────────────────────────────────────────

const STATUS_LABELS = {
  active: "Actif",
  flawed: "Défectueux",
  archived: "Archivé",
  stable: "Stable",
};

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  flawed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  stable: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const CONDITION_LABELS = {
  any: "any",
  self: "self",
  same_region: "same_region",
  same_wilaya: "same_wilaya",
  same_role: "same_role",
  same_level: "same_level",
  higher_level: "higher_level",
  lower_level: "lower_level",
  same_tenant: "same_tenant",
  owns_resource: "owns_resource",
};

const SCOPE_LABELS = {
  same_region: "same_region",
  same_wilaya: "same_wilaya",
  same_role: "same_role",
  self: "self",
  same_region_of_owner: "owner.region",
  same_region_of_user: "user.region",
  same_region_of_target_user: "target_user.region",
};

// ─── Rule description ──────────────────────────────────────────────────

function describeCondition(rule, depth = 0) {
  const c = rule.condition;
  if (!c || c === "any") return "any";

  if (c === "and" || c === "or") {
    const op = c === "and" ? " AND " : " OR ";
    const kids = (rule.conditions || []).map((x) => describeCondition(x, depth + 1));
    if (!kids.length) return `${c.toUpperCase()}()`;
    const joined = kids.join(op);
    return depth === 0 ? joined : `(${joined})`;
  }

  if (c === "not") {
    const kids = (rule.conditions || []).map((x) => describeCondition(x, depth + 1));
    return `NOT(${kids.join(", ")})`;
  }

  if (c === "custom") return rule.customCondition ? `custom:${rule.customCondition}` : "custom";
  return CONDITION_LABELS[c] || c;
}

function describeScope(scope, depth = 0) {
  if (!scope || typeof scope !== "object") return null;
  const t = scope.type;
  if (!t) return null;

  if (t === "and" || t === "or") {
    const op = t === "and" ? " AND " : " OR ";
    const kids = (scope.scopes || []).map((s) => describeScope(s, depth + 1));
    if (!kids.length) return `${t.toUpperCase()}()`;
    const joined = kids.join(op);
    return depth === 0 ? joined : `(${joined})`;
  }

  if (t === "field_equals") return `${scope.field} = ${JSON.stringify(scope.value)}`;
  if (t === "field_in") return `${scope.field} IN [${(scope.value || []).join(", ")}]`;
  if (t === "relation_field_in") return `${scope.relation}.${scope.field} IN [${(scope.value || []).join(", ")}]`;
  if (t === "relation_field_equals") return `${scope.relation}.${scope.field} = ${JSON.stringify(scope.value)}`;

  return SCOPE_LABELS[t] || t;
}

function describeRule(rule) {
  if (!rule || typeof rule !== "object") return null;
  const target = rule.grade
    ? { kind: "grade", label: `grade:${rule.grade}` }
    : rule.role?.name
    ? { kind: "role", label: `role:${rule.role.name}` }
    : null;
  if (!target) return null;

  return {
    target,
    condition: describeCondition(rule),
    scope: describeScope(rule.scope),
  };
}

// ─── Rule presentation — plain readable text, no pills ─────────────────

function RuleRow({ rule }) {
  const d = describeRule(rule);
  if (!d) {
    return (
      <span className="font-mono text-xs text-rose-400">⚠ règle invalide</span>
    );
  }

  return (
    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 font-mono text-xs leading-relaxed">
      <span className="text-[#F8FAFC] font-medium">{d.target.label}</span>
      <span className="text-[#475569]">→</span>
      <span className="text-[#94A3B8]">{d.condition}</span>
      {d.scope && (
        <>
          <span className="text-[#475569]">·</span>
          <span className="text-[#94A3B8]">where {d.scope}</span>
        </>
      )}
    </div>
  );
}

function RuleList({ rules }) {
  if (!rules || rules.length === 0) {
    return <span className="text-[#475569] text-xs">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {rules.map((r, i) => (
        <RuleRow key={i} rule={r} />
      ))}
    </div>
  );
}

// ─── Page sub-components ───────────────────────────────────────────────

function CenteredShell({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <CenteredShell>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
        <p className="text-[#94A3B8] text-sm">Chargement du schéma...</p>
      </div>
    </CenteredShell>
  );
}

function ErrorState({ error, onBack }) {
  return (
    <CenteredShell>
      <div className="bg-[#111827] rounded-2xl border border-rose-500/20 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <p className="text-[#F8FAFC] text-lg font-medium">Erreur</p>
        <p className="text-[#94A3B8] text-sm mt-1">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </div>
    </CenteredShell>
  );
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

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

function HeaderCard({ schema, onRestore, onEdit }) {
  return (
    <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 mb-6 shadow-2xl shadow-black/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetaItem icon={Shield} label="Statut">
          <StatusBadge status={schema.status} />
        </MetaItem>

        <MetaItem icon={Calendar} label="Activé le">
          <p className="text-[#F8FAFC] text-sm font-medium">
            {schema.activatedAt
              ? new Date(schema.activatedAt).toLocaleDateString("fr-FR")
              : "-"}
          </p>
        </MetaItem>

        <MetaItem icon={User} label="Créé par">
          <p className="text-[#F8FAFC] text-sm font-medium">
            {schema.createdBy?.name || "Inconnu"}
          </p>
        </MetaItem>

        <MetaItem icon={GitBranch} label="Version modèle">
          <p className="text-[#F8FAFC] text-sm font-medium">
            v{schema.modelVersion || schema.version}
          </p>
        </MetaItem>
      </div>

      {!schema.isActive && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap gap-3">
          <button
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Restaurer
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-sm font-medium"
          >
            <Edit className="w-4 h-4" /> Modifier
          </button>
        </div>
      )}
    </div>
  );
}

function TabsBar({ activeTab, setActiveTab, schema }) {
  const tabs = [
    { key: "fields", label: "Champs", icon: Table, count: schema.fields?.length || 0 },
    { key: "operations", label: "Opérations", icon: List, count: schema.operations?.length || 0 },
    { key: "info", label: "Métadonnées", icon: Info, count: null },
    { key: "history", label: "Historique", icon: History, count: schema.changeLog?.length || 0 },
  ];

  return (
    <div className="flex overflow-x-auto gap-1 border-b border-[rgba(255,255,255,0.06)] pb-px">
      {tabs.map(({ key, label, icon: Icon, count }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== null && <span className="text-xs text-[#64748B]">({count})</span>}
          </button>
        );
      })}
    </div>
  );
}

function TableShell({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            {headers.map((h) => (
              <th
                key={h}
                className="pb-3 px-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children || empty}</tbody>
      </table>
    </div>
  );
}

function FieldsTab({ fields }) {
  const isEmpty = !fields || fields.length === 0;
  return (
    <TableShell
      headers={["Nom", "Type", "Création", "Édition", "Visibilité"]}
      empty={
        <tr>
          <td colSpan={5} className="py-8 text-center text-[#64748B]">
            Aucun champ défini
          </td>
        </tr>
      }
    >
      {!isEmpty &&
        fields.map((field, idx) => (
          <tr
            key={idx}
            className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors align-top"
          >
            <td className="py-3 px-3 font-mono text-sm text-[#F8FAFC]">{field.name}</td>
            <td className="py-3 px-3 text-xs text-[#94A3B8] capitalize">{field.type}</td>
            <td className="py-3 px-3"><RuleList rules={field.creatableBy} /></td>
            <td className="py-3 px-3"><RuleList rules={field.editableBy} /></td>
            <td className="py-3 px-3"><RuleList rules={field.visibleTo} /></td>
          </tr>
        ))}
    </TableShell>
  );
}

function OperationsTab({ operations }) {
  const isEmpty = !operations || operations.length === 0;
  return (
    <TableShell
      headers={["Opération", "Autorisations"]}
      empty={
        <tr>
          <td colSpan={2} className="py-8 text-center text-[#64748B]">
            Aucune opération définie
          </td>
        </tr>
      }
    >
      {!isEmpty &&
        operations.map((op, idx) => (
          <tr
            key={idx}
            className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors align-top"
          >
            <td className="py-3 px-3 font-mono text-sm capitalize text-[#F8FAFC]">
              {op.operation}
            </td>
            <td className="py-3 px-3"><RuleList rules={op.allowed} /></td>
          </tr>
        ))}
    </TableShell>
  );
}

function InfoTab({ schema }) {
  const entries = [
    ["Version", `v${schema.version}`],
    ["Modèle", schema.model],
    ["Version du modèle", schema.modelVersion],
    ["Tenant", schema.tenantId || "Global"],
    ["Créé le", schema.createdAt ? new Date(schema.createdAt).toLocaleString("fr-FR") : "–"],
    ["Modifié le", schema.updatedAt ? new Date(schema.updatedAt).toLocaleString("fr-FR") : "–"],
    ["Créé par", schema.createdBy?.email || "–"],
    ["Dernière modification", schema.updatedBy?.email || "–"],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      {entries.map(([label, value], i) => (
        <div key={i} className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
          <span className="text-[#64748B] block text-xs uppercase tracking-wider mb-1">
            {label}
          </span>
          <span className="text-[#F8FAFC]">{value}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ changeLog }) {
  const hasHistory = changeLog && changeLog.length > 0;
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
      {hasHistory ? (
        changeLog.map((entry, idx) => (
          <div
            key={idx}
            className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#F8FAFC] font-medium">Version {entry.version}</span>
              <span className="text-[#64748B]">—</span>
              <span className="text-[#94A3B8]">
                {new Date(entry.changedAt).toLocaleString("fr-FR")}
              </span>
              <span className="text-[#64748B]">par</span>
              <span className="text-[#F8FAFC]">
                {entry.changedBy?.name || entry.changedBy || "Inconnu"}
              </span>
            </div>
            {entry.reason && (
              <p className="text-[#94A3B8] text-sm mt-1">{entry.reason}</p>
            )}
          </div>
        ))
      ) : (
        <p className="text-[#94A3B8] text-center py-8">Aucun historique disponible</p>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────

export default function PermissionDetails() {
  const { model, versionId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { alert } = useModal();

  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("fields");

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/permissions/schemas/${versionId}`,
          { method: "GET" },
          authData.token,
          setAuthData,
        );
        const data = await res.json();
        if (res.ok && data.success !== false) {
          const found = data.data?.version || data.version;
          if (found) setSchema(found);
          else setError("Version non trouvée");
        } else {
          setError(data.message || "Erreur");
        }
      } catch (err) {
        console.error("Failed to load permission schema:", err);
        setError("Erreur réseau");
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) fetchSchema();
  }, [model, versionId, authData?.token, setAuthData]);

  const handleRestore = async () => {
    try {
      const url = `${NEST_API_URL}/permissions/reactivate/${schema.id}?model=${model}`;
      const res = await fetchWithRefresh(url, { method: "POST" }, authData.token, setAuthData);
      const data = await res.json();
      if (res.ok && data.success !== false) {
        window.location.reload();
      } else {
        await alert({
          title: "Erreur",
          message: data.message || "Erreur lors de la restauration",
        });
      }
    } catch (err) {
      console.error("Restore error:", err);
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Impossible de contacter le serveur",
      });
    }
  };

  const handleEdit = () => navigate(`/dash/permissions/edit/${schema.id}`);
  const handleBack = () => navigate(-1);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onBack={handleBack} />;
  if (!schema) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/permissions" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                {model} – v{schema.version}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Détails du schéma de permissions
              </p>
            </div>
          </div>
        </div>

        <HeaderCard schema={schema} onRestore={handleRestore} onEdit={handleEdit} />

        <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} schema={schema} />

        <div className="bg-[#111827] rounded-b-2xl border-x border-b border-[rgba(255,255,255,0.06)] p-6">
          {activeTab === "fields" && <FieldsTab fields={schema.fields} />}
          {activeTab === "operations" && <OperationsTab operations={schema.operations} />}
          {activeTab === "info" && <InfoTab schema={schema} />}
          {activeTab === "history" && <HistoryTab changeLog={schema.changeLog} />}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #374151 transparent; }
      `}</style>
    </div>
  );
}