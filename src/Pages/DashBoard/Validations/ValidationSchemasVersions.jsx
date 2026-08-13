import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useApi } from '../../../Hooks/useApi';
import { useModal } from '../../../Context/ModalContext'; 
import BackButton from '../../../Components/Buttons/BackButton';
import { 
  Layers, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  GitBranch, 
  History, 
  Edit,
  RefreshCw,
  Loader2,
  FileText
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des versions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/validation/schemas" />
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <History className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Versions du schéma
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              {schemaName ? `Schéma : ${schemaName}` : 'Chargement du nom...'}
            </p>
          </div>
        </div>

        {versions.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#94A3B8] text-lg font-medium">Aucune version trouvée</p>
            <p className="text-[#64748B] text-sm mt-1">Ce schéma n'a pas encore de versions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <h3 className="text-xl font-semibold text-[#F8FAFC]">
                        Version {version.version}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        version.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {version.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Actif
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactif
                          </>
                        )}
                      </span>
                      <span className="text-xs text-[#64748B] bg-[#0A0F1C] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.06)]">
                        {version.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#94A3B8]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                        Créée le {new Date(version.createdAt).toLocaleString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                        {version.steps?.length || 0} étape(s)
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!version.isActive && version.status !== 'flawed' && (
                      <button
                        onClick={() => handleReactivate(version.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Réactiver
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/dash/validation/schemas/${version.id}/edit`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] text-[#94A3B8] border border-[rgba(255,255,255,0.06)] rounded-lg hover:bg-[#182233] hover:text-[#F8FAFC] transition-all text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}