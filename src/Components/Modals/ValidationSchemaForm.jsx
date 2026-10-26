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
// Only on a step that waits for the requester: its form goes back to them.
const RETURN_TO_USER_ACTION = 'return_to_user';
const USER_TIMEOUT_ACTIONS = [
  { value: 'cancel_request', label: 'Annuler la demande' },
  { value: 'reject_request', label: 'Rejeter la demande' },
];
const STEP_TYPES = [
  { value: 'validation', label: 'Validation' },
  { value: 'verification', label: 'Verification' },
];
// `grades` = grades whose roles can be chosen as audience for the type.
const TARGET_TYPES = [
  { value: 'User', label: 'User (membre)', grades: ['user'] },
  { value: 'File', label: 'File (fichier)', grades: ['user'] },
  { value: 'Cotisation', label: 'Cotisation (frais)', grades: ['user'] },
  { value: 'Admin', label: 'Admin (administrateur)', grades: ['admin', 'super_admin'] },
];
const audienceGrades = (targetType) =>
  TARGET_TYPES.find((t) => t.value === targetType)?.grades || ['user'];
const isFilePayloadField = (f) =>
  f?.type === 'file' || f?.type === 'image' || f?.ui?.widget === 'file' || f?.ui?.widget === 'image';
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
  { value: 'Admin', label: 'Admin' },
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

function MultiSelect({ options, value = [], onChange, placeholder, emptyLabel = 'Aucun utilisateur' }) {
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
            <div className="px-3 py-2 text-xs text-[#64748B]">{emptyLabel}</div>
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

// One reason per line; kept as typed while editing, saved trimmed.
function ReserveReasonsInput({ reasons, onChange }) {
  const [text, setText] = useState(() => reasons.join('\n'));
  return (
    <textarea
      rows={4}
      className={inputCls}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split('\n').map((r) => r.trim()).filter(Boolean));
      }}
      placeholder={'Document Non Conforme aux exigences\nDate de Validité expirée'}
    />
  );
}

// ─── Payload field editor ───────────────────────────────────────────
// `reviewerOption`: main-form fields may be left to the approvers (filledBy).
function PayloadFieldEditor({ field, onChange, onDelete, stepOptions = [], reviewerOption = false }) {
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
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#CBD5E1]">
            <input
              type="checkbox"
              checked={v.required === true}
              onChange={(e) => setV({ required: e.target.checked })}
              className="accent-emerald-500"
            />
            Requis
          </label>
          {reviewerOption && (
            <label
              className="flex items-center gap-2 text-sm text-[#CBD5E1]"
              title="Absent du formulaire du demandeur ; l'approbateur le saisit sur la demande. Utilisable dans les états de sortie via {{params.payload.<nom>}}."
            >
              <input
                type="checkbox"
                checked={field.filledBy === 'reviewer'}
                onChange={(e) => set({ filledBy: e.target.checked ? 'reviewer' : undefined })}
                className="accent-emerald-500"
              />
              Rempli par l'administrateur
            </label>
          )}
        </div>
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

      {isFilePayloadField(field) && (
        <div>
          <label className={labelCls}>Motifs de réserve (un par ligne)</label>
          <ReserveReasonsInput
            reasons={field.review?.reasons || []}
            onChange={(reasons) =>
              set({ review: reasons.length ? { ...(field.review || {}), reasons } : undefined })
            }
          />
          <p className="text-xs text-[#64748B] mt-1">
            Proposés au vérificateur quand il émet une réserve sur ce document
            (« Autre » est toujours ajouté). Vide = motifs par défaut.
          </p>
        </div>
      )}

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
                  onChange={(e) => {
                    const next = e.target.value;
                    // 'on_step' needs a step: store the one the dropdown shows.
                    if (next === 'on_step' && typeof app.stepOrder !== 'number') {
                      setApp({ strategy: next, stepOrder: stepOptions[0]?.value ?? 1 });
                    } else {
                      setApp({ strategy: next });
                    }
                  }}
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
                    value={app.stepOrder ?? stepOptions[0]?.value ?? 1}
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
// First dropdown: the group (registry `category`). Email and États de
// sortie hold one service each; Call service lists every other registered
// service. Parameters are rendered from the service's paramsSchema.
const ACTION_CATEGORIES = [
  { value: 'email', label: 'Email' },
  { value: 'document', label: 'États de sortie' },
  { value: 'service', label: 'Call service' },
];

// Year-less actions saved before « États de sortie » existed: shown as a
// document action whose template must be chosen before saving.
const LEGACY_DOCUMENT_ACTIONS = { createDegree: 'generate', sendDegreeByEmail: 'email' };

const upgradeLegacyAction = (action) => {
  if (!action || typeof action !== 'object') return action;
  const name = action.serviceName || action.action || '';
  const mode = LEGACY_DOCUMENT_ACTIONS[name];
  if (mode) {
    return {
      serviceName: 'document',
      order: action.order ?? 0,
      params: { mode, templateKey: '', entity: 'targetUser' },
    };
  }
  if (name === 'callService' && action.params?.target) {
    return { serviceName: action.params.target, order: action.order ?? 0, params: action.params.payload || {} };
  }
  return action;
};

const upgradeActionList = (list) => (Array.isArray(list) ? list.map(upgradeLegacyAction) : list);

const upgradeStepHooks = (steps) =>
  (Array.isArray(steps) ? steps : []).map((s) => ({
    ...s,
    ...(s.onApprove !== undefined ? { onApprove: upgradeActionList(s.onApprove) } : {}),
    ...(s.onReject !== undefined ? { onReject: upgradeActionList(s.onReject) } : {}),
  }));

const defaultParams = (service) =>
  Object.fromEntries(
    Object.entries(service?.paramsSchema || {})
      .filter(([, d]) => d.default !== undefined)
      .map(([k, d]) => [k, d.default]),
  );

/** Required parameters left empty, as readable labels. */
const missingParams = (action, catalog) => {
  const service = catalog.find((s) => s.name === (action.serviceName || action.action));
  if (!service) return [];
  return Object.entries(service.paramsSchema || {})
    .filter(([k, d]) => d.required && (action.params?.[k] === undefined || action.params?.[k] === ''))
    .map(([, d]) => d.label);
};

function JsonParamInput({ value, onChange, placeholder }) {
  // Own text state: invalid JSON while typing stays visible instead of
  // being replaced by the last valid value.
  const [text, setText] = useState(() => (value === undefined ? '' : JSON.stringify(value, null, 2)));
  const [error, setError] = useState(null);
  return (
    <div>
      <textarea
        className={inputCls + ' font-mono text-xs'}
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            setError(null);
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setError(null);
          } catch {
            setError('JSON invalide');
          }
        }}
      />
      {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

function ParamInput({ name, descriptor, value, onChange }) {
  const d = descriptor;
  if (d.type === 'documentTemplate') {
    const options = d.options || [];
    const current = options.find((o) => o.value === value);
    return (
      <div>
        <select className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">— choisir un modèle —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {value && !current && <option value={value}>{value} (introuvable)</option>}
        </select>
        {current && current.isActive === false && (
          <p className="text-[11px] text-amber-400 mt-1">
            Modèle inactif : activez-le dans « Gestion des modèles PDF » avant que les demandes soient approuvées.
          </p>
        )}
      </div>
    );
  }
  if (Array.isArray(d.enum)) {
    return (
      <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        {!d.required && <option value="">—</option>}
        {d.enum.map((v) => (
          <option key={v} value={v}>{d.enumLabels?.[v] || v}</option>
        ))}
      </select>
    );
  }
  if (d.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-[#CBD5E1] py-2">
        <input
          type="checkbox"
          className="w-4 h-4 accent-emerald-500"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        Oui
      </label>
    );
  }
  if (d.type === 'number') {
    return (
      <input
        type="number"
        className={inputCls}
        value={value ?? ''}
        placeholder={d.placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    );
  }
  if (d.type === 'json') {
    return <JsonParamInput key={name} value={value} onChange={onChange} placeholder={d.placeholder || d.help} />;
  }
  return (
    <input
      className={inputCls}
      value={value ?? ''}
      placeholder={d.placeholder}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
    />
  );
}

function ActionEditor({ action, onChange, onDelete, serviceCatalog }) {
  const serviceName = action.serviceName || action.action || '';
  const selected = serviceCatalog.find((s) => s.name === serviceName);
  const [category, setCategory] = useState(selected?.category || '');
  useEffect(() => {
    if (selected?.category) setCategory(selected.category);
  }, [selected?.category]);

  const set = (patch) => onChange({ ...action, ...patch });
  const setParam = (key, value) => {
    const params = { ...(action.params || {}) };
    if (value === undefined) delete params[key];
    else params[key] = value;
    set({ params });
  };

  const servicesInCategory = serviceCatalog.filter((s) => s.category === category);
  const pickCategory = (value) => {
    setCategory(value);
    const services = serviceCatalog.filter((s) => s.category === value);
    // Email and États de sortie have a single service: select it directly.
    if (services.length === 1) set({ serviceName: services[0].name, params: defaultParams(services[0]) });
    else set({ serviceName: '', params: {} });
  };

  const unknown = serviceName && serviceCatalog.length > 0 && !selected;
  const missing = missingParams(action, serviceCatalog);

  return (
    <div className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-emerald-400">
          {selected?.label || serviceName || 'action'}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select className={inputCls} value={category} onChange={(e) => pickCategory(e.target.value)}>
            <option value="">— choisir —</option>
            {ACTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {category === 'service' && (
          <div className="md:col-span-2">
            <label className={labelCls}>Service</label>
            <select
              className={inputCls}
              value={serviceName}
              onChange={(e) => {
                const svc = serviceCatalog.find((s) => s.name === e.target.value);
                set({ serviceName: e.target.value, params: defaultParams(svc) });
              }}
            >
              <option value="">— choisir un service —</option>
              {servicesInCategory.map((s) => (
                <option key={s.name} value={s.name}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className={category === 'service' ? '' : 'md:col-start-4'}>
          <label className={labelCls}>Ordre</label>
          <input
            type="number"
            className={inputCls}
            value={action.order ?? 0}
            onChange={(e) => set({ order: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>

      {unknown && (
        <p className="text-xs text-amber-400">
          Action « {serviceName} » inconnue ou obsolète : choisissez un type pour la remplacer.
        </p>
      )}

      {selected?.description && (
        <p className="text-xs text-[#64748B] italic">{selected.description}</p>
      )}

      {selected && Object.keys(selected.paramsSchema || {}).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(selected.paramsSchema).map(([key, descriptor]) => (
            <div key={key} className={descriptor.type === 'json' ? 'md:col-span-2' : ''}>
              <label className={labelCls}>
                {descriptor.label}
                {descriptor.required && <span className="text-rose-400"> *</span>}
              </label>
              <ParamInput
                name={`${serviceName}.${key}`}
                descriptor={descriptor}
                value={action.params?.[key]}
                onChange={(value) => setParam(key, value)}
              />
              {descriptor.help && descriptor.type !== 'json' && (
                <p className="text-[11px] text-[#64748B] mt-1">{descriptor.help}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-[11px] text-rose-400">À renseigner : {missing.join(', ')}</p>
      )}
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
    targetRoles: Array.isArray(initialData?.targetRoles) ? initialData.targetRoles : [],
    name: initialData?.name || '',
    description: initialData?.description || '',
    payloadSchema: Array.isArray(initialData?.payloadSchema)
      ? initialData.payloadSchema
      : [],
    steps: upgradeStepHooks(initialData?.steps),
    globalTimeout: initialData?.globalTimeout || { duration: 0, action: 'reject' },
    notificationConfig:
      initialData?.notificationConfig || { methods: { email: true, system: false } },
    onApproval: upgradeActionList(normalizeActions(initialData?.onApproval)),
    onRejection: upgradeActionList(normalizeActions(initialData?.onRejection)),
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

  // ── Requester step form (fields the requester fills at that step) ──
  const setStepFields = (stepIndex, updater) =>
    setFormData((prev) => {
      const steps = [...prev.steps];
      const current = Array.isArray(steps[stepIndex].payloadSchema)
        ? steps[stepIndex].payloadSchema
        : [];
      steps[stepIndex] = { ...steps[stepIndex], payloadSchema: updater(current) };
      return { ...prev, steps };
    });

  const addStepField = (stepIndex) =>
    setStepFields(stepIndex, (fields) => [
      ...fields,
      {
        name: '',
        label: '',
        labelAr: '',
        type: 'text',
        ui: { group: 'custom', colSpan: 12, placeholder: '' },
        validation: { required: false },
      },
    ]);

  const toggleWaitForUser = (stepIndex, on) =>
    setFormData((prev) => {
      const steps = [...prev.steps];
      const step = { ...steps[stepIndex], waitForUser: on };
      if (on) {
        step.payloadSchema = Array.isArray(step.payloadSchema) ? step.payloadSchema : [];
        step.userTimeout = step.userTimeout || { duration: 0, action: 'cancel_request' };
      } else if (step.rejectAction === RETURN_TO_USER_ACTION) {
        step.rejectAction = 'reject_request';
      }
      steps[stepIndex] = step;
      return { ...prev, steps };
    });

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

      // Steps that wait for the requester (same rules as the server).
      formData.steps.forEach((s, i) => {
        if (!s.waitForUser) return;
        if (i === 0) {
          throw new Error("Étape #1 : la première étape ne peut pas attendre le demandeur");
        }
        const fields = Array.isArray(s.payloadSchema) ? s.payloadSchema : [];
        if (fields.length === 0 && !(s.userInstructions || '').trim()) {
          throw new Error(`Étape #${i + 1} : indiquez des instructions ou des champs pour le demandeur`);
        }
        const unnamed = fields.findIndex((f) => !f.name || f.name.trim() === '');
        if (unnamed !== -1) {
          throw new Error(`Étape #${i + 1}, champ #${unnamed + 1} : le nom est obligatoire`);
        }
      });

      if (formData.targetType === 'Admin') {
        const allFields = [
          ...formData.payloadSchema,
          ...formData.steps.flatMap((s) => (s.waitForUser ? s.payloadSchema || [] : [])),
        ];
        if (allFields.some(isFilePayloadField)) {
          throw new Error(
            'Les schémas ciblant un administrateur ne peuvent pas encore contenir de champ fichier',
          );
        }
      }

      // Step-form settings only travel with steps that wait for the requester.
      // An 'on_step' field saved without a step gets the one its dropdown
      // showed (the first offered step).
      const withStepOrder = (fields, defaultOrder) =>
        (fields || []).map((f) =>
          f.application?.strategy === 'on_step' && typeof f.application.stepOrder !== 'number'
            ? { ...f, application: { ...f.application, stepOrder: defaultOrder } }
            : f,
        );
      const firstOrder = formData.steps[0]?.order ?? 1;

      const REQUESTER_KEYS = ['payloadSchema', 'userInstructions', 'userTimeout', 'waitForUser'];
      const cleanSteps = formData.steps.map((s) =>
        s.waitForUser
          ? { ...s, payloadSchema: withStepOrder(s.payloadSchema, s.order) }
          : Object.fromEntries(Object.entries(s).filter(([k]) => !REQUESTER_KEYS.includes(k))),
      );

      // Post-validation actions: a type must be chosen and required
      // parameters filled (e.g. the template of an État de sortie).
      const actionGroups = [
        ['Actions en cas d’approbation', formData.onApproval],
        ['Actions en cas de rejet', formData.onRejection],
        ...formData.steps.flatMap((s, i) => [
          [`Étape #${i + 1} (approbation)`, s.onApprove || []],
          [`Étape #${i + 1} (rejet)`, s.onReject || []],
        ]),
      ];
      for (const [where, actions] of actionGroups) {
        for (const action of actions) {
          if (!(action.serviceName || action.action)) {
            throw new Error(`${where} : choisissez le type de chaque action (ou supprimez-la)`);
          }
          const missing = missingParams(action, serviceCatalog);
          if (missing.length) {
            throw new Error(`${where} : ${missing.join(', ')} à renseigner`);
          }
        }
      }

      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit
        ? `${API_URL}/validation/schemas/${schemaId}`
        : `${API_URL}/validation/schemas`;

      const payload = {
        targetType: formData.targetType,
        targetRoles: formData.targetRoles,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        payloadSchema: withStepOrder(formData.payloadSchema, firstOrder),
        steps: cleanSteps,
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
        // The server sends field-by-field errors as a list: one per line.
        const message = Array.isArray(body.message) ? body.message.join('\n') : body.message;
        throw new Error(message || `Erreur (${res.status})`);
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
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setFormData((prev) => {
                      // Keep only roles that still fit the new type.
                      const grades = audienceGrades(nextType);
                      const fitting = new Set(
                        rolesList.filter((r) => grades.includes(r.grade || 'user')).map((r) => r.name),
                      );
                      return {
                        ...prev,
                        targetType: nextType,
                        targetRoles: prev.targetRoles.filter((name) => fitting.has(name)),
                      };
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Rôles concernés
              </label>
              <MultiSelect
                options={rolesList
                  .filter((r) => audienceGrades(formData.targetType).includes(r.grade || 'user'))
                  .map((r) => ({ value: r.name, label: `${r.label || r.name} (${r.name})` }))}
                value={formData.targetRoles}
                onChange={(selected) => setFormData((prev) => ({ ...prev, targetRoles: selected }))}
                emptyLabel="Aucun rôle pour ce type de cible"
                placeholder={
                  formData.targetType === 'Admin'
                    ? 'Tous les administrateurs'
                    : 'Tous les membres'
                }
              />
              <p className="text-xs text-[#64748B]">
                {formData.targetType === 'Admin'
                  ? 'Rôles administrateur pouvant faire cette demande. Laissez vide pour tous.'
                  : 'Rôles membre (ex. architecte, stagiaire) pouvant faire cette demande. Laissez vide pour tous.'}
              </p>
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
                  reviewerOption
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
                        {step.waitForUser && (
                          <option value={RETURN_TO_USER_ACTION}>
                            {RETURN_TO_USER_ACTION} — renvoyer au demandeur
                          </option>
                        )}
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

                  {/* ── Requester step: they fill a form first, then the approvers act ── */}
                  <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                    <label
                      className={`flex items-center gap-2 text-sm ${idx === 0 ? 'text-[#64748B]' : 'text-[#CBD5E1]'}`}
                      title={idx === 0 ? 'La première étape commence dès la création de la demande' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={step.waitForUser === true}
                        disabled={idx === 0}
                        onChange={(e) => toggleWaitForUser(idx, e.target.checked)}
                        className="accent-amber-500"
                      />
                      Attendre le demandeur avant cette étape
                      {idx === 0 && (
                        <span className="text-xs">(impossible pour la première étape)</span>
                      )}
                    </label>

                    {step.waitForUser && (
                      <div className="mt-4 space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <p className="text-xs text-amber-200 leading-relaxed">
                          Quand la demande arrive à cette étape, le demandeur reçoit une notification
                          et remplit le formulaire ci-dessous. Les approbateurs de l'étape ne la voient
                          qu'ensuite. Un champ non requis (fichier compris) peut être laissé vide.
                        </p>
                        <div className="space-y-1">
                          <label className={labelCls}>Instructions pour le demandeur</label>
                          <textarea
                            value={step.userInstructions || ''}
                            onChange={(e) => updateStep(idx, 'userInstructions', e.target.value)}
                            rows="2"
                            placeholder="Merci de fournir l'attestation de stage signée."
                            className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className={labelCls}>Délai du demandeur (secondes)</label>
                            <input
                              type="number"
                              value={step.userTimeout?.duration ?? 0}
                              onChange={(e) =>
                                updateStep(idx, 'userTimeout', {
                                  ...(step.userTimeout || { action: 'cancel_request' }),
                                  duration: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            />
                            <p className="text-xs text-[#64748B]">0 = pas de délai</p>
                          </div>
                          <div className="space-y-1">
                            <label className={labelCls}>Sans réponse dans le délai</label>
                            <select
                              value={step.userTimeout?.action || 'cancel_request'}
                              onChange={(e) =>
                                updateStep(idx, 'userTimeout', {
                                  ...(step.userTimeout || { duration: 0 }),
                                  action: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            >
                              {USER_TIMEOUT_ACTIONS.map((a) => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                              <Layers className="w-4 h-4 text-amber-400" />
                              Formulaire de l'étape
                              <span className="text-xs text-[#64748B]">
                                ({(step.payloadSchema || []).length})
                              </span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => addStepField(idx)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 text-xs font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" /> Ajouter un champ
                            </button>
                          </div>
                          {(step.payloadSchema || []).length === 0 && (
                            <p className="text-xs text-[#64748B] italic">
                              Aucun champ : le demandeur confirmera simplement après avoir lu les instructions.
                            </p>
                          )}
                          <div className="space-y-3">
                            {(step.payloadSchema || []).map((f, fi) => (
                              <PayloadFieldEditor
                                key={fi}
                                field={f}
                                stepOptions={stepOptions.filter((o) => o.value >= step.order)}
                                onChange={(next) =>
                                  setStepFields(idx, (fields) =>
                                    fields.map((x, j) => (j === fi ? next : x)),
                                  )
                                }
                                onDelete={() =>
                                  setStepFields(idx, (fields) => fields.filter((_, j) => j !== fi))
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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