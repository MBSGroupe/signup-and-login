import Title from '../Components/Title';
import { useContext, useEffect, useState, useRef } from "react";
import { UserContext } from "../Context/dataCont";
import { useParams, useNavigate } from "react-router-dom";
import PDFPreviewModal from '../Components/Modals/pdfPreviexModal';
import { useError } from '../Context/ErrorContext';
import { useModal } from '../Context/ModalContext';

import sabAvatar from '../assets/ChatGPT Image Jul 13, 2026, 03_44_20 PM.png';
import FileCard from '../Components/Cards/FileCrad';
import CotisationCard from '../Components/Cards/CotisationCard';
import AddFileCard from '../Components/Cards/AddFileCard';
import CreditTransactionCard from '../Components/Cards/CreditTransactionCard';
import PaymentCard from '../Components/Cards/PayementCard';

import {
  User,
  Mail,
  Phone,
  Eye,
  Calendar,
  MapPin,
  Briefcase,
  CreditCard,
  FileText,
  MoreVertical,
  Plus,
  Minus,
  Edit,
  CheckCircle,
  Clock,
  Shield,
  Award,
  BookOpen,
  Home,
  Building,
  Globe,
  Users,
  Crown,
  BadgeCheck,
  CalendarDays,
  FileArchive,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
  SkipForward,
  ClipboardList
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;


export default function ProfilePage({ user }) {
  const { authData, setAuthData } = useContext(UserContext);
  const { showError, showWarning, showSuccess } = useError();
  const { confirm, alert } = useModal();
  const { id } = useParams();
  const navigate = useNavigate();

  const [displayUser, setDisplayUser] = useState(user || authData.user);
  const [permissions, setPermissions] = useState(null);
  const [perform, setPerform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [userFees, setUserFees] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('deposit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionMethod, setTransactionMethod] = useState('cash');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [pdfPreview, setPdfPreview] = useState({
    isOpen: false,
    type: 'situation',
    data: null,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [activeTab, setActiveTab] = useState('info');

  const targetUserId = user?.id || id || authData.user?.id;
  const isOwner = authData.user?.id === targetUserId;
  const isAdmin = authData.user?.role === 'admin' || authData.user?.role === 'super_admin';

  const [validationRequests, setValidationRequests] = useState([]);
  const [validationLoading, setValidationLoading] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState({});
  const [demandSubmitting, setDemandSubmitting] = useState(false);
  const [availableSchemas, setAvailableSchemas] = useState([]);

  const toggleRequestExpand = (reqId) => {
    setExpandedRequests(prev => ({
      ...prev,
      [reqId]: prev[reqId] !== undefined ? !prev[reqId] : false
    }));
  };

  // ─── Click outside ────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── File handlers ────────────────────────────────────────────────────────

  const handleUpload = async (file) => {
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "uploads");
      const response = await fetch(`${NEST_API_URL}/files/${displayUser.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: uploadData,
      });
      const data = await response.json();
      if (response.status === 413) {
        showError(data.message || "File is too large");
        return;
      }
      if (!response.ok) {
        showError(data.message || "Upload failed");
        return;
      }
      if (isOwner) setAuthData(prev => ({ token: data.data.token || prev.token, user: data.data.user || prev.user }));
      else setDisplayUser(data.data.user);
      showSuccess("File uploaded successfully ✅");
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplace = async (file, newFile) => {
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append("file", newFile);
      uploadData.append("folder", "uploads");
      const response = await fetch(`${NEST_API_URL}/files/${file.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: uploadData,
      });
      const data = await response.json();
      if (response.status === 413) {
        showError(data.message || "File is too large");
        return;
      }
      if (!response.ok) {
        showError(data.message || "Replace failed");
        return;
      }
      if (isOwner) setAuthData(prev => ({ token: data.data.token || prev.token, user: data.data.user || prev.user }));
      else setDisplayUser(data.data.user);
      showSuccess("File replaced successfully ✅");
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file) => {
    try {
      setIsUploading(true);
      const response = await fetch(`${NEST_API_URL}/files/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showError(data.message || "Delete failed");
        return;
      }
      if (isOwner) setAuthData(prev => ({ token: data.data.token || prev.token, user: data.data.user || prev.user }));
      else setDisplayUser(data.data.user);
      showSuccess("File deleted successfully ✅");
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Refresh functions ──────────────────────────────────────────────────


  const refreshUserAndFees = async () => {
    try {
      const userRes = await fetch(`${NEST_API_URL}/users/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        const updatedUser = userData.data;
        setDisplayUser(updatedUser);
        if (isOwner) setAuthData(prev => ({ ...prev, user: updatedUser }));
      }
      await refreshUserFees();
      await fetchCreditTransactions();
    } catch (error) {
      console.error("Error refreshing user and fees:", error);
    }
  };

  const refreshUserFees = async () => {
    try {
      const feesRes = await fetch(`${NEST_API_URL}/fees/user/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      if (feesRes.ok) {
        const feesData = await feesRes.json();
        setUserFees(feesData.data);
      } else {
        console.warn("Erreur lors du rafraîchissement des cotisations");
      }
    } catch (error) {
      console.error("Error refreshing fees:", error);
    }
  };

  const fetchCreditTransactions = async () => {
    try {
      const res = await fetch(`${NEST_API_URL}/fees/credit/user/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      if (res.ok) {
        const transactionData = await res.json();
        setCreditTransactions(transactionData.data.transactions || transactionData.data);
      } else {
        console.warn("Impossible de charger les transactions de crédit");
      }
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
    }
  };

  // ─── Transaction handler ────────────────────────────────────────────────

  const handleTransaction = async (amount, method, notes, type) => {
    const finalAmount = type === 'deposit' ? Math.abs(amount) : -Math.abs(amount);
    try {
      const res = await fetch(`${NEST_API_URL}/fees/versement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.token}` },
        body: JSON.stringify({ userId: targetUserId, amount: finalAmount, paymentMethod: method, notes })
      });
      const data = await res.json();
      console.log(dataX)
      if (res.ok && data.success) {
        if (type === 'deposit') {
          showSuccess(`${data.data.usedForFees} DA utilisé pour les cotisations, ${data.data.creditAdded} DA ajoutés au crédit.`);
        } else {
          showSuccess(`Retrait de ${Math.abs(finalAmount)} DA effectué. Nouveau crédit : ${data.data.newCreditBalance} DA.`);
        }
        await refreshUserAndFees();
        setShowTransactionModal(false);
        setTransactionAmount('');
        setTransactionMethod('cash');
        setTransactionNotes('');
      } else {
        showError(data.message || data.error);
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau');
    }
  };

  // ─── User actions ────────────────────────────────────────────────────────

  const handleEditUser = () => {
    navigate(`/auth/update/${targetUserId}`);
  };

  const handleValidateUser = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/users/${targetUserId}/validate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showSuccess('Utilisateur validé avec succès');
        await refreshUserAndFees();
      } else {
        showError(data.message || 'Erreur lors de la validation');
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau');
    }
  };

  // ─── Print Situation / Degree ──────────────────────────────────────────

  const handlePrintSituation = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/pdf/preview/situation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        let errorMsg = 'Échec de la génération du PDF';
        try {
          const err = await response.json();
          errorMsg = err.message || errorMsg;
        } catch (_) { }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      setPdfPreview({
        isOpen: true,
        type: 'situation',
        data: {
          blobUrl,
          memberName: `${displayUser?.name} ${displayUser?.lastname}`,
          downloadUrl: null,
        },
      });

      showSuccess('Aperçu généré avec succès!');
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      showError(error.message || 'Erreur réseau');
    }
  };

  const handlePrintDegree = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/pdf/preview/degree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        let errorMsg = 'Échec de la génération du diplôme';
        try {
          const err = await response.json();
          errorMsg = err.message || errorMsg;
        } catch (_) { }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const previewBlobUrl = window.URL.createObjectURL(blob);

      setPdfPreview({
        isOpen: true,
        type: 'degree',
        data: {
          blobUrl: previewBlobUrl,
          memberName: `${displayUser?.name} ${displayUser?.lastname}`,
          downloadUrl: null,
        },
        onGenerate: async () => {
          let jobRes;
          try {
            jobRes = await fetch(`${NEST_API_URL}/pdf/degree`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authData.token}`,
              },
              body: JSON.stringify({ userId: targetUserId }),
            });
          } catch (networkError) {
            throw new Error('Erreur réseau – impossible de contacter le serveur.');
          }

          if (!jobRes.ok) {
            let errorMsg = 'Échec de la création de la tâche';
            try {
              const errData = await jobRes.json();
              errorMsg = errData.message || errorMsg;
            } catch (_) { }
            throw new Error(errorMsg);
          }

          const jobData = await jobRes.json();

          if (!jobData.data.success || !jobData.data.jobId) {
            throw new Error(jobData.data.message || 'Réponse inattendue du serveur');
          }
          const jobId = jobData.data.jobId;

          let finalPdfUrl = null;
          let cloudinaryUrl = null;
          let attempts = 0;
          while (!finalPdfUrl && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            let statusRes;
            try {
              statusRes = await fetch(`${NEST_API_URL}/pdf/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${authData.token}` },
              });
            } catch (e) {
              attempts++;
              continue;
            }

            if (!statusRes.ok) {
              attempts++;
              continue;
            }

            const statusData = await statusRes.json();
            if (statusData.data.status === 'completed') {
              finalPdfUrl = statusData.data.downloadUrl;
              cloudinaryUrl = statusData.data.cloudinaryUrl || null;
              if (!finalPdfUrl) {
                finalPdfUrl = statusData.data.cloudinaryUrl;
              }
            } else if (statusData.data.status === 'failed') {
              throw new Error('La génération a échoué : ' + (statusData.data.error || ''));
            }
            attempts++;
          }

          if (!finalPdfUrl) {
            throw new Error('Délai dépassé – la génération a pris trop de temps.');
          }
          const isCloudinary = finalPdfUrl.startsWith('https://res.cloudinary.com');
          const pdfRes = await fetch(finalPdfUrl, isCloudinary ? {} : {
            headers: { Authorization: `Bearer ${authData.token}` },
          });
          if (!pdfRes.ok) throw new Error('Impossible de récupérer le PDF final');

          const finalBlob = await pdfRes.blob();
          const finalBlobUrl = URL.createObjectURL(finalBlob);

          setPdfPreview(prev => ({
            ...prev,
            data: {
              ...prev.data,
              blobUrl: finalBlobUrl,
              downloadUrl: finalPdfUrl,
              cloudinaryUrl: cloudinaryUrl,
              userId: targetUserId,
              memberEmail: displayUser?.email || '',
            },
          }));
        },
      });

      showSuccess('Aperçu du diplôme généré avec succès!');
    } catch (error) {
      console.error('❌ Error generating degree preview:', error);
      showError(error.message || 'Erreur réseau');
    }
  };

  //  ─── Validations fetch ──────────────────────────────────────────────────

  const fetchValidationRequests = async () => {
    if (!targetUserId) return;
    setValidationLoading(true);
    try {
      const res = await fetch(`${NEST_API_URL}/validation/requests/user/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Validation requests:', data);
        const requests = data?.data;
        setValidationRequests(Array.isArray(requests) ? requests : []);
      }
    } catch (error) {
      console.error('Error fetching validation requests:', error);
    } finally {
      setValidationLoading(false);
    }
  };
  const getRequestName = (req) => {
    if (!req) return 'Demande';
    if (req.schemaName) return req.schemaName;
    if (req.schema?.name) return req.schema.name;
    if (req.schemaVersion?.name) return req.schemaVersion.name;
    if (req.schemaVersion?.schema?.name) return req.schemaVersion.schema.name;
    if (req.validationSchema?.name) return req.validationSchema.name;
    if (req.title) return req.title;
    if (req.name) return req.name;

    const targetSchemaId = req.schemaId || req.schemaVersionId || req.schemaVersion?.schemaId || req.validationSchemaId;
    if (targetSchemaId && availableSchemas?.length > 0) {
      const found = availableSchemas.find(s =>
        s.id === targetSchemaId ||
        s.schemaId === targetSchemaId ||
        s.versions?.some(v => v.id === targetSchemaId)
      );
      if (found?.name) return found.name;
    }

    if (req.steps?.length > 0 && availableSchemas?.length > 0) {
      const stepNames = req.steps.map(s => s.stepName).filter(Boolean);
      const matchingSchema = availableSchemas.find(s =>
        s.steps?.some(st => stepNames.includes(st.stepName || st.name))
      );
      if (matchingSchema?.name) return matchingSchema.name;
    }

    return req.targetType ? `Validation ${req.targetType}` : 'Demande';
  };

  const fetchSchemas = async () => {
    try {
      const res = await fetch(`${NEST_API_URL}/validation/schemas`, {
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const schemasList = data?.schemas || data?.data || data || [];
        setAvailableSchemas(Array.isArray(schemasList) ? schemasList : []);
      }
    } catch (err) {
      console.error('Error fetching validation schemas:', err);
    }
  };

  // 🟢 [MODIFICATION] : Création dynamique de demande à partir du schéma
  const handleCreateDemand = async (schemaOrName) => {
    if (demandSubmitting) return;

    const schemaName = typeof schemaOrName === 'object' ? (schemaOrName.name || schemaOrName.title) : schemaOrName;
    const schemaId = typeof schemaOrName === 'object' ? (schemaOrName.id || schemaOrName._id) : null;
    const targetType = typeof schemaOrName === 'object' ? (schemaOrName.targetType || 'User') : 'User';

    const confirmed = await confirm({
      title: 'Confirmer la demande',
      message: `Êtes-vous sûr de vouloir initier la "${schemaName}" ?`,
    });
    if (!confirmed) return;

    // Vérifier si une demande active existe déjà
    const existingRequest = validationRequests.find(req => {
      const reqName = (getRequestName(req) || '').toLowerCase();
      const defName = (schemaName || '').toLowerCase();
      const reqSchemaName = (req.schemaName || req.schema?.name || req.validationSchema?.name || '').toLowerCase();
      const matchesName = reqName === defName || reqSchemaName === defName ||
                          (schemaId && (req.schemaId === schemaId || req.validationSchemaId === schemaId || req.schemaVersion?.schemaId === schemaId));
      const isActive = !['rejected', 'cancelled'].includes(req.status?.toLowerCase());
      return matchesName && isActive;
    });

    if (existingRequest) {
      await alert({
        title: 'Demande déjà existante',
        message: `Cette demande existe déjà. Vous pouvez suivre son avancement dans l'onglet "Validation".`,
      });
      return;
    }

    try {
      setDemandSubmitting(true);
      const payload = {
        targetId: targetUserId,
        targetType: targetType,
        schemaName: schemaName,
      };
      if (schemaId) payload.schemaId = schemaId;

      const res = await fetch(`${NEST_API_URL}/validation/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.id || data.data)) {
        showSuccess(`Demande "${schemaName}" initiée avec succès !`);
        await fetchValidationRequests();
      } else {
        const errMsg = (data.message || data.error || '').toLowerCase();
        if (errMsg.includes('already') || errMsg.includes('exist') || errMsg.includes('déjà') || errMsg.includes('en cours') || res.status === 409) {
          await alert({
            title: 'Demande déjà existante',
            message: `Cette demande existe déjà. Vous pouvez suivre son avancement dans l'onglet "Validation".`,
          });
        } else {
          showError(data.message || data.error || 'Erreur lors de la création de la demande');
        }
      }
    } catch (err) {
      console.error('Error submitting demand:', err);
      showError('Erreur réseau lors de la création de la demande');
    } finally {
      setDemandSubmitting(false);
    }
  };
  // ─── Initial data fetch ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let userData = user;
        if (!userData && id) {
          const userRes = await fetch(`${NEST_API_URL}/users/${id}`, {
            headers: { Authorization: `Bearer ${authData.token}` }
          });
          const result = await userRes.json();
          userData = result.data;
        }
        setDisplayUser(userData || authData.user);

        const permRes = await fetch(`${NEST_API_URL}/permissions/user/${targetUserId}/viewable-fields?model=User`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
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

        setPermissions({ fields });

        const opRes = await fetch(`${NEST_API_URL}/permissions/${targetUserId}/check-operation`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authData.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operation: "create", model: "File" })
        });
        const opData = await opRes.json();
        setPerform(opData.data?.canPerform || false);

        const feesRes = await fetch(`${NEST_API_URL}/fees/user/${targetUserId}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        if (feesRes.ok) {
          const feesData = await feesRes.json();
          setUserFees(feesData.data);
        }

        const paymentsRes = await fetch(`${NEST_API_URL}/fees/payements/user/${targetUserId}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData.data);
        }

        await fetchCreditTransactions();
        await fetchValidationRequests();
        await fetchSchemas();
      } catch (error) {
        console.error("Error fetching data:", error);
        showError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token && targetUserId) fetchData();
  }, [id, user, authData, targetUserId]);

  const totalDebt = userFees.reduce((sum, fee) => {
    const computed = fee.computed || {};
    const remaining = computed.remaining || 0;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const PROFILE_URL = displayUser?.profilePicture || sabAvatar;
  const files = displayUser?.files || [];


  const roleColors = {
    admin: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    user: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    moderator: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const verificationTag = displayUser?.isAdminVerified
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  const verificationText = displayUser?.isAdminVerified ? "Validé" : "En attente de validation";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[#64748B] text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  const visibleFields = permissions?.fields || [];
  const isVisible = (fieldName) => visibleFields.includes(fieldName);
  const showMenu = isAdmin || isOwner;

  // Essential fields
  const essentialFields = [
    { key: 'nomArabe', label: 'الاسم', isArabic: true, icon: <User className="w-4 h-4" /> },
    { key: 'prenomArabe', label: 'اللقب', isArabic: true, icon: <User className="w-4 h-4" /> },
    { key: 'name', label: 'Nom', isArabic: false, icon: <User className="w-4 h-4" /> },
    { key: 'lastname', label: 'Prénom', isArabic: false, icon: <User className="w-4 h-4" /> },
    { key: 'email', label: 'Email', isArabic: false, icon: <Mail className="w-4 h-4" /> },
    { key: 'emailPro', label: 'Email Pro', isArabic: false, icon: <Mail className="w-4 h-4" /> },
    { key: 'phone', label: 'Téléphone', isArabic: false, icon: <Phone className="w-4 h-4" /> },
    { key: 'sexe', label: 'Sexe', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'dateOfBirth', label: 'Date de naissance', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'lieuNaissance', label: 'Lieu de naissance', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'profession', label: 'Profession', isArabic: false, icon: <Briefcase className="w-4 h-4" /> },
    { key: 'specialty', label: 'Spécialité', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'registrationNumber', label: "N° d'inscription", isArabic: false, icon: <BookOpen className="w-4 h-4" /> },
    { key: 'wilaya', label: 'CLOA', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'commune', label: 'Commune', isArabic: false, icon: <Home className="w-4 h-4" /> },
    { key: 'adressePersonnelle', label: 'Adresse personnelle', isArabic: false, icon: <Home className="w-4 h-4" /> },
    { key: 'adressePro', label: 'Adresse professionnelle', isArabic: false, icon: <Building className="w-4 h-4" /> },
    { key: 'civility', label: 'Civilité', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'maritalStatus', label: 'Situation familiale', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'nationality', label: 'Nationalité', isArabic: false, icon: <Globe className="w-4 h-4" /> },
    { key: 'serviceNationalStatus', label: 'Service national', isArabic: false, icon: <Shield className="w-4 h-4" /> },
    { key: 'professionalMode', label: "Mode d'exercice", isArabic: false, icon: <Briefcase className="w-4 h-4" /> },
    { key: 'registrationStatus', label: "Statut d'inscription", isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'role', label: 'Rôle', isArabic: false, icon: <Crown className="w-4 h-4" /> },
    { key: 'status', label: 'Statut', isArabic: false, icon: <BadgeCheck className="w-4 h-4" /> },
  ];
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (value instanceof Date || (typeof value === 'string' && value.includes('T'))) {
      try {
        return new Date(value).toLocaleDateString('fr-FR');
      } catch {
        return value;
      }
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  };

  const getSexeLabel = (value) => {
    if (value === 'M') return 'Homme';
    if (value === 'F') return 'Femme';
    return value || '-';
  };

  // ─── Tabs config ──────────────────────────────────────────────────────────

  const tabs = [
    { id: 'info', label: 'Informations', icon: <User className="w-4 h-4" /> },
    { id: 'files', label: 'Fichiers', icon: <FileArchive className="w-4 h-4" /> },
    { id: 'fees', label: 'Cotisations', icon: <Award className="w-4 h-4" /> },
    { id: 'payments', label: 'Paiements', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Crédits', icon: <Clock className="w-4 h-4" /> },
    { id: 'validation', label: 'Validation', icon: <Shield className="w-4 h-4" /> },
    { id: 'Demandes', label: 'Demandes', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-[#0A0F1C] relative">

        {/* ─── Spinner Overlay ───────────────────────────────────────────── */}
        {isUploading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1C]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-[#64748B] text-sm">En cours…</p>
            </div>
          </div>
        )}

        {/* ─── Header: Banking Account Summary ────────────────────────────── */}
        <header className="bg-[#111827] border-b border-white/5 px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left: Avatar + Identity */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={PROFILE_URL}
                  alt="Profile"
                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-full border-2 border-white/10 shadow-xl"
                />
                {displayUser?.isAdminVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-1 border-2 border-[#111827]">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isVisible('name') && isVisible('lastname') && displayUser?.name && displayUser?.lastname
                      ? `${displayUser.name} ${displayUser.lastname}`
                      : 'Utilisateur'}
                  </h1>
                  {isVisible('role') && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${roleColors[displayUser?.role] || "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                      {displayUser?.role?.toUpperCase()}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${verificationTag}`}>
                    {verificationText}
                  </span>
                </div>
                {isVisible('email') && displayUser?.email && (
                  <p className="text-sm text-[#94A3B8] flex items-center gap-1.5 mt-1">
                    <Mail className="w-4 h-4" />
                    {displayUser.email}
                  </p>
                )}
                {displayUser?.createdAt && (
                  <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Membre depuis {new Date(displayUser.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Quick financial metrics + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 ml-auto w-full lg:w-auto">
              <div className="flex flex-wrap items-center gap-6 bg-[#182233] rounded-xl px-5 py-3 border border-white/5">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wider">Crédit</p>
                  <p className="text-xl font-semibold text-white">{displayUser?.credit || 0} <span className="text-sm font-normal text-[#64748B]">DA</span></p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wider">Créances</p>
                  <p className="text-xl font-semibold text-white">{totalDebt} <span className="text-sm font-normal text-[#64748B]">DA</span></p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wider">Documents</p>
                  <p className="text-xl font-semibold text-white">{files.filter(f => f.folder !== "profile").length}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wider">Cotisations</p>
                  <p className="text-xl font-semibold text-white">{userFees.length}</p>
                </div>
              </div>

              {showMenu && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2.5 bg-[#1F2937] hover:bg-[#2A3A4A] text-[#94A3B8] hover:text-white rounded-lg transition-colors border border-white/5"
                    title="Plus d'actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#182233] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 py-1 divide-y divide-white/5">
                      <div className="py-1">
                        <button
                          onClick={() => { setMenuOpen(false); setTransactionType('deposit'); setShowTransactionModal(true); }}
                          className="w-full px-4 py-2 text-left text-sm text-[#F8FAFC] hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-emerald-400" /> Versement
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setTransactionType('withdraw'); setShowTransactionModal(true); }}
                          className="w-full px-4 py-2 text-left text-sm text-[#F8FAFC] hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-rose-400" /> Retrait
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); handlePrintSituation(); }}
                          className="w-full px-4 py-2 text-left text-sm text-[#F8FAFC] hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-sky-400" /> Situation
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); handlePrintDegree(); }}
                          className="w-full px-4 py-2 text-left text-sm text-[#F8FAFC] hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                        >
                          <Award className="w-4 h-4 text-amber-400" /> Agrément
                        </button>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => { setMenuOpen(false); handleEditUser(); }}
                          className="w-full px-4 py-2 text-left text-sm text-[#F8FAFC] hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-slate-400" /> Modifier
                        </button>
                        {!displayUser?.isAdminVerified && isAdmin && (
                          <button
                            onClick={() => { setMenuOpen(false); handleValidateUser(); }}
                            className="w-full px-4 py-2 text-left text-sm text-emerald-400 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" /> Valider
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── Main Layout: Sidebar + Content ────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row gap-6">

            {/* ─── Sidebar Navigation (Segmented) ─────────────────────────── */}
            <aside className="md:w-64 shrink-0">
              <nav className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-2 sticky top-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.id
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* ─── Main Content ────────────────────────────────────────────── */}
            <main className="flex-1 min-w-0">

              {/* ─── Information Tab ────────────────────────────────────────── */}
              {activeTab === 'info' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                    <User className="w-5 h-5 text-emerald-400" />
                    Informations personnelles
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {essentialFields.map((field) => {
                      if (!isVisible(field.key)) return null;
                      const value = displayUser?.[field.key];
                      if (value === undefined || value === null || value === '') return null;

                      let displayValue = formatValue(value);
                      if (field.key === 'sexe') {
                        displayValue = getSexeLabel(value);
                      }

                      return (
                        <div key={field.key} className="border-b border-white/5 pb-2 last:border-0">
                          <p className="text-xs text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                            {field.icon} {field.label}
                          </p>
                          <p className={`text-[#F8FAFC] font-medium ${field.isArabic ? 'font-arabic text-right' : ''}`}>
                            {displayValue}
                          </p>
                        </div>
                      );
                    })}
                    {essentialFields.every(f => !isVisible(f.key) || !displayUser?.[f.key]) && (
                      <div className="col-span-full flex flex-col items-center gap-2 py-8 text-[#64748B]">
                        <User className="w-8 h-8" />
                        <p className="text-sm">Aucune information disponible</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Files Tab ────────────────────────────────────────────── */}
              {activeTab === 'files' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-3">
                      <FileArchive className="w-5 h-5 text-emerald-400" />
                      Documents
                    </h2>
                    <span className="text-sm text-[#64748B]">
                      {files.filter(f => f.folder !== "profile").length} fichier(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {files.filter(file => file.folder !== "profile").map((file) => (
                      <FileCard key={file.id} file={file} handleDelete={handleDelete} handleReplace={handleReplace} />
                    ))}
                    {perform && <AddFileCard onUpload={handleUpload} />}
                  </div>
                  {files.filter(file => file.folder !== "profile").length === 0 && !perform && (
                    <div className="flex flex-col items-center gap-2 py-8 text-[#64748B]">
                      <FileArchive className="w-8 h-8" />
                      <p className="text-sm">Aucun document disponible</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Fees Tab ──────────────────────────────────────────────── */}
              {activeTab === 'fees' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                    <Award className="w-5 h-5 text-emerald-400" />
                    Cotisations
                  </h2>
                  {userFees && userFees.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userFees.map((fee) => (
                        <CotisationCard
                          key={fee.id}
                          cotisation={fee}
                          isOwner={isOwner}
                          onCotisationUpdated={refreshUserFees}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-[#64748B]">
                      <Award className="w-8 h-8" />
                      <p className="text-sm">Aucune cotisation trouvée</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Payments Tab ──────────────────────────────────────────── */}
              {activeTab === 'payments' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    Historique des paiements
                  </h2>
                  {payments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {payments.map((payment) => (
                        <PaymentCard key={payment.id} payment={payment} handlePopup={showSuccess} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-[#64748B]">
                      <CreditCard className="w-8 h-8" />
                      <p className="text-sm">Aucun paiement enregistré</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Credit Transactions Tab ──────────────────────────────── */}
              {activeTab === 'transactions' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    Historique des crédits
                  </h2>
                  {creditTransactions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {creditTransactions.map((tx) => (
                        <CreditTransactionCard key={tx.id} transaction={tx} handlePopup={showSuccess} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-[#64748B]">
                      <Clock className="w-8 h-8" />
                      <p className="text-sm">Aucune transaction de crédit trouvée</p>
                    </div>
                  )}
                </div>
              )}
              {/* ─── Validations Tab ──────────────────────────────── */}
              {activeTab === 'validation' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Parcours de validation
                  </h2>

                  {validationLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    </div>
                  ) : validationRequests.length > 0 ? (
                    <div className="space-y-6">
                      {validationRequests.map((req, reqIdx) => {
                        const totalSteps = req.steps?.length || 0;
                        const approvedSteps = req.steps?.filter(s => s.status === 'approved').length || 0;
                        const progressPercent = totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0;
                        const isExpanded = expandedRequests[req.id] ?? true;
                        const requestName = getRequestName(req);

                        return (
                          <div key={req.id || reqIdx} className="bg-[#0A0F1C] rounded-xl border border-white/10 p-5 transition-all">
                            {/* Request header with name & collapsible trigger */}
                            <div>
                              <div className="flex items-center justify-between gap-4 mb-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-base font-semibold text-[#F8FAFC]">
                                      {requestName}
                                    </p>
                                    {req.targetType && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#94A3B8]">
                                        {req.targetType}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#94A3B8] mt-1">
                                    Créée le {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {/* 🟢 [MODIFICATION 1] : Badge adapté pour le statut 'changes_requested' */}
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    req.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                      req.status === 'changes_requested' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                    {req.status === 'changes_requested' ? 'Modifications requises' : req.status}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRequestExpand(req.id)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
                                    title={isExpanded ? "Masquer les étapes" : "Afficher les étapes"}
                                  >
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>

                              {/* 🟢 [MODIFICATION 2] : Bannière d'alerte et bouton de renvoi si des modifications sont requises */}
                              {req.status === 'changes_requested' && (
                                <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                  <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" /> Action requise sur votre dossier
                                      </p>
                                      <p className="text-sm text-[#F8FAFC] mt-1">
                                        {req.steps?.find(s => s.status === 'changes_requested' || s.comments)?.comments || 'Veuillez corriger ou compléter vos informations/documents.'}
                                      </p>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        const confirmed = await confirm({
                                          title: 'Renvoyer la demande',
                                          message: 'Avez-vous bien mis à jour vos informations et documents avant de renvoyer ?',
                                        });
                                        if (!confirmed) return;
                                        try {
                                          const res = await fetch(`${NEST_API_URL}/validation/requests/${req.id}/resubmit`, {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              Authorization: `Bearer ${authData.token}`,
                                            },
                                            body: JSON.stringify({ comments: 'Corrections apportées par l\'utilisateur' }),
                                          });
                                          const data = await res.json();
                                          if (res.ok) {
                                            showSuccess('Dossier renvoyé avec succès pour vérification !');
                                            await fetchValidationRequests();
                                          } else {
                                            showError(data.message || 'Erreur lors du renvoi de la demande');
                                          }
                                        } catch (err) {
                                          console.error('Error resubmitting:', err);
                                          showError('Erreur réseau lors du renvoi');
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 shrink-0"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Renvoyer mon dossier
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Progress bar */}
                              <div className="w-full bg-[#1F2937] rounded-full h-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-xs text-[#64748B]">
                                {approvedSteps} / {totalSteps} étapes terminées
                              </p>
                            </div>

                            {/* Collapsible Steps Timeline */}
                            {isExpanded && (
                              <div className="mt-6 pt-6 border-t border-white/5">
                                <div className="relative pl-8">
                                  {/* Vertical line */}
                                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#1F2937]" />

                                  {req.steps?.map((step, idx) => {
                                    const isDone = step.status === 'approved';
                                    const isPending = step.status === 'pending';
                                    const isRejected = step.status === 'rejected' || step.status === 'expired';
                                    const isSkipped = step.status === 'skipped';

                                    let icon = <Clock className="w-4 h-4 text-yellow-400" />;
                                    let circleBg = 'bg-yellow-500/20 border-yellow-500/40';
                                    if (isDone) {
                                      icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
                                      circleBg = 'bg-emerald-500/20 border-emerald-500/40';
                                    } else if (isRejected) {
                                      icon = <XCircle className="w-4 h-4 text-rose-400" />;
                                      circleBg = 'bg-rose-500/20 border-rose-500/40';
                                    } else if (isSkipped) {
                                      icon = <SkipForward className="w-4 h-4 text-gray-400" />;
                                      circleBg = 'bg-gray-500/20 border-gray-500/40';
                                    }

                                    return (
                                      <div key={idx} className="relative pb-6 last:pb-0">
                                        {/* Circle icon */}
                                        <div className={`absolute -left-[29px] z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 ${circleBg}`}>
                                          {icon}
                                        </div>

                                        <div className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.12)] transition-all">
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-[#F8FAFC]">
                                              {step.stepName}
                                            </p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${isDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                              isRejected ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                isSkipped ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                              }`}>
                                              {step.status}
                                            </span>
                                          </div>

                                          <p className="text-xs text-[#94A3B8]">
                                            Rôle requis : {step.requiredRole}
                                          </p>

                                          {step.allowedUserIds?.length > 0 && (
                                            <p className="text-xs text-[#94A3B8] mt-1">
                                              Assignée à : {step.allowedUserIds.map(u => u.name || u.email || u.id).join(', ')}
                                            </p>
                                          )}

                                          {step.comments && (
                                            <div className="mt-2 p-2 bg-[#0A0F1C] rounded-lg border border-[rgba(255,255,255,0.06)]">
                                              <p className="text-xs text-[#64748B] uppercase tracking-wider">Commentaire</p>
                                              <p className="text-xs text-[#F8FAFC] mt-0.5">{step.comments}</p>
                                            </div>
                                          )}

                                          {step.approvedBy && (
                                            <p className="text-xs text-[#64748B] mt-2">
                                              Traitée par {typeof step.approvedBy === 'object'
                                                ? `${step.approvedBy.name || ''} ${step.approvedBy.lastname || ''}`.trim() || step.approvedBy.name || step.approvedBy.lastname || '-'
                                                : step.approvedBy}
                                              {step.approvedAt ? ` le ${new Date(step.approvedAt).toLocaleString('fr-FR')}` : ''}
                                            </p>
                                          )}

                                          {step.timeout?.duration > 0 && step.status === 'pending' && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-400">
                                              <Clock className="w-3.5 h-3.5" />
                                              <span>Délai : {step.timeout.duration}h – {step.timeout.action}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Link to full progress */}
                                <div className="mt-4 text-right">
                                  <button
                                    onClick={() => navigate(`/dash/validation/requests/${req.id}/`)}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                  >
                                    Voir le détail complet →
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-12 text-[#64748B]">
                      <Shield className="w-10 h-10" />
                      <p className="text-sm">Aucune demande de validation en cours.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Demandes Tab (100% Dynamique à partir des Schémas de Validation) ─── */}
              {(activeTab === 'Demandes' || activeTab === 'demandes') && (
                <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-3">
                      <ClipboardList className="w-5 h-5 text-emerald-400" />
                      Demandes
                    </h2>
                  </div>

                  {availableSchemas.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-[#64748B]">
                      <ClipboardList className="w-10 h-10" />
                      <p className="text-sm">Aucun type de demande configuré pour le moment.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* 🟢 [MODIFICATION] : Liste 100% dynamique générée à partir des schémas créés par l'admin */}
                      {availableSchemas.map((schema, index) => {
                        const schemaTitle = schema.name || schema.title || `Schéma #${index + 1}`;
                        const isAlreadyRequested = validationRequests.some(req => {
                          const reqName = (getRequestName(req) || '').toLowerCase();
                          const sName = schemaTitle.toLowerCase();
                          return reqName === sName && !['rejected', 'cancelled'].includes(req.status?.toLowerCase());
                        });

                        return (
                          <div
                            key={schema.id || schema._id || index}
                            className="bg-[#0A0F1C] rounded-xl border border-white/10 hover:border-emerald-500/30 p-4 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start sm:items-center gap-3.5">
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-[#F8FAFC] group-hover:text-emerald-400 transition-colors">
                                  {schemaTitle}
                                </h3>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                              {/* 🟢 [MODIFICATION] : Le bouton "Faire une demande →" est toujours accessible pour déclencher l'alerte si déjà existante */}
                              <button
                                disabled={demandSubmitting}
                                onClick={() => handleCreateDemand(schema)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                              >
                                {demandSubmitting ? 'Envoi...' : 'Faire une demande →'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </main>
          </div>
        </div>
      </div>

      {/* ─── Transaction Modal ────────────────────────────────────────────── */}

      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1C]/80 backdrop-blur-sm p-4">
          <div className="bg-[#182233] rounded-2xl p-6 md:p-8 w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
              {transactionType === 'deposit' ? (
                <><Plus className="w-5 h-5 text-emerald-400" /> Versement</>
              ) : (
                <><Minus className="w-5 h-5 text-red-400" /> Retrait de crédit</>
              )}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[#94A3B8] text-sm font-medium block mb-1.5">Montant (DA)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#111827] border border-white/10 rounded-lg text-white placeholder-[#64748B] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[#94A3B8] text-sm font-medium block mb-1.5">Méthode de paiement</label>
                <select
                  value={transactionMethod}
                  onChange={(e) => setTransactionMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#111827] border border-white/10 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="cash">Espèces</option>
                  <option value="bank_transfer">Virement</option>
                  <option value="check">Chèque</option>
                  <option value="online">En ligne</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-[#94A3B8] text-sm font-medium block mb-1.5">Notes (optionnel)</label>
                <textarea
                  placeholder="Ajouter une note…"
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#111827] border border-white/10 rounded-lg text-white placeholder-[#64748B] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  rows="3"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[#1F2937] hover:bg-[#2A3A4A] text-white font-medium rounded-lg transition-colors border border-white/5"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const amountNum = parseFloat(transactionAmount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                      showError('Montant invalide (doit être positif)');
                      return;
                    }
                    if (transactionType === 'withdraw' && amountNum > displayUser.credit) {
                      showError('Crédit insuffisant');
                      return;
                    }
                    handleTransaction(amountNum, transactionMethod, transactionNotes, transactionType);
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PDF Preview Modal ────────────────────────────────────────────── */}

      {pdfPreview.isOpen && pdfPreview.data?.blobUrl && (
        <PDFPreviewModal
          type={pdfPreview.type}
          data={pdfPreview.data}
          onClose={() => setPdfPreview({ isOpen: false, type: 'degree', data: null })}
          onGenerate={pdfPreview.onGenerate}
          onEmail={async (userId, recipientEmail) => {
            const res = await fetch(`${NEST_API_URL}/pdf/send-degree-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authData.token}`,
              },
              body: JSON.stringify({ userId, recipientEmail }),
            });
            if (!res.ok) throw new Error('Échec de l’envoi');
          }}
        />
      )}
    </>
  );
}