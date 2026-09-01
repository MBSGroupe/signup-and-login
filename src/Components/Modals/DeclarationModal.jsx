import { useState, useRef } from 'react';
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

export default function DeclarationModal({
  isOpen,
  onClose,
  targetUserId,
  authToken,
  onSuccess,
  schema = null
}) {
  const { showError, showSuccess } = useError();

  // State
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

  const fileInputRefs = {
    cnrc: useRef(null),
    paiement: useRef(null),
    cnas: useRef(null)
  };

  if (!isOpen) return null;

  // Reset form
  const resetForm = () => {
    setNin('');
    setDocuments({ cnrc: null, paiement: null, cnas: null });
    setIsLoading(false);
    setUploadMessage('');
    setShowConfirmModal(false);
    setErrorMessage(null);
    setAlreadyExists(false);
    setSuccessRef(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // File handlers
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
    if (fileInputRefs[docKey]?.current) {
      fileInputRefs[docKey].current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Upload single file with documentType
  const uploadSingleFile = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'declaration');
    formData.append('documentType', docType); // ✅ Added

    const uploadUrl = targetUserId 
      ? `${NEST_API_URL}/files/${targetUserId}`
      : `${NEST_API_URL}/files/upload/temp`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Échec du téléversement du document ${docType}`);
    }

    const uploaded = data.data?.file || data.data || data;
    return {
      fileId: uploaded.id || uploaded._id || uploaded.fileId,
      name: file.name,
      url: uploaded.url || uploaded.path,
      size: file.size,
      mimeType: file.type,
      docType
    };
  };

  // Pre-submit validation (shows confirmation modal)
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
      setErrorMessage("Veuillez joindre le document CNRC CNAS (Attestation d'affiliation).");
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  // Final submission after confirmation
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setErrorMessage(null);
    setAlreadyExists(false);
    setIsLoading(true);

    try {
      // 1. Upload the 3 files
      setUploadMessage('Téléversement des 3 documents justificatifs...');
      const [cnrcUploaded, paiementUploaded, cnasUploaded] = await Promise.all([
        uploadSingleFile(documents.cnrc, 'CNRC'),
        uploadSingleFile(documents.paiement, 'PAIEMENT'),
        uploadSingleFile(documents.cnas, 'CNAS')
      ]);

      // 2. Update user's NIN
      setUploadMessage('Mise à jour du NIN...');
      const cleanNin = nin.replace(/[^0-9]/g, '');
      const updateUserRes = await fetch(`${NEST_API_URL}/users/${targetUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ nin: cleanNin })
      });

      if (!updateUserRes.ok) {
        const errorData = await updateUserRes.json();
        throw new Error(errorData.message || 'Échec de la mise à jour du NIN');
      }

      // 3. Create validation request
      setUploadMessage('Enregistrement de la demande de Déclaration...');
      const schemaName = schema?.name || 'Declaration';
      const schemaId = schema?.id || schema?._id;

      const requestPayload = {
        targetId: targetUserId,
        targetType: schema?.targetType || 'User',
        schemaName: schemaName,
      };


      const res = await fetch(`${NEST_API_URL}/validation/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(requestPayload)
      });

      const data = await res.json();

      if (res.ok && (data.success || data.id || data.data)) {
        const generatedRef =
          data?.data?.reference ||
          data?.reference ||
          `DEC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        setSuccessRef(generatedRef);
        showSuccess('Demande de Déclaration soumise avec succès !');
        if (onSuccess) await onSuccess();
      } else {
        const errMsg = (data.message || data.error || '').toLowerCase();
        if (errMsg.includes('already') || errMsg.includes('exist') || errMsg.includes('déjà') || res.status === 409) {
          // Les fichiers et le NIN ont déjà été téléversés avec succès
          setSuccessRef(`DEC-2026-MAJ`);
          showSuccess('Vos documents et informations ont été mis à jour avec succès !');
          if (onSuccess) await onSuccess();
        } else {
          setErrorMessage(data.message || data.error || 'Erreur lors de la soumission de la demande.');
        }
      }
    } catch (err) {
      console.error('[DeclarationModal] Erreur soumission déclaration:', err);
      setErrorMessage(err.message || 'Erreur réseau lors de la soumission de la demande.');
    } finally {
      setIsLoading(false);
      setUploadMessage('');
    }
  };

  // ─── Main Modal ──────────────────────────────────────────────────────────
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
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Remplissez votre NIN et téléversez les 3 documents obligatoires
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successRef ? (
            /* Success screen */
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-in zoom-in">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Déclaration Transmise !
              </h3>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-md">
                Votre dossier de déclaration a été enregistré avec succès.
              </p>

              <p className="text-xs text-[#64748B] max-w-md">
                Vous pouvez suivre le traitement et les étapes de validation dans l'onglet "Validation".
              </p>
            </div>
          ) : alreadyExists ? (
            /* Already exists screen */
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 animate-in zoom-in">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Déclaration déjà existante !
              </h3>
              <p className="text-sm text-amber-200/90 mt-2 max-w-md leading-relaxed">
                Une déclaration de ce type est déjà en cours de traitement pour votre compte. Retrouvez tous ses détails dans l'onglet "Validation".
              </p>
            </div>
          ) : (
            /* Form */
            <form className="space-y-6" onSubmit={handlePreSubmit}>
              {/* Error message */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-200 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Info note */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  Tous les champs avec <span className="text-rose-400 font-bold">*</span> sont obligatoires. Formats acceptés : PDF, JPG, PNG (Max 10 Mo par fichier).
                </div>
              </div>

              {/* NIN field */}
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
                  className={`w-full px-4 py-3 bg-[#0A0F1C] border rounded-xl text-white placeholder-[#64748B] outline-none transition-all font-mono ${
                    nin.length === 18 ? 'border-emerald-500/50' : 'border-white/10'
                  }`}
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Votre identifiant unique figurant sur votre pièce d'identité biométrique.
                </p>
              </div>

              {/* Documents */}
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

              {/* Loading indicator */}
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
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Fermer
            </button>
          ) : alreadyExists ? (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Fermer
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
                    Envoyer la demande
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Confirmation Modal (Portal) ──────────────────────────────────────
  const confirmationModal = showConfirmModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0F1C]/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">
            Confirmation de la demande
          </h4>
          <p className="text-xs text-[#94A3B8] mt-1">
            Êtes-vous sûr de vouloir envoyer cette demande de déclaration ?
          </p>
        </div>

        {/* Récapitulatif */}
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
            Confirmer et envoyer
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
      className={`p-3.5 rounded-xl border transition-all ${
        file
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
              className={`px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer select-none active:scale-95 ${
                isLoading ? 'opacity-50 pointer-events-none' : ''
              }`}
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