import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../Context/dataCont';
import { useApi } from '../../hooks/useApi';
import { useModal } from '../../Context/ModalContext';

const API_URL = import.meta.env.VITE_NEST_API_URL;

const STEP_ROLES = ['user', 'moderator', 'admin', 'super_admin'];
const REJECT_ACTIONS = ['reject_request', 'escalate', 'skip_step', 'notify_only', 'wait_for_another', 'cancel_request', 'go_back'];
const TIMEOUT_ACTIONS = ['reject_step', 'cancel_request', 'escalate'];
const FINAL_ACTIONS = ['setField', 'callService', 'sendEmail'];

const CONDITION_TYPES = [
  { value: 'file_exists', label: 'Fichier existe', params: { folder: '' } },
  { value: 'file_missing', label: 'Fichier manquant', params: { folder: '' } },
  { value: 'field_equals', label: 'Champ égal à', params: { field: '', value: '' } },
  { value: 'field_exists', label: 'Champ existe', params: { field: '' } },
  { value: 'payment_status', label: 'Statut de paiement', params: { feeType: 'annual', year: new Date().getFullYear(), status: 'paid' } },
  { value: 'debt_zero', label: 'Dette nulle', params: {} }
];

const FEE_TYPES = [
  { value: 'annual', label: 'Annuelle' },
  { value: 'event', label: 'Événement' },
  { value: 'training', label: 'Formation' },
  { value: 'exceptional', label: 'Exceptionnelle' },
  { value: 'other', label: 'Autre' }
];

const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Payée' },
  { value: 'pending', label: 'En attente' },
  { value: 'partial', label: 'Partielle' }
];

function MultiSelect({ options, value = [], onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const selectedLabels = options
    .filter(opt => value.includes(opt.value))
    .map(opt => opt.label)
    .join(', ');

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 cursor-pointer"
      >
        {selectedLabels || placeholder || 'Sélectionner...'}
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
                className="mr-2 w-4 h-4"
              />
              <span className="text-gray-200">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ValidationSchemaForm({ initialData, schemaId, onSuccess, allowedFields = null, fieldConfigs = {} }) {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();  // <-- centralized API
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersByRole, setUsersByRole] = useState({});
  const [formData, setFormData] = useState({
    targetType: initialData?.targetType || 'User',
    name: initialData?.name || '',
    description: initialData?.description || '',
    steps: initialData?.steps || [],
    globalTimeout: initialData?.globalTimeout || { duration: 0, action: 'reject' },
    notificationConfig: initialData?.notificationConfig || { methods: { email: true, system: false } },
    onApproval: {
      action: initialData?.onApproval?.action || 'setField',
      params: initialData?.onApproval?.params || {}
    },
    onRejection: {
      action: initialData?.onRejection?.action || 'setField',
      params: initialData?.onRejection?.params || {}
    }
  });

  // Local states for JSON argument textareas
  const [approvalArgsText, setApprovalArgsText] = useState(JSON.stringify(formData.onApproval.params.args || []));
  const [rejectionArgsText, setRejectionArgsText] = useState(JSON.stringify(formData.onRejection.params.args || []));

  useEffect(() => {
    setApprovalArgsText(JSON.stringify(formData.onApproval.params.args || []));
  }, [formData.onApproval.params.args]);
  useEffect(() => {
    setRejectionArgsText(JSON.stringify(formData.onRejection.params.args || []));
  }, [formData.onRejection.params.args]);

  // --- Fetch users by role using callApi ---
  const fetchUsersByRole = async (role) => {
    if (usersByRole[role]) return usersByRole[role];
    setLoadingUsers(true);
    const result = await callApi(async () => {
      const res = await fetch(`${API_URL}/users/role/${role}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      return res;
    }, { showSuccessMessage: false });

    if (result) {
      // result is the unwrapped data – expected to be an array of users
      const users = result || [];
      setUsersByRole(prev => ({ ...prev, [role]: users }));
      setLoadingUsers(false);
      return users;
    }
    setLoadingUsers(false);
    return [];
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepName: '',
          requiredRole: 'admin',
          order: prev.steps.length + 1,
          required: true,
          allowedUserIds: [],
          timeout: { duration: 0, action: 'reject_step', escalateToRole: 'admin' },
          rejectAction: 'reject_request',
          escalateToRole: 'super_admin',
          description: '',
          approveConditions: []
        }
      ]
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      if (field === 'timeout') {
        newSteps[index] = { ...newSteps[index], timeout: { ...newSteps[index].timeout, ...value } };
      } else if (field === 'approveConditions') {
        newSteps[index] = { ...newSteps[index], approveConditions: value };
      } else {
        newSteps[index] = { ...newSteps[index], [field]: value };
      }
      return { ...prev, steps: newSteps };
    });
  };

  const deleteStep = (index) => {
    setFormData(prev => {
      const newSteps = prev.steps.filter((_, i) => i !== index);
      newSteps.forEach((step, idx) => (step.order = idx + 1));
      return { ...prev, steps: newSteps };
    });
  };

  const handleRoleChange = async (index, newRole) => {
    updateStep(index, 'requiredRole', newRole);
    updateStep(index, 'allowedUserIds', []);
    await fetchUsersByRole(newRole);
  };

  const addCondition = (stepIndex) => {
    const newCondition = { type: 'file_exists', params: { folder: '' } };
    const currentConditions = formData.steps[stepIndex].approveConditions || [];
    updateStep(stepIndex, 'approveConditions', [...currentConditions, newCondition]);
  };

  const updateCondition = (stepIndex, condIndex, field, value) => {
    const step = formData.steps[stepIndex];
    const conditions = [...(step.approveConditions || [])];
    if (field === 'type') {
      const typeDef = CONDITION_TYPES.find(t => t.value === value);
      conditions[condIndex] = { type: value, params: typeDef ? { ...typeDef.params } : {} };
    } else if (field === 'param') {
      conditions[condIndex].params = { ...conditions[condIndex].params, ...value };
    } else {
      conditions[condIndex][field] = value;
    }
    updateStep(stepIndex, 'approveConditions', conditions);
  };

  const removeCondition = (stepIndex, condIndex) => {
    const step = formData.steps[stepIndex];
    const conditions = [...(step.approveConditions || [])];
    conditions.splice(condIndex, 1);
    updateStep(stepIndex, 'approveConditions', conditions);
  };

  const renderConditionParams = (condition, stepIdx, condIdx) => {
    const { type, params } = condition;
    switch (type) {
      case 'file_exists':
      case 'file_missing':
        return (
          <>
            <label className="block text-xs text-gray-400 mb-1">Dossier</label>
            <input
              type="text"
              value={params.folder || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { folder: e.target.value })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
              placeholder="ex: id_documents"
            />
          </>
        );
      case 'field_equals':
        return (
          <>
            <label className="block text-xs text-gray-400 mb-1">Nom du champ</label>
            <input
              type="text"
              value={params.field || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { field: e.target.value })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
              placeholder="ex: status"
            />
            <label className="block text-xs text-gray-400 mt-2 mb-1">Valeur</label>
            <input
              type="text"
              value={params.value || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { value: e.target.value })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
              placeholder="ex: active"
            />
          </>
        );
      case 'field_exists':
        return (
          <>
            <label className="block text-xs text-gray-400 mb-1">Nom du champ</label>
            <input
              type="text"
              value={params.field || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { field: e.target.value })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
              placeholder="ex: registrationNumber"
            />
          </>
        );
      case 'payment_status':
        return (
          <>
            <label className="block text-xs text-gray-400 mb-1">Type de cotisation</label>
            <select
              value={params.feeType || 'annual'}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { feeType: e.target.value })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
            >
              {FEE_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
            <label className="block text-xs text-gray-400 mt-2 mb-1">Année</label>
            <input
              type="number"
              value={params.year || new Date().getFullYear()}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { year: parseInt(e.target.value) })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
            />
            <label className="block text-xs text-gray-400 mt-2 mb-1">Statut attendu</label>
            <select
              value={params.status || 'paid'}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { status: e.target.value })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
            >
              {PAYMENT_STATUSES.map(ps => (
                <option key={ps.value} value={ps.value}>{ps.label}</option>
              ))}
            </select>
          </>
        );
      case 'debt_zero':
        return <p className="text-xs text-gray-400">Aucune dette restante (vérifié automatiquement)</p>;
      default:
        return null;
    }
  };

  const updateFinalAction = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const updateFinalActionParam = (type, paramKey, paramValue) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], params: { ...prev[type].params, [paramKey]: paramValue } }
    }));
  };

  const handleApprovalArgsBlur = () => {
    try {
      const parsed = JSON.parse(approvalArgsText);
      if (Array.isArray(parsed)) updateFinalActionParam('onApproval', 'args', parsed);
    } catch (e) { console.warn('Invalid JSON, keeping previous args'); }
  };

  const handleRejectionArgsBlur = () => {
    try {
      const parsed = JSON.parse(rejectionArgsText);
      if (Array.isArray(parsed)) updateFinalActionParam('onRejection', 'args', parsed);
    } catch (e) { console.warn('Invalid JSON, keeping previous args'); }
  };

  // --- Submit with callApi ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const method = initialData ? 'PUT' : 'POST';
    const url = initialData ? `${API_URL}/validation/schemas/${schemaId}` : `${API_URL}/validation/schemas`;

    const result = await callApi(async () => {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.token}` },
        body: JSON.stringify(formData),
      });
      return res;
    }, {
      showSuccessMessage: true,
      successMessage: initialData ? 'Schéma mis à jour avec succès' : 'Schéma créé avec succès',
    });

    if (result) {
      // Success – call onSuccess and navigate
      onSuccess?.();
      navigate('/dash/validation/schemas');
    }
    setLoading(false);
  };

  // Centralised cancel handler
  const handleCancel = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Annuler',
      message: 'Êtes-vous sûr de vouloir annuler ? Les modifications seront perdues.',
    });

    if (confirmed) {
      navigate('/dash/validation/schemas');
    }
  };

  useEffect(() => {
    const preFetch = async () => {
      const roles = new Set(formData.steps.map(s => s.requiredRole));
      for (const role of roles) {
        if (role && !usersByRole[role]) await fetchUsersByRole(role);
      }
    };
    if (authData?.token && formData.steps.length) preFetch();
  }, [formData.steps, authData?.token]);

  // Helper to check if a field should be rendered
  const isFieldAllowed = (fieldName) => {
    return allowedFields === null || allowedFields.includes(fieldName);
  };

  const getFieldLabel = (fieldName, defaultLabel) => {
    return fieldConfigs[fieldName]?.label || defaultLabel;
  };

  const renderSimpleField = (fieldName, type, value, onChange, config = {}) => {
    const label = getFieldLabel(fieldName, fieldName);
    const required = config.validation?.required || false;
    const min = config.validation?.min;
    const max = config.validation?.max;
    const options = config.validation?.options || [];

    switch (type) {
      case 'select':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <select
              value={value || ''}
              onChange={onChange}
              required={required}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <textarea
              value={value || ''}
              onChange={onChange}
              required={required}
              rows="3"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
            />
          </div>
        );
      default:
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <input
              type={type}
              value={value || ''}
              onChange={onChange}
              required={required}
              min={min}
              max={max}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-5xl mx-auto bg-gray-800/80 backdrop-blur-xl border border-yellow-400/20 rounded-xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-yellow-300 mb-6">
          {initialData ? 'Modifier le schéma' : 'Nouveau schéma de validation'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* --- General info fields --- */}
          {(isFieldAllowed('name') || isFieldAllowed('targetType') || isFieldAllowed('description')) && (
            <div className="bg-gray-900/40 border border-yellow-400/10 rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-semibold text-yellow-300">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isFieldAllowed('name') && renderSimpleField(
                  'name', 'text', formData.name,
                  (e) => setFormData(prev => ({ ...prev, name: e.target.value })),
                  fieldConfigs.name
                )}
                {isFieldAllowed('targetType') && renderSimpleField(
                  'targetType', 'select', formData.targetType,
                  (e) => setFormData(prev => ({ ...prev, targetType: e.target.value })),
                  fieldConfigs.targetType
                )}
              </div>
              {isFieldAllowed('description') && renderSimpleField(
                'description', 'textarea', formData.description,
                (e) => setFormData(prev => ({ ...prev, description: e.target.value })),
                fieldConfigs.description
              )}
            </div>
          )}

          {/* --- Steps --- */}
          {isFieldAllowed('steps') && (
            <div className="bg-gray-900/40 border border-yellow-400/10 rounded-lg p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-yellow-300">Étapes du workflow</h3>
                <button type="button" onClick={addStep} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  + Ajouter une étape
                </button>
              </div>
              {formData.steps.length === 0 && (
                <p className="text-gray-400 italic text-center py-4">Aucune étape. Cliquez sur "Ajouter une étape" pour commencer.</p>
              )}
              {formData.steps.map((step, idx) => {
                const usersForRole = usersByRole[step.requiredRole] || [];
                const userOptions = usersForRole.map(u => ({
                  value: u.id,
                  label: `${u.name} ${u.lastname} (${u.email})`
                }));
                return (
                  <div key={idx} className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-5 shadow-md">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-semibold text-yellow-200">Étape {step.order}</h4>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={step.required}
                            onChange={e => updateStep(idx, 'required', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                          <span className="ml-2 text-sm text-gray-300">Requis</span>
                        </label>
                        <button type="button" onClick={() => deleteStep(idx)} className="text-red-400 text-sm hover:text-red-300">Supprimer</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Nom de l'étape</label>
                        <input
                          type="text"
                          value={step.stepName}
                          onChange={e => updateStep(idx, 'stepName', e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Rôle requis</label>
                        <select
                          value={step.requiredRole}
                          onChange={(e) => handleRoleChange(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          {STEP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Utilisateurs autorisés</label>
                        {loadingUsers && usersForRole.length === 0 ? (
                          <div className="text-sm text-gray-400">Chargement...</div>
                        ) : (
                          <MultiSelect
                            key={`${step.requiredRole}-${idx}`}
                            options={userOptions}
                            value={step.allowedUserIds || []}
                            onChange={(selected) => updateStep(idx, 'allowedUserIds', selected)}
                            placeholder="Sélectionner des utilisateurs..."
                          />
                        )}
                        <p className="text-xs text-gray-400 mt-1">Laissez vide pour autoriser tout le rôle.</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Action en cas de rejet</label>
                        <select
                          value={step.rejectAction}
                          onChange={e => updateStep(idx, 'rejectAction', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          {REJECT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Rôle d'escalade (si action='escalate')</label>
                        <select
                          value={step.escalateToRole || 'admin'}
                          onChange={e => updateStep(idx, 'escalateToRole', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          {STEP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Timeout (secondes, 0 = désactivé)</label>
                        <input
                          type="number"
                          value={step.timeout.duration}
                          onChange={e => updateStep(idx, 'timeout', { duration: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Action du timeout</label>
                        <select
                          value={step.timeout.action}
                          onChange={e => updateStep(idx, 'timeout', { action: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          {TIMEOUT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t text-gray-300 border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="text-sm font-semibold text-yellow-300">Conditions d'approbation</h5>
                        <button
                          type="button"
                          onClick={() => addCondition(idx)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                        >
                          + Ajouter une condition
                        </button>
                      </div>
                      {(step.approveConditions || []).length === 0 && (
                        <p className="text-gray-400 text-xs italic">Aucune condition.</p>
                      )}
                      {(step.approveConditions || []).map((cond, cidx) => (
                        <div key={cidx} className="bg-gray-900/60 rounded p-3 mb-2">
                          <div className="flex justify-between items-start mb-2">
                            <select
                              value={cond.type}
                              onChange={e => updateCondition(idx, cidx, 'type', e.target.value)}
                              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                            >
                              {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <button onClick={() => removeCondition(idx, cidx)} className="text-red-400 text-xs">Supprimer</button>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {renderConditionParams(cond, idx, cidx)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm text-gray-300 mb-1">Description de l'étape</label>
                      <textarea
                        value={step.description}
                        onChange={e => updateStep(idx, 'description', e.target.value)}
                        rows="2"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* --- Global timeout --- */}
          {isFieldAllowed('globalTimeout') && (
            <div className="bg-gray-900/40 border border-yellow-400/10 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-yellow-300 mb-4">Configuration globale</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Timeout global (heures)</label>
                  <input
                    type="number"
                    value={formData.globalTimeout.duration}
                    onChange={e => setFormData(prev => ({ ...prev, globalTimeout: { ...prev.globalTimeout, duration: parseInt(e.target.value) || 0 } }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Action globale du timeout</label>
                  <select
                    value={formData.globalTimeout.action}
                    onChange={e => setFormData(prev => ({ ...prev, globalTimeout: { ...prev.globalTimeout, action: e.target.value } }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                  >
                    <option value="reject">Rejeter la demande</option>
                    <option value="cancel">Annuler la demande</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* --- Notification configuration --- */}
          {isFieldAllowed('notificationConfig') && (
            <div className="bg-gray-900/40 border border-yellow-400/10 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-yellow-300 mb-4">Configuration des notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-200 font-medium">Notifications par email</span>
                    <p className="text-xs text-gray-400">Envoyer un email lorsque cette étape devient active</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.notificationConfig?.methods?.email === true}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notificationConfig: {
                          ...prev.notificationConfig,
                          methods: {
                            ...prev.notificationConfig?.methods,
                            email: e.target.checked
                          }
                        }
                      }))}
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-200 font-medium">Notifications internes (cloche)</span>
                    <p className="text-xs text-gray-400">Afficher dans le centre de notifications de l'application</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.notificationConfig?.methods?.system === true}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notificationConfig: {
                          ...prev.notificationConfig,
                          methods: {
                            ...prev.notificationConfig?.methods,
                            system: e.target.checked
                          }
                        }
                      }))}
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Modèle d'email (optionnel)</label>
                  <input
                    type="text"
                    value={formData.notificationConfig?.emailTemplate || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notificationConfig: {
                        ...prev.notificationConfig,
                        emailTemplate: e.target.value
                      }
                    }))}
                    placeholder="Laissez vide pour utiliser le modèle par défaut"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                  />
                  <p className="text-xs text-gray-400 mt-1">Permet de personnaliser le contenu des emails pour ce schéma.</p>
                </div>
              </div>
            </div>
          )}

          {/* --- Post‑validation actions --- */}
          {(isFieldAllowed('onApproval') || isFieldAllowed('onRejection')) && (
            <div className="bg-gray-900/40 border border-yellow-400/10 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-yellow-300 mb-4">Actions post‑validation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isFieldAllowed('onApproval') && (
                  <div>
                    <h4 className="text-md font-medium text-yellow-300 mb-3">En cas d'approbation</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Action</label>
                        <select
                          value={formData.onApproval.action}
                          onChange={e => updateFinalAction('onApproval', 'action', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          {FINAL_ACTIONS.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                      </div>
                      {formData.onApproval.action === 'setField' && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Nom du champ</label>
                            <input
                              type="text"
                              value={formData.onApproval.params.field || ''}
                              onChange={e => updateFinalActionParam('onApproval', 'field', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Valeur</label>
                            <input
                              type="text"
                              value={formData.onApproval.params.value ?? ''}
                              onChange={e => updateFinalActionParam('onApproval', 'value', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                            />
                          </div>
                        </>
                      )}
                      {formData.onApproval.action === 'callService' && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Service</label>
                            <input
                              type="text"
                              value={formData.onApproval.params.service || ''}
                              onChange={e => updateFinalActionParam('onApproval', 'service', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Méthode</label>
                            <input
                              type="text"
                              value={formData.onApproval.params.method || ''}
                              onChange={e => updateFinalActionParam('onApproval', 'method', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Arguments (JSON)</label>
                            <textarea
                              value={approvalArgsText}
                              onChange={(e) => setApprovalArgsText(e.target.value)}
                              onBlur={handleApprovalArgsBlur}
                              rows="2"
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                              placeholder='["arg1", 123]'
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isFieldAllowed('onRejection') && (
                  <div>
                    <h4 className="text-md font-medium text-yellow-300 mb-3">En cas de rejet</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Action</label>
                        <select
                          value={formData.onRejection.action}
                          onChange={e => updateFinalAction('onRejection', 'action', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          {FINAL_ACTIONS.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                      </div>
                      {formData.onRejection.action === 'setField' && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Nom du champ</label>
                            <input
                              type="text"
                              value={formData.onRejection.params.field || ''}
                              onChange={e => updateFinalActionParam('onRejection', 'field', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Valeur</label>
                            <input
                              type="text"
                              value={formData.onRejection.params.value ?? ''}
                              onChange={e => updateFinalActionParam('onRejection', 'value', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                            />
                          </div>
                        </>
                      )}
                      {formData.onRejection.action === 'callService' && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Service</label>
                            <input
                              type="text"
                              value={formData.onRejection.params.service || ''}
                              onChange={e => updateFinalActionParam('onRejection', 'service', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Méthode</label>
                            <input
                              type="text"
                              value={formData.onRejection.params.method || ''}
                              onChange={e => updateFinalActionParam('onRejection', 'method', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Arguments (JSON)</label>
                            <textarea
                              value={rejectionArgsText}
                              onChange={(e) => setRejectionArgsText(e.target.value)}
                              onBlur={handleRejectionArgsBlur}
                              rows="2"
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                              placeholder='["arg1", 123]'
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- Submit buttons --- */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCancel(e);
              }}
              className="px-5 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-500 text-white disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}