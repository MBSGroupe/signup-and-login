// pages/DashBoard/Permissions/PermissionManager.jsx
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import Title from "../../../Components/Title";
import { useNavigate } from "react-router-dom";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  Shield,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Calendar,
  GitBranch,
  Loader2,
  ChevronRight
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function PermissionManager() {
  const { authData, setAuthData } = useContext(UserContext);
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [schemas, setSchemas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSchemas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  const fetchSchemas = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/permissions/schemas`,
        { method: "GET" },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      console.log(data)
      if (res.ok) {
        const schemasData = data.data.schemas || [];
        const grouped = schemasData.reduce((acc, schema) => {
          if (!acc[schema.model]) acc[schema.model] = [];
          acc[schema.model].push(schema);
          return acc;
        }, {});
        setSchemas(grouped);
      } else {
        setError(data.message || "Erreur lors du chargement");
      }
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleNewVersion = (model) => {
    navigate(`/dash/permissions/new/${model}`);
  };

  const confirmRollback = async (model) => {
    const confirmed = await confirm({
      title: "Rollback",
      message: `Voulez-vous effectuer un rollback pour le modèle ${model} ?`
    });
    if (!confirmed) return;

    try {
      const url = `${NEST_API_URL}/permissions/rollback?model=${model}`;
      const res = await fetchWithRefresh(
        url,
        { method: "POST" },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      if (res.ok) {
        // Success – refresh the list
        await fetchSchemas();
        // Optional: show success message (you could use a toast)
        alert("Rollback effectué avec succès");
      } else {
        alert(data.message || "Erreur lors du rollback");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#111827] rounded-2xl border border-rose-500/20 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-lg font-medium">Erreur</p>
          <p className="text-[#94A3B8] text-sm mt-1">{error}</p>
          <button
            onClick={fetchSchemas}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Gestion des permissions
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Gérez les schémas de permissions par modèle
              </p>
            </div>
          </div>
          <button
            onClick={fetchSchemas}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F2937] hover:bg-[#2A3A4A] text-[#94A3B8] hover:text-white transition border border-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(schemas).length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
              <Shield className="w-12 h-12 text-[#64748B] opacity-30 mx-auto mb-4" />
              <p className="text-[#94A3B8] text-lg font-medium">Aucun schéma de permission</p>
              <p className="text-[#64748B] text-sm mt-1">Aucun modèle n'a encore de schéma défini.</p>
            </div>
          ) : (
            Object.entries(schemas).map(([model, versions]) => {
              const activeVersion = versions.find(v => v.isActive);
              return (
                <div
                  key={model}
                  className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Layers className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-[#F8FAFC]">{model}</h2>
                      <span className="text-xs text-[#64748B] bg-[#0A0F1C] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.06)]">
                        {versions.length} version{versions.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleNewVersion(model)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Nouvelle version
                      </button>
                      {activeVersion && (
                        <button
                          onClick={() => confirmRollback(model)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all duration-200 text-sm font-medium"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.04)]">
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Version
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Activé le
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions
                          .sort((a, b) => b.version - a.version)
                          .map((ver) => (
                            <tr
                              key={ver.id}
                              className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors group"
                            >
                              <td className="px-6 py-3.5">
                                <span className="font-mono text-sm font-medium text-[#F8FAFC]">
                                  v{ver.version}
                                </span>
                              </td>
                              <td className="px-6 py-3.5">
                                {ver.isActive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                    <CheckCircle className="w-3 h-3" />
                                    Actif
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    ver.status === 'flawed'
                                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                                      : 'border-gray-500/20 bg-gray-500/10 text-gray-400'
                                  }`}>
                                    {ver.status === 'flawed' ? (
                                      <>
                                        <XCircle className="w-3 h-3" />
                                        Défectueux
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3 h-3" />
                                        Inactif
                                      </>
                                    )}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
                                  <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                                  {ver.activatedAt ? new Date(ver.activatedAt).toLocaleDateString('fr-FR') : '-'}
                                </div>
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <button
                                  onClick={() => navigate(`/dash/permissions/${model}/${ver.id}`)}
                                  className="inline-flex items-center gap-1 text-sm text-[#94A3B8] hover:text-emerald-400 transition-colors group-hover:bg-[#1F2937] px-3 py-1.5 rounded-lg"
                                >
                                  Détails
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}