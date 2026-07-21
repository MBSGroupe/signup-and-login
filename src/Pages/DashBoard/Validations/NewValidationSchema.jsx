import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import ValidationSchemaForm from '../../../Components/Modals/ValidationSchemaForm';
import { useApi } from '../../../hooks/useApi';
import BackButton from '../../../Components/Buttons/BackButton';
import Title from '../../../Components/Title';

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function NewValidationSchema() {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const navigate = useNavigate();
  const [allowedFields, setAllowedFields] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreatableFields = async () => {
      setLoading(true);
      
      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/permissions/user/${authData.user.id}/creatable-fields?model=Validation`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        return res;
      }, { showSuccessMessage: false });

      if (result) {
        setAllowedFields(result.fields || []);
        setFieldConfigs(result.configs || {});
      } else {
        // No permission data – allow all fields (default behaviour)
        console.warn('Could not fetch creatable fields, using all fields');
        setAllowedFields(null);
      }
      
      setLoading(false);
    };

    if (authData?.token) {
      fetchCreatableFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData?.token, setAuthData, authData?.user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath="/dash/validation/schemas" />
      </div>
      <Title title="Nouveau schéma de validation" />
      <ValidationSchemaForm
        initialData={null}
        schemaId={null}
        onSuccess={() => navigate('/dash/validation/schemas')}
        allowedFields={allowedFields}
        fieldConfigs={fieldConfigs}
      />
    </div>
  );
}