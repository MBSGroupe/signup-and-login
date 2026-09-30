import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  User,
  Mail,
  Calendar,
  FileText,
  Layers,
  Settings,
  History,
  RefreshCw,
  Edit,
  AlertCircle,
  Shield,
  UserCheck,
  Zap,
  GitBranch,
  Info,
  List,
  Database,
  Paperclip,
  Hash,
  Type,
  ToggleLeft,
  CalendarDays,
  Code,
  ArrowRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_NEST_API_URL;

const statusLabels = {
  active: "Active",
  flawed: "Flawed",
  archived: "Archived",
  stable: "Stable",
};

const statusColors = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  flawed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  stable: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

// ─── Helper: unwrap the ResponseInterceptor envelope ────────────────────
const unwrap = (body) =>
  body && typeof body === 'object' && 'data' in body && 'success' in body
    ? body.data
    : body;

// ─── Helpers: normalize arrays ─────────────────────────────────────────
const asArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

// ─── Helpers: payload field visual metadata ────────────────────────────
const FIELD_TYPE_META = {
  text:     { Icon: Type,        label: 'Texte' },
  email:    { Icon: Mail,        label: 'Email' },
  password: { Icon: Shield,      label: 'Mot de passe' },
  number:   { Icon: Hash,        label: 'Nombre' },
  boolean:  { Icon: ToggleLeft,  label: 'Booléen' },
  date:     { Icon: CalendarDays,label: 'Date' },
  file:     { Icon: Paperclip,   label: 'Fichier' },
  image:    { Icon: Paperclip,   label: 'Image' },
  json:     { Icon: Code,        label: 'JSON' },
};

const STRATEGY_META = {
  immediate:    { label: 'Immédiat',        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  on_step:      { label: 'À une étape',     color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  on_approval:  { label: 'À l’approbation', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_rejection: { label: 'Au rejet',        color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  never:        { label: 'Jamais',          color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export default function ValidationSchemaDetails() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { confirm } = useModal();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("steps");

  // ─── Fetch schema ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSchema = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/schemas/${schemaId}`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
        const body = await res.json();
        const data = unwrap(body);
        if (data) {
          setSchema(data);
        } else {
          setError("Impossible de charger le schéma.");
        }
      } catch (err) {
        console.error("Failed to load schema:", err);
        setError(err?.message || "Impossible de charger le schéma.");
      } finally {
        setLoading(false);
      }
    };

    if (authData?.token && schemaId) fetchSchema();
  }, [schemaId, authData?.token, setAuthData]);

  const handleRollback = async () => {
    const confirmed = await confirm({
      title: "Rollback",
      message: "Rollback to this version? It will become active.",
    });
    if (!confirmed) return;

    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/rollback`,
        { method: "POST" },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      if (body?.success) window.location.reload();
    } catch (err) {
      console.error("Rollback error:", err);
    }
  };

  const handleReactivate = async () => {
    const confirmed = await confirm({
      title: "Réactivation",
      message: "Reactivate this version? It will become active.",
    });
    if (!confirmed) return;

    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/schemas/${schema.id}/reactivateVersion`,
        { method: "POST" },
        authData.token,
        setAuthData
      );
      const body = await res.json();
      if (body?.success) window.location.reload();
    } catch (err) {
      console.error("Reactivate error:", err);
    }
  };

  const handleEdit = () => {
    navigate(`/dash/validation/schemas/${schema.id}/edit`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#94A3B8] text-sm">Loading schema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-rose-400">
          <AlertCircle className="w-6 h-6 inline-block mr-2" />
          {error}
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="text-[#94A3B8]">Schema not found</div>
      </div>
    );
  }

  // ─── Resolve names via the backend-provided directory ───────────────
  const directory = schema.adminDirectory || {};
  const resolveAdminLabel = (entry) => {
    if (entry == null) return '—';
    const id = typeof entry === 'string' ? entry : entry.id;
    const fromDir = directory[id];
    if (fromDir) {
      return (
        `${(fromDir.name || '')} ${(fromDir.lastname || '')}`.trim() ||
        fromDir.email ||
        id
      );
    }
    if (typeof entry === 'object') {
      return (
        `${(entry.name || '')} ${(entry.lastname || '')}`.trim() ||
        entry.email ||
        id
      );
    }
    return id;
  };

  // ─── Step card ─────────────────────────────────────────────────────
  const renderStepCard = (step, idx) => {
    const ids = Array.isArray(step.allowedUserIds) ? step.allowedUserIds : [];
    const allowedUsersDisplay = ids.length
      ? ids.map(resolveAdminLabel).join(', ')
      : 'Aucun (par rôle)';

    const stepType = step.type || 'validation';
    const stepTypeLabel = stepType === 'verification' ? 'Vérification' : 'Validation';
    const stepTypeColor =
      stepType === 'verification'
        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

    const onApprove = asArray(step.onApprove);
    const onReject = asArray(step.onReject);

    return (
      <div
        key={idx}
        className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] p-5 mb-4 hover:border-[rgba(255,255,255,0.12)] transition-all duration-200"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold border border-emerald-500/20">
              {step.order}
            </span>
            <h4 className="font-semibold text-[#F8FAFC]">{step.stepName}</h4>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                step.required
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
              }`}
            >
              {step.required ? 'Requis' : 'Optionnel'}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${stepTypeColor}`}
            >
              {stepTypeLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Rôle requis :</span>
              <span className="text-[#F8FAFC] ml-1">{step.requiredRole || '—'}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Utilisateurs autorisés :</span>
              <span className="text-[#F8FAFC] ml-1">{allowedUsersDisplay}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Action en cas de rejet :</span>
              <span className="text-[#F8FAFC] ml-1">{step.rejectAction || '—'}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Rôle d'escalade :</span>
              <span className="text-[#F8FAFC] ml-1">{step.escalateToRole || '—'}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Timeout :</span>
              <span className="text-[#F8FAFC] ml-1">
                {step.timeout?.duration > 0
                  ? `${step.timeout.duration} s (${step.timeout.action})`
                  : 'Désactivé'}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#64748B]">Validation de masse :</span>
              <span className="text-[#F8FAFC] ml-1">
                {step.massValidation ? 'Oui' : 'Non'}
              </span>
            </div>
          </div>
          {step.description && (
            <div className="flex items-start gap-2 col-span-full">
              <FileText className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[#64748B]">Description :</span>
                <span className="text-[#F8FAFC] ml-1">{step.description}</span>
              </div>
            </div>
          )}
          {step.approveConditions?.length > 0 && (
            <div className="flex items-start gap-2 col-span-full">
              <CheckCircle className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[#64748B]">Conditions d'approbation :</span>
                <ul className="list-disc list-inside ml-2 text-[#F8FAFC]">
                  {step.approveConditions.map((cond, ci) => (
                    <li key={ci}>
                      {cond.type} {JSON.stringify(cond.params)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ── Step hooks (post-validation on this step) ─────────── */}
        {(onApprove.length > 0 || onReject.length > 0) && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-1 md:grid-cols-2 gap-3">
            {onApprove.length > 0 && (
              <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-3">
                <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Actions après approbation
                </h5>
                <div className="space-y-2">
                  {[...onApprove]
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((hook, hi) => (
                      <div key={hi} className="flex items-start gap-2 text-xs">
                        <span className="text-[#64748B] font-mono shrink-0">
                          {hook.order ?? 0}.
                        </span>
                        <div className="min-w-0">
                          <p className="text-[#F8FAFC] font-medium truncate">
                            {hook.serviceName || hook.action || '—'}
                          </p>
                          {hook.params && Object.keys(hook.params).length > 0 && (
                            <pre className="text-[#94A3B8] mt-0.5 whitespace-pre-wrap break-all">
                              {JSON.stringify(hook.params, null, 0)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {onReject.length > 0 && (
              <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-3">
                <h5 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Actions après rejet
                </h5>
                <div className="space-y-2">
                  {[...onReject]
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((hook, hi) => (
                      <div key={hi} className="flex items-start gap-2 text-xs">
                        <span className="text-[#64748B] font-mono shrink-0">
                          {hook.order ?? 0}.
                        </span>
                        <div className="min-w-0">
                          <p className="text-[#F8FAFC] font-medium truncate">
                            {hook.serviceName || hook.action || '—'}
                          </p>
                          {hook.params && Object.keys(hook.params).length > 0 && (
                            <pre className="text-[#94A3B8] mt-0.5 whitespace-pre-wrap break-all">
                              {JSON.stringify(hook.params, null, 0)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Payload field card ────────────────────────────────────────────
  const renderPayloadField = (field, idx) => {
    const meta = FIELD_TYPE_META[field.type] || { Icon: FileText, label: field.type || 'Inconnu' };
    const Icon = meta.Icon;
    const app = field.application;
    const strategyMeta = app?.strategy ? STRATEGY_META[app.strategy] : null;

    const validationChips = [];
    if (field.validation?.required) validationChips.push({ key: 'required', label: 'Requis' });
    if (field.validation?.minLength !== undefined) validationChips.push({ key: 'minLength', label: `min ${field.validation.minLength}` });
    if (field.validation?.maxLength !== undefined) validationChips.push({ key: 'maxLength', label: `max ${field.validation.maxLength}` });
    if (field.validation?.min !== undefined) validationChips.push({ key: 'min', label: `≥ ${field.validation.min}` });
    if (field.validation?.max !== undefined) validationChips.push({ key: 'max', label: `≤ ${field.validation.max}` });
    if (field.validation?.pattern) validationChips.push({ key: 'pattern', label: `motif` });
    if (field.validation?.unique) validationChips.push({ key: 'unique', label: 'unique' });
    if (Array.isArray(field.validation?.enum) && field.validation.enum.length > 0) {
      validationChips.push({ key: 'enum', label: field.validation.enum.join(' / ') });
    }

    const isFileLike = field.type === 'file' || field.ui?.widget === 'file' || field.ui?.widget === 'image';

    return (
      <div
        key={idx}
        className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.12)] transition-all"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-[#0A0F1C] text-emerald-400 shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                {field.label || field.name}
              </p>
              <p className="text-xs text-[#64748B] font-mono truncate">
                {field.name}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#94A3B8] shrink-0">
            {meta.label}
          </span>
        </div>

        {field.labelAr && (
          <p className="text-xs text-[#64748B] mb-2" dir="rtl">
            {field.labelAr}
          </p>
        )}

        {/* ── UI info ─────────────────────────────────────────────── */}
        {(field.ui?.group || field.ui?.colSpan || field.ui?.placeholder || field.ui?.widget) && (
          <div className="flex flex-wrap gap-1.5 mb-2 text-[11px]">
            {field.ui?.group && (
              <span className="px-2 py-0.5 rounded bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#94A3B8]">
                groupe : <span className="text-[#F8FAFC]">{field.ui.group}</span>
              </span>
            )}
            {field.ui?.colSpan !== undefined && (
              <span className="px-2 py-0.5 rounded bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#94A3B8]">
                colSpan : <span className="text-[#F8FAFC]">{field.ui.colSpan}</span>
              </span>
            )}
            {field.ui?.widget && (
              <span className="px-2 py-0.5 rounded bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#94A3B8]">
                widget : <span className="text-[#F8FAFC]">{field.ui.widget}</span>
              </span>
            )}
            {field.ui?.placeholder && (
              <span className="px-2 py-0.5 rounded bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#94A3B8]">
                placeholder : <span className="text-[#F8FAFC]">"{field.ui.placeholder}"</span>
              </span>
            )}
          </div>
        )}

        {/* ── Validation chips ─────────────────────────────────────── */}
        {validationChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
            {validationChips.map((chip) => (
              <span
                key={chip.key}
                className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300"
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Application block ───────────────────────────────────── */}
        {app ? (
          <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="text-[11px] uppercase tracking-wider text-[#64748B]">
                Application
              </span>
              {strategyMeta && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${strategyMeta.color}`}
                >
                  {strategyMeta.label}
                </span>
              )}
              {app.strategy === 'on_step' && app.stepOrder !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  étape {app.stepOrder}
                </span>
              )}
            </div>
            {app.target && (app.target.entity || app.target.field) && (
              <p className="text-xs text-[#94A3B8] font-mono">
                → <span className="text-emerald-400">{app.target.entity}</span>
                <span className="text-[#64748B]">.</span>
                <span className="text-[#F8FAFC]">{app.target.field}</span>
              </p>
            )}
            {app.coerce && (
              <p className="text-xs text-[#94A3B8] mt-1">
                coerce : <span className="text-[#F8FAFC] font-mono">{app.coerce}</span>
              </p>
            )}
          </div>
        ) : (
          isFileLike ? (
            <p className="text-[11px] text-[#475569] mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] italic">
              Fichier joint au payload — jamais écrit sur une entité cible.
            </p>
          ) : null
        )}
      </div>
    );
  };

  const payloadFields = Array.isArray(schema.payloadSchema) ? schema.payloadSchema : [];
  const onApprovalList = asArray(schema.onApproval);
  const onRejectionList = asArray(schema.onRejection);

  return (
    <div className="min-h-screen ml-[30px] bg-[#0A0F1C] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <BackButton />
        </div>

        {/* Header */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 md:p-8 shadow-2xl shadow-black/50">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-6 h-6 text-emerald-400" />
                <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                  {schema.name}
                </h1>
                <span className="text-sm text-[#64748B] bg-[#0A0F1C] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.06)]">
                  v{schema.version}
                </span>
              </div>
              <p className="text-[#94A3B8] text-sm">{schema.description || 'No description'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {new Date(schema.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                  <User className="w-3.5 h-3.5" />
                  By {schema.createdBy?.name || 'Unknown'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                  <GitBranch className="w-3.5 h-3.5" />
                  Target: {schema.targetType}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                  statusColors[schema.status] ||
                  'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
              >
                {statusLabels[schema.status] || schema.status}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                  schema.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
              >
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
          </div>

          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            {!schema.isActive && schema.status !== 'flawed' && (
              <>
                <button
                  onClick={handleRollback}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Rollback
                </button>
                <button
                  onClick={handleReactivate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all text-sm font-medium"
                >
                  <Zap className="w-4 h-4" />
                  Reactivate
                </button>
              </>
            )}
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg hover:bg-[#182233] transition-all text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <div className="flex overflow-x-auto gap-1 border-b border-[rgba(255,255,255,0.06)] pb-px">
            <button
              onClick={() => setActiveTab("steps")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "steps"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <List className="w-4 h-4" />
              Steps ({schema.steps?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("payload")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "payload"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              Payload ({payloadFields.length})
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "global"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Settings className="w-4 h-4" />
              Global Config
            </button>
            <button
              onClick={() => setActiveTab("actions")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "actions"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Zap className="w-4 h-4" />
              Post-Validation
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "info"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <Info className="w-4 h-4" />
              Metadata
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "history"
                  ? "bg-[#111827] text-emerald-400 border-b-2 border-emerald-400"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1F2937]"
              }`}
            >
              <History className="w-4 h-4" />
              History ({schema.changeLog?.length || 0})
            </button>
          </div>

          {/* Tab content */}
          <div className="bg-[#111827] rounded-b-2xl border-x border-b border-[rgba(255,255,255,0.06)] p-6">
            {activeTab === "steps" && (
              <div>
                {(!schema.steps || schema.steps.length === 0) && (
                  <p className="text-[#94A3B8] text-center py-8">No steps defined.</p>
                )}
                {schema.steps?.map((step, idx) => renderStepCard(step, idx))}
              </div>
            )}

            {activeTab === "payload" && (
              <div>
                {payloadFields.length === 0 ? (
                  <p className="text-[#94A3B8] text-center py-8">
                    Aucun schéma de payload défini pour cette version.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {payloadFields.map(renderPayloadField)}
                  </div>
                )}
              </div>
            )}

            {activeTab === "global" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Global Timeout</span>
                  <span className="text-[#F8FAFC] font-medium">
                    {schema.globalTimeout?.duration || 0} hours
                  </span>
                  <span className="text-[#94A3B8] ml-2">
                    ({schema.globalTimeout?.action || 'reject'})
                  </span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Notifications</span>
                  <div className="flex gap-4 mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        schema.notificationConfig?.methods?.email
                          ? 'text-emerald-400'
                          : 'text-[#64748B]'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        schema.notificationConfig?.methods?.system
                          ? 'text-emerald-400'
                          : 'text-[#64748B]'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      System
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "actions" && (
              <div className="space-y-4">
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    On Approval ({onApprovalList.length})
                  </h4>
                  {onApprovalList.length === 0 ? (
                    <p className="text-sm text-[#64748B]">Aucune action.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...onApprovalList]
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((action, ai) => (
                          <div
                            key={ai}
                            className="flex items-start gap-2 text-sm bg-[#111827] border border-[rgba(255,255,255,0.04)] rounded-lg p-3"
                          >
                            <span className="text-[#64748B] font-mono shrink-0">
                              {action.order ?? 0}.
                            </span>
                            <div className="min-w-0">
                              <p className="text-[#F8FAFC] font-medium">
                                {action.serviceName || action.action || '—'}
                              </p>
                              {action.params &&
                                Object.keys(action.params).length > 0 && (
                                  <pre className="text-xs text-[#94A3B8] mt-1 whitespace-pre-wrap break-all">
                                    {JSON.stringify(action.params, null, 2)}
                                  </pre>
                                )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    On Rejection ({onRejectionList.length})
                  </h4>
                  {onRejectionList.length === 0 ? (
                    <p className="text-sm text-[#64748B]">Aucune action.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...onRejectionList]
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((action, ai) => (
                          <div
                            key={ai}
                            className="flex items-start gap-2 text-sm bg-[#111827] border border-[rgba(255,255,255,0.04)] rounded-lg p-3"
                          >
                            <span className="text-[#64748B] font-mono shrink-0">
                              {action.order ?? 0}.
                            </span>
                            <div className="min-w-0">
                              <p className="text-[#F8FAFC] font-medium">
                                {action.serviceName || action.action || '—'}
                              </p>
                              {action.params &&
                                Object.keys(action.params).length > 0 && (
                                  <pre className="text-xs text-[#94A3B8] mt-1 whitespace-pre-wrap break-all">
                                    {JSON.stringify(action.params, null, 2)}
                                  </pre>
                                )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "info" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Name</span>
                  <span className="text-[#F8FAFC]">{schema.name}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Description</span>
                  <span className="text-[#F8FAFC]">{schema.description || '—'}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Version</span>
                  <span className="text-[#F8FAFC]">{schema.version}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Target Type</span>
                  <span className="text-[#F8FAFC]">{schema.targetType}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Tenant</span>
                  <span className="text-[#F8FAFC]">{schema.tenantId || 'Global'}</span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Created</span>
                  <span className="text-[#F8FAFC]">
                    {new Date(schema.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Created By</span>
                  <span className="text-[#F8FAFC]">
                    {schema.createdBy?.email || schema.createdBy?.name || '—'}
                  </span>
                </div>
                <div className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#64748B] block">Last Updated</span>
                  <span className="text-[#F8FAFC]">
                    {new Date(schema.updatedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {schema.changeLog && schema.changeLog.length > 0 ? (
                  schema.changeLog.map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0A0F1C] p-4 rounded-xl border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-[#F8FAFC] font-medium">
                          Version {entry.version}
                        </span>
                        <span className="text-[#64748B]">—</span>
                        <span className="text-[#94A3B8]">
                          {new Date(entry.changedAt).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[#64748B]">by</span>
                        <span className="text-[#F8FAFC]">
                          {entry.changedBy?.name || 'Unknown'}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-[#94A3B8] text-sm mt-1">{entry.reason}</p>
                      )}
                      {entry.changes && entry.changes.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs">
                          {entry.changes.map((change, changeIdx) => (
                            <div key={changeIdx} className="text-[#94A3B8]">
                              <span className="text-[#64748B]">{change.field}</span>:
                              <span className="text-rose-400 ml-1">
                                {JSON.stringify(change.oldValue)}
                              </span>
                              <span className="text-[#64748B] mx-1">→</span>
                              <span className="text-emerald-400">
                                {JSON.stringify(change.newValue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[#94A3B8] text-center py-8">No history available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #374151 transparent; }
      `}</style>
    </div>
  );
}