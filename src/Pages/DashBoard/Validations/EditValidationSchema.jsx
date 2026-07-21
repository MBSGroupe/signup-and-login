import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import ValidationSchemaForm from '../../../Components/Modals/ValidationSchemaForm';
import { useApi } from '../../../hooks/useApi';
import BackButton from '../../../Components/Buttons/BackButton';
import Title from '../../../Components/Title';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function EditValidationSchema() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowedFields, setAllowedFields] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch schema data
      const schemaResult = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/schemas/${schemaId}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        return res;
      });

      if (!schemaResult) {
        // `callApi` already showed a toast (error or warning). Just navigate away.
        navigate('/dash/validation/schemas');
        setLoading(false);
        return;
      }

      setInitialData(schemaResult);

      // 2. Fetch editable fields (optional)
      const permResult = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/permissions/user/${authData.user.id}/editable-fields?model=Validation`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        return res;
      }, { showSuccessMessage: false });

      if (permResult) {
        setAllowedFields(permResult.fields || []);
        setFieldConfigs(permResult.configs || {});
      } else {
        setAllowedFields(null);
      }

      setLoading(false);
    };

    if (authData?.token) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaId, authData?.token, setAuthData, authData?.user?.id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath="/dash/validation/schemas" />
      </div>
      <Title title="Modifier le schéma" />
      <ValidationSchemaForm
        initialData={initialData}
        schemaId={schemaId}
        onSuccess={() => navigate(-1)}
        allowedFields={allowedFields}
        fieldConfigs={fieldConfigs}
      />
    </div>
  );
}