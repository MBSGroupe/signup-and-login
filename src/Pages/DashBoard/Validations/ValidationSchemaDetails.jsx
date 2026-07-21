import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { fetchWithRefresh } from "../../../Components/api";
import { useApi } from "../../../hooks/useApi";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";

const API_URL = import.meta.env.VITE_NEST_API_URL;

const statusLabels = {
  active: "Actif",
  flawed: "Défectueux",
  archived: "Archivé",
  stable: "Stable"
};

const statusColors = {
  active: "bg-green-600/20 text-green-300",
  flawed: "bg-red-600/20 text-red-300",
  archived: "bg-gray-600/20 text-gray-400",
  stable: "bg-blue-600/20 text-blue-300"
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
        // result is the unwrapped schema object
        setSchema(result);
      } else {
        // callApi already shows a toast; we set error to show a friendly message
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
              console.log(user)
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
      // Refresh the page to show updated schema
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-yellow-300">Chargement...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  if (!schema) return <div className="min-h-screen flex items-center justify-center text-red-400">Schéma introuvable</div>;

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
      <div key={idx} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-yellow-300">Étape {step.order} – {step.stepName}</h4>
          <span className={`px-2 py-0.5 text-xs rounded-full ${step.required ? 'bg-green-600/20 text-green-300' : 'bg-gray-600/20 text-gray-300'}`}>
            {step.required ? 'Requis' : 'Optionnel'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-400">Rôle requis :</span> {step.requiredRole}</div>
          <div><span className="text-gray-400">Utilisateurs autorisés :</span> {allowedUsersDisplay}</div>
          <div><span className="text-gray-400">Action en cas de rejet :</span> {step.rejectAction}</div>
          <div><span className="text-gray-400">Rôle d'escalade :</span> {step.escalateToRole || '—'}</div>
          <div><span className="text-gray-400">Timeout :</span> {step.timeout?.duration > 0 ? `${step.timeout.duration} secondes (${step.timeout.action})` : 'Désactivé'}</div>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-gray-400">Description :</span> {step.description || '—'}
        </div>
        {(step.approveConditions?.length > 0) && (
          <div className="mt-2 text-sm">
            <span className="text-gray-400">Conditions d'approbation :</span>
            <ul className="list-disc list-inside ml-4">
              {step.approveConditions.map((cond, ci) => (
                <li key={ci}>{cond.type} {JSON.stringify(cond.params)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton />
      </div>
      <Title title={`Schéma ${schema.name} v${schema.version}`} />

      <div className="mt-4 bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <span className="text-gray-400">Statut : </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[schema.status] || 'bg-gray-600/20 text-gray-400'}`}>
            {statusLabels[schema.status] || schema.status}
          </span>
        </div>
        <div className="text-gray-400">Cible : {schema.targetType}</div>
        <div className="text-gray-400">Actif : {schema.isActive ? '✓ Oui' : '✗ Non'}</div>
        <div className="text-gray-400">Créé par : {schema.createdBy?.name || "Inconnu"}</div>
        <div className="flex gap-2">
          {!schema.isActive && schema.status !== 'flawed' && (
            <>
              <button
                onClick={handleRollback}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Rollback
              </button>
              <button
                onClick={handleReactivate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Réactiver
              </button>
            </>
          )}
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500"
          >
            Modifier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mt-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("steps")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "steps"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Étapes ({schema.steps?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("global")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "global"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Configuration globale
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "actions"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Actions post‑validation
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "info"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Métadonnées
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "history"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Historique ({schema.changeLog?.length || 0})
        </button>
      </div>

      <div className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-b-xl p-6">
        {activeTab === "steps" && (
          <div>
            {schema.steps?.length === 0 && <p className="text-gray-400">Aucune étape définie.</p>}
            {schema.steps?.map((step, idx) => renderStepCard(step, idx))}
          </div>
        )}

        {activeTab === "global" && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">Timeout global :</span>
                <span className="ml-2 font-mono">{schema.globalTimeout?.duration || 0} heures</span>
              </div>
              <div>
                <span className="text-gray-400">Action globale :</span>
                <span className="ml-2">{schema.globalTimeout?.action || 'reject'}</span>
              </div>
              <div>
                <span className="text-gray-400">Notification email :</span>
                <span className="ml-2">{schema.notificationConfig?.methods?.email ? 'Activée' : 'Désactivée'}</span>
              </div>
              <div>
                <span className="text-gray-400">Notification système :</span>
                <span className="ml-2">{schema.notificationConfig?.methods?.system ? 'Activée' : 'Désactivée'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-yellow-300 mb-2">En cas d'approbation</h4>
              <div className="bg-gray-900/60 p-3 rounded">
                <div><span className="text-gray-400">Action :</span> {schema.onApproval?.action || 'setField'}</div>
                <div><span className="text-gray-400">Paramètres :</span> <pre className="inline text-xs">{JSON.stringify(schema.onApproval?.params, null, 2)}</pre></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-300 mb-2">En cas de rejet</h4>
              <div className="bg-gray-900/60 p-3 rounded">
                <div><span className="text-gray-400">Action :</span> {schema.onRejection?.action || 'setField'}</div>
                <div><span className="text-gray-400">Paramètres :</span> <pre className="inline text-xs">{JSON.stringify(schema.onRejection?.params, null, 2)}</pre></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-400">Nom :</span>
              <span>{schema.name}</span>
              <span className="text-gray-400">Description :</span>
              <span>{schema.description || '—'}</span>
              <span className="text-gray-400">Version :</span>
              <span>{schema.version}</span>
              <span className="text-gray-400">Target Type :</span>
              <span>{schema.targetType}</span>
              <span className="text-gray-400">Tenant :</span>
              <span>{schema.tenantId || 'Global'}</span>
              <span className="text-gray-400">Créé le :</span>
              <span>{new Date(schema.createdAt).toLocaleString('fr-FR')}</span>
              <span className="text-gray-400">Modifié le :</span>
              <span>{new Date(schema.updatedAt).toLocaleString('fr-FR')}</span>
              <span className="text-gray-400">Créé par :</span>
              <span>{schema.createdBy?.email || schema.createdBy?.name + ' ' + schema.createdBy?.lastname || "–"}</span>
              <span className="text-gray-400">Dernière modification par :</span>
              <span>{schema.updatedBy?.email || schema.updatedBy?.name + ' ' + schema.updatedBy?.lastname  || "–"}</span>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-2 text-sm">
            {schema.changeLog && schema.changeLog.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {schema.changeLog.map((entry, idx) => (
                  <div key={idx} className="bg-gray-900/60 p-2 rounded text-xs">
                    <p>
                      <span className="text-gray-400">Version {entry.version}</span> –{" "}
                      {new Date(entry.changedAt).toLocaleString('fr-FR')}
                    </p>
                    <p>
                      <span className="text-gray-400">Chargé par :</span> {entry.changedBy?.name || "Inconnu"}
                    </p>
                    <p className="text-gray-300 mt-1">{entry.reason || "–"}</p>
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entry.changes.map((change, changeIdx) => (
                          <div key={changeIdx} className="text-gray-400 text-xs">
                            <span className="font-mono">{change.field}</span> : {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">Aucun historique</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}