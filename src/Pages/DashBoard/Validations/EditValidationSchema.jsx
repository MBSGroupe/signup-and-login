import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import ValidationSchemaForm from '../../../Components/Modals/ValidationSchemaForm';
import { useApi } from '../../../Hooks/useApi';
import BackButton from '../../../Components/Buttons/BackButton';
import Title from '../../../Components/Title';
import { Loader2, Layers } from 'lucide-react';

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
      <div className="min-h-screen ml-[40px] mt-20 bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Loading schema...</p>
        </div>
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackButton fallbackPath="/dash/validation/schemas" />
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Layers className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Modifier le schéma
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Mettez à jour le workflow de validation
            </p>
          </div>
        </div>

        <ValidationSchemaForm
          initialData={initialData}
          schemaId={schemaId}
          onSuccess={() => navigate(-1)}
          allowedFields={allowedFields}
          fieldConfigs={fieldConfigs}
        />
      </div>
    </div>
  );
}