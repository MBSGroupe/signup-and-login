import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function NewValidationSchema() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [allowedFields, setAllowedFields] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreatableFields = async () => {
      setLoading(true);
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/permissions/user/${authData.user.id}/creatable-fields?model=ValidationSchema`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const body = await res.json();
        const payload = unwrap(body);
        if (payload) {
          setAllowedFields(payload.fields || []);
          setFieldConfigs(payload.configs || {});
        } else {
          console.warn('Could not fetch creatable fields, using all fields');
          setAllowedFields(null);
        }
      } catch (err) {
        console.error('Failed to load creatable fields:', err);
        setAllowedFields(null);
      } finally {
        setLoading(false);
      }
    };

    if (authData?.token && authData?.user?.id) fetchCreatableFields();
  }, [authData?.token, setAuthData, authData?.user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ml-[30px] mt-20 bg-[#0A0F1C] p-6 md:p-8">
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
              Nouveau schéma de validation
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Créez un nouveau workflow de validation
            </p>
          </div>
        </div>

        <ValidationSchemaForm
          initialData={null}
          schemaId={null}
          onSuccess={() => navigate('/dash/validation/schemas')}
          allowedFields={allowedFields}
          fieldConfigs={fieldConfigs}
        />
      </div>
    </div>
  );
}