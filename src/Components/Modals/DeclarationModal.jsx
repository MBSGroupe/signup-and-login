// src/Components/Modals/DeclarationModal.jsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  FileCheck,
  Shield,
  CreditCard,
  Building2,
  Info,
  HelpCircle,
  Paperclip
} from 'lucide-react';
import { useError } from '../../Context/ErrorContext';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Unwrap the ResponseInterceptor envelope
const unwrap = (body) =>
  body && typeof body === 'object' && 'data' in body && 'success' in body
    ? body.data
    : body;

// Derive a stable, human-friendly folder name from the schema name.
//   "Déclaration" → "declaration"
//   "Changement d'adresse" → "changement-d-adresse"
const getSchemaFolder = (sch) => {
  const raw = (sch?.name || sch?.title || 'declaration').toString();
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'declaration'
  );
};

export default function DeclarationModal({
  isOpen,
  onClose,
  onGoToValidations = null,
  targetUserId,
  authToken,
  onSuccess,
  schema = null,
  existingRequestId = null,
  resubmitMode = false,          // ← NEW: true when correcting an existing request
  initialNin = '',
  user = null,
  validationRequests = []
}) {
  const { showSuccess } = useError();

  const [nin, setNin] = useState('');
  const [documents, setDocuments] = useState({
    cnrc: null,
    paiement: null,
    cnas: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const fileInputRefs = {
    cnrc: useRef(null),
    paiement: useRef(null),
    cnas: useRef(null)
  };

  useEffect(() => {
    if (isOpen) {
      if (initialNin) {
        setNin(String(initialNin).replace(/[^0-9]/g, '').slice(0, 18));
      } else if (user?.nin) {
        setNin(String(user.nin).replace(/[^0-9]/g, '').slice(0, 18));
      }
    }
  }, [isOpen, initialNin, user?.nin]);

  if (!isOpen) return null;

  const resetForm = () => {
    setNin('');
    setDocuments({ cnrc: null, paiement: null, cnas: null });
    setIsLoading(false);
    setUploadMessage('');
    setShowConfirmModal(false);
    setErrorMessage(null);
    setAlreadyExists(false);
    setSuccessRef(null);
    setSuccessData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSuccessClose = () => {
    const dataToPass = successData;
    handleClose();
    if (onSuccess && dataToPass) onSuccess(dataToPass);
  };

  const handleSuccessGoToValidations = () => {
    const dataToPass = successData;
    resetForm();
    if (onGoToValidations) onGoToValidations();
    else onClose();
    if (onSuccess && dataToPass) onSuccess(dataToPass);
  };

  const handleFileChange = (docKey, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`Le fichier pour ${docKey.toUpperCase()} dépasse la taille maximale autorisée (10 Mo).`);
      return;
    }
    setErrorMessage(null);
    setDocuments(prev => ({ ...prev, [docKey]: file }));
  };

  const removeFile = (docKey) => {
    setDocuments(prev => ({ ...prev, [docKey]: null }));
    if (fileInputRefs[docKey]?.current) fileInputRefs[docKey].current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const uploadSingleFile = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', getSchemaFolder(schema));
    formData.append('documentType', docType);

    const uploadUrl = targetUserId
      ? `${NEST_API_URL}/files/${targetUserId}`
      : `${NEST_API_URL}/files/upload/temp`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Client-Type': 'app',
      },
      body: formData
    });

    const raw = await res.json();
    const data = unwrap(raw);
    if (!res.ok) {
      throw new Error(data?.message || `Échec du téléversement du document ${docType}`);
    }

    const uploaded = data?.file || data;
    return {
      fileId: uploaded.id || uploaded._id || uploaded.fileId,
      name: file.name,
      url: uploaded.url || uploaded.path,
      size: file.size,
      mimeType: file.type,
      docType
    };
  };

  const isDeclarationRequestActive = (req) => {
    if (!req) return false;
    const name = (
      req.schemaName ||
      req.schema?.name ||
      req.schema?.title ||
      req.schemaVersion?.name ||
      req.schemaVersion?.schema?.name ||
      req.validationSchema?.name ||
      req.title ||
      req.name ||
      req.type ||
      ''
    ).toLowerCase();

    const isDecl = name.includes('déclaration') || name.includes('declaration');
    const status = String(req.status || '').toLowerCase();
    const isInactive = ['rejected', 'cancelled', 'rejete', 'rejetee', 'annule', 'annulee', 'refused'].includes(status);

    return isDecl && !isInactive;
  };

  const handlePreSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanNin = nin.replace(/[^0-9]/g, '');
    if (!cleanNin) {
      setErrorMessage("Veuillez saisir votre Numéro d'Identification Nationale (NIN).");
      return;
    }
    if (cleanNin.length !== 18) {
      setErrorMessage(`Le NIN doit comporter exactement 18 chiffres (actuellement ${cleanNin.length}/18).`);
      return;
    }
    if (!documents.cnrc) {
      setErrorMessage("Veuillez joindre le document CNRC (Registre de Commerce).");
      return;
    }
    if (!documents.paiement) {
      setErrorMessage("Veuillez joindre le document de paiement (Quittance / Reçu).");
      return;
    }
    if (!documents.cnas) {
      setErrorMessage("Veuillez joindre le document CNAS (Attestation d'affiliation).");
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  // ─────────────────────────────────────────────────────────────────
  // Submission — aligned with the ValidationService contract.
  //   - Fresh request : POST  /validation/requests
  //   - Resubmission  : PATCH /validation/requests/:id/resubmit
  //   In both cases the 3 files are uploaded first, then the bare fileIds
  //   are sent in the payload. The backend resolves them on read.
  // ─────────────────────────────────────────────────────────────────
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setErrorMessage(null);
    setAlreadyExists(false);
    setIsLoading(true);

    try {
      const schemaName = schema?.name || schema?.title || 'Déclaration';
      const cleanNin = nin.replace(/[^0-9]/g, '');

      // ── ÉTAPE 1 : Guards (skipped entirely on resubmit) ───────────
      if (!resubmitMode) {
        if (existingRequestId) {
          setAlreadyExists(true);
          setIsLoading(false);
          setUploadMessage('');
          return;
        }

        if (Array.isArray(validationRequests) && validationRequests.some(isDeclarationRequestActive)) {
          setAlreadyExists(true);
          setIsLoading(false);
          setUploadMessage('');
          return;
        }

        setUploadMessage('Vérification de votre dossier...');
        try {
          const checkRes = await fetch(
            `${NEST_API_URL}/validation/requests/user/${targetUserId}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'X-Client-Type': 'app',
              },
            },
          );

          if (checkRes.ok) {
            const raw = await checkRes.json();
            const data = unwrap(raw);
            const userRequestsList = Array.isArray(data)
              ? data
              : data?.requests || data?.data || [];

            if (
              Array.isArray(userRequestsList) &&
              userRequestsList.some(isDeclarationRequestActive)
            ) {
              setAlreadyExists(true);
              setIsLoading(false);
              setUploadMessage('');
              return;
            }
          }
        } catch (errCheck) {
          console.warn('[DeclarationModal] Contrôle préventif silencieux:', errCheck);
        }
      } else if (!existingRequestId) {
        // Resubmit mode but no request ID — impossible state; bail out safely.
        setErrorMessage(
          "Impossible de retrouver la demande à corriger. Veuillez recharger la page.",
        );
        setIsLoading(false);
        return;
      }

      // ── ÉTAPE 2 : Upload des 3 fichiers ───────────────────────────
      setUploadMessage('Téléversement des 3 documents justificatifs...');
      const [cnrcFile, paiementFile, cnasFile] = await Promise.all([
        uploadSingleFile(documents.cnrc, 'CNRC'),
        uploadSingleFile(documents.paiement, 'PAIEMENT'),
        uploadSingleFile(documents.cnas, 'CNAS'),
      ]);

      // ── ÉTAPE 3 : Construction du payload ─────────────────────────
      const payload = {
        nin: cleanNin,
        cnrc: cnrcFile.fileId,
        paiement: paiementFile.fileId,
        cnas: cnasFile.fileId,
      };

      // ── ÉTAPE 4 : POST (fresh) ou PATCH (resubmit) ────────────────
      setUploadMessage(
        resubmitMode
          ? 'Mise à jour de votre demande...'
          : 'Enregistrement de la nouvelle demande...',
      );

      let url;
      let method;
      let requestPayload;

      if (resubmitMode) {
        url = `${NEST_API_URL}/validation/requests/${existingRequestId}/resubmit`;
        method = 'PATCH';
        requestPayload = {
          payload,
          comments: 'Corrections apportées par le membre',
        };
      } else {
        url = `${NEST_API_URL}/validation/requests`;
        method = 'POST';
        requestPayload = {
          targetId: targetUserId,
          targetType: schema?.targetType || 'User',
          schemaName: schemaName,
          payload,
        };
      }

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
      console.log('[DeclarationModal] request response', res.status, raw);
      const data = unwrap(raw);

      if (!res.ok) {
        // On resubmit, surface the real error instead of the "already exists" screen.
        if (resubmitMode) {
          throw new Error(
            data?.message ||
              'Impossible de mettre à jour votre demande. Veuillez réessayer.',
          );
        }
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      const createdReqId =
        data?.id || data?._id || raw?.id || raw?.data?.id || existingRequestId;
      const generatedRef =
        data?.reference ||
        raw?.reference ||
        `DEC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // ── Succès ────────────────────────────────────────────────────
      setSuccessRef(generatedRef);
      setSuccessData({
        id: createdReqId || `doc-${Date.now()}`,
        title: schemaName,
        reference: generatedRef,
        nin: cleanNin,
        status: 'En cours',
        type: 'Déclaration',
        schemaName: schemaName,
        resubmitted: resubmitMode,
      });
      showSuccess(
        resubmitMode
          ? 'Votre dossier a été mis à jour et renvoyé pour validation !'
          : 'Votre demande de déclaration a été transmise avec succès !',
      );
    } catch (err) {
      console.warn('[DeclarationModal] Erreur soumission déclaration:', err);
      const msg = (err?.message || '').toLowerCase();
      if (
        !resubmitMode &&
        (msg.includes('already') ||
          msg.includes('exist') ||
          msg.includes('déjà') ||
          msg.includes('en cours'))
      ) {
        setAlreadyExists(true);
      } else {
        setErrorMessage(
          err?.message ||
            "Une erreur est survenue lors de l'enregistrement de votre dossier.",
        );
      }
    } finally {
      setIsLoading(false);
      setUploadMessage('');
    }
  };

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
                {schema?.name || 'Formulaire de Déclaration'}
                {resubmitMode && (
                  <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Correction
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {resubmitMode
                  ? 'Mettez à jour vos informations puis renvoyez votre dossier.'
                  : 'Remplissez votre NIN et téléversez les 3 documents obligatoires'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={successRef ? handleSuccessClose : handleClose}
            disabled={isLoading}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
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
                  : 'Votre dossier de déclaration a été transmis avec succès pour vérification.'}
              </p>
              <p className="text-xs text-[#64748B] mt-4 max-w-md">
                Vous pouvez suivre son état d'avancement et sa validation directement dans l'onglet "Validations".
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
                Vous pouvez suivre son état d'avancement et sa validation directement dans l'onglet Validations.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handlePreSubmit}>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-200 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {resubmitMode && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 leading-relaxed">
                    Vous corrigez une demande existante. Remplacez les documents ou le NIN
                    concernés puis envoyez à nouveau le dossier. Le traitement reprendra
                    depuis la première étape.
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  Tous les champs avec <span className="text-rose-400 font-bold">*</span> sont obligatoires. Formats acceptés : PDF, JPG, PNG (Max 10 Mo par fichier).
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    NIN <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-xs font-mono ${nin.length === 18 ? 'text-emerald-400' : 'text-[#64748B]'}`}>
                    {nin.length}/18
                  </span>
                </div>
                <input
                  type="text"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/[^0-9]/g, '').slice(0, 18))}
                  placeholder="18 chiffres"
                  disabled={isLoading}
                  className={`w-full px-4 py-3 bg-[#0A0F1C] border rounded-xl text-white placeholder-[#64748B] outline-none transition-all font-mono ${nin.length === 18 ? 'border-emerald-500/50' : 'border-white/10'}`}
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Votre identifiant unique figurant sur votre pièce d'identité biométrique.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Documents obligatoires <span className="text-rose-400">*</span>
                </h3>
                <div className="grid grid-cols-1 gap-3.5">
                  <DocumentUploadSlot
                    title="CNRC"
                    subtitle="Registre du Commerce"
                    icon={<Building2 className="w-5 h-5 text-emerald-400" />}
                    docKey="cnrc"
                    file={documents.cnrc}
                    fileInputRef={fileInputRefs.cnrc}
                    isLoading={isLoading}
                    onFileChange={(f) => handleFileChange('cnrc', f)}
                    onRemove={() => removeFile('cnrc')}
                    formatSize={formatFileSize}
                  />
                  <DocumentUploadSlot
                    title="Paiement"
                    subtitle="Quittance / Reçu"
                    icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
                    docKey="paiement"
                    file={documents.paiement}
                    fileInputRef={fileInputRefs.paiement}
                    isLoading={isLoading}
                    onFileChange={(f) => handleFileChange('paiement', f)}
                    onRemove={() => removeFile('paiement')}
                    formatSize={formatFileSize}
                  />
                  <DocumentUploadSlot
                    title="CNAS"
                    subtitle="Attestation d'affiliation"
                    icon={<FileCheck className="w-5 h-5 text-emerald-400" />}
                    docKey="cnas"
                    file={documents.cnas}
                    fileInputRef={fileInputRefs.cnas}
                    isLoading={isLoading}
                    onFileChange={(f) => handleFileChange('cnas', f)}
                    onRemove={() => removeFile('cnas')}
                    formatSize={formatFileSize}
                  />
                </div>
              </div>

              {isLoading && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <div className="text-xs text-emerald-200">
                    <span className="font-semibold block text-white">Traitement en cours</span>
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
                disabled={isLoading}
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

  const confirmationModal = showConfirmModal && createPortal(
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
              : 'Êtes-vous sûr de vouloir envoyer cette demande de déclaration ?'}
          </p>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-[#0A0F1C] border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Démarche :</span>
            <span className="font-semibold text-white">{schema?.name || 'Déclaration'}</span>
          </div>
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-400" /> NIN :</span>
            <span className="font-mono font-semibold text-white">{nin}</span>
          </div>
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-400" /> Pièces jointes :</span>
            <span className="font-semibold text-emerald-400">3 documents fournis</span>
          </div>
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
    document.body
  );

  return (
    <>
      {mainModal}
      {confirmationModal}
    </>
  );
}

// ─── Document Upload Slot ──────────────────────────────────────────────
function DocumentUploadSlot({
  title,
  subtitle,
  icon,
  docKey,
  file,
  fileInputRef,
  isLoading,
  onFileChange,
  onRemove,
  formatSize
}) {
  const id = `file-${docKey}`;

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${file
        ? 'bg-emerald-500/5 border-emerald-500/30'
        : 'bg-[#0A0F1C] border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-white/5 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate flex items-center gap-2">
              {title}
              {file ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" /> Fichier sélectionné
                </span>
              ) : (
                <span className="text-rose-400 font-bold text-xs">*</span>
              )}
            </p>
            <p className="text-xs text-[#94A3B8] truncate">
              {file ? `${file.name} (${formatSize(file.size)})` : subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            id={id}
            type="file"
            ref={fileInputRef}
            onChange={(e) => onFileChange(e.target.files?.[0])}
            accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={isLoading}
          />

          {file ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={isLoading}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
              title="Supprimer le fichier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <label
              htmlFor={id}
              className={`px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer select-none active:scale-95 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Choisir
            </label>
          )}
        </div>
      </div>
    </div>
  );
}