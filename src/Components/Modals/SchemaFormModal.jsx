// src/Components/Modals/SchemaFormModal.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCheck,
  Shield,
  Info,
  HelpCircle,
  Paperclip,
} from 'lucide-react';
import { useError } from '../../Context/ErrorContext';
import {
  uploadValidationFile,
  getSchemaFolder,
  unwrap,
} from '../Api/uploadValidationFile';
import DocumentUploadSlot from './DocumentUploadSlot';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ── field-type helpers ────────────────────────────────────────────
const isFileField = (f) =>
  f?.type === 'file' ||
  f?.ui?.widget === 'file' ||
  f?.ui?.widget === 'image';

const isMultiFile = (f) =>
  isFileField(f) &&
  (f?.ui?.multiple === true || f?.validation?.multiple === true);

const defaultValueForField = (f) => {
  if (f?.type === 'boolean') return false;
  if (isMultiFile(f)) return [];
  return '';
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Client-side mirror of ValidationService._validatePayload() rules.
 * Returns an error string, or null if valid.
 */
const validateField = (field, rawValue) => {
  const v = field?.validation || {};
  const label = field?.label || field?.name;

  const isEmpty =
    rawValue === undefined ||
    rawValue === null ||
    rawValue === '' ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (v.required && isEmpty) return `Le champ "${label}" est requis`;
  if (isEmpty) return null;

  if (field.type === 'number') {
    const num = Number(rawValue);
    if (Number.isNaN(num)) return `Le champ "${label}" doit être un nombre`;
    if (v.min !== undefined && num < v.min)
      return `Le champ "${label}" doit être ≥ ${v.min}`;
    if (v.max !== undefined && num > v.max)
      return `Le champ "${label}" doit être ≤ ${v.max}`;
  }

  if (typeof rawValue === 'string') {
    if (v.minLength && rawValue.length < v.minLength)
      return `Le champ "${label}" doit contenir au moins ${v.minLength} caractères`;
    if (v.maxLength && rawValue.length > v.maxLength)
      return `Le champ "${label}" ne peut pas dépasser ${v.maxLength} caractères`;
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(rawValue))
          return `Le champ "${label}" ne respecte pas le format attendu`;
      } catch (_) {
        /* ignore malformed regex */
      }
    }
  }

  if (Array.isArray(v.enum) && v.enum.length > 0) {
    if (!v.enum.includes(rawValue))
      return `Le champ "${label}" doit être l'une des valeurs : ${v.enum.join(', ')}`;
  }

  return null;
};

// ── main component ────────────────────────────────────────────────
export default function SchemaFormModal({
  isOpen,
  onClose,
  onGoToValidations = null,
  targetUserId,
  authToken,
  onSuccess,
  schema = null,
  existingRequestId = null,
  resubmitMode = false,
  user = null,
  validationRequests = [],
}) {
  const { showSuccess } = useError();

  const fields = useMemo(() => {
    const arr = schema?.payloadSchema;
    return Array.isArray(arr) ? arr : [];
  }, [schema]);

  const fileFields = useMemo(() => fields.filter(isFileField), [fields]);

  const [values, setValues] = useState({});
  const [newFiles, setNewFiles] = useState({});
  const [existingFiles, setExistingFiles] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const fileInputRefs = useRef({});
  const getFileRef = (name) => {
    if (!fileInputRefs.current[name]) fileInputRefs.current[name] = { current: null };
    return fileInputRefs.current[name];
  };

  // ── reset on open ──
  useEffect(() => {
    if (!isOpen) return;
    const init = {};
    for (const f of fields) {
      if (
        !isFileField(f) &&
        user &&
        user[f.name] !== undefined &&
        user[f.name] !== null
      ) {
        init[f.name] = user[f.name];
      } else {
        init[f.name] = defaultValueForField(f);
      }
    }
    setValues(init);
    setNewFiles({});
    setExistingFiles({});
    setErrorMessage(null);
    setAlreadyExists(false);
    setSuccessRef(null);
    setSuccessData(null);
    setShowConfirmModal(false);
    setIsLoading(false);
    setUploadMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, schema?.id]);

  // ── prefill from existing request in resubmit mode ──
  useEffect(() => {
    if (!isOpen || !resubmitMode || !existingRequestId || !authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${NEST_API_URL}/validation/requests/${existingRequestId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authToken}`,
              'X-Client-Type': 'app',
            },
          },
        );
        if (!res.ok) return;
        const raw = await res.json();
        const data = unwrap(raw);
        if (cancelled || !data?.payload) return;
        const p = data.payload;

        const nextValues = {};
        const nextExisting = {};
        for (const f of fields) {
          const val = p[f.name];
          if (isFileField(f)) {
            nextExisting[f.name] = val ?? (isMultiFile(f) ? [] : null);
          } else if (val !== undefined && val !== null) {
            nextValues[f.name] = val;
          }
        }
        setValues((prev) => ({ ...prev, ...nextValues }));
        setExistingFiles(nextExisting);
      } catch (err) {
        console.warn('[SchemaFormModal] prefill failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resubmitMode, existingRequestId, authToken]);

  if (!isOpen) return null;

  const handleClose = () => onClose?.();

  const handleSuccessClose = () => {
    const dataToPass = successData;
    handleClose();
    if (onSuccess && dataToPass) onSuccess(dataToPass);
  };

  const handleSuccessGoToValidations = () => {
    const dataToPass = successData;
    if (onGoToValidations) onGoToValidations();
    else onClose?.();
    if (onSuccess && dataToPass) onSuccess(dataToPass);
  };

  const setFieldValue = (name, value) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleFileChange = (field, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(
        `Le fichier pour "${field.label || field.name}" dépasse la taille maximale (10 Mo).`,
      );
      return;
    }
    setErrorMessage(null);
    if (isMultiFile(field)) {
      setNewFiles((prev) => {
        const current = Array.isArray(prev[field.name]) ? prev[field.name] : [];
        return { ...prev, [field.name]: [...current, file] };
      });
    } else {
      setNewFiles((prev) => ({ ...prev, [field.name]: file }));
    }
  };

  const removeNewFile = (field, idx = null) => {
    if (isMultiFile(field) && idx !== null) {
      setNewFiles((prev) => {
        const current = Array.isArray(prev[field.name]) ? prev[field.name] : [];
        return {
          ...prev,
          [field.name]: current.filter((_, i) => i !== idx),
        };
      });
    } else {
      setNewFiles((prev) => ({ ...prev, [field.name]: null }));
      const input = fileInputRefs.current[field.name];
      if (input) input.value = '';
    }
  };

  const clearExisting = (field) => {
    setExistingFiles((prev) => ({
      ...prev,
      [field.name]: isMultiFile(field) ? [] : null,
    }));
  };

  // ── client-side validation ──
  const handlePreSubmit = (e) => {
    if (e) e.preventDefault();

    const errors = [];
    for (const field of fields) {
      if (isFileField(field)) {
        const existing = existingFiles[field.name];
        const newFile = newFiles[field.name];
        const hasExisting = isMultiFile(field)
          ? Array.isArray(existing) && existing.length > 0
          : !!existing;
        const hasNew = isMultiFile(field)
          ? Array.isArray(newFile) && newFile.length > 0
          : !!newFile;

        if (field.validation?.required && !hasExisting && !hasNew) {
          errors.push(`Le champ "${field.label || field.name}" est requis`);
        }
        continue;
      }

      const err = validateField(field, values[field.name]);
      if (err) errors.push(err);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' • '));
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  // ── submit ──
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setErrorMessage(null);
    setAlreadyExists(false);
    setIsLoading(true);

    try {
      const folder = getSchemaFolder(schema);

      // 1) Upload files
      const uploadedFileIds = {};
      for (const field of fileFields) {
        const newFile = newFiles[field.name];
        const existing = existingFiles[field.name];
        const multi = isMultiFile(field);

        if (multi) {
          const list = Array.isArray(newFile) ? newFile : [];
          if (list.length > 0) {
            setUploadMessage(`Téléversement : ${field.label || field.name}…`);
            const ids = [];
            for (const f of list) {
              const up = await uploadValidationFile({
                file: f,
                folder,
                documentType: field.name,
                targetUserId,
                authToken,
              });
              ids.push(up.fileId);
            }
            uploadedFileIds[field.name] = ids;
          } else if (Array.isArray(existing) && existing.length > 0) {
            uploadedFileIds[field.name] = existing
              .map((e) => (typeof e === 'string' ? e : e?.fileId))
              .filter(Boolean);
          } else {
            uploadedFileIds[field.name] = [];
          }
        } else {
          if (newFile) {
            setUploadMessage(`Téléversement : ${field.label || field.name}…`);
            const up = await uploadValidationFile({
              file: newFile,
              folder,
              documentType: field.name,
              targetUserId,
              authToken,
            });
            uploadedFileIds[field.name] = up.fileId;
          } else if (existing) {
            uploadedFileIds[field.name] =
              typeof existing === 'string' ? existing : existing.fileId;
          } else {
            uploadedFileIds[field.name] = null;
          }
        }
      }

      // 2) Build payload
      const payload = {};
      for (const field of fields) {
        if (isFileField(field)) {
          payload[field.name] = uploadedFileIds[field.name];
        } else {
          const raw = values[field.name];
          if (field.type === 'number') {
            payload[field.name] =
              raw === '' || raw === null || raw === undefined ? null : Number(raw);
          } else if (field.type === 'boolean') {
            payload[field.name] = !!raw;
          } else if (field.type === 'json') {
            try {
              payload[field.name] =
                typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch {
              throw new Error(
                `Le champ "${field.label || field.name}" doit être un JSON valide`,
              );
            }
          } else {
            payload[field.name] = raw;
          }
        }
      }

      // 3) POST or PATCH
      setUploadMessage(
        resubmitMode
          ? 'Mise à jour de votre demande…'
          : 'Enregistrement de la demande…',
      );

      const url = resubmitMode
        ? `${NEST_API_URL}/validation/requests/${existingRequestId}/resubmit`
        : `${NEST_API_URL}/validation/requests`;
      const method = resubmitMode ? 'PATCH' : 'POST';
      const requestPayload = resubmitMode
        ? {
            payload,
            comments: 'Corrections apportées par le membre',
          }
        : {
            targetId: targetUserId,
            targetType: schema?.targetType || 'User',
            schemaName: schema?.name || schema?.title,
            payload,
          };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'X-Client-Type': 'app',
        },
        body: JSON.stringify(requestPayload),
      });

      const raw = await res.json().catch(() => null);
      const data = unwrap(raw);

      if (!res.ok) {
        if (resubmitMode) {
          throw new Error(
            data?.message ||
              'Impossible de mettre à jour votre demande. Veuillez réessayer.',
          );
        }
        const msg = (data?.message || '').toLowerCase();
        if (
          res.status === 409 ||
          msg.includes('déjà') ||
          msg.includes('existe') ||
          msg.includes('already') ||
          msg.includes('en cours')
        ) {
          setAlreadyExists(true);
          setIsLoading(false);
          setUploadMessage('');
          return;
        }
        throw new Error(data?.message || "Erreur lors de l'enregistrement.");
      }

      const createdReqId =
        data?.id || data?._id || raw?.id || raw?.data?.id || existingRequestId;
      const generatedRef =
        data?.reference ||
        raw?.reference ||
        `REQ-${Date.now().toString(36).toUpperCase()}`;

      setSuccessRef(generatedRef);
      setSuccessData({
        id: createdReqId || `req-${Date.now()}`,
        title: schema?.name || schema?.title || 'Demande',
        reference: generatedRef,
        status: 'En cours',
        type: schema?.name || 'Demande',
        schemaName: schema?.name || schema?.title || 'Demande',
        resubmitted: resubmitMode,
      });
      showSuccess(
        resubmitMode
          ? 'Votre dossier a été mis à jour et renvoyé pour validation !'
          : 'Votre demande a été transmise avec succès !',
      );
    } catch (err) {
      console.warn('[SchemaFormModal] submit error:', err);
      setErrorMessage(
        err?.message ||
          "Une erreur est survenue lors de l'enregistrement de votre dossier.",
      );
    } finally {
      setIsLoading(false);
      setUploadMessage('');
    }
  };

  // ── render one payload field based on type/ui/validation ──
  const renderField = (field) => {
    const { name, label, type, validation = {}, ui = {} } = field;
    const displayLabel = label || name;
    const requiredMark = validation.required ? (
      <span className="text-rose-400 font-bold"> *</span>
    ) : null;

    // ── file field ──
    if (isFileField(field)) {
      const multi = isMultiFile(field);
      const existingVal = existingFiles[name];
      const newVal = newFiles[name];

      if (multi) {
        return (
          <div key={name} className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              {displayLabel}
              {requiredMark}
            </label>

            {Array.isArray(existingVal) &&
              existingVal.map((e, idx) => (
                <div
                  key={`ex-${idx}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {e?.name || `Fichier existant ${idx + 1}`}
                      </p>
                      <p className="text-xs text-emerald-400">Déjà téléversé</p>
                    </div>
                  </div>
                </div>
              ))}

            {Array.isArray(newVal) &&
              newVal.map((f, idx) => (
                <DocumentUploadSlot
                  key={`new-${idx}`}
                  title={displayLabel}
                  subtitle={`${f.name} (${formatBytes(f.size)})`}
                  icon={<Upload className="w-5 h-5 text-emerald-400" />}
                  docKey={`${name}-${idx}`}
                  file={f}
                  fileInputRef={{ current: null }}
                  isLoading={isLoading}
                  onFileChange={() => {}}
                  onRemove={() => removeNewFile(field, idx)}
                  formatSize={formatBytes}
                  disableSelect
                />
              ))}

            <label
              className={`block px-4 py-2.5 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 text-center text-xs text-[#94A3B8] cursor-pointer transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                className="hidden"
                accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png"
                disabled={isLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(field, f);
                  e.target.value = '';
                }}
              />
              <Upload className="w-4 h-4 inline-block mr-1.5" />
              Ajouter un fichier
            </label>
          </div>
        );
      }

      return (
        <div key={name}>
          <DocumentUploadSlot
            title={displayLabel}
            subtitle={ui.placeholder || 'PDF, JPG, PNG — 10 Mo max'}
            icon={<FileCheck className="w-5 h-5 text-emerald-400" />}
            docKey={name}
            file={newVal}
            fileInputRef={getFileRef(name)}
            isLoading={isLoading}
            onFileChange={(f) => handleFileChange(field, f)}
            onRemove={() => removeNewFile(field)}
            formatSize={formatBytes}
            existingFile={existingVal}
            onClearExisting={() => clearExisting(field)}
          />
        </div>
      );
    }

    // ── enum → select ──
    if (Array.isArray(validation.enum) && validation.enum.length > 0) {
      return (
        <div key={name}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
            {displayLabel}
            {requiredMark}
          </label>
          <select
            value={values[name] ?? ''}
            onChange={(e) => setFieldValue(name, e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 transition-all"
          >
            <option value="">— Sélectionner —</option>
            {validation.enum.map((opt) => (
              <option key={String(opt)} value={opt}>
                {String(opt)}
              </option>
            ))}
          </select>
          {ui.help && <p className="text-[11px] text-[#64748B] mt-1">{ui.help}</p>}
        </div>
      );
    }

    // ── boolean → toggle ──
    if (type === 'boolean') {
      return (
        <div
          key={name}
          className="flex items-center justify-between p-3 rounded-xl bg-[#0A0F1C] border border-white/10"
        >
          <div>
            <p className="text-sm font-medium text-white">
              {displayLabel}
              {requiredMark}
            </p>
            {ui.help && (
              <p className="text-xs text-[#94A3B8] mt-0.5">{ui.help}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFieldValue(name, !values[name])}
            disabled={isLoading}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${values[name] ? 'bg-emerald-500' : 'bg-[#334155]'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${values[name] ? 'translate-x-6' : ''}`}
            />
          </button>
        </div>
      );
    }

    // ── json / textarea ──
    if (type === 'json' || ui.widget === 'textarea') {
      return (
        <div key={name}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
            {displayLabel}
            {requiredMark}
          </label>
          <textarea
            rows={4}
            value={values[name] ?? ''}
            onChange={(e) => setFieldValue(name, e.target.value)}
            placeholder={ui.placeholder || ''}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white placeholder-[#64748B] outline-none focus:border-emerald-500 transition-all resize-none"
          />
          {ui.help && <p className="text-[11px] text-[#64748B] mt-1">{ui.help}</p>}
        </div>
      );
    }

    // ── date ──
    if (type === 'date') {
      return (
        <div key={name}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
            {displayLabel}
            {requiredMark}
          </label>
          <input
            type="date"
            value={values[name] ?? ''}
            onChange={(e) => setFieldValue(name, e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 transition-all"
          />
          {ui.help && <p className="text-[11px] text-[#64748B] mt-1">{ui.help}</p>}
        </div>
      );
    }

    // ── number ──
    if (type === 'number') {
      return (
        <div key={name}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
            {displayLabel}
            {requiredMark}
          </label>
          <input
            type="number"
            value={values[name] ?? ''}
            onChange={(e) => setFieldValue(name, e.target.value)}
            min={validation.min}
            max={validation.max}
            placeholder={ui.placeholder || ''}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white placeholder-[#64748B] outline-none focus:border-emerald-500 transition-all"
          />
          {ui.help && <p className="text-[11px] text-[#64748B] mt-1">{ui.help}</p>}
        </div>
      );
    }

    // ── default: text ──
    const inputType =
      ui.widget === 'email' ? 'email' : ui.widget === 'tel' ? 'tel' : 'text';
    const currentValue = values[name] ?? '';

    return (
      <div key={name}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            {displayLabel}
            {requiredMark}
          </label>
          {validation.maxLength && (
            <span
              className={`text-xs font-mono ${String(currentValue).length === validation.maxLength ? 'text-emerald-400' : 'text-[#64748B]'}`}
            >
              {String(currentValue).length}/{validation.maxLength}
            </span>
          )}
        </div>
        <input
          type={inputType}
          value={currentValue}
          onChange={(e) => setFieldValue(name, e.target.value)}
          placeholder={ui.placeholder || ''}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white placeholder-[#64748B] outline-none focus:border-emerald-500 transition-all"
        />
        {ui.help && <p className="text-[11px] text-[#64748B] mt-1">{ui.help}</p>}
      </div>
    );
  };

  // ── build confirm summary rows ──
  const confirmRows = [];
  for (const field of fields) {
    if (isFileField(field)) {
      const existing = existingFiles[field.name];
      const newFile = newFiles[field.name];
      const count = isMultiFile(field)
        ? (Array.isArray(newFile) && newFile.length > 0
            ? newFile.length
            : Array.isArray(existing)
              ? existing.length
              : 0)
        : newFile || existing
          ? 1
          : 0;
      confirmRows.push({
        key: field.name,
        label: field.label || field.name,
        value: `${count} fichier${count > 1 ? 's' : ''}`,
      });
    } else if (field.type === 'boolean') {
      confirmRows.push({
        key: field.name,
        label: field.label || field.name,
        value: values[field.name] ? 'Oui' : 'Non',
      });
    } else {
      const v = values[field.name];
      if (v === undefined || v === null || v === '') continue;
      confirmRows.push({
        key: field.name,
        label: field.label || field.name,
        value: String(v),
      });
    }
  }

  const formTitle = schema?.name || schema?.title || 'Formulaire de demande';
  const formDescription =
    schema?.description ||
    (resubmitMode
      ? 'Mettez à jour vos informations puis renvoyez votre dossier.'
      : 'Remplissez les informations demandées puis envoyez votre demande.');

  // ── MAIN MODAL ──
  const mainModal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1C]/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#182233]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {formTitle}
                {resubmitMode && (
                  <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Correction
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">{formDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={successRef ? handleSuccessClose : handleClose}
            disabled={isLoading}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successRef ? (
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {resubmitMode ? 'Dossier mis à jour !' : 'Demande bien transmise !'}
              </h3>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-md leading-relaxed">
                {resubmitMode
                  ? 'Votre dossier a été renvoyé pour validation. Il repasse par le circuit depuis la première étape.'
                  : 'Votre dossier a été transmis avec succès pour vérification.'}
              </p>
              <p className="text-xs text-[#64748B] mt-4 max-w-md">
                Vous pouvez suivre son état d'avancement et sa validation directement dans
                l'onglet "Validations".
              </p>
            </div>
          ) : alreadyExists ? (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 animate-in zoom-in">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Demande déjà existante !
              </h3>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-md leading-relaxed">
                Vous pouvez suivre son état d'avancement et sa validation directement
                dans l'onglet Validations.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handlePreSubmit}>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-200 font-medium leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              )}

              {resubmitMode && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 leading-relaxed">
                    Vous corrigez une demande existante. Remplacez les documents ou les
                    champs concernés puis envoyez à nouveau le dossier. Le traitement
                    reprendra depuis la première étape.
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  Les champs marqués d'un <span className="text-rose-400 font-bold">*</span>{' '}
                  sont obligatoires. Formats acceptés : PDF, JPG, PNG (Max 10 Mo par fichier).
                </div>
              </div>

              {fields.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                  Ce schéma n'a pas de <code>payloadSchema</code> défini — aucun champ à
                  afficher.
                </div>
              ) : (
                <div className="space-y-4">{fields.map(renderField)}</div>
              )}

              {isLoading && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <div className="text-xs text-emerald-200">
                    <span className="font-semibold block text-white">
                      Traitement en cours
                    </span>
                    {uploadMessage}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-[#182233]/40 flex items-center justify-end gap-3">
          {successRef ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSuccessClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSuccessGoToValidations}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                Suivre dans Validations
              </button>
            </div>
          ) : alreadyExists ? (
            <button
              type="button"
              onClick={() => {
                if (onGoToValidations) onGoToValidations();
                else handleClose();
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              Suivre dans Validations
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePreSubmit}
                disabled={isLoading || fields.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {resubmitMode ? 'Renvoyer mon dossier' : 'Envoyer la demande'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── CONFIRM MODAL ──
  const confirmationModal =
    showConfirmModal &&
    createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0F1C]/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
        <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {resubmitMode ? 'Confirmer la mise à jour' : 'Confirmation de la demande'}
            </h4>
            <p className="text-xs text-[#94A3B8] mt-1">
              {resubmitMode
                ? 'Êtes-vous sûr de vouloir renvoyer votre dossier corrigé ?'
                : 'Êtes-vous sûr de vouloir envoyer cette demande ?'}
            </p>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-[#0A0F1C] border border-white/10 space-y-2.5 text-xs max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Démarche :
              </span>
              <span className="font-semibold text-white">{formTitle}</span>
            </div>

            {confirmRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between text-[#94A3B8] gap-3"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{row.label} :</span>
                </span>
                <span className="font-mono font-semibold text-white text-right break-all">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {resubmitMode ? 'Confirmer et renvoyer' : 'Confirmer et envoyer'}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {mainModal}
      {confirmationModal}
    </>
  );
}