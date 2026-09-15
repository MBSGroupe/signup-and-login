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

export default function DeclarationModal({
  isOpen,
  onClose,
  onGoToValidations = null,
  targetUserId,
  authToken,
  onSuccess,
  schema = null,
  existingRequestId = null,
  // 🟢 [MODIFICATION] Récupération du NIN initial pour pré-remplir le formulaire
  initialNin = '',
  user = null,
  validationRequests = []
}) {
  const { showSuccess } = useError();

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
  // 🟢 [MODIFICATION] Données de la demande créée pour transmission lors de la fermeture
  const [successData, setSuccessData] = useState(null);

  const fileInputRefs = {
    cnrc: useRef(null),
    paiement: useRef(null),
    cnas: useRef(null)
  };

  // 🟢 [MODIFICATION] Pré-remplissage automatique du NIN à l'ouverture du modal si disponible
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
    setSuccessData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 🟢 [MODIFICATION] Fermeture après succès et transmission du callback parent
  const handleSuccessClose = () => {
    const dataToPass = successData;
    handleClose();
    if (onSuccess && dataToPass) {
      onSuccess(dataToPass);
    }
  };

  // 🟢 [MODIFICATION] Bascule vers les validations après affichage du message de succès
  const handleSuccessGoToValidations = () => {
    const dataToPass = successData;
    resetForm();
    if (onGoToValidations) {
      onGoToValidations();
    } else {
      onClose();
    }
    if (onSuccess && dataToPass) {
      onSuccess(dataToPass);
    }
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

  // 🟢 [FONCTION DE VÉRIFICATION] : Détecte si une demande de déclaration est déjà active
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

    const isDecl =
      name.includes('déclaration') ||
      name.includes('declaration');

    const status = String(req.status || '').toLowerCase();
    const isInactive = ['rejected', 'cancelled', 'rejete', 'rejetee', 'annule', 'annulee', 'refused'].includes(status);

    return isDecl && !isInactive;
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
      const schemaName = schema?.name || schema?.title || 'Déclaration';

      // ─────────────────────────────────────────────────────────────────────────
      // 🟢 ÉTAPE 1 : VÉRIFICATION PRÉALABLE D'UNE DEMANDE DÉJÀ EXISTANTE
      // On s'assure qu'AUCUN fichier n'est téléversé et que le NIN n'est JAMAIS modifié
      // si une demande existe déjà dans l'état local ou distant.
      // ─────────────────────────────────────────────────────────────────────────

      // 1.1. Vérification via existingRequestId
      if (existingRequestId) {
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      // 1.2. Vérification via la liste validationRequests transmise en props
      if (Array.isArray(validationRequests) && validationRequests.some(isDeclarationRequestActive)) {
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      // 1.3. Vérification directe en temps réel auprès de l'API utilisateur
      setUploadMessage('Vérification de votre dossier...');
      try {
        const checkRes = await fetch(`${NEST_API_URL}/validation/requests/user/${targetUserId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });

        if (checkRes.ok) {
          const userRequestsData = await checkRes.json();
          const userRequestsList = Array.isArray(userRequestsData)
            ? userRequestsData
            : (userRequestsData?.data || userRequestsData?.requests || []);

          if (Array.isArray(userRequestsList) && userRequestsList.some(isDeclarationRequestActive)) {
            // 🛑 [DEMANDE DÉJÀ EXISTANTE DANS LA BDD]
            setAlreadyExists(true);
            setIsLoading(false);
            setUploadMessage('');
            return;
          }
        }
      } catch (errCheck) {
        console.warn('[DeclarationModal] Contrôle préventif silencieux:', errCheck);
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 🟢 ÉTAPE 2 : ENREGISTREMENT DE LA NOUVELLE DEMANDE AUPRÈS DU BACKEND
      // On envoie le payload standard (targetId, targetType, schemaName).
      // Si le backend refuse ou signale un doublon, on affiche l'écran dédié.
      // ─────────────────────────────────────────────────────────────────────────
      setUploadMessage('Enregistrement de la nouvelle demande...');
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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // 🛑 [REFUS DU BACKEND / DEMANDE DÉJÀ EXISTANTE]
        // On affiche immédiatement l'écran "Demande déjà existante !"
        // SANS afficher de bandeau d'erreur rouge et SANS toucher au NIN ni aux fichiers !
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      const createdReqId = data?.data?.id || data?.id || data?.data?._id || data?._id;
      const generatedRef =
        data?.data?.reference ||
        data?.reference ||
        `DEC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // ─────────────────────────────────────────────────────────────────────────
      // 🟢 ÉTAPE 3 : LA NOUVELLE DEMANDE EST CONFIRMÉE ET ACCEPTÉE
      // Maintenant et UNIQUEMENT maintenant que la demande est créée avec succès :
      // 3.1. On met à jour le NIN
      // 3.2. On téléverse les 3 fichiers justificatifs
      // ─────────────────────────────────────────────────────────────────────────
      // 3.1. Mise à jour du NIN de l'utilisateur
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
        const errorData = await updateUserRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Échec de la mise à jour du NIN');
      }

      // 3.2. Téléversement des 3 documents justificatifs
      setUploadMessage('Téléversement des 3 documents justificatifs...');
      await Promise.all([
        uploadSingleFile(documents.cnrc, 'CNRC'),
        uploadSingleFile(documents.paiement, 'PAIEMENT'),
        uploadSingleFile(documents.cnas, 'CNAS')
      ]);

      // 3.3. Confirmation de succès
      setSuccessRef(generatedRef);
      setSuccessData({
        id: createdReqId || existingRequestId || `doc-${Date.now()}`,
        title: schemaName,
        reference: generatedRef,
        nin: cleanNin,
        status: 'En cours',
        type: 'Déclaration',
        schemaName: schemaName,
      });
      showSuccess('Votre demande de déclaration a été transmise avec succès !');
    } catch (err) {
      console.warn('[DeclarationModal] Erreur soumission déclaration:', err);
      // 🛑 En cas d'erreur de duplication, afficher l'écran dédié, sinon afficher le message d'erreur
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exist') || msg.includes('déjà') || msg.includes('en cours')) {
        setAlreadyExists(true);
      } else {
        setErrorMessage(err?.message || "Une erreur est survenue lors de l'enregistrement de votre dossier.");
      }
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
            /* 🟢 [MODIFICATION] Écran dédié : Demande bien transmise avec succès */
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Demande bien transmise !
              </h3>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-md leading-relaxed">
                Votre dossier de déclaration a été transmis avec succès pour vérification.
              </p>

              <p className="text-xs text-[#64748B] mt-4 max-w-md">
                Vous pouvez suivre son état d'avancement et sa validation directement dans l'onglet "Validations".
              </p>
            </div>
          ) : alreadyExists ? (
            /* 🟢 [MODIFICATION] Écran dédié : Demande déjà existante */
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
                  className={`w-full px-4 py-3 bg-[#0A0F1C] border rounded-xl text-white placeholder-[#64748B] outline-none transition-all font-mono ${nin.length === 18 ? 'border-emerald-500/50' : 'border-white/10'
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
            /* 🟢 [MODIFICATION] Boutons de confirmation sur l'écran de succès */
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
            /* 🟢 [MODIFICATION] Bouton permettant de basculer immédiatement vers l'onglet Validations */
            <button
              type="button"
              onClick={() => {
                if (onGoToValidations) {
                  onGoToValidations();
                } else {
                  handleClose();
                }
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
              className={`px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer select-none active:scale-95 ${isLoading ? 'opacity-50 pointer-events-none' : ''
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