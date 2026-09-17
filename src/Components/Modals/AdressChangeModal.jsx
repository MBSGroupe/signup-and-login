import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Info,
  HelpCircle,
  MapPinned,
  Home,
  Briefcase,
} from 'lucide-react';
import { useError } from '../../Context/ErrorContext';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function AddressChangeModal({
  isOpen,
  onClose,
  onGoToValidations = null,
  targetUserId,
  authToken,
  onSuccess,
  schema = null,
  existingRequestId = null,
  user = null,
  validationRequests = [],
}) {
  const { showSuccess } = useError();

  // ─── State ──────────────────────────────────────────────────────────────
  const [adressePro, setAdressePro] = useState('');
  const [adressePersonnelle, setAdressePersonnelle] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // ─── Prefill from user on open ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (user?.adressePro) setAdressePro(String(user.adressePro));
      if (user?.adressePersonnelle) setAdressePersonnelle(String(user.adressePersonnelle));
    }
  }, [isOpen, user?.adressePro, user?.adressePersonnelle]);

  if (!isOpen) return null;

  // ─── Reset ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setAdressePro('');
    setAdressePersonnelle('');
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

  // ─── Detect existing active address-change request ──────────────────────
  const isAddressRequestActive = (req) => {
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

    const isAddr = name.includes('adresse') || name.includes('address');
    const status = String(req.status || '').toLowerCase();
    const isInactive = ['rejected', 'cancelled', 'rejete', 'rejetee', 'annule', 'annulee', 'refused'].includes(status);

    return isAddr && !isInactive;
  };

  // ─── Pre-submit validation ──────────────────────────────────────────────
  const handlePreSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanPro = adressePro.trim();
    const cleanPerso = adressePersonnelle.trim();

    if (!cleanPro) {
      setErrorMessage("Veuillez renseigner l'adresse professionnelle.");
      return;
    }
    if (!cleanPerso) {
      setErrorMessage("Veuillez renseigner l'adresse personnelle.");
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  // ─── Confirm submission ─────────────────────────────────────────────────
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setErrorMessage(null);
    setAlreadyExists(false);
    setIsLoading(true);

    try {
      const schemaName = schema?.name || schema?.title || "Changement d'adresse";
      const cleanPro = adressePro.trim();
      const cleanPerso = adressePersonnelle.trim();

      // ── STEP 1: Pre-check existing request ────────────────────────────────
      if (existingRequestId) {
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      if (Array.isArray(validationRequests) && validationRequests.some(isAddressRequestActive)) {
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      // ── STEP 1.3: Live API check ──────────────────────────────────────────
      setUploadMessage('Vérification de votre dossier...');
      try {
        const checkRes = await fetch(
          `${NEST_API_URL}/validation/requests/user/${targetUserId}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        if (checkRes.ok) {
          const userRequestsData = await checkRes.json();
          const userRequestsList = Array.isArray(userRequestsData)
            ? userRequestsData
            : (userRequestsData?.data || userRequestsData?.requests || []);

          if (Array.isArray(userRequestsList) && userRequestsList.some(isAddressRequestActive)) {
            setAlreadyExists(true);
            setIsLoading(false);
            setUploadMessage('');
            return;
          }
        }
      } catch (errCheck) {
        console.warn('[AddressChangeModal] Contrôle préventif silencieux:', errCheck);
      }

      // ── STEP 2: Create the validation request ─────────────────────────────
      setUploadMessage('Enregistrement de la nouvelle demande...');
      const requestPayload = {
        targetId: targetUserId,
        targetType: schema?.targetType || 'User',
        schemaName: schemaName,
        // Attach the address payload so the backend/validation steps can consume it
        data: {
          adressePro: cleanPro,
          adressePersonnelle: cleanPerso,
        },
      };

      const res = await fetch(`${NEST_API_URL}/validation/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAlreadyExists(true);
        setIsLoading(false);
        setUploadMessage('');
        return;
      }

      const createdReqId = data?.data?.id || data?.id || data?.data?._id || data?._id;
      const generatedRef =
        data?.data?.reference ||
        data?.reference ||
        `ADR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // ── STEP 3: Success ───────────────────────────────────────────────────
      setSuccessRef(generatedRef);
      setSuccessData({
        id: createdReqId || existingRequestId || `addr-${Date.now()}`,
        title: schemaName,
        reference: generatedRef,
        adressePro: cleanPro,
        adressePersonnelle: cleanPerso,
        status: 'En cours',
        type: "Changement d'adresse",
        schemaName: schemaName,
      });
      showSuccess("Votre demande de changement d'adresse a été transmise avec succès !");
    } catch (err) {
      console.warn('[AddressChangeModal] Erreur soumission changement adresse:', err);
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

  // ─── Main Modal ─────────────────────────────────────────────────────────
  const mainModal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1C]/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#182233]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <MapPinned className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {schema?.name || "Changement d'adresse"}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Renseignez vos adresses professionnelle et personnelle
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
            /* SUCCESS SCREEN */
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Demande bien transmise !
              </h3>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-md leading-relaxed">
                Votre demande de changement d'adresse a été transmise avec succès pour vérification.
              </p>
              <p className="text-xs text-[#64748B] mt-4 max-w-md">
                Vous pouvez suivre son état d'avancement et sa validation directement dans l'onglet "Validations".
              </p>
            </div>
          ) : alreadyExists ? (
            /* ALREADY EXISTS SCREEN */
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
            /* FORM */
            <form className="space-y-6" onSubmit={handlePreSubmit}>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-200 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  Tous les champs avec <span className="text-rose-400 font-bold">*</span> sont obligatoires.
                </div>
              </div>

              {/* Adresse professionnelle */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                  Adresse professionnelle <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adressePro}
                  onChange={(e) => setAdressePro(e.target.value)}
                  placeholder="Renseignez votre adresse professionnelle..."
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white placeholder-[#64748B] outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
              </div>

              {/* Adresse personnelle */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-sky-400" />
                  Adresse personnelle <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adressePersonnelle}
                  onChange={(e) => setAdressePersonnelle(e.target.value)}
                  placeholder="Renseignez votre adresse personnelle..."
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-xl text-white placeholder-[#64748B] outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
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

  // ─── Confirmation Modal (Portal) ────────────────────────────────────────
  const confirmationModal = showConfirmModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0F1C]/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">
            Confirmation de la demande
          </h4>
          <p className="text-xs text-[#94A3B8] mt-1">
            Êtes-vous sûr de vouloir envoyer cette demande de changement d'adresse ?
          </p>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-[#0A0F1C] border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" /> Démarche :
            </span>
            <span className="font-semibold text-white">{schema?.name || "Changement d'adresse"}</span>
          </div>
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex items-start justify-between gap-3 text-[#94A3B8]">
              <span className="shrink-0">Adresse pro. :</span>
              <span className="text-right font-medium text-[#CBD5E1] line-clamp-2">{adressePro}</span>
            </div>
            <div className="flex items-start justify-between gap-3 text-[#94A3B8]">
              <span className="shrink-0">Adresse perso. :</span>
              <span className="text-right font-medium text-[#CBD5E1] line-clamp-2">{adressePersonnelle}</span>
            </div>
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