import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { fetchWithRefresh } from "../../../Components/api";
import { useApi } from "../../../hooks/useApi";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  User,
  Mail,
  Calendar,
  FileText,
  Layers,
  Settings,
  History,
  RefreshCw,
  Edit,
  MoreVertical,
  ChevronRight,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
  Zap,
  GitBranch,
  AlertTriangle,
  Info,
  List,
  Database,
  ExternalLink
} from "lucide-react";

const API_URL = import.meta.env.VITE_NEST_API_URL;

const statusLabels = {
  active: "Active",
  flawed: "Flawed",
  archived: "Archived",
  stable: "Stable"
};

const statusColors = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  flawed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  stable: "bg-blue-500/10 text-blue-400 border-blue-500/20"
};

export default function ValidationSchemaDetails() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { confirm, alert } = useModal();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("steps");
  const [userNamesMap, setUserNamesMap] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch schema data
  useEffect(() => {
    const fetchSchema = async () => {
      setLoading(true);
      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/schemas/${schemaId}`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
        return res;
      }, { showSuccessMessage: false });

      if (result) {
        setSchema(result);
      } else {
        setError("Impossible de charger le schéma.");
      }
      setLoading(false);
    };

    if (authData?.token) fetchSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaId, authData.token, setAuthData]);

  // Fetch user names for allowedUserIds
  useEffect(() => {
    if (schema && schema.steps) {
      const allUserIds = schema.steps.flatMap(step => step.allowedUserIds || []);
      if (allUserIds.length) {
        const fetchUserNames = async () => {
          setLoadingUsers(true);
          const uniqueIds = [...new Set(allUserIds.map(id => id.toString()))];
          const results = {};
          for (const id of uniqueIds) {
            const result = await callApi(async () => {
              const res = await fetchWithRefresh(
                `${API_URL}/users/${id}`,
                { method: "GET" },
                authData.token,
                setAuthData
              );
              return res;
            }, { showSuccessMessage: false });

            if (result && result.user) {
              const user = result.user;
              results[id] = `${user.name} ${user.lastname} (${user.email})`;
            } else {
              results[id] = id;
            }
          }
          setUserNamesMap(results);
          setLoadingUsers(false);
        };
        fetchUserNames();
      }
    }
  }, [schema, authData.token, setAuthData]);

  const handleRollback = async () => {
    const confirmed = await confirm({
      title: "Rollback",
      message: "Rollback to this version? It will become active."
    });
    if (!confirmed) return;

    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/rollback`,
        { method: "POST" },
        authData.token,
        setAuthData
      );
      return res;
    }, {
      showSuccessMessage: true,
      successMessage: "Rollback successful"
    });

    if (result) {
      window.location.reload();
    }
  };

  const handleReactivate = async () => {
    const confirmed = await confirm({
      title: "Réactivation",
      message: "Reactivate this version? It will become active."
    });
    if (!confirmed) return;

    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/reactivateVersion`,
        { method: "POST" },
        authData.token,
        setAuthData
      );
      return res;
    }, {
      showSuccessMessage: true,
      successMessage: "Version reactivated"
    });

    if (result) {
      window.location.reload();
    }
  };

  const handleEdit = () => {
    navigate(`/dash/validation/schemas/${schema.id}/edit`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#94A3B8] text-sm">Loading schema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-rose-400">
          <AlertCircle className="w-6 h-6 inline-block mr-2" />
          {error}
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="text-[#94A3B8]">Schema not found</div>
      </div>
    );
  }

  const renderStepCard = (step, idx) => {
    let allowedUsersDisplay = "Aucun";
    if (step.allowedUserIds?.length) {
      if (loadingUsers) {
        allowedUsersDisplay = "Chargement...";
      } else {
        allowedUsersDisplay = step.allowedUserIds
          .map(id => userNamesMap[id] || id)
          .join(", ");
      }
    }

    return (
      <div key={idx} className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] p-5 mb-4 hover:border-[rgba(255,255,255,0.12)] transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold border border-emerald-500/20">
              {step.order}
            </span>
            <h4 className="font-semibold text-[#F8FAFC]">{step.stepName}</h4>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            step.required
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
          }`}>
            {step.required ? 'Requis' : 'Optionnel'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Rôle requis :</span>
              <span className="text-[#F8FAFC] ml-1">{step.requiredRole || '—'}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Utilisateurs autorisés :</span>
              <span className="text-[#F8FAFC] ml-1">{allowedUsersDisplay}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Action en cas de rejet :</span>
              <span className="text-[#F8FAFC] ml-1">{step.rejectAction || '—'}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Rôle d'escalade :</span>
              <span className="text-[#F8FAFC] ml-1">{step.escalateToRole || '—'}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 col-span-full">
            <Clock className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Timeout :</span>
              <span className="text-[#F8FAFC] ml-1">
                {step.timeout?.duration > 0
                  ? `${step.timeout.duration} secondes (${step.timeout.action})`
                  : 'Désactivé'}
              </span>
            </div>
          </div>
          {step.description && (
            <div className="flex items-start gap-2 col-span-full">
              <FileText className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[#64748B]">Description :</span>
                <span className="text-[#F8FAFC] ml-1">{step.description}</span>
              </div>
            </div>
          )}
          {step.approveConditions?.length > 0 && (
            <div className="flex items-start gap-2 col-span-full">
              <CheckCircle className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[#64748B]">Conditions d'approbation :</span>
                <ul className="list-disc list-inside ml-2 text-[#F8FAFC]">
                  {step.approveConditions.map((cond, ci) => (
                    <li key={ci}>{cond.type} {JSON.stringify(cond.params)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen ml-[30px]  bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <div className="mb-4">
          <BackButton />
        </div>

        {/* Header */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 md:p-8 shadow-2xl shadow-black/50">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-6 h-6 text-emerald-400" />
                <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                  {schema.name}
                </h1>
                <span className="text-sm text-[#64748B] bg-[#0A0F1C] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.06)]">
                  v{schema.version}
                </span>
              </div>
              <p className="text-[#94A3B8] text-sm">{schema.description || 'No description'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {new Date(schema.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                  <User className="w-3.5 h-3.5" />
                  By {schema.createdBy?.name || 'Unknown'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                  <GitBranch className="w-3.5 h-3.5" />
                  Target: {schema.targetType}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                statusColors[schema.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
              }`}>
                {statusLabels[schema.status] || schema.status}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                schema.isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
              }`}>
                {schema.isActive ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            {!schema.isActive && schema.status !== 'flawed' && (
              <>
                <button
                  onClick={handleRollback}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Rollback
                </button>
                <button
                  onClick={handleReactivate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all text-sm font-medium"
                >
                  <Zap className="w-4 h-4" />
                  Reactivate
                </button>
              </>
            )}
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg hover:bg-[#182233] transition-all text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <div className="flex overflow-x-auto gap-1 border-b border-[rgba(255,255,255,0.06)] pb-px">
            <button
              onClick={() => setActiveTab("steps")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "steps"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <List className="w-4 h-4" />
              Steps ({schema.steps?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "global"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Settings className="w-4 h-4" />
              Global Config
            </button>
            <button
              onClick={() => setActiveTab("actions")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "actions"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Zap className="w-4 h-4" />
              Post-Validation
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
              Metadata
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
              History ({schema.changeLog?.length || 0})
            </button>
          </div>

          {/* Tab content */}
          <div className="bg-[#111827] rounded-b-2xl border-x border-b border-[rgba(255,255,255,0.06)] p-6">
            {activeTab === "steps" && (
              <div>
                {schema.steps?.length === 0 && (
                  <p className="text-[#94A3B8] text-center py-8">No steps defined.</p>
                )}
                {schema.steps?.map((step, idx) => renderStepCard(step, idx))}
              </div>
            )}

            {activeTab === "global" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Global Timeout</span>
                  <span className="text-[#F8FAFC] font-medium">
                    {schema.globalTimeout?.duration || 0} hours
                  </span>
                  <span className="text-[#94A3B8] ml-2">({schema.globalTimeout?.action || 'reject'})</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Notifications</span>
                  <div className="flex gap-4 mt-1">
                    <span className={`inline-flex items-center gap-1.5 ${
                      schema.notificationConfig?.methods?.email ? 'text-emerald-400' : 'text-[#64748B]'
                    }`}>
                      <Mail className="w-4 h-4" />
                      Email
                    </span>
                    <span className={`inline-flex items-center gap-1.5 ${
                      schema.notificationConfig?.methods?.system ? 'text-emerald-400' : 'text-[#64748B]'
                    }`}>
                      <Database className="w-4 h-4" />
                      System
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "actions" && (
              <div className="space-y-4">
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    On Approval
                  </h4>
                  <div className="text-sm text-[#94A3B8]">
                    <span className="text-[#64748B]">Action: </span>
                    <span className="text-[#F8FAFC]">{schema.onApproval?.action || 'setField'}</span>
                  </div>
                  <div className="mt-1 text-sm text-[#94A3B8]">
                    <span className="text-[#64748B]">Params: </span>
                    <code className="text-[#F8FAFC] bg-[#111827] px-2 py-0.5 rounded text-xs">
                      {JSON.stringify(schema.onApproval?.params, null, 2)}
                    </code>
                  </div>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    On Rejection
                  </h4>
                  <div className="text-sm text-[#94A3B8]">
                    <span className="text-[#64748B]">Action: </span>
                    <span className="text-[#F8FAFC]">{schema.onRejection?.action || 'setField'}</span>
                  </div>
                  <div className="mt-1 text-sm text-[#94A3B8]">
                    <span className="text-[#64748B]">Params: </span>
                    <code className="text-[#F8FAFC] bg-[#111827] px-2 py-0.5 rounded text-xs">
                      {JSON.stringify(schema.onRejection?.params, null, 2)}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "info" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Name</span>
                  <span className="text-[#F8FAFC]">{schema.name}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Description</span>
                  <span className="text-[#F8FAFC]">{schema.description || '—'}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Version</span>
                  <span className="text-[#F8FAFC]">{schema.version}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Target Type</span>
                  <span className="text-[#F8FAFC]">{schema.targetType}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Tenant</span>
                  <span className="text-[#F8FAFC]">{schema.tenantId || 'Global'}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Created</span>
                  <span className="text-[#F8FAFC]">{new Date(schema.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Created By</span>
                  <span className="text-[#F8FAFC]">{schema.createdBy?.email || schema.createdBy?.name || '—'}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Last Updated</span>
                  <span className="text-[#F8FAFC]">{new Date(schema.updatedAt).toLocaleString('fr-FR')}</span>
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
                        <span className="text-[#64748B]">by</span>
                        <span className="text-[#F8FAFC]">{entry.changedBy?.name || 'Unknown'}</span>
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
                  <p className="text-[#94A3B8] text-center py-8">No history available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
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