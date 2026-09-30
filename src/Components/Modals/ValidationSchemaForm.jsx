// src/Components/Modals/ValidationSchemaForm.jsx
import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../Context/dataCont';
import { useModal } from '../../Context/ModalContext';
import { fetchWithRefresh } from '../../Components/api';
import {
  Plus, Trash2, Save, X,
  Settings, Bell, CheckCircle, XCircle,
  Layers, FileText, List, Zap, Mail, Database,
  Loader2, ArrowRight, Info,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

const TIMEOUT_ACTIONS = [
  'reject_step', 'escalate', 'notify_only',
  'wait_for_another', 'skip_step', 'cancel_request',
];
const REJECT_ACTIONS = [
  'reject_request', 'escalate', 'skip_step',
  'notify_only', 'wait_for_another', 'cancel_request', 'go_back',
];
const STEP_TYPES = [
  { value: 'validation', label: 'Validation' },
  { value: 'verification', label: 'Verification' },
];
const TARGET_TYPES = [
  { value: 'User', label: 'User (membre)' },
  { value: 'File', label: 'File (fichier)' },
  { value: 'Cotisation', label: 'Cotisation (frais)' },
];
const GRADES = ['user', 'admin', 'super_admin'];
const CONDITION_TYPES = [
  { value: 'file_exists', label: 'Fichier existe', params: { folder: '' } },
  { value: 'file_missing', label: 'Fichier manquant', params: { folder: '' } },
  { value: 'field_equals', label: 'Champ égal à', params: { field: '', value: '' } },
  { value: 'field_exists', label: 'Champ existe', params: { field: '' } },
  { value: 'payment_status', label: 'Statut de paiement', params: { feeType: 'annual', year: new Date().getFullYear(), status: 'paid' } },
  { value: 'debt_zero', label: 'Dette nulle', params: {} },
];
const FEE_TYPES = [
  { value: 'annual', label: 'Annuelle' },
  { value: 'event', label: 'Événement' },
  { value: 'training', label: 'Formation' },
  { value: 'exceptional', label: 'Exceptionnelle' },
  { value: 'other', label: 'Autre' },
];
const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Payée' },
  { value: 'pending', label: 'En attente' },
  { value: 'partial', label: 'Partielle' },
];
const PAYLOAD_FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'boolean', label: 'Booléen' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'json', label: 'JSON' },
  { value: 'image', label: 'Image' },
  { value: 'file', label: 'Fichier' },
];
const UI_GROUPS = [
  'identity', 'address', 'contact', 'activity', 'professional',
  'financial', 'education', 'family', 'registration',
  'verification', 'status', 'agreements', 'system', 'custom',
];
// ── NEW: widget + payload application options ───────────────────────
const UI_WIDGETS = [
  { value: '', label: 'Auto' },
  { value: 'file', label: 'Fichier' },
  { value: 'image', label: 'Image' },
];
const PAYLOAD_STRATEGIES = [
  { value: 'never', label: 'Jamais — informatif seulement' },
  { value: 'immediate', label: 'Immédiat — à la création de la demande' },
  { value: 'on_step', label: 'À une étape spécifique' },
  { value: 'on_approval', label: "À l'approbation finale" },
  { value: 'on_rejection', label: 'Au rejet final' },
];
const PAYLOAD_TARGET_ENTITIES = [
  { value: 'User', label: 'User' },
  { value: 'File', label: 'File' },
  { value: 'Cotisation', label: 'Cotisation' },
];
const PAYLOAD_COERCIONS = [
  { value: '', label: 'Auto (déduit du modèle)' },
  { value: 'int', label: 'int' },
  { value: 'float', label: 'float' },
  { value: 'bool', label: 'bool' },
  { value: 'date', label: 'date' },
  { value: 'string', label: 'string' },
];

const inputCls =
  'w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm';

const labelCls =
  'block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1';

// ─── Helpers ────────────────────────────────────────────────────────
const unwrap = (body) =>
  body && typeof body === 'object' && 'data' in body && 'success' in body
    ? body.data
    : body;

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
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      return `<p>${t.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
};

function EmailContentTextarea({ value = '', onChange, ringColor, placeholder }) {
  const [text, setText] = useState(() => htmlToPlainText(value));

  useEffect(() => {
    setText(htmlToPlainText(value));
  }, [value]);

  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(plainTextToHtml(e.target.value));
      }}
      rows={5}
      className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none ${ringColor} transition-all text-sm`}
      placeholder={placeholder}
    />
  );
}

function MultiSelect({ options, value = [], onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label)
    .join(', ');

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen((o) => !o)}
        className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-all text-sm"
      >
        {selectedLabels || placeholder || 'Sélectionner...'}
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-[#182233] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl shadow-black/50 max-h-60 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-[#64748B]">Aucun utilisateur</div>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center px-3 py-2 hover:bg-[#1F2937] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
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

// ─── Payload field editor ───────────────────────────────────────────
function PayloadFieldEditor({ field, onChange, onDelete, stepOptions = [] }) {
  const v = field.validation || {};
  const ui = field.ui || {};
  const app = field.application || {};
  const hasApplication = field.application !== undefined;

  const set = (patch) => onChange({ ...field, ...patch });
  const setV = (patch) => set({ validation: { ...v, ...patch } });
  const setUi = (patch) => set({ ui: { ...ui, ...patch } });
  const setApp = (patch) =>
    set({ application: { ...(field.application || { strategy: 'never' }), ...patch } });
  const clearApp = () => {
    const { application, ...rest } = field;
    onChange(rest);
  };

  const handleTypeChange = (newType) => {
    const isFileLike = newType === 'file' || newType === 'image';
    const nextUi = { ...ui };
    if (isFileLike && !nextUi.widget) {
      nextUi.widget = newType === 'image' ? 'image' : 'file';
    }
    const nextField = { ...field, type: newType, ui: nextUi };
    // File-like fields can't be written to entities — default to never
    if (isFileLike && !field.application) {
      nextField.application = { strategy: 'never' };
    }
    onChange(nextField);
  };

  const strategy = app.strategy || 'never';
  const needsTarget = hasApplication && strategy !== 'never';

  return (
    <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-emerald-400">
          {field.name || 'nouveau_champ'}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Nom technique</label>
          <input
            className={inputCls}
            value={field.name || ''}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="documentType"
          />
        </div>
        <div>
          <label className={labelCls}>Libellé FR</label>
          <input
            className={inputCls}
            value={field.label || ''}
            onChange={(e) => set({ label: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Libellé AR</label>
          <input
            className={inputCls}
            value={field.labelAr || ''}
            onChange={(e) => set({ labelAr: e.target.value })}
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select
            className={inputCls}
            value={field.type || 'text'}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {PAYLOAD_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Widget</label>
          <select
            className={inputCls}
            value={ui.widget || ''}
            onChange={(e) => setUi({ widget: e.target.value || undefined })}
          >
            {UI_WIDGETS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Groupe UI</label>
          <select
            className={inputCls}
            value={ui.group || 'custom'}
            onChange={(e) => setUi({ group: e.target.value })}
          >
            {UI_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Largeur</label>
          <select
            className={inputCls}
            value={ui.colSpan ?? 12}
            onChange={(e) => setUi({ colSpan: parseInt(e.target.value, 10) })}
          >
            <option value={12}>12</option>
            <option value={6}>6</option>
            <option value={4}>4</option>
            <option value={3}>3</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 text-sm text-[#CBD5E1]">
          <input
            type="checkbox"
            checked={v.required === true}
            onChange={(e) => setV({ required: e.target.checked })}
            className="accent-emerald-500"
          />
          Requis
        </label>
        <div>
          <label className={labelCls}>Longueur min</label>
          <input
            type="number"
            className={inputCls}
            value={v.minLength ?? ''}
            onChange={(e) =>
              setV({ minLength: e.target.value ? parseInt(e.target.value, 10) : undefined })
            }
          />
        </div>
        <div>
          <label className={labelCls}>Longueur max</label>
          <input
            type="number"
            className={inputCls}
            value={v.maxLength ?? ''}
            onChange={(e) =>
              setV({ maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Valeurs autorisées (séparées par virgule)</label>
          <input
            className={inputCls}
            value={(v.enum || []).join(', ')}
            onChange={(e) =>
              setV({
                enum: e.target.value
                  ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  : undefined,
              })
            }
            placeholder="cni, passeport, autre"
          />
        </div>
        <div>
          <label className={labelCls}>Pattern (regex)</label>
          <input
            className={inputCls}
            value={v.pattern || ''}
            onChange={(e) => setV({ pattern: e.target.value || undefined })}
            placeholder="^[a-z]+$"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Placeholder</label>
        <input
          className={inputCls}
          value={ui.placeholder || ''}
          onChange={(e) => setUi({ placeholder: e.target.value })}
        />
      </div>

      {/* ── Application sur entité cible ─────────────────────────── */}
      <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              Application sur entité cible
            </label>
          </div>
          {hasApplication ? (
            <button
              type="button"
              onClick={clearApp}
              className="text-[11px] text-rose-400 hover:text-rose-300 underline"
            >
              Désactiver
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setApp({ strategy: 'never' })}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline"
            >
              Activer
            </button>
          )}
        </div>

        {!hasApplication ? (
          <p className="text-xs text-[#64748B] italic">
            Aucune application : la valeur reste dans le payload et n'est écrite nulle part.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Stratégie</label>
                <select
                  className={inputCls}
                  value={strategy}
                  onChange={(e) => setApp({ strategy: e.target.value })}
                >
                  {PAYLOAD_STRATEGIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {strategy === 'on_step' && (
                <div>
                  <label className={labelCls}>Numéro d'étape</label>
                  <select
                    className={inputCls}
                    value={app.stepOrder ?? 1}
                    onChange={(e) =>
                      setApp({ stepOrder: parseInt(e.target.value, 10) || 1 })
                    }
                  >
                    {stepOptions.length === 0 && (
                      <option value={1}>1</option>
                    )}
                    {stepOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {needsTarget && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Entité cible</label>
                  <select
                    className={inputCls}
                    value={app.target?.entity || 'User'}
                    onChange={(e) =>
                      setApp({
                        target: {
                          entity: e.target.value,
                          field: app.target?.field || '',
                        },
                      })
                    }
                  >
                    {PAYLOAD_TARGET_ENTITIES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Champ cible</label>
                  <input
                    className={inputCls}
                    value={app.target?.field || ''}
                    onChange={(e) =>
                      setApp({
                        target: {
                          entity: app.target?.entity || 'User',
                          field: e.target.value,
                        },
                      })
                    }
                    placeholder="nin"
                  />
                </div>
                <div>
                  <label className={labelCls}>Coercition</label>
                  <select
                    className={inputCls}
                    value={app.coerce || ''}
                    onChange={(e) => setApp({ coerce: e.target.value || undefined })}
                  >
                    {PAYLOAD_COERCIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {strategy === 'never' && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200 leading-relaxed">
                  La valeur sera stockée dans le payload de la demande mais jamais écrite
                  sur une entité. Utilisez ce mode pour les champs purement documentaires
                  (par exemple les fichiers joints).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Post-validation action editor ──────────────────────────────────
function ActionEditor({ action, onChange, onDelete, serviceCatalog }) {
  const serviceName = action.serviceName || action.action || '';
  const selected = serviceCatalog.find((s) => s.name === serviceName);

  const set = (patch) => onChange({ ...action, ...patch });

  return (
    <div className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-emerald-400">
          {serviceName || 'service'}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Service</label>
          <select
            className={inputCls}
            value={serviceName}
            onChange={(e) => set({ serviceName: e.target.value, params: {} })}
          >
            <option value="">— choisir un service —</option>
            {serviceCatalog.map((s) => (
              <option key={s.name} value={s.name}>
                {s.label} ({s.name})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Ordre</label>
          <input
            type="number"
            className={inputCls}
            value={action.order ?? 0}
            onChange={(e) => set({ order: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>

      {selected?.description && (
        <p className="text-xs text-[#64748B] italic">{selected.description}</p>
      )}

      <div>
        <label className={labelCls}>Paramètres (JSON)</label>
        <textarea
          className={inputCls + ' font-mono text-xs'}
          rows={4}
          value={JSON.stringify(action.params || {}, null, 2)}
          onChange={(e) => {
            try {
              set({ params: e.target.value ? JSON.parse(e.target.value) : {} });
            } catch {
              /* keep last valid while typing */
            }
          }}
          placeholder='{ "field": "isVerified", "value": true }'
        />
      </div>
    </div>
  );
}

// ─── Step hooks editor (reused inside each step) ────────────────────
function StepHooksEditor({
  title,
  hooks,
  onChange,
  serviceCatalog,
  accent = 'emerald',
}) {
  const accentMap = {
    emerald: {
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      hover: 'hover:bg-emerald-500/20',
    },
    rose: {
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/10',
      hover: 'hover:bg-rose-500/20',
    },
  };
  const accentClasses = accentMap[accent] || accentMap.emerald;
  const list = Array.isArray(hooks) ? hooks : [];

  const add = () =>
    onChange([...list, { serviceName: '', params: {}, order: list.length }]);

  const update = (i, next) => {
    const copy = [...list];
    copy[i] = next;
    onChange(copy);
  };

  const remove = (i) => onChange(list.filter((_, j) => j !== i));

  return (
    <div className="bg-[#111827] rounded-lg border border-[rgba(255,255,255,0.06)] p-3">
      <div className="flex items-center justify-between mb-3">
        <h5 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${accentClasses.text}`}>
          <Zap className="w-3.5 h-3.5" />
          {title} ({list.length})
        </h5>
        <button
          type="button"
          onClick={add}
          className={`inline-flex items-center gap-1 px-2 py-1 ${accentClasses.bg} ${accentClasses.text} border ${accentClasses.border} rounded-md ${accentClasses.hover} text-[11px] font-medium`}
        >
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>

      {list.length === 0 && (
        <p className="text-[11px] text-[#64748B] italic">Aucune action.</p>
      )}

      <div className="space-y-3">
        {list.map((hook, i) => (
          <ActionEditor
            key={i}
            action={hook}
            serviceCatalog={serviceCatalog}
            onChange={(next) => update(i, next)}
            onDelete={() => remove(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main form ──────────────────────────────────────────────────────
export default function ValidationSchemaForm({
  initialData = null,
  schemaId = null,
  onSuccess,
  allowedFields = null,
  fieldConfigs = {},
}) {
  const { authData, setAuthData } = useContext(UserContext);
  const { confirm, alert } = useModal();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersByRole, setUsersByRole] = useState({});
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const isEdit = Boolean(initialData || schemaId);

  const normalizeActions = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return [raw];
  };

  const [formData, setFormData] = useState({
    targetType: initialData?.targetType || 'User',
    name: initialData?.name || '',
    description: initialData?.description || '',
    payloadSchema: Array.isArray(initialData?.payloadSchema)
      ? initialData.payloadSchema
      : [],
    steps: initialData?.steps || [],
    globalTimeout: initialData?.globalTimeout || { duration: 0, action: 'reject' },
    notificationConfig:
      initialData?.notificationConfig || { methods: { email: true, system: false } },
    onApproval: normalizeActions(initialData?.onApproval),
    onRejection: normalizeActions(initialData?.onRejection),
  });

  // ── Fetch roles ─────────────────────────────────────────────────
  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/roles`,
          { method: 'GET' },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        const data = unwrap(body);
        const roles = Array.isArray(data) ? data : data?.roles || [];
        setRolesList(roles);
      } catch (err) {
        console.warn('Failed to load roles, falling back to grades only', err);
        setRolesList([]);
      } finally {
        setLoadingRoles(false);
      }
    };
    if (authData?.token) loadRoles();
  }, [authData?.token, setAuthData]);

  // ── Fetch post-validation services ─────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/post-validation-services`,
          { method: 'GET' },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        const data = unwrap(body);
        if (data?.services) setServiceCatalog(data.services);
      } catch (err) {
        console.warn('Failed to load post-validation services', err);
      }
    };
    if (authData?.token) load();
  }, [authData?.token, setAuthData]);

  const fetchUsersByRole = async (role) => {
    if (!role) return [];
    if (usersByRole[role]) return usersByRole[role];

    setLoadingUsers(true);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/admins/for-approver/${encodeURIComponent(role)}`,
        { method: 'GET' },
        authData.token,
        setAuthData,
      );
      const body = await res.json();
      const payload = unwrap(body);
      const admins = Array.isArray(payload) ? payload : payload?.admins || [];
      setUsersByRole((prev) => ({ ...prev, [role]: admins }));
      return admins;
    } catch (err) {
      console.error('Failed to fetch admins for approver role:', err);
      setUsersByRole((prev) => ({ ...prev, [role]: [] }));
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  // ── Role dropdown (grades + dynamic roles) ──────────────────────
  const renderRoleSelect = (value, onChange, ringCls = '') => {
    const rolesByGrade = { user: [], admin: [], super_admin: [] };
    for (const r of rolesList) {
      const g = r.grade || 'user';
      if (!rolesByGrade[g]) rolesByGrade[g] = [];
      rolesByGrade[g].push(r);
    }

    return (
      <select
        value={value || ''}
        onChange={onChange}
        disabled={loadingRoles && rolesList.length === 0}
        className={`w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50 ${ringCls}`}
      >
        <option value="">— choisir —</option>

        <optgroup label="Grades (ciblage par niveau)">
          <option value="user">user — tous les membres</option>
          <option value="admin">admin — tous les admins</option>
          <option value="super_admin">super_admin — tous les super admins</option>
        </optgroup>

        {GRADES.map((grade) => {
          const roles = rolesByGrade[grade] || [];
          if (roles.length === 0) return null;
          return (
            <optgroup key={grade} label={`Rôles — grade ${grade}`}>
              {roles.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.label || r.name} ({r.name})
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    );
  };

  // ── Payload schema actions ─────────────────────────────────────
  const addPayloadField = () =>
    setFormData((prev) => ({
      ...prev,
      payloadSchema: [
        ...prev.payloadSchema,
        {
          name: '',
          label: '',
          labelAr: '',
          type: 'text',
          ui: { group: 'custom', colSpan: 12, placeholder: '' },
          validation: { required: false },
        },
      ],
    }));

  const updatePayloadField = (i, field) =>
    setFormData((prev) => {
      const copy = [...prev.payloadSchema];
      copy[i] = field;
      return { ...prev, payloadSchema: copy };
    });

  const removePayloadField = (i) =>
    setFormData((prev) => ({
      ...prev,
      payloadSchema: prev.payloadSchema.filter((_, j) => j !== i),
    }));

  // ── Step actions ────────────────────────────────────────────────
  const addStep = () =>
    setFormData((prev) => ({
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
          massValidation: false,
          onApprove: [],
          onReject: [],
        },
      ],
    }));

  const updateStep = (index, field, value) =>
    setFormData((prev) => {
      const steps = [...prev.steps];
      if (field === 'timeout') {
        steps[index] = { ...steps[index], timeout: { ...steps[index].timeout, ...value } };
      } else if (field === 'approveConditions') {
        steps[index] = { ...steps[index], approveConditions: value };
      } else {
        steps[index] = { ...steps[index], [field]: value };
      }
      return { ...prev, steps };
    });

  const deleteStep = (index) =>
    setFormData((prev) => {
      const steps = prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 }));
      return { ...prev, steps };
    });

  const handleRoleChange = async (index, newRole) => {
    const isGrade = GRADES.includes(newRole);
    setFormData((prev) => {
      const steps = [...prev.steps];
      steps[index] = {
        ...steps[index],
        requiredRole: isGrade ? undefined : newRole,
        requiredGrade: isGrade ? newRole : undefined,
        allowedUserIds: [],
      };
      return { ...prev, steps };
    });
    await fetchUsersByRole(newRole);
  };

  // ── Conditions ──────────────────────────────────────────────────
  const addCondition = (stepIndex) => {
    const step = formData.steps[stepIndex];
    const conds = [...(step.approveConditions || []), { type: 'file_exists', params: { folder: '' } }];
    updateStep(stepIndex, 'approveConditions', conds);
  };

  const updateCondition = (stepIndex, condIndex, field, value) => {
    const step = formData.steps[stepIndex];
    const conds = [...(step.approveConditions || [])];
    if (field === 'type') {
      const def = CONDITION_TYPES.find((t) => t.value === value);
      conds[condIndex] = { type: value, params: def ? { ...def.params } : {} };
    } else if (field === 'param') {
      conds[condIndex] = { ...conds[condIndex], params: { ...conds[condIndex].params, ...value } };
    } else {
      conds[condIndex] = { ...conds[condIndex], [field]: value };
    }
    updateStep(stepIndex, 'approveConditions', conds);
  };

  const removeCondition = (stepIndex, condIndex) => {
    const step = formData.steps[stepIndex];
    const conds = [...(step.approveConditions || [])];
    conds.splice(condIndex, 1);
    updateStep(stepIndex, 'approveConditions', conds);
  };

  const renderConditionParams = (condition, stepIdx, condIdx) => {
    const { type, params } = condition;
    switch (type) {
      case 'file_exists':
      case 'file_missing':
        return (
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Dossier</label>
            <input
              type="text"
              value={params.folder || ''}
              onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { folder: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              placeholder="id_documents"
            />
          </div>
        );
      case 'field_equals':
        return (
          <>
            <div>
              <label className="block text-xs text-[#64748B] mb-1">Champ</label>
              <input
                type="text"
                value={params.field || ''}
                onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { field: e.target.value })}
                className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
                placeholder="status"
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs text-[#64748B] mb-1">Valeur</label>
              <input
                type="text"
                value={params.value || ''}
                onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { value: e.target.value })}
                className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
                placeholder="active"
              />
            </div>
          </>
        );
      case 'field_exists':
        return (
          <div>
            <label className="block text-xs text-[#64748B] mb-1">Champ</label>
            <input
              type="text"
              value={params.field || ''}
              onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { field: e.target.value })}
              className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              placeholder="registrationNumber"
            />
          </div>
        );
      case 'payment_status':
        return (
          <>
            <div>
              <label className="block text-xs text-[#64748B] mb-1">Type</label>
              <select
                value={params.feeType || 'annual'}
                onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { feeType: e.target.value })}
                className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              >
                {FEE_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-[#64748B] mb-1">Année</label>
              <input
                type="number"
                value={params.year || new Date().getFullYear()}
                onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { year: parseInt(e.target.value) })}
                className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs text-[#64748B] mb-1">Statut</label>
              <select
                value={params.status || 'paid'}
                onChange={(e) => updateCondition(stepIdx, condIdx, 'param', { status: e.target.value })}
                className="w-full px-2 py-1 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC]"
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps.value} value={ps.value}>{ps.label}</option>
                ))}
              </select>
            </div>
          </>
        );
      case 'debt_zero':
        return <p className="text-xs text-[#64748B]">Aucune dette restante (vérifié automatiquement).</p>;
      default:
        return null;
    }
  };

  // ── Post-validation actions (schema-level) ──────────────────────
  const addAction = (key) =>
    setFormData((prev) => ({
      ...prev,
      [key]: [...prev[key], { serviceName: '', params: {}, order: prev[key].length }],
    }));

  const updateAction = (key, i, next) =>
    setFormData((prev) => {
      const copy = [...prev[key]];
      copy[i] = next;
      return { ...prev, [key]: copy };
    });

  const removeAction = (key, i) =>
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, j) => j !== i),
    }));

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const badField = formData.payloadSchema.findIndex(
        (p) => !p.name || p.name.trim() === '',
      );
      if (badField !== -1) {
        throw new Error(`Champ payload #${badField + 1} : le nom est obligatoire`);
      }

      const badStep = formData.steps.findIndex(
        (s) => !s.stepName || s.stepName.trim() === '',
      );
      if (badStep !== -1) {
        throw new Error(`Étape #${badStep + 1} : le nom est obligatoire`);
      }

      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit
        ? `${API_URL}/validation/schemas/${schemaId}`
        : `${API_URL}/validation/schemas`;

      const payload = {
        targetType: formData.targetType,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        payloadSchema: formData.payloadSchema,
        steps: formData.steps,
        onApproval: formData.onApproval.length ? formData.onApproval : null,
        onRejection: formData.onRejection.length ? formData.onRejection : null,
        globalTimeout: formData.globalTimeout,
        notificationConfig: formData.notificationConfig,
      };

      const res = await fetchWithRefresh(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        authData.token,
        setAuthData,
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body.message || `Erreur (${res.status})`);
      }

      if (onSuccess) onSuccess(unwrap(body));
      navigate('/dash/validation/schemas');
    } catch (error) {
      console.error('Submit error:', error);
      await alert({
        title: 'Erreur',
        message: error.message || 'Erreur réseau',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: 'Annuler',
      message: 'Êtes-vous sûr de vouloir annuler ? Les modifications seront perdues.',
    });
    if (ok) navigate('/dash/validation/schemas');
  };

  // Prefetch users for existing roles on edit
  useEffect(() => {
    const preFetch = async () => {
      const roles = new Set(formData.steps.map((s) => s.requiredRole || s.requiredGrade));
      for (const role of roles) {
        if (role && !usersByRole[role]) await fetchUsersByRole(role);
      }
    };
    if (authData?.token && formData.steps.length) preFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.steps.length, authData?.token]);

  const isFieldAllowed = (name) => allowedFields === null || allowedFields.includes(name);

  const renderSimpleField = (fieldName, type, value, onChange, config = {}) => {
    const label = fieldConfigs[fieldName]?.label || fieldName;
    const required = config.validation?.required || false;

    if (type === 'textarea') {
      return (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{label}</label>
          <textarea
            value={value || ''}
            onChange={onChange}
            required={required}
            rows="3"
            className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-y"
          />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{label}</label>
        <input
          type={type}
          value={value || ''}
          onChange={onChange}
          required={required}
          className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
        />
      </div>
    );
  };

  // Step options for `on_step` application strategy dropdown
  const stepOptions = formData.steps.map((s, i) => ({
    value: s.order ?? i + 1,
    label: `Étape ${s.order ?? i + 1}${s.stepName ? ` — ${s.stepName}` : ''}`,
  }));

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ─── Informations générales ─────────────────────────── */}
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Informations générales</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Type de cible</label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetType: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows="2"
                className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* ─── Payload schema ─────────────────────────────────── */}
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">
                  Champs du payload
                </h2>
                <span className="text-xs text-[#64748B]">({formData.payloadSchema.length})</span>
              </div>
              <button
                type="button"
                onClick={addPayloadField}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Ajouter un champ
              </button>
            </div>

            {formData.payloadSchema.length === 0 && (
              <div className="text-center py-8 bg-[#0A0F1C] rounded-xl border border-dashed border-[rgba(255,255,255,0.06)]">
                <p className="text-[#94A3B8] text-sm">Aucun champ payload.</p>
                <p className="text-[#64748B] text-xs mt-1">
                  Ajoutez-en un si le formulaire doit capturer des données propres à cette demande.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {formData.payloadSchema.map((f, i) => (
                <PayloadFieldEditor
                  key={i}
                  field={f}
                  stepOptions={stepOptions}
                  onChange={(next) => updatePayloadField(i, next)}
                  onDelete={() => removePayloadField(i)}
                />
              ))}
            </div>
          </div>

          {/* ─── Steps ──────────────────────────────────────────── */}
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <List className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Étapes du workflow</h2>
              </div>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Ajouter une étape
              </button>
            </div>

            {formData.steps.length === 0 && (
              <div className="text-center py-8 bg-[#0A0F1C] rounded-xl border border-dashed border-[rgba(255,255,255,0.06)]">
                <p className="text-[#94A3B8] text-sm">Aucune étape définie.</p>
              </div>
            )}

            {formData.steps.map((step, idx) => {
              const roleKey = step.requiredRole || step.requiredGrade;
              const usersForRole = usersByRole[roleKey] || [];
              const userOptions = usersForRole.map((u) => ({
                value: u.id,
                label: `${u.name} ${u.lastname} (${u.email})`,
              }));

              return (
                <div
                  key={idx}
                  className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-5 mb-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold border border-emerald-500/20">
                        {step.order}
                      </span>
                      <h3 className="text-lg font-semibold text-[#F8FAFC]">Étape {step.order}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <input
                          type="checkbox"
                          checked={step.required}
                          onChange={(e) => updateStep(idx, 'required', e.target.checked)}
                          className="accent-emerald-500"
                        />
                        Requis
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <input
                          type="checkbox"
                          checked={step.massValidation || false}
                          onChange={(e) => updateStep(idx, 'massValidation', e.target.checked)}
                          className="accent-purple-500"
                        />
                        Validation en masse
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteStep(idx)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className={labelCls}>Nom de l'étape</label>
                      <input
                        type="text"
                        value={step.stepName}
                        onChange={(e) => updateStep(idx, 'stepName', e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>
                        Rôle / grade requis
                        {loadingRoles && rolesList.length === 0 && (
                          <span className="ml-2 text-[#64748B] normal-case">(chargement...)</span>
                        )}
                      </label>
                      {renderRoleSelect(
                        step.requiredRole || step.requiredGrade || '',
                        (e) => handleRoleChange(idx, e.target.value),
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Utilisateurs autorisés</label>
                      {loadingUsers && usersForRole.length === 0 ? (
                        <div className="text-sm text-[#64748B] py-2">Chargement...</div>
                      ) : (
                        <MultiSelect
                          key={`${roleKey}-${idx}`}
                          options={userOptions}
                          value={step.allowedUserIds || []}
                          onChange={(selected) => updateStep(idx, 'allowedUserIds', selected)}
                          placeholder="Sélectionner des utilisateurs..."
                        />
                      )}
                      <p className="text-xs text-[#64748B] mt-1">Laissez vide pour autoriser tout le rôle.</p>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Type d'étape</label>
                      <select
                        value={step.type || 'validation'}
                        onChange={(e) => updateStep(idx, 'type', e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Action en cas de rejet</label>
                      <select
                        value={step.rejectAction}
                        onChange={(e) => updateStep(idx, 'rejectAction', e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {REJECT_ACTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Rôle d'escalade</label>
                      {renderRoleSelect(
                        step.escalateToRole || 'admin',
                        (e) => updateStep(idx, 'escalateToRole', e.target.value),
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Timeout (secondes)</label>
                      <input
                        type="number"
                        value={step.timeout.duration}
                        onChange={(e) =>
                          updateStep(idx, 'timeout', { duration: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <p className="text-xs text-[#64748B] mt-1">0 = désactivé</p>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Action du timeout</label>
                      <select
                        value={step.timeout.action}
                        onChange={(e) =>
                          updateStep(idx, 'timeout', { action: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {TIMEOUT_ACTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>

                    {(step.approveConditions || []).length === 0 && (
                      <p className="text-xs text-[#64748B] italic">Aucune condition définie.</p>
                    )}

                    {(step.approveConditions || []).map((cond, cidx) => (
                      <div
                        key={cidx}
                        className="bg-[#111827] rounded-lg p-3 mb-2 border border-[rgba(255,255,255,0.06)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <select
                            value={cond.type}
                            onChange={(e) => updateCondition(idx, cidx, 'type', e.target.value)}
                            className="bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1 text-sm text-[#F8FAFC]"
                          >
                            {CONDITION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
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

                  {/* ── NEW: step-level hooks ─────────────────────── */}
                  <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StepHooksEditor
                      title="Actions après approbation"
                      accent="emerald"
                      hooks={step.onApprove || []}
                      serviceCatalog={serviceCatalog}
                      onChange={(next) => updateStep(idx, 'onApprove', next)}
                    />
                    <StepHooksEditor
                      title="Actions après rejet"
                      accent="rose"
                      hooks={step.onReject || []}
                      serviceCatalog={serviceCatalog}
                      onChange={(next) => updateStep(idx, 'onReject', next)}
                    />
                  </div>

                  <div className="mt-4 space-y-1">
                    <label className={labelCls}>Description de l'étape</label>
                    <textarea
                      value={step.description}
                      onChange={(e) => updateStep(idx, 'description', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Global timeout ─────────────────────────────────── */}
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Configuration globale</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className={labelCls}>Timeout global (heures)</label>
                <input
                  type="number"
                  value={formData.globalTimeout.duration}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      globalTimeout: { ...prev.globalTimeout, duration: parseInt(e.target.value) || 0 },
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="text-xs text-[#64748B]">0 = désactivé</p>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Action du timeout</label>
                <select
                  value={formData.globalTimeout.action}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      globalTimeout: { ...prev.globalTimeout, action: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="reject">Rejeter</option>
                  <option value="cancel">Annuler</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─── Notifications ──────────────────────────────────── */}
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Configuration des notifications</h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#F8FAFC] font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" /> Notifications par email
                </span>
                <input
                  type="checkbox"
                  checked={formData.notificationConfig?.methods?.email === true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notificationConfig: {
                        ...prev.notificationConfig,
                        methods: { ...prev.notificationConfig?.methods, email: e.target.checked },
                      },
                    }))
                  }
                  className="accent-emerald-500 w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                <span className="text-[#F8FAFC] font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" /> Notifications internes
                </span>
                <input
                  type="checkbox"
                  checked={formData.notificationConfig?.methods?.system === true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notificationConfig: {
                        ...prev.notificationConfig,
                        methods: { ...prev.notificationConfig?.methods, system: e.target.checked },
                      },
                    }))
                  }
                  className="accent-emerald-500 w-5 h-5"
                />
              </div>
            </div>
          </div>

          {/* ─── Post-validation actions ────────────────────────── */}
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">
                Actions post‑validation (niveau demande)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['onApproval', 'onRejection'].map((key) => {
                const isApproval = key === 'onApproval';
                const actions = formData[key] || [];
                return (
                  <div
                    key={key}
                    className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className={`text-sm font-semibold flex items-center gap-2 ${
                          isApproval ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isApproval ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {isApproval ? "En cas d'approbation" : 'En cas de rejet'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => addAction(key)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>

                    {actions.length === 0 && (
                      <p className="text-xs text-[#64748B] italic">
                        Aucune action. Ajoutez-en pour déclencher un effet à ce stade.
                      </p>
                    )}

                    <div className="space-y-3">
                      {actions.map((a, i) => (
                        <ActionEditor
                          key={i}
                          action={a}
                          serviceCatalog={serviceCatalog}
                          onChange={(next) => updateAction(key, i, next)}
                          onDelete={() => removeAction(key, i)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Actions ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1F2937] hover:bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl border border-[rgba(255,255,255,0.06)] text-sm font-medium"
            >
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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