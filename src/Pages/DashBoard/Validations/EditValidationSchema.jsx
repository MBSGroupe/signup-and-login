import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import ValidationSchemaForm from '../../../Components/Modals/ValidationSchemaForm';
import BackButton from '../../../Components/Buttons/BackButton';
import { Loader2, Layers } from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Helper: unwrap the ResponseInterceptor envelope ────────────────────
const unwrap = (body) => (body && typeof body === 'object' && 'data' in body && 'success' in body)
  ? body.data
  : body;

export default function EditValidationSchema() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowedFields, setAllowedFields] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch schema data
        const schemaRes = await fetchWithRefresh(
          `${API_URL}/validation/schemas/${schemaId}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const schemaBody = await schemaRes.json();
        const schemaData = unwrap(schemaBody);

        if (!schemaData) {
          navigate('/dash/validation/schemas');
          return;
        }
        setInitialData(schemaData);

        // 2. Fetch editable fields for this schema model
        //    NOTE: model is `ValidationSchema` (matches the Prisma model / permission schema name)
        try {
          const permRes = await fetchWithRefresh(
            `${API_URL}/permissions/user/${authData.user.id}/editable-fields?model=ValidationSchema`,
            { method: 'GET' },
            authData.token,
            setAuthData
          );
          const permBody = await permRes.json();
          const permData = unwrap(permBody);
          if (permData) {
            setAllowedFields(permData.fields || []);
            setFieldConfigs(permData.configs || {});
          } else {
            setAllowedFields(null);
          }
        } catch (permErr) {
          // Permissions are optional — if this fails, the form falls back to defaults
          console.error('Failed to load editable fields for ValidationSchema:', permErr);
          setAllowedFields(null);
        }
      } catch (err) {
        console.error('Failed to load validation schema:', err);
        navigate('/dash/validation/schemas');
      } finally {
        setLoading(false);
      }
    };

    if (authData?.token && schemaId) fetchData();
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