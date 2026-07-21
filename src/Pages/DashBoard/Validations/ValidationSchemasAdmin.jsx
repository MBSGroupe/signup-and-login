import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useModal } from '../../../Context/ModalContext';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ValidationSchemasList() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { confirm } = useModal(); 
  const navigate = useNavigate();
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchSchemas = async () => {
    setLoading(true);
    const url = `${API_URL}/validation/schemas`;
    const result = await callApi(async () => {
      const res = await fetchWithRefresh(url, { method: 'GET' }, authData.token, setAuthData);
      return res;
    }, { showSuccessMessage: false });

    if (result) {
      setSchemas(result.schemas || result || []);
    } else {
      setSchemas([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authData?.token) {
      fetchSchemas();
    }
  }, [authData?.token, setAuthData]);

  const handleRollback = async (schema) => {
    const confirmed = await confirm({
      title: 'Rollback',
      message: 'Rollback to the previous active version? This will change the active schema.',
    });
    if (!confirmed) return;

    const result = await callApi(async () => {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/rollback`,
        { method: 'POST' },
        authData.token,
        setAuthData
      );
      return res;
    }, {
      showSuccessMessage: true, 
      successMessage: 'Rollback successful',
    });

    if (result) {
      await fetchSchemas();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-yellow-300">Chargement...</div>;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="flex justify-between items-center mb-6">
        <Title title="Schémas de validation" />
        <button
          onClick={() => navigate('/dash/validation/schemas/new')}
          className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition"
        >
          + Nouveau schéma
        </button>
      </div>

      <div className="space-y-4">
        {schemas.map(schema => (
          <div key={schema.id} className="bg-gray-800/60 border border-yellow-400/20 rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{schema.name}</h3>
                <div className="text-sm text-gray-400 mt-1">
                  Cible : {schema.targetType} | v{schema.version} | Statut : {schema.isActive ? '✓ Actif' : '✗ Inactif'}
                </div>
                <p className="text-gray-300 mt-2">{schema.description}</p>
                <div className="mt-3 text-xs text-gray-500">
                  {schema.steps?.length} étape(s)
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {schema.isActive && schema.status !== 'flawed' && (
                  <button
                    onClick={() => handleRollback(schema)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                  >
                    Rollback
                  </button>
                )}
                <button
                  onClick={() => navigate(`/dash/validation/schemas/${schema.id}/edit`)}
                  className="px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => navigate(`/dash/validation/schemas/${schema.id}/versions`)}
                  className="px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition text-sm"
                >
                  Versions
                </button>
                <button
                  onClick={() => navigate(`/dash/validation/schemas/${schema.id}`)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition text-sm"
                >
                  Détails
                </button>
              </div>
            </div>
          </div>
        ))}
        {schemas.length === 0 && <p className="text-center text-gray-400 py-8">Aucun schéma trouvé.</p>}
      </div>
    </div>
  );
}