import { useContext, useEffect, useMemo, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
  AlertTriangle,
  Power,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Helper: unwrap the ResponseInterceptor envelope ────────────────────
const unwrap = (body) => (body && typeof body === 'object' && 'data' in body && 'success' in body)
  ? body.data
  : body;

export default function ValidationSchemasList() {
  const { authData, setAuthData, canDo } = useContext(UserContext);
  const canToggle = canDo('ValidationSchema', 'toggle_schema');
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 'all' | 'active' | 'inactive'
  const [statusFilter, setStatusFilter] = useState('all');

  // One card per schema family (same name): its active version, or — when
  // the schema is deactivated — its latest version, so it can still be
  // edited to tweak the requests opened from it. Older versions stay
  // under "Versions".
  const families = useMemo(() => {
    const byFamily = new Map();
    for (const s of schemas) {
      const key = `${s.tenantId ?? ''}::${s.name}`;
      const current = byFamily.get(key);
      const better =
        !current ||
        (s.isActive && !current.isActive) ||
        (s.isActive === current.isActive && s.version > current.version);
      if (better) byFamily.set(key, s);
    }
    return [...byFamily.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [schemas]);

  const visibleSchemas = families.filter((s) =>
    statusFilter === 'all' ? true : statusFilter === 'active' ? s.isActive : !s.isActive,
  );
  const counts = {
    all: families.length,
    active: families.filter((s) => s.isActive).length,
    inactive: families.filter((s) => !s.isActive).length,
  };

  const fetchSchemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas?includeInactive=true`,
        { method: 'GET' },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      const payload = unwrap(body);
      const list =
        (Array.isArray(payload) && payload) ||
        payload?.schemas ||
        [];
      setSchemas(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load validation schemas:', err);
      setError(err?.message || 'Erreur lors du chargement des schémas.');
      setSchemas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authData?.token) fetchSchemas();
  }, [authData?.token, setAuthData]);

  const handleRollback = async (schema) => {
    const confirmed = await confirm({
      title: 'Rollback',
      message: 'Rollback to the previous active version? This will change the active schema.',
    });
    if (!confirmed) return;

    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/rollback`,
        { method: 'POST' },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      if (body?.success) {
        await fetchSchemas();
      }
    } catch (err) {
      console.error('Rollback error:', err);
    }
  };

  // A card is the family's active version, or its latest when deactivated:
  // deactivate the first, reactivate the schema with the second.
  const handleToggleActive = async (schema) => {
    const activate = !schema.isActive;
    const hasSignup = !!schema.entryConfig?.signup?.enabled;
    const confirmed = await confirm({
      title: activate ? 'Réactiver le schéma' : 'Désactiver le schéma',
      message: activate
        ? `Réactiver « ${schema.name} » (v${schema.version}) ? Les nouvelles demandes${hasSignup ? " et sa page d'inscription" : ''} seront de nouveau ouvertes.`
        : `Désactiver « ${schema.name} » ? Plus aucune nouvelle demande${hasSignup ? ", et sa page d'inscription sera fermée" : ''}. Les demandes en cours continuent.`,
    });
    if (!confirmed) return;

    setError(null);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/${activate ? 'activate' : 'deactivate'}`,
        { method: 'PATCH' },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      if (res.ok && body?.success !== false) {
        await fetchSchemas();
        return;
      }
      const msg = body?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : msg || 'Action impossible.');
    } catch (err) {
      console.error('Toggle schema error:', err);
      setError(err?.message || 'Action impossible.');
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

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-300 font-medium">Erreur de chargement</p>
              <p className="text-rose-400/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            ['all', 'Tous'],
            ['active', 'Actifs'],
            ['inactive', 'Inactifs'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                statusFilter === value
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-[#111827] text-[#94A3B8] border-[rgba(255,255,255,0.06)] hover:text-[#F8FAFC]'
              }`}
            >
              {label} ({counts[value]})
            </button>
          ))}
        </div>

        {/* Schema list */}
        <div className="space-y-4">
          {visibleSchemas.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center">
              <FileText className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#94A3B8]">
                {schemas.length === 0 ? 'No schemas found.' : 'Aucun schéma pour ce filtre.'}
              </p>
              {schemas.length === 0 && (
                <p className="text-[#64748B] text-sm mt-1">Create your first validation schema to get started.</p>
              )}
            </div>
          ) : (
            visibleSchemas.map((schema) => (
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
                    {!schema.isActive && (
                      <p className="mt-2 text-xs text-amber-300/90">
                        Schéma désactivé : plus de nouvelles demandes. Ses modifications de libellés,
                        motifs, instructions et actions de fin s'appliquent aux demandes encore ouvertes.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canToggle && (schema.isActive || schema.status !== 'flawed') && (
                      <button
                        onClick={() => handleToggleActive(schema)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors text-sm font-medium ${
                          schema.isActive
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {schema.isActive ? 'Désactiver' : 'Réactiver'}
                      </button>
                    )}
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