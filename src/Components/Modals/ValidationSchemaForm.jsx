import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../Context/dataCont';
import { useApi } from '../../Hooks/useApi';
import { useModal } from '../../Context/ModalContext';
import {
  Plus,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  UserCheck,
  Clock,
  ArrowRight,
  Layers,
  FileText,
  List,
  Zap,
  Mail,
  Database,
  Briefcase,
  UserPlus,
  Shield,
  GitBranch,
  Calendar,
  Edit,
  MoreVertical,
  Info,
  History
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;
const TIMEOUT_ACTIONS = [
  'reject_step',
  'escalate',
  'notify_only',
  'wait_for_another',
  'skip_step',
  'cancel_request'
];
const STEP_ROLES = ['user', 'moderator', 'admin', 'super_admin'];
const REJECT_ACTIONS = ['reject_request', 'escalate', 'skip_step', 'notify_only', 'wait_for_another', 'cancel_request', 'go_back'];
// 🟢 [MODIFICATION] : callService commenté dans les actions post-validation
const FINAL_ACTIONS = [
  'setField',
  // 'callService',
  'sendEmail'
]; 
const PREDEFINED_SERVICES = [
  {
    name: 'PdfService',
    label: 'PdfService (Diplômes, Reçus & Situations PDF)',
    methods: [
      {
        name: 'sendDegreeByEmail',
        label: 'sendDegreeByEmail(userId, recipientEmail) — Envoyer diplôme par email',
        defaultArgs: ['$userId', '$userEmail'],
      },
      {
        name: 'generateDegree',
        label: 'generateDegree(dto, userId) — Générer diplôme & Upload Cloudinary',
        defaultArgs: [{ userId: '$userId', customTitle: 'DIPLÔME', additionalText: '', backgroundOpacity: 0.15 }, '$userId'],
      },
      {
        name: 'sendReceiptByEmail',
        label: 'sendReceiptByEmail(paymentId, recipientEmail) — Envoyer reçu par email',
        defaultArgs: ['$paymentId', '$userEmail'],
      },
      {
        name: 'generateReceipt',
        label: 'generateReceipt(dto, userId) — Générer reçu de paiement',
        defaultArgs: [{ paymentId: '$paymentId' }, '$userId'],
      },
      {
        name: 'generateMemberSituation',
        label: 'generateMemberSituation(dto, userId) — Générer situation financière membre',
        defaultArgs: [{ userId: '$userId' }, '$userId'],
      },
      {
        name: 'sendVersementReceiptByEmail',
        label: 'sendVersementReceiptByEmail(transactionId, recipientEmail) — Envoyer reçu versement',
        defaultArgs: ['$transactionId', '$userEmail'],
      },
    ],
  },
  /// sendmail
  {
    name: 'MailerService',
    label: 'MailerService (Service d\'envoi d\'emails)',
    methods: [
      {
        name: 'sendEmail',
        label: 'sendEmail(options) — Envoyer un email personnalisé (to, subject, html)',
        defaultArgs: [{ to: '$userEmail', subject: 'Notification de validation', html: '<p>Bonjour,</p><p>Votre dossier a été validé.</p>' }],
      },
      {
        name: 'sendVerificationEmail',
        label: 'sendVerificationEmail(to, token, mode) — Email de vérification',
        defaultArgs: ['$userEmail', '$token', 'signup'],
      },
    ],
  },
];

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

const STEP_TYPES = [
  { value: 'validation', label: 'Validation' },
  { value: 'verification', label: 'Verification' },
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
        className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-all"
      >
        {selectedLabels || placeholder || 'Sélectionner...'}
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-[#182233] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl shadow-black/50 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center px-3 py-2 hover:bg-[#1F2937] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
                className="mr-2 w-4 h-4 accent-emerald-500"
              />
              <span className="text-[#F8FAFC] text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// email content conversion
const htmlToPlainText = (html = '') => {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|div)>\s*/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const plainTextToHtml = (text = '') => {
  if (!text) return '';
  const blocks = text.split(/\n{2,}/);
  return blocks
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      const withBr = trimmed.replace(/\n/g, '<br />');
      return `<p>${withBr}</p>`;
    })
    .filter(Boolean)
    .join('\n');
};

function EmailContentTextarea({ value = '', onChange, ringColor, placeholder }) {
  const [text, setText] = useState(() => htmlToPlainText(value));

  useEffect(() => {
    setText(htmlToPlainText(value));
  }, [value]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    onChange(plainTextToHtml(newText));
  };

  return (
    <textarea
      value={text}
      onChange={handleChange}
      rows={5}
      className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none ${ringColor} transition-all text-sm`}
      placeholder={placeholder}
    />
  );
}

export default function ValidationSchemaForm({ initialData, schemaId, onSuccess, allowedFields = null, fieldConfigs = {} }) {
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
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

  const [approvalArgsText, setApprovalArgsText] = useState(JSON.stringify(formData.onApproval.params.args || []));
  const [rejectionArgsText, setRejectionArgsText] = useState(JSON.stringify(formData.onRejection.params.args || []));

  useEffect(() => {
    setApprovalArgsText(JSON.stringify(formData.onApproval.params.args || []));
  }, [formData.onApproval.params.args]);
  useEffect(() => {
    setRejectionArgsText(JSON.stringify(formData.onRejection.params.args || []));
  }, [formData.onRejection.params.args]);

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
          approveConditions: [],
          type: 'validation',
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
            <label className="block text-xs text-[#64748B] mb-1">Dossier</label>
            <input
              type="text"
              value={params.folder || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { folder: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              placeholder="ex: id_documents"
            />
          </>
        );
      case 'field_equals':
        return (
          <>
            <label className="block text-xs text-[#64748B] mb-1">Nom du champ</label>
            <input
              type="text"
              value={params.field || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { field: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              placeholder="ex: status"
            />
            <label className="block text-xs text-[#64748B] mt-2 mb-1">Valeur</label>
            <input
              type="text"
              value={params.value || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { value: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              placeholder="ex: active"
            />
          </>
        );
      case 'field_exists':
        return (
          <>
            <label className="block text-xs text-[#64748B] mb-1">Nom du champ</label>
            <input
              type="text"
              value={params.field || ''}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { field: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              placeholder="ex: registrationNumber"
            />
          </>
        );
      case 'payment_status':
        return (
          <>
            <label className="block text-xs text-[#64748B] mb-1">Type de cotisation</label>
            <select
              value={params.feeType || 'annual'}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { feeType: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
            >
              {FEE_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
            <label className="block text-xs text-[#64748B] mt-2 mb-1">Année</label>
            <input
              type="number"
              value={params.year || new Date().getFullYear()}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { year: parseInt(e.target.value) })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
            />
            <label className="block text-xs text-[#64748B] mt-2 mb-1">Statut attendu</label>
            <select
              value={params.status || 'paid'}
              onChange={e => updateCondition(stepIdx, condIdx, 'param', { status: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
            >
              {PAYMENT_STATUSES.map(ps => (
                <option key={ps.value} value={ps.value}>{ps.label}</option>
              ))}
            </select>
          </>
        );
      case 'debt_zero':
        return <p className="text-xs text-[#64748B]">Aucune dette restante (vérifié automatiquement)</p>;
      default:
        return null;
    }
  };

  const updateFinalAction = (type, field, value) => {
    setFormData(prev => {
      if (field === 'action') {
        let initialParams = {};
        if (value === 'setField') {
          initialParams = { field: '', value: '' };
        } else if (value === 'callService') {
          initialParams = { service: '', method: '', args: [] };
        } else if (value === 'sendEmail') {
          const isApproval = type === 'onApproval';
          initialParams = {
            to: '$userEmail',
            subject: isApproval ? 'Votre demande a été approuvée' : 'Votre demande a été rejetée',
            html: isApproval
              ? "<p>Bonjour,</p>\n<p>Nous avons le plaisir de vous informer que votre demande a été validée avec succès.</p>\n<p>Cordialement,<br />L'administration</p>"
              : "<p>Bonjour,</p>\n<p>Nous vous informons que votre demande n'a pas pu être validée.</p>\n<p>Cordialement,<br />L'administration</p>"
          };
        }
        return {
          ...prev,
          [type]: { action: value, params: initialParams }
        };
      }
      return {
        ...prev,
        [type]: { ...prev[type], [field]: value }
      };
    });
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
  //service 
  const renderCallServiceFields = (actionType) => {
    const isApproval = actionType === 'onApproval';
    const currentService = formData[actionType]?.params?.service || '';
    const currentMethod = formData[actionType]?.params?.method || '';
    const argsText = isApproval ? approvalArgsText : rejectionArgsText;
    const setArgsText = isApproval ? setApprovalArgsText : setRejectionArgsText;
    const handleBlur = isApproval ? handleApprovalArgsBlur : handleRejectionArgsBlur;
    const ringColor = isApproval ? 'focus:ring-emerald-500/50 focus:border-emerald-500' : 'focus:ring-rose-500/50 focus:border-rose-500';

    const matchedService = PREDEFINED_SERVICES.find(
      s => s.name.toLowerCase() === currentService.toLowerCase()
    );

    const handleServiceChange = (serviceName) => {
      const found = PREDEFINED_SERVICES.find(s => s.name === serviceName);
      if (found) {
        updateFinalActionParam(actionType, 'service', found.name);
        if (found.methods.length > 0) {
          const firstMethod = found.methods[0];
          updateFinalActionParam(actionType, 'method', firstMethod.name);
          const argsJson = JSON.stringify(firstMethod.defaultArgs, null, 2);
          setArgsText(argsJson);
          updateFinalActionParam(actionType, 'args', firstMethod.defaultArgs);
        }
      }
    };

    const handleMethodChange = (methodName) => {
      updateFinalActionParam(actionType, 'method', methodName);
      if (matchedService) {
        const foundMethod = matchedService.methods.find(m => m.name === methodName);
        if (foundMethod) {
          const argsJson = JSON.stringify(foundMethod.defaultArgs, null, 2);
          setArgsText(argsJson);
          updateFinalActionParam(actionType, 'args', foundMethod.defaultArgs);
        }
      }
    };

    return (
      <div className="space-y-4">
        {/* Service */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Service </label>
          <select
            value={matchedService ? matchedService.name : (currentService || '')}
            onChange={e => handleServiceChange(e.target.value)}
            className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none ${ringColor} transition-all`}
          >
            <option value="" disabled>-- Choisir un service --</option>
            {PREDEFINED_SERVICES.map(s => (
              <option key={s.name} value={s.name}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Méthode */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Méthode</label>
          <select
            value={currentMethod || ''}
            onChange={e => handleMethodChange(e.target.value)}
            className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none ${ringColor} transition-all text-sm`}
          >
            <option value="" disabled>-- Choisir une méthode --</option>
            {matchedService?.methods.map(m => (
              <option key={m.name} value={m.name}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Arguments JSON */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Arguments (JSON)</label>
            <span className="text-[11px] text-[#64748B]">Variables: $userId, $userEmail, $paymentId</span>
          </div>
          <textarea
            value={argsText}
            onChange={e => setArgsText(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none ${ringColor} transition-all font-mono text-xs`}
            placeholder='["$userId", "$userEmail"]'
          />
        </div>
      </div>
    );
  };
  // send mail

  const renderSendEmailFields = (actionType) => {
    const isApproval = actionType === 'onApproval';
    const params = formData[actionType]?.params || {};
    const ringColor = isApproval ? 'focus:ring-emerald-500/50 focus:border-emerald-500' : 'focus:ring-rose-500/50 focus:border-rose-500';

    const applyEmailTemplate = (templateType) => {
      if (templateType === 'approval') {
        updateFinalActionParam(actionType, 'subject', 'Votre demande a été approuvée');
        updateFinalActionParam(
          actionType,
          'html',
          "<p>Bonjour,</p>\n<p>Nous avons le plaisir de vous informer que votre demande a été validée avec succès.</p>\n<p>Cordialement,<br />L'administration</p>"
        );
        if (!params.to) updateFinalActionParam(actionType, 'to', '$userEmail');
      } else if (templateType === 'rejection') {
        updateFinalActionParam(actionType, 'subject', 'Votre demande a été rejetée');
        updateFinalActionParam(
          actionType,
          'html',
          "<p>Bonjour,</p>\n<p>Nous vous informons que votre demande n'a pas pu être validée.</p>\n<p>Cordialement,<br />L'administration</p>"
        );
        if (!params.to) updateFinalActionParam(actionType, 'to', '$userEmail');
      }
    };

    return (
      <div className="space-y-4">
        {/* Info destinataire automatique */}
        <div className="flex items-center gap-2.5 p-3 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-xs text-[#94A3B8]">
          <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>L'email sera automatiquement envoyé à l'adresse de la personne ayant soumis la demande (<code className="text-cyan-300 font-mono text-[11px]">$userEmail</code>).</span>
        </div>

        {/* Modèles rapides */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94A3B8]">Modèle rapide :</span>
          <button
            type="button"
            onClick={() => applyEmailTemplate(isApproval ? 'approval' : 'rejection')}
            className="px-2.5 py-1 text-xs bg-[#1F2937] hover:bg-[#374151] text-[#F8FAFC] rounded-lg transition-colors border border-[rgba(255,255,255,0.06)]"
          >
            {isApproval ? 'Appliquer modèle Approbation' : 'Appliquer modèle Rejet'}
          </button>
        </div>

        {/* Sujet */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Sujet de l'email</label>
          <input
            type="text"
            value={params.subject || ''}
            onChange={e => updateFinalActionParam(actionType, 'subject', e.target.value)}
            placeholder="ex: Votre dossier a été validé"
            className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none ${ringColor} transition-all text-sm`}
          />
        </div>

        {/* Contenu */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Contenu de l'email</label>
            {/* 🟢 [MODIFICATION] : Affichage des variables dynamiques disponibles incluant le motif de rejet */}
            <span className="text-[11px] text-[#64748B]">Variables: $userName, $userEmail, $rejectReason</span>
          </div>
          <EmailContentTextarea
            value={params.html || ''}
            onChange={newHtml => updateFinalActionParam(actionType, 'html', newHtml)}
            ringColor={ringColor}
            placeholder={`Bonjour,\n\nVotre demande a été traitée.\n\nCordialement,\nL'administration`}
          />
        </div>
      </div>
    );
  };

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
      console.log(formData, "form data")
      return res;

    }, {
      showSuccessMessage: true,
      successMessage: initialData ? 'Schéma mis à jour avec succès' : 'Schéma créé avec succès',
    });

    if (result) {
      onSuccess?.();
      navigate('/dash/validation/schemas');
    }
    setLoading(false);
  };

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
          <div key={fieldName} className="space-y-1">
            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{label}</label>
            <select
              value={value || ''}
              onChange={onChange}
              required={required}
              className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName} className="space-y-1">
            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{label}</label>
            <textarea
              value={value || ''}
              onChange={onChange}
              required={required}
              rows="3"
              className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-y"
            />
          </div>
        );
      default:
        return (
          <div key={fieldName} className="space-y-1">
            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{label}</label>
            <input
              type={type}
              value={value || ''}
              onChange={onChange}
              required={required}
              min={min}
              max={max}
              className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* --- General info --- */}
          {(isFieldAllowed('name') || isFieldAllowed('targetType') || isFieldAllowed('description')) && (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Informations générales</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Étapes du workflow</h2>
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une étape
                </button>
              </div>

              {formData.steps.length === 0 && (
                <div className="text-center py-12 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-[#94A3B8]">Aucune étape définie</p>
                  <p className="text-[#64748B] text-sm mt-1">Cliquez sur "Ajouter une étape" pour commencer</p>
                </div>
              )}

              {formData.steps.map((step, idx) => {
                const usersForRole = usersByRole[step.requiredRole] || [];
                const userOptions = usersForRole.map(u => ({
                  value: u.id,
                  label: `${u.name} ${u.lastname} (${u.email})`
                }));
                return (
                  <div key={idx} className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-5 mb-5 hover:border-[rgba(255,255,255,0.12)] transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold border border-emerald-500/20">
                          {step.order}
                        </span>
                        <h3 className="text-lg font-semibold text-[#F8FAFC]">Étape {step.order}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={step.required}
                            onChange={e => updateStep(idx, 'required', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-[#1F2937] rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                          <span className="ml-2 text-sm text-[#94A3B8]">Requis</span>
                        </label>
                        {/* Mass Validation toggle */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={step.massValidation || false}
                            onChange={e => updateStep(idx, 'massValidation', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-[#1F2937] rounded-full peer peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                          <span className="ml-2 text-sm text-[#94A3B8]">Validation en masse</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteStep(idx)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Nom de l'étape</label>
                        <input
                          type="text"
                          value={step.stepName}
                          onChange={e => updateStep(idx, 'stepName', e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Rôle requis</label>
                        <select
                          value={step.requiredRole}
                          onChange={(e) => handleRoleChange(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {STEP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Utilisateurs autorisés</label>
                        {loadingUsers && usersForRole.length === 0 ? (
                          <div className="text-sm text-[#64748B] py-2">Chargement...</div>
                        ) : (
                          <MultiSelect
                            key={`${step.requiredRole}-${idx}`}
                            options={userOptions}
                            value={step.allowedUserIds || []}
                            onChange={(selected) => updateStep(idx, 'allowedUserIds', selected)}
                            placeholder="Sélectionner des utilisateurs..."
                          />
                        )}
                        <p className="text-xs text-[#64748B] mt-1">Laissez vide pour autoriser tout le rôle.</p>
                      </div>
                      {/* Step Type */}
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Type d'étape</label>
                        <select
                          value={step.type || 'validation'}
                          onChange={e => updateStep(idx, 'type', e.target.value)}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {STEP_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-[#64748B] mt-1">Détermine le comportement de l'étape.</p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Action en cas de rejet</label>
                        <select
                          value={step.rejectAction}
                          onChange={e => updateStep(idx, 'rejectAction', e.target.value)}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {REJECT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Rôle d'escalade</label>
                        <select
                          value={step.escalateToRole || 'admin'}
                          onChange={e => updateStep(idx, 'escalateToRole', e.target.value)}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {STEP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <p className="text-xs text-[#64748B] mt-1">Utilisé si l'action de rejet est 'escalate'</p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Timeout (secondes)</label>
                        <input
                          type="number"
                          value={step.timeout.duration}
                          onChange={e => updateStep(idx, 'timeout', { duration: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                        <p className="text-xs text-[#64748B] mt-1">0 = désactivé</p>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Action du timeout</label>
                        <select
                          value={step.timeout.action}
                          onChange={e => updateStep(idx, 'timeout', { action: e.target.value })}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {TIMEOUT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-sm font-semibold text-[#F8FAFC]">Conditions d'approbation</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => addCondition(idx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-xs font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter
                        </button>
                      </div>

                      {(step.approveConditions || []).length === 0 && (
                        <p className="text-xs text-[#64748B] italic">Aucune condition définie.</p>
                      )}

                      {(step.approveConditions || []).map((cond, cidx) => (
                        <div key={cidx} className="bg-[#111827] rounded-lg p-3 mb-2 border border-[rgba(255,255,255,0.06)]">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <select
                              value={cond.type}
                              onChange={e => updateCondition(idx, cidx, 'type', e.target.value)}
                              className="bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1 text-sm text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeCondition(idx, cidx)}
                              className="text-rose-400 hover:text-rose-300 text-xs p-1 hover:bg-rose-500/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {renderConditionParams(cond, idx, cidx)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-1">
                      <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Description de l'étape</label>
                      <textarea
                        value={step.description}
                        onChange={e => updateStep(idx, 'description', e.target.value)}
                        rows="2"
                        className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* --- Global configuration --- */}
          {isFieldAllowed('globalTimeout') && (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Configuration globale</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Timeout global (heures)</label>
                  <input
                    type="number"
                    value={formData.globalTimeout.duration}
                    onChange={e => setFormData(prev => ({ ...prev, globalTimeout: { ...prev.globalTimeout, duration: parseInt(e.target.value) || 0 } }))}
                    className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-xs text-[#64748B]">0 = désactivé</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Action globale du timeout</label>
                  <select
                    value={formData.globalTimeout.action}
                    onChange={e => setFormData(prev => ({ ...prev, globalTimeout: { ...prev.globalTimeout, action: e.target.value } }))}
                    className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
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
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Configuration des notifications</h2>
              </div>
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <div>
                    <span className="text-[#F8FAFC] font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      Notifications par email
                    </span>
                    <p className="text-xs text-[#64748B] mt-0.5">Envoyer un email lorsque cette étape devient active</p>
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
                    <div className="w-11 h-6 bg-[#1F2937] rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <div>
                    <span className="text-[#F8FAFC] font-medium flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      Notifications internes
                    </span>
                    <p className="text-xs text-[#64748B] mt-0.5">Afficher dans le centre de notifications de l'application</p>
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
                    <div className="w-11 h-6 bg-[#1F2937] rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Modèle d'email (optionnel)</label>
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
                    className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Permet de personnaliser le contenu des emails pour ce schéma.</p>
                </div>
              </div>
            </div>
          )}

          {/* --- Post-validation actions --- */}
          {(isFieldAllowed('onApproval') || isFieldAllowed('onRejection')) && (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Actions post‑validation</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isFieldAllowed('onApproval') && (
                  <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-5">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      En cas d'approbation
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Action</label>
                        <select
                          value={formData.onApproval.action}
                          onChange={e => updateFinalAction('onApproval', 'action', e.target.value)}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {FINAL_ACTIONS.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                      </div>

                      {formData.onApproval.action === 'setField' && (
                        <>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Nom du champ</label>
                            <input
                              type="text"
                              value={formData.onApproval.params.field || ''}
                              onChange={e => updateFinalActionParam('onApproval', 'field', e.target.value)}
                              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Valeur</label>
                            <input
                              type="text"
                              value={formData.onApproval.params.value ?? ''}
                              onChange={e => updateFinalActionParam('onApproval', 'value', e.target.value)}
                              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                        </>
                      )}

                      {formData.onApproval.action === 'callService' && renderCallServiceFields('onApproval')}
                      {formData.onApproval.action === 'sendEmail' && renderSendEmailFields('onApproval')}
                    </div>
                  </div>
                )}

                {isFieldAllowed('onRejection') && (
                  <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-5">
                    <h3 className="text-sm font-semibold text-rose-400 mb-4 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      En cas de rejet
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Action</label>
                        <select
                          value={formData.onRejection.action}
                          onChange={e => updateFinalAction('onRejection', 'action', e.target.value)}
                          className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          {FINAL_ACTIONS.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                      </div>

                      {formData.onRejection.action === 'setField' && (
                        <>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Nom du champ</label>
                            <input
                              type="text"
                              value={formData.onRejection.params.field || ''}
                              onChange={e => updateFinalActionParam('onRejection', 'field', e.target.value)}
                              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Valeur</label>
                            <input
                              type="text"
                              value={formData.onRejection.params.value ?? ''}
                              onChange={e => updateFinalActionParam('onRejection', 'value', e.target.value)}
                              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                        </>
                      )}

                      {formData.onRejection.action === 'callService' && renderCallServiceFields('onRejection')}
                      {formData.onRejection.action === 'sendEmail' && renderSendEmailFields('onRejection')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- Submit buttons --- */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCancel(e);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1F2937] hover:bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)] text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}