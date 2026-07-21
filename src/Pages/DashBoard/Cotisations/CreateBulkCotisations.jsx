import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import wilayasData from '../../../assets/data/wilayas.json';
import { transformDates } from '../../../Utils/transformPayload';

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
        // Extract from wrapper: { success: true, data: { fields: [], configs: {} } }
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
      // Extract data from wrapper: { success: true, data: { ... } }
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

    if (config.type === 'select') {
      return (
        <div key={fieldName}>
          <label className="block text-sm font-medium text-gray-300 mb-2">{config.label}</label>
          <select
            name={fieldName}
            value={value}
            onChange={handleCotisationFieldChange}
            required={config.validation?.required}
            disabled={isDisabled}
            className={`w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{config.label}</label>
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
              className={`w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
      case 'date':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{config.label}</label>
            <input
              type="date"
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              required={config.validation?.required}
              disabled={isDisabled}
              className={`w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{config.label}</label>
            <textarea
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              rows="3"
              disabled={isDisabled}
              className={`w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
      default:
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{config.label}</label>
            <input
              type={config.type || 'text'}
              name={fieldName}
              value={value}
              onChange={handleCotisationFieldChange}
              placeholder={config.ui?.placeholder}
              required={config.validation?.required}
              disabled={isDisabled}
              className={`w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <Title title="Création en masse de cotisations" />

      <div className="max-w-2xl mx-auto bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rôle</label>
            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">Tous les rôles</option>
              <option value="user">Utilisateur</option>
              <option value="moderator">Modérateur</option>
              <option value="admin">Administrateur</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Wilaya</label>
            <select
              name="wilaya"
              value={filters.wilaya}
              onChange={handleFilterChange}
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">Toutes les wilayas</option>
              {wilayasData.map(w => (
                <option key={w.code} value={w.code}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {creatableFieldsList
            .sort((a, b) => {
              const orderA = fieldConfigs[a]?.ui?.order || 0;
              const orderB = fieldConfigs[b]?.ui?.order || 0;
              return orderA - orderB;
            })
            .map(fieldName => renderField(fieldName))}

          {message && (
            <p className={`text-sm ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}

          {result && (
            <div className="p-4 bg-green-600/20 border border-green-500 rounded-lg space-y-1">
              <p className="text-green-300">✅ {result.created} cotisation(s) créée(s)</p>
              {result.skipped > 0 && (
                <p className="text-yellow-300">⚠️ {result.skipped} utilisateur(s) avec une cotisation déjà existante (active) ignoré(s)</p>
              )}
              {result.replacedCancelled > 0 && (
                <p className="text-blue-300">🔄 {result.replacedCancelled} cotisation(s) annulée(s) remplacée(s)</p>
              )}
              {result.startDateSkipped > 0 && (
                <p className="text-orange-300">📅 {result.startDateSkipped} utilisateur(s) exclus(s) car leur date de début est postérieure à la date d'échéance</p>
              )}
              <p className="text-gray-400 text-sm">Total utilisateurs concernés : {result.total}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg font-semibold bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer les cotisations'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dash/allCotisations')}
              className="flex-1 py-3 rounded-lg font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}