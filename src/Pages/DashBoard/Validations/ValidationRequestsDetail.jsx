import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import { useApi } from '../../../hooks/useApi';
import { useError } from '../../../Context/ErrorContext';
import BackButton from '../../../Components/Buttons/BackButton';
import FilePreviewWithZoom from '../../../Components/FilePreviewWithZoom';
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  FileText,
  CreditCard,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  SkipForward,
  Eye,
  Info,
  ArrowRight,
  Check,
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  BookOpen,
  Award,
  Save,
  Edit3
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Prebuilt comments list ────────────────────────────────────────────
const PREBUILT_COMMENTS = [
  "Document conforme aux exigences.",
  "Pièce justificative manquante.",
  "Information incomplète – veuillez compléter.",
  "Vérification effectuée avec succès.",
  "Signature absente – veuillez signer.",
  "Date de validité expirée.",
  "Téléchargement de document accepté.",
  "Demande de modifications envoyée.",
  "Dossier complet – prêt pour approbation.",
  "Dossier en attente de pièces supplémentaires.",
];

// --- Field definitions for user display (same as ProfilePage) ---
const USER_FIELDS = [
  { key: 'name', label: 'Nom', icon: User },
  { key: 'lastname', label: 'Prénom', icon: User },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'phone', label: 'Téléphone', icon: Phone },
  { key: 'sexe', label: 'Sexe', icon: User },
  { key: 'dateOfBirth', label: 'Date de naissance', icon: Calendar },
  { key: 'lieuNaissance', label: 'Lieu de naissance', icon: MapPin },
  { key: 'profession', label: 'Profession', icon: Briefcase },
  { key: 'specialty', label: 'Spécialité', icon: Award },
  { key: 'registrationNumber', label: "N° d'inscription", icon: BookOpen },
  { key: 'wilaya', label: 'CLOA', icon: MapPin },
  { key: 'commune', label: 'Commune', icon: MapPin },
  { key: 'adressePersonnelle', label: 'Adresse personnelle', icon: MapPin },
  { key: 'adressePro', label: 'Adresse professionnelle', icon: MapPin },
  { key: 'civility', label: 'Civilité', icon: User },
  { key: 'maritalStatus', label: 'Situation familiale', icon: User },
  { key: 'nationality', label: 'Nationalité', icon: User },
  { key: 'serviceNationalStatus', label: 'Service national', icon: Shield },
  { key: 'professionalMode', label: "Mode d'exercice", icon: Briefcase },
  { key: 'registrationStatus', label: "Statut d'inscription", icon: CheckCircle },
  { key: 'role', label: 'Rôle', icon: Shield },
  { key: 'status', label: 'Statut', icon: CheckCircle },
];

export default function ValidationRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { callApi } = useApi();
  const { showWarning } = useError();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState({});
  const [isCustomComment, setIsCustomComment] = useState({}); // track if "other" is selected

  // --- Target user / file data for verification steps ---
  const [targetUserData, setTargetUserData] = useState(null);
  const [targetFiles, setTargetFiles] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);

  // --- Edit state ---
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  // --- Batch edit state ---
  const [localEdits, setLocalEdits] = useState({});
  const [savingEdits, setSavingEdits] = useState(false);

  // --- Permissions ---
  const [allowedFields, setAllowedFields] = useState(null);

  const getTargetDisplay = (targetType, target) => {
    if (!target) return 'N/A';
    switch (targetType) {
      case 'User':
        return target.fullName || `${target.name || ''} ${target.lastname || ''}`.trim() || target.id;
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return target.type || target.feeType || `Cotisation ${target.year || ''}` || target.id;
      default:
        return typeof target === 'object' ? target.id : target;
    }
  };

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/request/${id}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        return res;
      }, { showSuccessMessage: false });

      if (result) {
        setRequest(result);

        if (result.targetType === 'User') {
          setTargetLoading(true);
          const targetUserId = result.targetId?.id || result.targetId;
          const userRes = await callApi(async () => {
            const res = await fetchWithRefresh(
              `${API_URL}/users/${targetUserId}`,
              { method: 'GET' },
              authData.token,
              setAuthData
            );
            return res;
          }, { showSuccessMessage: false });
          if (userRes && userRes.user) {
            setTargetUserData(userRes.user);
            setTargetFiles(userRes.user.files || []);
            try {
              const permRes = await fetchWithRefresh(
                `${API_URL}/permissions/user/${targetUserId}/viewable-fields?model=User`,
                { method: 'GET' },
                authData.token,
                setAuthData
              );
              const permData = await permRes.json();
              let fields = [];
              if (permData.data?.fields) {
                fields = permData.data.fields;
              } else if (permData.fields) {
                fields = permData.fields;
              } else if (Array.isArray(permData.data)) {
                fields = permData.data;
              } else if (Array.isArray(permData)) {
                fields = permData;
              }
              setAllowedFields(fields);
            } catch (err) {
              console.error('Failed to load permissions for target user', err);
              setAllowedFields([]);
            }
          }
          setTargetLoading(false);
        }
      }
      setLoading(false);
    };

    if (authData?.token) {
      fetchRequest();
    }
  }, [id, authData?.token, setAuthData]);

  const handleStepAction = async (stepOrder, action) => {
    const comment = comments[stepOrder] || '';
    if (!comment && action !== 'skip') {
      showWarning('Veuillez ajouter un commentaire');
      return;
    }

    setActionLoading(true);

    let body;
    if (action === 'approve') {
      body = { comments: comment };
    } else {
      body = { reason: comment };
    }

    try {
      const result = await callApi(async () => {
        const res = await fetchWithRefresh(
          `${API_URL}/validation/requests/${id}/${action}/${stepOrder}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
          authData.token,
          setAuthData
        );
        return res;
      }, {
        showSuccessMessage: true,
        successMessage: `Étape ${action}ée avec succès`,
      });

      if (result) {
        const updatedRequest = result.request || result.data || result;
        if (updatedRequest && updatedRequest.id) {
          setRequest(updatedRequest);
        } else {
          const refetched = await callApi(async () => {
            const res = await fetchWithRefresh(
              `${API_URL}/validation/request/${id}`,
              { method: 'GET' },
              authData.token,
              setAuthData
            );
            return res;
          }, { showSuccessMessage: false });
          if (refetched) setRequest(refetched);
        }
        setComments(prev => ({ ...prev, [stepOrder]: '' }));
        setIsCustomComment(prev => ({ ...prev, [stepOrder]: false }));
      }
    } catch (error) {
      console.error('Error during step action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const updateComment = (stepOrder, value) => {
    setComments(prev => ({ ...prev, [stepOrder]: value }));
  };

  const getStepStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      expired: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      skipped: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStepStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5" />;
      case 'approved': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
      case 'expired': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'skipped': return <SkipForward className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getTargetIcon = (type) => {
    switch (type) {
      case 'User': return <User className="w-4 h-4" />;
      case 'File': return <FileText className="w-4 h-4" />;
      case 'Cotisation': return <CreditCard className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getSexeLabel = (value) => {
    if (value === 'M') return 'Homme';
    if (value === 'F') return 'Femme';
    return value || '-';
  };

  const handleBatchSave = async () => {
    if (Object.keys(localEdits).length === 0) return;
    const targetId = request?.targetId?.id || request?.targetId;
    if (!targetId) return;

    setSavingEdits(true);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/users/${targetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.token}` },
          body: JSON.stringify(localEdits),
        },
        authData.token,
        setAuthData
      );
      const updatedUser = await res.json();
      if (res.ok) {
        setTargetUserData(prev => ({ ...prev, ...(updatedUser.data?.user || updatedUser) }));
        setLocalEdits({});
      }
    } catch (err) {
      console.error('Failed to update user fields', err);
    } finally {
      setSavingEdits(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement de la demande...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-[#F8FAFC] text-lg font-medium">Demande non trouvée</p>
          <p className="text-[#94A3B8] text-sm mt-1">Cette demande n'existe pas ou a été supprimée.</p>
          <button
            onClick={() => navigate('/dash/validation/requests')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            <ArrowRight className="w-4 h-4" />
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  const userId = authData.user?.id;
  const userSteps = (request?.steps || []).filter(step =>
    step.isActive === true &&
    step.allowedUserIds?.some(user => user.id.toString() === userId?.toString())
  );

  const visibleFields = allowedFields
    ? USER_FIELDS.filter(f => allowedFields.includes(f.key))
    : USER_FIELDS;

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/validation/requests" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Eye className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Demande #{request.id?.slice(-6)}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">Détails et validation</p>
            </div>
          </div>
        </div>

        {/* Request info card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 mb-6 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                {getTargetIcon(request.targetType)}
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Cible</p>
                <p className="text-[#F8FAFC] font-medium">
                  {request.targetType} – {getTargetDisplay(request.targetType, request.targetId)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Info className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Statut</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStepStatusBadge(request.status)}`}>
                  {getStepStatusIcon(request.status)}
                  {request.status}
                </span>
              </div>
            </div>
            {request.expiresAt && (
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wider">Expire le</p>
                  <p className="text-[#F8FAFC] font-medium">{new Date(request.expiresAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            )}
          </div>
          {request.createdBy && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-3">
              <User className="w-4 h-4 text-[#64748B]" />
              <p className="text-sm text-[#94A3B8]">
                Créée par <span className="text-[#F8FAFC]">{request.createdBy.name || 'Inconnu'}</span>
                {' '}le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Étapes à valider
        </h3>
        <div className="space-y-4 mb-6">
          {userSteps.length === 0 && (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-[#F8FAFC] text-lg font-medium">Aucune étape en attente</p>
              <p className="text-[#94A3B8] text-sm mt-1">Toutes les étapes ont été traitées ou ne vous sont pas assignées.</p>
            </div>
          )}
          {userSteps.map((step, idx) => {
            const stepType = step.type || 'validation';
            const stepTypeLabel = stepType === 'verification' ? 'Vérification' : 'Validation';
            const stepTypeColor = stepType === 'verification'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

            const currentComment = comments[step.order] || '';
            const showCustom = isCustomComment[step.order] || false;

            return (
              <div key={idx} className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] transition-all shadow-lg">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold text-[#F8FAFC]">
                        Étape {step.order} – {step.stepName}
                      </h4>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStepStatusBadge(step.status)}`}>
                        {getStepStatusIcon(step.status)}
                        {step.status}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${stepTypeColor}`}>
                        {stepTypeLabel}
                      </span>
                    </div>
                    <p className="text-sm text-[#94A3B8] mt-1">Rôle requis : {step.requiredRole}</p>
                    {step.description && <p className="text-sm text-[#94A3B8] mt-1">{step.description}</p>}
                    {step.comments && (
                      <div className="mt-2 p-3 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
                        <p className="text-xs text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Commentaire
                        </p>
                        <p className="text-[#F8FAFC] text-sm mt-0.5">{step.comments}</p>
                      </div>
                    )}
                  </div>
                </div>

                {step.status === 'pending' && (
                  <>
                    {stepType === 'verification' && (
                      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                        <h5 className="text-sm font-medium text-[#F8FAFC] mb-3 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-400" />
                          Vérification du dossier
                        </h5>
                        {targetLoading ? (
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto my-4" />
                        ) : targetUserData ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                              <h6 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                                Informations du membre
                              </h6>
                              <div className="grid grid-cols-1 gap-3">
                                {visibleFields.map(field => {
                                  const value = targetUserData[field.key];
                                  if (value === null || value === undefined || value === '') return null;
                                  const Icon = field.icon;
                                  const isEditing = editingField === field.key;
                                  const currentValue = Object.prototype.hasOwnProperty.call(localEdits, field.key)
                                    ? localEdits[field.key]
                                    : value;
                                  let display = currentValue;
                                  if (field.key === 'sexe') display = getSexeLabel(currentValue);

                                  return (
                                    <div
                                      key={field.key}
                                      className="flex items-center gap-2 text-sm group cursor-pointer hover:bg-[#1F2937] rounded-lg transition-colors px-2 -ml-2"
                                      onClick={() => {
                                        setEditingField(field.key);
                                        setEditValue(currentValue);
                                      }}
                                    >
                                      <Icon className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                                      <span className="text-[#64748B] w-28">{field.label}:</span>
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onBlur={() => {
                                            setLocalEdits(prev => ({ ...prev, [field.key]: editValue }));
                                            setEditingField(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              setLocalEdits(prev => ({ ...prev, [field.key]: editValue }));
                                              setEditingField(null);
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingField(null);
                                            }
                                          }}
                                          autoFocus
                                          className="flex-1 px-2 py-1 bg-[#111827] border border-emerald-500 rounded text-[#F8FAFC] focus:outline-none text-sm"
                                        />
                                      ) : (
                                        <span className="text-[#F8FAFC]">{display}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {Object.keys(localEdits).length > 0 && (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={handleBatchSave}
                                    disabled={savingEdits}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
                                  >
                                    {savingEdits ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                    {savingEdits ? 'Enregistrement…' : 'Enregistrer les modifications'}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                              <h6 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Fichier à vérifier</h6>
                              {targetFiles.length > 0 ? (
                                <FilePreviewWithZoom file={targetFiles[0]} />
                              ) : (
                                <p className="text-sm text-[#64748B]">Aucun fichier trouvé pour cet utilisateur.</p>
                              )}
                              <p className="text-xs text-[#64748B] mt-3">
                                Veuillez examiner le dossier puis approuver ou rejeter.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#64748B]">Impossible de charger les données de la cible.</p>
                        )}
                      </div>
                    )}

                    {/* ─── Unified Comment Section ─────────────────────────── */}
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5">
                            Commentaire <span className="text-rose-400">*</span>
                          </label>
                          <div className="space-y-2">
                            <select
                              value={showCustom ? 'other' : currentComment}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'other') {
                                  setIsCustomComment(prev => ({ ...prev, [step.order]: true }));
                                  setComments(prev => ({ ...prev, [step.order]: '' }));
                                } else {
                                  setIsCustomComment(prev => ({ ...prev, [step.order]: false }));
                                  setComments(prev => ({ ...prev, [step.order]: val }));
                                }
                              }}
                              className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            >
                              <option value="">Sélectionner un commentaire…</option>
                              {PREBUILT_COMMENTS.map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                              ))}
                              <option value="other">✏️ Autre (commentaire personnalisé)</option>
                            </select>

                            {showCustom && (
                              <textarea
                                value={currentComment}
                                onChange={(e) => updateComment(step.order, e.target.value)}
                                placeholder="Saisissez votre commentaire personnalisé…"
                                rows="2"
                                className="w-full px-3 py-2 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-y"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleStepAction(step.order, 'approve')}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
                          >
                            <ThumbsUp className="w-4 h-4" /> Approuver
                          </button>
                          <button
                            onClick={() => handleStepAction(step.order, 'reject')}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/20 transition-all text-sm font-medium disabled:opacity-50"
                          >
                            <ThumbsDown className="w-4 h-4" /> Rejeter
                          </button>
                          {(authData.user?.role === 'admin' || authData.user?.role === 'super_admin') && (
                            <button
                              onClick={() => handleStepAction(step.order, 'skip')}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm font-medium disabled:opacity-50"
                            >
                              <SkipForward className="w-4 h-4" /> Ignorer (admin)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}