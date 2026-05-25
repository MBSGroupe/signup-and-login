import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { useNavigate } from "react-router-dom";


const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function PermissionManager() {
  const { authData } = useContext(UserContext);
  const navigate = useNavigate();
  const [schemas, setSchemas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSchemas();
  }, [authData]);

  const fetchSchemas = async () => {
    try {
      const res = await fetch(`${NEST_API_URL}/permissions/schemas`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const grouped = data.schemas.reduce((acc, schema) => {
          if (!acc[schema.model]) acc[schema.model] = [];
          acc[schema.model].push(schema);
          return acc;
        }, {});
        setSchemas(grouped);
      } else {
        setError(data.message || "Erreur");
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
    if (!window.confirm(`Voulez‑vous effectuer un rollback pour le modèle ${model} ?`)) return;
    try {
      const url = `${NEST_API_URL}/permissions/rollback?model=${model}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        await fetchSchemas();
      } else {
        alert(data.message || "Erreur");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  if (loading) return <div className="text-yellow-300">Chargement...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <Title title="Gestion des permissions" />

      <div className="mt-6 space-y-8">
        {Object.entries(schemas).map(([model, versions]) => {
          const activeVersion = versions.find(v => v.isActive);
          return (
            <div key={model} className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-yellow-300">{model}</h2>
                <div className="space-x-3">
                  <button
                    onClick={() => handleNewVersion(model)}
                    className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition"
                  >
                    Nouvelle version
                  </button>
                  {activeVersion && (
                    <button
                      onClick={() => confirmRollback(model)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              </div>

              <table className="w-full text-left">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="pb-2">Version</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2">Activé le</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.sort((a, b) => b.version - a.version).map((ver) => (
                    <tr key={ver.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 font-mono">v{ver.version}</td>
                      <td className="py-3">
                        {ver.isActive ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-300">
                            Actif
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ver.status === 'flawed' ? 'bg-red-600/20 text-red-300' : 'bg-gray-600/20 text-gray-400'
                          }`}>
                            {ver.status === 'flawed' ? 'Défectueux' : 'Inactif'}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {ver.activatedAt ? new Date(ver.activatedAt).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => navigate(`/dash/permissions/${model}/${ver.id}`)}
                          className="text-yellow-300 hover:text-yellow-400"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}