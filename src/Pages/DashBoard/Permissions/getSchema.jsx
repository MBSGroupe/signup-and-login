// pages/DashBoard/Permissions/PermissionDetails.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  GitBranch,
  History,
  Layers,
  Table,
  List,
  Info,
  ArrowLeft,
  RefreshCw,
  Edit,
  Loader2,
  ChevronRight,
  Clock
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

const statusLabels = {
  active: "Actif",
  flawed: "Défectueux",
  archived: "Archivé",
  stable: "Stable"
};

const statusColors = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  flawed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  stable: "bg-blue-500/10 text-blue-400 border-blue-500/20"
};

export default function PermissionDetails() {
  const { model, versionId } = useParams();
  const navigate = useNavigate();
  const { authData } = useContext(UserContext);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("fields");

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await fetch(`${NEST_API_URL}/permissions/schemas/${versionId}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const data = await res.json();
        if (res.ok && data.success !== false) {
          const found = data.data?.version || data.version;
          if (found) {
            setSchema(found);
          } else {
            setError("Version non trouvée");
          }
        } else {
          setError(data.message || "Erreur");
        }
      } catch (err) {
        setError("Erreur réseau");
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) fetchSchema();
  }, [model, versionId, authData]);

  const handleRestore = async () => {
    try {
      const url = `${NEST_API_URL}/permissions/reactivate/${schema.id}?model=${model}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        window.location.reload();
      } else {
        alert(data.message || "Erreur lors de la restauration");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  const handleEdit = () => {
    navigate(`/dash/permissions/edit/${schema.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement du schéma...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#111827] rounded-2xl border border-rose-500/20 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-lg font-medium">Erreur</p>
          <p className="text-[#94A3B8] text-sm mt-1">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!schema) return null;

  const renderFieldRow = (field, index) => {
    const getRolesList = (arr) => arr?.map(r => `${r.role.name} (${r.condition})`).join(", ") || "–";
    return (
      <tr key={index} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors group">
        <td className="py-3 px-4 font-mono text-sm text-[#F8FAFC]">{field.name}</td>
        <td className="py-3 px-4 text-sm text-[#94A3B8]">{field.label || "–"}</td>
        <td className="py-3 px-4 text-sm text-[#94A3B8] capitalize">{field.type}</td>
        <td className="py-3 px-4 text-sm text-[#94A3B8] max-w-[150px] truncate">{getRolesList(field.creatableBy)}</td>
        <td className="py-3 px-4 text-sm text-[#94A3B8] max-w-[150px] truncate">{getRolesList(field.editableBy)}</td>
        <td className="py-3 px-4 text-sm text-[#94A3B8] max-w-[150px] truncate">{getRolesList(field.visibleTo)}</td>
      </tr>
    );
  };

  const renderOperationRow = (op, index) => {
    const allowed = op.allowed?.map(a => `${a.role.name} (${a.condition})`).join(", ") || "–";
    return (
      <tr key={index} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors group">
        <td className="py-3 px-4 font-mono text-sm capitalize text-[#F8FAFC]">{op.operation}</td>
        <td className="py-3 px-4 text-sm text-[#94A3B8]">{allowed}</td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Info card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 mb-6 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Shield className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Statut</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[schema.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                  {statusLabels[schema.status] || schema.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Activé le</p>
                <p className="text-[#F8FAFC] text-sm font-medium">
                  {schema.activatedAt ? new Date(schema.activatedAt).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <User className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Créé par</p>
                <p className="text-[#F8FAFC] text-sm font-medium">{schema.createdBy?.name || "Inconnu"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <GitBranch className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Version modèle</p>
                <p className="text-[#F8FAFC] text-sm font-medium">v{schema.modelVersion || schema.version}</p>
              </div>
            </div>
          </div>
          {!schema.isActive && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap gap-3">
              <button
                onClick={handleRestore}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Restaurer
              </button>
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 border-b border-[rgba(255,255,255,0.06)] pb-px">
          <button
            onClick={() => setActiveTab("fields")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "fields"
                ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
            }`}
          >
            <Table className="w-4 h-4" />
            Champs ({schema.fields?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "operations"
                ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
            }`}
          >
            <List className="w-4 h-4" />
            Opérations ({schema.operations?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "info"
                ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
            }`}
          >
            <Info className="w-4 h-4" />
            Métadonnées
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "history"
                ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
            }`}
          >
            <History className="w-4 h-4" />
            Historique ({schema.changeLog?.length || 0})
          </button>
        </div>

        {/* Tab content */}
        <div className="bg-[#111827] rounded-b-2xl border-x border-b border-[rgba(255,255,255,0.06)] p-6">
          {activeTab === "fields" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Nom</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Libellé</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Type</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Création</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Édition</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Visibilité</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.fields?.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#64748B]">Aucun champ défini</td>
                    </tr>
                  ) : (
                    schema.fields.map((field, idx) => renderFieldRow(field, idx))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "operations" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Opération</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">Autorisations</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.operations?.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="py-8 text-center text-[#64748B]">Aucune opération définie</td>
                    </tr>
                  ) : (
                    schema.operations.map((op, idx) => renderOperationRow(op, idx))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "info" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Version</span>
                <span className="text-[#F8FAFC] font-mono">v{schema.version}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Modèle</span>
                <span className="text-[#F8FAFC]">{schema.model}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Version du modèle</span>
                <span className="text-[#F8FAFC]">{schema.modelVersion}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Tenant</span>
                <span className="text-[#F8FAFC]">{schema.tenantId || "Global"}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Créé le</span>
                <span className="text-[#F8FAFC]">{new Date(schema.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Modifié le</span>
                <span className="text-[#F8FAFC]">{new Date(schema.updatedAt).toLocaleString('fr-FR')}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Créé par</span>
                <span className="text-[#F8FAFC]">{schema.createdBy?.email || "–"}</span>
              </div>
              <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#64748B] block">Dernière modification</span>
                <span className="text-[#F8FAFC]">{schema.updatedBy?.email || "–"}</span>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {schema.changeLog && schema.changeLog.length > 0 ? (
                schema.changeLog.map((entry, idx) => (
                  <div key={idx} className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[#F8FAFC] font-medium">Version {entry.version}</span>
                      <span className="text-[#64748B]">—</span>
                      <span className="text-[#94A3B8]">{new Date(entry.changedAt).toLocaleString('fr-FR')}</span>
                      <span className="text-[#64748B]">par</span>
                      <span className="text-[#F8FAFC]">{entry.changedBy?.name || entry.changedBy || "Inconnu"}</span>
                    </div>
                    {entry.reason && (
                      <p className="text-[#94A3B8] text-sm mt-1">{entry.reason}</p>
                    )}
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs">
                        {entry.changes.map((change, changeIdx) => (
                          <div key={changeIdx} className="text-[#94A3B8]">
                            <span className="text-[#64748B]">{change.field}</span>:
                            <span className="text-rose-400 ml-1">{JSON.stringify(change.oldValue)}</span>
                            <span className="text-[#64748B] mx-1">→</span>
                            <span className="text-emerald-400">{JSON.stringify(change.newValue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[#94A3B8] text-center py-8">Aucun historique disponible</p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
      `}</style>
    </div>
  );
}