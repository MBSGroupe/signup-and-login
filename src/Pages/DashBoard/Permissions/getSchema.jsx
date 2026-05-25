import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Mapping des statuts en français
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
        if (res.ok) {
          const found = data.version
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
      if (res.ok) {
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

  if (loading) return <div className="text-yellow-300">Chargement...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!schema) return <div className="text-red-400">Schéma introuvable</div>;

  const renderFieldRow = (field, index) => {
    const getRolesList = (arr) => arr?.map(r => `${r.role.name} (${r.condition})`).join(", ") || "–";
    return (
      <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-700/20">
        <td className="py-2 px-1 font-mono text-sm">{field.name}</td>
        <td className="py-2 px-1 text-sm">{field.label || "–"}</td>
        <td className="py-2 px-1 text-sm capitalize">{field.type}</td>
        <td className="py-2 px-1 text-sm">{getRolesList(field.creatableBy)}</td>
        <td className="py-2 px-1 text-sm">{getRolesList(field.editableBy)}</td>
        <td className="py-2 px-1 text-sm">{getRolesList(field.visibleTo)}</td>
      </tr>
    );
  };

  const renderOperationRow = (op, index) => {
    const allowed = op.allowed?.map(a => `${a.role.name} (${a.condition})`).join(", ") || "–";
    return (
      <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-700/20">
        <td className="py-2 px-1 font-mono text-sm capitalize">{op.operation}</td>
        <td className="py-2 px-1 text-sm">{allowed}</td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-300 hover:text-yellow-400 mb-4 inline-flex items-center"
        >
          ← Retour
        </button>
      </div>
      <Title title={`Schéma ${model} v${schema.version}`} />

      {/* En-tête d'info */}
      <div className="mt-4 bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <span className="text-gray-400">Statut : </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[schema.status] || 'bg-gray-600/20 text-gray-400'}`}>
            {statusLabels[schema.status] || schema.status}
          </span>
        </div>
        <div className="text-gray-400">Activé le : {new Date(schema.activatedAt).toLocaleDateString('fr-FR')}</div>
        <div className="text-gray-400">Créé par : {schema.createdBy?.name || "Inconnu"}</div>
        <div className="flex gap-2">
          {!schema.isActive && (
            <>
              <button
                onClick={handleRestore}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Restaurer
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500"
              >
                Modifier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex space-x-1 mt-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("fields")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "fields"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Champs ({schema.fields?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("operations")}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === "operations"
              ? "bg-yellow-400 text-gray-900"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Opérations ({schema.operations?.length || 0})
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
          Historique
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-b-xl p-6">
        {activeTab === "fields" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="pb-2">Nom</th>
                  <th className="pb-2">Libellé</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Création</th>
                  <th className="pb-2">Édition</th>
                  <th className="pb-2">Visibilité</th>
                </tr>
              </thead>
              <tbody>
                {schema.fields?.map((field, idx) => renderFieldRow(field, idx))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="pb-2">Opération</th>
                  <th className="pb-2">Autorisations</th>
                </tr>
              </thead>
              <tbody>
                {schema.operations?.map((op, idx) => renderOperationRow(op, idx))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "info" && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-400">Version :</span>
              <span className="font-mono">{schema.version}</span>
              <span className="text-gray-400">Modèle :</span>
              <span>{schema.model}</span>
              <span className="text-gray-400">Version du modèle :</span>
              <span>{schema.modelVersion}</span>
              <span className="text-gray-400">Tenant :</span>
              <span>{schema.tenantId || "Global"}</span>
              <span className="text-gray-400">Créé le :</span>
              <span>{new Date(schema.createdAt).toLocaleString('fr-FR')}</span>
              <span className="text-gray-400">Modifié le :</span>
              <span>{new Date(schema.updatedAt).toLocaleString('fr-FR')}</span>
              <span className="text-gray-400">Créé par :</span>
              <span>{schema.createdBy?.email || "–"}</span>
              <span className="text-gray-400">Dernière modification par :</span>
              <span>{schema.updatedBy?.email || "–"}</span>
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
                      <span className="text-gray-400">Changed By {entry.changedBy.name}</span> –{" "}
                      {new Date(entry.changedAt).toLocaleString('fr-FR')}
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