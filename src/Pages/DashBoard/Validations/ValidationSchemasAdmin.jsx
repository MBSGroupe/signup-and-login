import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../Hooks/useApi';
import { useModal } from '../../../Context/ModalContext';
import { 
  Plus, 
  Edit, 
  Eye, 
  History, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Layers,
  FileText,
  Loader2,
  ChevronRight
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Loading schemas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ml-[30px] mt-20 bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-3">
              <Layers className="w-7 h-7 text-emerald-400" />
              Validation Schemas
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Manage validation workflows and schema versions
            </p>
          </div>
          <button
            onClick={() => navigate('/dash/validation/schemas/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Schema
          </button>
        </div>

        {/* Schema list */}
        <div className="space-y-4">
          {schemas.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center">
              <FileText className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#94A3B8]">No schemas found.</p>
              <p className="text-[#64748B] text-sm mt-1">Create your first validation schema to get started.</p>
            </div>
          ) : (
            schemas.map((schema) => (
              <div
                key={schema.id}
                className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-[#F8FAFC] truncate">
                        {schema.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        schema.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {schema.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#94A3B8]">
                      <span>Target: <span className="text-[#F8FAFC]">{schema.targetType}</span></span>
                      <span>Version: <span className="text-[#F8FAFC]">v{schema.version}</span></span>
                      <span>Steps: <span className="text-[#F8FAFC]">{schema.steps?.length || 0}</span></span>
                    </div>
                    {schema.description && (
                      <p className="mt-2 text-[#94A3B8] text-sm line-clamp-2">{schema.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {schema.isActive && schema.status !== 'flawed' && (
                      <button
                        onClick={() => handleRollback(schema)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-sm font-medium"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Rollback
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/dash/validation/schemas/${schema.id}/edit`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F2937] text-[#94A3B8] border border-[rgba(255,255,255,0.06)] rounded-lg hover:bg-[#182233] hover:text-[#F8FAFC] transition-colors text-sm font-medium"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/dash/validation/schemas/${schema.id}/versions`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F2937] text-[#94A3B8] border border-[rgba(255,255,255,0.06)] rounded-lg hover:bg-[#182233] hover:text-[#F8FAFC] transition-colors text-sm font-medium"
                    >
                      <History className="w-3.5 h-3.5" />
                      Versions
                    </button>
                    <button
                      onClick={() => navigate(`/dash/validation/schemas/${schema.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}