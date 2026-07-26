import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import wilayasData from '../../../assets/data/wilayas.json';
import { transformDates } from '../../../Utils/transformPayload';
import {
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Percent,
  Clock,
  AlertCircle,
  FileText,
  Check,
  X,
  Loader2,
  PlusCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function CreateBulkCotisation() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const [filters, setFilters] = useState({
    role: 'user',
    wilaya: 'all',
  });

  const [cotisationFields, setCotisationFields] = useState({});
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [creatableFieldsList, setCreatableFieldsList] = useState([]);

  useEffect(() => {
    if (!authData?.token) return;

    const fetchCreatableFields = async () => {
      try {
        const viewerId = authData.user?._id || authData.user?.id;
        const response = await fetch(
          `${NEST_API_URL}/permissions/user/${viewerId}/creatable-fields?model=Fee`,
          { headers: { Authorization: `Bearer ${authData.token}` } }
        );
        const responseData = await response.json();
        const data = responseData.data || responseData;
        if (response.ok) {
          setCreatableFieldsList(data.fields || []);
          setFieldConfigs(data.configs || {});
          const initial = {};
          data.fields.forEach(field => {
            if (field === 'year') initial[field] = new Date().getFullYear();
            else if (field === 'dueDate') initial[field] = '';
            else if (field === 'amount') initial[field] = 0;
            else if (field === 'penaltyConfig.type') initial[field] = 'none';
            else if (field === 'penaltyConfig.rate') initial[field] = 0;
            else if (field === 'penaltyConfig.frequency') initial[field] = 'once';
            else initial[field] = '';
          });
          setCotisationFields(initial);
        } else {
          console.error('Erreur chargement des champs créables');
        }
      } catch (error) {
        console.error('Erreur réseau', error);
      }
    };
    fetchCreatableFields();
  }, [authData]);

  const isPenaltyDisabled = () => {
    return cotisationFields['penaltyConfig.type'] === 'none';
  };

  useEffect(() => {
    if (isPenaltyDisabled()) {
      setCotisationFields(prev => ({
        ...prev,
        'penaltyConfig.rate': 0,
        'penaltyConfig.frequency': 'once',
      }));
    }
  }, [cotisationFields['penaltyConfig.type']]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCotisationFieldChange = (e) => {
    const { name, value, type } = e.target;
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }
    setCotisationFields(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setResult(null);

    const nested = {};
    Object.keys(cotisationFields).forEach(key => {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = nested;
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]] = current[parts[i]] || {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = cotisationFields[key];
      } else {
        nested[key] = cotisationFields[key];
      }
    });

    let payload = {
      ...filters,
      ...nested,
    };
    payload = transformDates(payload, ['dueDate']);
    
    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/fees/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        authData.token,
        setAuthData
      );
      const responseData = await response.json();
      const data = responseData.data || responseData;
      if (response.ok && responseData.success !== false) {
        setResult(data);
        setMessage(`✅ Opération terminée : ${data.created} cotisation(s) créée(s)`);
      } else {
        setMessage(data.message || responseData.message || '❌ Erreur lors de la création');
      }
    } catch (err) {
      console.error(err);
      setMessage('⚠️ Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (fieldName) => {
    const config = fieldConfigs[fieldName];
    if (!config) return null;

    const value = cotisationFields[fieldName] !== undefined ? cotisationFields[fieldName] : '';
    const isDisabled = (fieldName === 'penaltyConfig.rate' || fieldName === 'penaltyConfig.frequency') && isPenaltyDisabled();

    const fieldIcons = {
      amount: <DollarSign className="w-4 h-4 text-emerald-400" />,
      dueDate: <Calendar className="w-4 h-4 text-emerald-400" />,
      year: <Calendar className="w-4 h-4 text-emerald-400" />,
      notes: <FileText className="w-4 h-4 text-emerald-400" />,
    };

    const baseInputClasses = "w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]";

    if (config.type === 'select') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
            {fieldIcons[fieldName] || <Tag className="w-4 h-4 text-emerald-400" />}
            {config.label}
            {config.validation?.required && <span className="text-rose-400 ml-1">*</span>}
          </label>
          <select
            name={fieldName}
            value={value}
            onChange={handleCotisationFieldChange}
            required={config.validation?.required}
            disabled={isDisabled}
            className={`${baseInputClasses} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Sélectionner...</option>
            {config.validation?.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    switch (config.type) {
      case 'number':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName] || <Percent className="w-4 h-4 text-emerald-400" />}
              {config.label}
              {config.validation?.required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              type="number"
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              min={config.validation?.min}
              max={config.validation?.max}
              step="1"
              required={config.validation?.required}
              disabled={isDisabled}
              className={`${baseInputClasses} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
      case 'date':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName] || <Calendar className="w-4 h-4 text-emerald-400" />}
              {config.label}
              {config.validation?.required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              type="date"
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              required={config.validation?.required}
              disabled={isDisabled}
              className={`${baseInputClasses} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName] || <FileText className="w-4 h-4 text-emerald-400" />}
              {config.label}
              {config.validation?.required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <textarea
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              rows="3"
              disabled={isDisabled}
              className={`${baseInputClasses} resize-y ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
      default:
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName] || <Tag className="w-4 h-4 text-emerald-400" />}
              {config.label}
              {config.validation?.required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              type={config.type || 'text'}
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              placeholder={config.ui?.placeholder}
              required={config.validation?.required}
              disabled={isDisabled}
              className={`${baseInputClasses} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[3px] mt-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <PlusCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Création en masse de cotisations
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Créez des cotisations pour plusieurs membres à la fois
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Filters section */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Filtres des membres
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    Rôle
                  </label>
                  <select
                    name="role"
                    value={filters.role}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                  >
                    <option value="all">Tous les rôles</option>
                    <option value="user">Utilisateur</option>
                    <option value="moderator">Modérateur</option>
                    <option value="admin">Administrateur</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Wilaya
                  </label>
                  <select
                    name="wilaya"
                    value={filters.wilaya}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                  >
                    <option value="all">Toutes les wilayas</option>
                    {wilayasData.map(w => (
                      <option key={w.code} value={w.code}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Cotisation fields */}
            <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Informations de la cotisation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {creatableFieldsList
                  .sort((a, b) => {
                    const orderA = fieldConfigs[a]?.ui?.order || 0;
                    const orderB = fieldConfigs[b]?.ui?.order || 0;
                    return orderA - orderB;
                  })
                  .map(fieldName => renderField(fieldName))}
              </div>
            </div>

            {/* Message and result */}
            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                message.includes('✅') || message.includes('Opération terminée')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {message.includes('✅') || message.includes('Opération terminée') ? (
                  <Check className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                {message}
              </div>
            )}

            {result && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <p className="text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {result.created} cotisation(s) créée(s)
                </p>
                {result.skipped > 0 && (
                  <p className="text-yellow-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {result.skipped} utilisateur(s) avec une cotisation déjà existante (active) ignoré(s)
                  </p>
                )}
                {result.replacedCancelled > 0 && (
                  <p className="text-blue-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {result.replacedCancelled} cotisation(s) annulée(s) remplacée(s)
                  </p>
                )}
                {result.startDateSkipped > 0 && (
                  <p className="text-orange-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {result.startDateSkipped} utilisateur(s) exclus(s) car leur date de début est postérieure à la date d'échéance
                  </p>
                )}
                <p className="text-[#94A3B8] text-sm pt-1 border-t border-[rgba(255,255,255,0.06)]">
                  Total utilisateurs concernés : {result.total}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    Créer les cotisations
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dash/allCotisations')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1F2937] hover:bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)] font-medium"
              >
                <X className="w-5 h-5" />
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}