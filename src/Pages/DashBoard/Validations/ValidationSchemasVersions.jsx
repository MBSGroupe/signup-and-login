import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useApi } from '../../../hooks/useApi';
import { useModal } from '../../../Context/ModalContext'; 
import BackButton from '../../../Components/Buttons/BackButton';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ValidationSchemaVersions() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { confirm } = useModal(); 
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaName, setSchemaName] = useState('');

  const fetchVersions = async () => {
    setLoading(true);
    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schemaId}/versions`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      return res;
    }, { showSuccessMessage: false });

    if (result) {
      setVersions(result);
      if (result.length) setSchemaName(result[0].name);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authData?.token) {
      fetchVersions();
    }
  }, [schemaId, authData?.token, setAuthData]);

  const handleReactivate = async (versionId) => {
    // Use centralized modal instead of native confirm
    const confirmed = await confirm({
      title: 'Réactivation',
      message: 'Réactiver cette version ? Elle deviendra active et l\'ancienne version active sera archivée.',
    });
    if (!confirmed) return;

    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${versionId}/reactivateVersion`,
        { method: 'POST' },
        authData.token,
        setAuthData
      );
      return res;
    }, {
      showSuccessMessage: true,
      successMessage: 'Version réactivée avec succès',
    });

    if (result) {
      await fetchVersions();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-yellow-300">Chargement...</div>;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton />
      </div>
      <Title title={`Versions du schéma : ${schemaName}`} />
      <div className="mt-6 space-y-4">
        {versions.map(version => (
          <div key={version.id} className="bg-gray-800/60 border border-yellow-400/20 rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">Version {version.version}</h3>
                <div className="text-sm text-gray-400 mt-1">
                  Statut : {version.isActive ? '✓ Actif' : '✗ Inactif'} | Status: {version.status}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Créée le {new Date(version.createdAt).toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {version.steps?.length} étape(s)
                </div>
              </div>
              <div className="flex gap-2">
                {!version.isActive && version.status !== 'flawed' && (
                  <button
                    onClick={() => handleReactivate(version.id)}
                    className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
                  >
                    Réactiver
                  </button>
                )}
                <button
                  onClick={() => navigate(`/dash/validation/schemas/${version.id}/edit`)}
                  className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        ))}
        {versions.length === 0 && <p className="text-center text-gray-400 py-8">Aucune version trouvée.</p>}
      </div>
    </div>
  );
}