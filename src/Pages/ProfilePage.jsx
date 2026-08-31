import Title from '../Components/Title';
import { useContext, useEffect, useState, useRef } from "react";
import { UserContext } from "../Context/dataCont";
import { useParams, useNavigate } from "react-router-dom";
import PDFPreviewModal from '../Components/Modals/pdfPreviexModal';
import { useError } from '../Context/ErrorContext';

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
  Loader2,
  XCircle,
  SkipForward
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ProfilePage({ user }) {
  const { authData, setAuthData } = useContext(UserContext);
  const { showError, showWarning, showSuccess } = useError();
  const { id } = useParams();
  const navigate = useNavigate();

  const [displayUser, setDisplayUser] = useState(user || authData.user);
  const [permissions, setPermissions] = useState({ fields: [] });
  const [perform, setPerform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [userFees, setUserFees] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [canManageFiles, setCanManageFiles] = useState(false);
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


  const [canUpdateUser, setCanUpdateUser] = useState(false);
const [canDeleteUser, setCanDeleteUser] = useState(false);
const [canCreateFile, setCanCreateFile] = useState(false);
const [canUpdateFile, setCanUpdateFile] = useState(false);
const [canDeleteFile, setCanDeleteFile] = useState(false);


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

      if (isOwner) {
        setAuthData(prev => ({
          token: data.data.token || prev.token,
          user: data.data.user || prev.user
        }));
      } else {
        setDisplayUser(data.data.user);
      }

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

      if (isOwner) {
        setAuthData(prev => ({
          token: data.data.token || prev.token,
          user: data.data.user || prev.user
        }));
      } else {
        setDisplayUser(data.data.user);
      }

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

      if (isOwner) {
        setAuthData(prev => ({
          token: data.data.token || prev.token,
          user: data.data.user || prev.user
        }));
      } else {
        setDisplayUser(data.data.user);
      }

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

        if (isOwner) {
          setAuthData(prev => ({ ...prev, user: updatedUser }));
        }
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
        setCreditTransactions(
          transactionData.data.transactions || transactionData.data
        );
      } else {
        console.warn("Impossible de charger les transactions de crédit");
      }
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
    }
  };

  // ─── Transaction handler ────────────────────────────────────────────────

  const handleTransaction = async (amount, method, notes, type) => {
    const finalAmount = type === 'deposit'
      ? Math.abs(amount)
      : -Math.abs(amount);

    try {
      const res = await fetch(`${NEST_API_URL}/fees/versement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`
        },
        body: JSON.stringify({
          userId: targetUserId,
          amount: finalAmount,
          paymentMethod: method,
          notes
        })
      });

      const data = await res.json();

      console.log(data);

      if (res.ok && data.success) {
        if (type === 'deposit') {
          showSuccess(
            `${data.data.usedForFees} DA utilisé pour les cotisations, ${data.data.creditAdded} DA ajoutés au crédit.`
          );
        } else {
          showSuccess(
            `Retrait de ${Math.abs(finalAmount)} DA effectué. Nouveau crédit : ${data.data.newCreditBalance} DA.`
          );
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
        headers: {
          Authorization: `Bearer ${authData.token}`
        }
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

  // ─── PDF helpers ─────────────────────────────────────────────────────────

  const waitForPdfJob = async (jobId) => {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      let statusRes;

      try {
        statusRes = await fetch(`${NEST_API_URL}/pdf/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        });
      } catch (error) {
        attempts++;
        continue;
      }

      if (!statusRes.ok) {
        attempts++;
        continue;
      }

      const statusData = await statusRes.json();
      const jobData = statusData?.data;

      if (!jobData) {
        attempts++;
        continue;
      }

      if (jobData.status === 'completed') {
        const finalPdfUrl =
          jobData.downloadUrl ||
          jobData.cloudinaryUrl;

        if (!finalPdfUrl) {
          throw new Error(
            'La génération est terminée mais aucun lien PDF n’a été retourné.'
          );
        }

        return {
          finalPdfUrl,
          cloudinaryUrl: jobData.cloudinaryUrl || null,
        };
      }

      if (jobData.status === 'failed') {
        throw new Error(
          'La génération a échoué : ' +
          (jobData.error || 'Erreur inconnue')
        );
      }

      attempts++;
    }

    throw new Error(
      'Délai dépassé – la génération a pris trop de temps.'
    );
  };

    const fetchPdfBlob = async (finalPdfUrl) => {
      // If the URL is relative, prepend the backend URL
      const isAbsolute = finalPdfUrl.startsWith('http://') || finalPdfUrl.startsWith('https://');
      const fullUrl = isAbsolute ? finalPdfUrl : `${NEST_API_URL}${finalPdfUrl.startsWith('/') ? '' : '/'}${finalPdfUrl}`;

      const isCloudinary = fullUrl.startsWith('https://res.cloudinary.com');

      const pdfRes = await fetch(
        fullUrl,
        isCloudinary
          ? {}
          : {
              headers: {
                Authorization: `Bearer ${authData.token}`,
              },
            }
      );

      if (!pdfRes.ok) {
        throw new Error('Impossible de récupérer le PDF final');
      }

      return await pdfRes.blob();
    };

  const generateQueuedPdf = async (endpoint) => {
    let jobRes;

    try {
      jobRes = await fetch(`${NEST_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
          userId: targetUserId,
        }),
      });
    } catch (networkError) {
      throw new Error(
        'Erreur réseau – impossible de contacter le serveur.'
      );
    }

    if (!jobRes.ok) {
      let errorMsg = 'Échec de la création de la tâche';

      try {
        const errData = await jobRes.json();
        errorMsg = errData.message || errorMsg;
      } catch (_) {}

      throw new Error(errorMsg);
    }

    const jobData = await jobRes.json();

    if (!jobData?.data?.success || !jobData?.data?.jobId) {
      throw new Error(
        jobData?.data?.message ||
        jobData?.message ||
        'Réponse inattendue du serveur'
      );
    }

    const jobId = jobData.data.jobId;

    const {
      finalPdfUrl,
      cloudinaryUrl,
    } = await waitForPdfJob(jobId);

    const finalBlob = await fetchPdfBlob(finalPdfUrl);
    const finalBlobUrl = URL.createObjectURL(finalBlob);

    return {
      blobUrl: finalBlobUrl,
      downloadUrl: finalPdfUrl,
      cloudinaryUrl,
    };
  };

  const handlePrintSituation = async () => {
    try {
      const pdfData = await generateQueuedPdf('/pdf/situation');

      setPdfPreview({
        isOpen: true,
        type: 'situation',
        data: {
          blobUrl: pdfData.blobUrl,
          memberName: `${displayUser?.name || ''} ${displayUser?.lastname || ''}`.trim(),
          downloadUrl: pdfData.downloadUrl,
          cloudinaryUrl: pdfData.cloudinaryUrl,
          userId: targetUserId,
          memberEmail: displayUser?.email || '',
        },
      });

      showSuccess('Aperçu généré avec succès!');
    } catch (error) {
      console.error('❌ Error generating situation PDF:', error);
      showError(error.message || 'Erreur réseau');
    }
  };

  const handlePrintDegree = async () => {
    try {
      const pdfData = await generateQueuedPdf('/pdf/degree');

      setPdfPreview({
        isOpen: true,
        type: 'degree',
        data: {
          blobUrl: pdfData.blobUrl,
          memberName: `${displayUser?.name || ''} ${displayUser?.lastname || ''}`.trim(),
          downloadUrl: pdfData.downloadUrl,
          cloudinaryUrl: pdfData.cloudinaryUrl,
          userId: targetUserId,
          memberEmail: displayUser?.email || '',
        },
      });

      showSuccess('Aperçu du diplôme généré avec succès!');
    } catch (error) {
      console.error('❌ Error generating degree PDF:', error);
      showError(error.message || 'Erreur réseau');
    }
  };

  // ─── Validations fetch ──────────────────────────────────────────────────

  const fetchValidationRequests = async () => {
    if (!targetUserId) return;

    setValidationLoading(true);

    try {
      const res = await fetch(
        `${NEST_API_URL}/validation/requests/user/${targetUserId}`,
        {
          headers: {
            Authorization: `Bearer ${authData.token}`
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const requests = data?.data;

        setValidationRequests(
          Array.isArray(requests) ? requests : []
        );
      }
    } catch (error) {
      console.error('Error fetching validation requests:', error);
    } finally {
      setValidationLoading(false);
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

            // --- 1. Viewable fields ---
            const permRes = await fetch(
              `${NEST_API_URL}/permissions/user/${targetUserId}/viewable-fields?model=User`,
              { headers: { Authorization: `Bearer ${authData.token}` } }
            );
            const permData = await permRes.json();
            const fields = permData.data?.fields || permData.fields || [];
            setPermissions({ fields });

            // --- 2. Operations on User ---

            const checkOp = async (operation, model) => {
      const res = await fetch(`${NEST_API_URL}/permissions/${targetUserId}/check-operation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation, model }),
      });
      const data = await res.json();
      return data.data?.canPerform || false;
    };

    const [canUpdate, canDelete, canCreateF, canUpdateF, canDeleteF] = await Promise.all([
      checkOp('update', 'User'),
      checkOp('delete', 'User'),
      checkOp('create', 'File'),
      checkOp('update', 'File'),
      checkOp('delete', 'File'),
    ]);

    setCanUpdateUser(canUpdate);
    setCanDeleteUser(canDelete);
    setCanCreateFile(canCreateF);
    setCanUpdateFile(canUpdateF);
    setCanDeleteFile(canDeleteF);

            // --- 3. Fees, payments, credit transactions, validations ---
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

          } catch (error) {
            console.error("Error fetching data:", error);
            showError("Erreur lors du chargement des données");
          } finally {
            setLoading(false);
          }
        };

        if (authData?.token && targetUserId) {
          fetchData();
        }
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

  const verificationText = displayUser?.isAdminVerified
    ? "Validé"
    : "En attente de validation";

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

  // --- UPDATED ESSENTIAL FIELDS (matching the new User model) ---
  const essentialFields = [
    // Identity
    { key: 'nomArabe', label: 'الاسم', isArabic: true, icon: <User className="w-4 h-4" /> },
    { key: 'prenomArabe', label: 'اللقب', isArabic: true, icon: <User className="w-4 h-4" /> },
    { key: 'name', label: 'Nom', isArabic: false, icon: <User className="w-4 h-4" /> },
    { key: 'lastname', label: 'Prénom', isArabic: false, icon: <User className="w-4 h-4" /> },
    { key: 'email', label: 'Email', isArabic: false, icon: <Mail className="w-4 h-4" /> },
    { key: 'emailPro', label: 'Email Pro', isArabic: false, icon: <Mail className="w-4 h-4" /> },
    { key: 'phone', label: 'Téléphone', isArabic: false, icon: <Phone className="w-4 h-4" /> },
    { key: 'fixe', label: 'Fixe', isArabic: false, icon: <Phone className="w-4 h-4" /> },
    { key: 'fax', label: 'Fax', isArabic: false, icon: <Phone className="w-4 h-4" /> },
    { key: 'sexe', label: 'Sexe', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'dateOfBirth', label: 'Date de naissance', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'lieuNaissance', label: 'Lieu de naissance', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'enfants', label: 'Enfants', isArabic: false, icon: <Users className="w-4 h-4" /> },

    // Family
    { key: 'prenomPere', label: 'Prénom du père', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'prenomPereArabe', label: 'Prénom du père (arabe)', isArabic: true, icon: <Users className="w-4 h-4" /> },
    { key: 'nomPrenomMere', label: 'Nom et prénom de la mère', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'nomPrenomMereArabe', label: 'Nom et prénom de la mère (arabe)', isArabic: true, icon: <Users className="w-4 h-4" /> },
    { key: 'maritalStatus', label: 'Situation familiale', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'nationality', label: 'Nationalité', isArabic: false, icon: <Globe className="w-4 h-4" /> },
    { key: 'serviceNationalStatus', label: 'Service national', isArabic: false, icon: <Shield className="w-4 h-4" /> },

    // Professional
    { key: 'profession', label: 'Profession', isArabic: false, icon: <Briefcase className="w-4 h-4" /> },
    { key: 'specialty', label: 'Spécialité', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'registrationNumber', label: "N° d'inscription", isArabic: false, icon: <BookOpen className="w-4 h-4" /> },
    { key: 'nif', label: 'NIF', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'cachet', label: 'Cachet', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'gps', label: 'Coordonnées GPS', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'professionalMode', label: "Mode d'exercice", isArabic: false, icon: <Briefcase className="w-4 h-4" /> },
    { key: 'activityStartDate', label: 'Date de début d\'activité', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'startDate', label: 'Date de début de cotisation', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'installationDate', label: 'Date d\'installation', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'recruitmentDate', label: 'Date de recrutement', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'numeroActeNaissance', label: 'N° acte de naissance', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'nin', label: 'NIN (Identité nationale)', isArabic: false, icon: <FileText className="w-4 h-4" /> },

    // Address
    { key: 'wilaya', label: 'CLOA / Wilaya', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'commune', label: 'Commune', isArabic: false, icon: <Home className="w-4 h-4" /> },
    { key: 'region', label: 'Région', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'adressePersonnelle', label: 'Adresse personnelle', isArabic: false, icon: <Home className="w-4 h-4" /> },
    { key: 'adressePersonnelleArabe', label: 'Adresse pers. (arabe)', isArabic: true, icon: <Home className="w-4 h-4" /> },
    { key: 'adressePro', label: 'Adresse professionnelle', isArabic: false, icon: <Building className="w-4 h-4" /> },
    { key: 'adresseProArabe', label: 'Adresse pro. (arabe)', isArabic: true, icon: <Building className="w-4 h-4" /> },

    // CNOA
    { key: 'oathLocation', label: 'Lieu du serment', isArabic: false, icon: <MapPin className="w-4 h-4" /> },
    { key: 'oathDate', label: 'Date du serment', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'diplomaType', label: 'Type de diplôme', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'sessionClassique', label: 'Session classique', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'anneeClassique', label: 'Année classique', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'universiteClassique', label: 'Université classique', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'sessionLMDL', label: 'Session LMD (Licence)', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'anneeLMDL', label: 'Année LMD (Licence)', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'universiteLMDL', label: 'Université LMD (Licence)', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'sessionLMDM', label: 'Session LMD (Master)', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'anneeLMDM', label: 'Année LMD (Master)', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'universiteLMDM', label: 'Université LMD (Master)', isArabic: false, icon: <Award className="w-4 h-4" /> },
    { key: 'otherDiplomas', label: 'Autres diplômes', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'otherTrainings', label: 'Autres formations', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'moyensHumains', label: 'Moyens humains', isArabic: false, icon: <Users className="w-4 h-4" /> },
    { key: 'benefitStateAid', label: 'Aide d\'État', isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'isAccredited', label: 'Architecte agréé', isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'lastAgreementDate', label: 'Date dernier agrément', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'lastAgreementFileId', label: 'ID fichier agrément', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'paymentReceipts', label: 'Reçus de paiement', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'isLateForYear', label: 'Année de retard', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'latePenalties', label: 'Pénalités de retard', isArabic: false, icon: <FileText className="w-4 h-4" /> },
    { key: 'registrationStatus', label: "Statut d'inscription", isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'registrationDate', label: "Date d'inscription", isArabic: false, icon: <Calendar className="w-4 h-4" /> },

    // Security (only visible to admins/super_admin)
    { key: 'role', label: 'Rôle', isArabic: false, icon: <Crown className="w-4 h-4" /> },
    { key: 'status', label: 'Statut', isArabic: false, icon: <BadgeCheck className="w-4 h-4" /> },
    { key: 'credit', label: 'Crédit (DA)', isArabic: false, icon: <Wallet className="w-4 h-4" /> },
    { key: 'isVerified', label: 'Vérifié', isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'isAdminVerified', label: 'Validé par admin', isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'isActive', label: 'Actif', isArabic: false, icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'loginAttempts', label: 'Tentatives de connexion', isArabic: false, icon: <AlertCircle className="w-4 h-4" /> },
    { key: 'lastLogin', label: 'Dernière connexion', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'lastActivity', label: 'Dernière activité', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'createdAt', label: 'Créé le', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
    { key: 'updatedAt', label: 'Mis à jour le', isArabic: false, icon: <Calendar className="w-4 h-4" /> },
  ];

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (typeof value === 'string' && (value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch {}
    }
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        return value.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return 'Date invalide';
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getSexeLabel = (value) => {
    if (value === 'M') return 'Homme';
    if (value === 'F') return 'Femme';
    return value || '-';
  };

  const tabs = [
    { id: 'info', label: 'Informations', icon: <User className="w-4 h-4" /> },
    { id: 'files', label: 'Fichiers', icon: <FileArchive className="w-4 h-4" /> },
    { id: 'fees', label: 'Cotisations', icon: <Award className="w-4 h-4" /> },
    { id: 'payments', label: 'Paiements', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Crédits', icon: <Clock className="w-4 h-4" /> },
    { id: 'validation', label: 'Validation', icon: <Shield className="w-4 h-4" /> },
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
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                      roleColors[displayUser?.role] ||
                      "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}
                  >
                    {displayUser?.role?.toUpperCase()}
                  </span>
                )}
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${verificationTag}`}>
                  {verificationText}
                </span>
              </div>
              {isVisible('email') && displayUser?.email && (
                <p className="text-sm text-[#94A3B8] flex items-center gap-1.5 mt-1">
                  <Mail className="w-4 h-4" /> {displayUser.email}
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

            {/* ─── Permission‑driven actions ─────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2" ref={menuRef}>
              {/* Versement / Retrait – only if canUpdateUser */}
              {canUpdateUser && (
                <>
                  <button
                    onClick={() => { setTransactionType('deposit'); setShowTransactionModal(true); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" /> Versement
                  </button>
                  <button
                    onClick={() => { setTransactionType('withdraw'); setShowTransactionModal(true); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-white text-sm font-medium rounded-lg transition-colors border border-white/5"
                  >
                    <Minus className="w-4 h-4" /> Retrait
                  </button>
                </>
              )}

              {/* Situation / Agrément – still based on isOwner/isAdmin (not yet in permission system) */}
              {(isOwner || isAdmin) && (
                <>
                  <button
                    onClick={handlePrintSituation}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-white text-sm font-medium rounded-lg transition-colors border border-white/5"
                  >
                    <FileText className="w-4 h-4" /> Situation
                  </button>
                  <button
                    onClick={handlePrintDegree}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-white text-sm font-medium rounded-lg transition-colors border border-white/5"
                  >
                    <Award className="w-4 h-4" /> Agrément
                  </button>
                </>
              )}

              {/* More options menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 bg-[#1F2937] hover:bg-[#2A3A4A] text-[#94A3B8] rounded-lg transition-colors border border-white/5"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#182233] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10">
                    {/* Edit – if canUpdateUser */}
                    {canUpdateUser && (
                      <button
                        onClick={() => { setMenuOpen(false); handleEditUser(); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#F8FAFC] hover:bg-white/5 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" /> Modifier
                      </button>
                    )}
                    {/* Validate – only admins (since we don't have a 'validate' permission check yet) */}
                    {!displayUser?.isAdminVerified && isAdmin && (
                      <button
                        onClick={() => { setMenuOpen(false); handleValidateUser(); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-emerald-400 hover:bg-white/5 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Valider
                      </button>
                    )}
                    {/* Delete – if canDeleteUser */}
                    {canDeleteUser && (
                      <button
                        onClick={() => { /* handleDeleteUser */ }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Layout: Sidebar + Content ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-64 shrink-0">
            <nav className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-2 sticky top-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {/* ─── Information Tab ────────────────────────────────────── */}
            {activeTab === 'info' && (
              <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                  <User className="w-5 h-5 text-emerald-400" /> Informations personnelles
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {essentialFields.map((field) => {
                    if (!isVisible(field.key)) return null;
                    const value = displayUser?.[field.key];
                    if (value === undefined || value === null || value === '') return null;
                    let displayValue = field.key === 'sexe' ? getSexeLabel(value) : formatValue(value);
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

            {/* ─── Files Tab ──────────────────────────────────────────── */}
            {activeTab === 'files' && (
              <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-3">
                    <FileArchive className="w-5 h-5 text-emerald-400" /> Documents
                  </h2>
                  <span className="text-sm text-[#64748B]">{files.filter(f => f.folder !== "profile").length} fichier(s)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files
                    .filter(file => file.folder !== "profile")
                    .map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        handleDelete={handleDelete}
                        handleReplace={handleReplace}
                        canReplace={canUpdateFile}
                        canDelete={canDeleteFile}
                        canPreview={true} // always allow preview if the file is accessible
                      />
                    ))}
                  {canCreateFile && <AddFileCard onUpload={handleUpload} />}
                </div>
                {files.filter(file => file.folder !== "profile").length === 0 && !canCreateFile && (
                  <div className="flex flex-col items-center gap-2 py-8 text-[#64748B]">
                    <FileArchive className="w-8 h-8" />
                    <p className="text-sm">Aucun document disponible</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Fees Tab ───────────────────────────────────────────── */}
            {activeTab === 'fees' && (
              <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                  <Award className="w-5 h-5 text-emerald-400" /> Cotisations
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

            {/* ─── Payments Tab ───────────────────────────────────────── */}
            {activeTab === 'payments' && (
              <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Historique des paiements
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

            {/* ─── Credit Transactions Tab ────────────────────────────── */}
            {activeTab === 'transactions' && (
              <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-emerald-400" /> Historique des crédits
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

            {/* ─── Validations Tab ────────────────────────────────────── */}
            {activeTab === 'validation' && (
              <div className="bg-[#111827] rounded-xl border border-white/5 shadow-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-400" /> Parcours de validation
                </h2>
                {validationLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                ) : validationRequests.length > 0 ? (
                  <div className="space-y-8">
                    {validationRequests.slice(0, 1).map((req) => {
                      const totalSteps = req.steps?.length || 0;
                      const approvedSteps = req.steps?.filter(s => s.status === 'approved').length || 0;
                      const progressPercent = totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0;

                      return (
                        <div key={req.id}>
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-[#F8FAFC]">
                                  Demande #{req.id.slice(-6)} – {req.targetType}
                                </p>
                                <p className="text-xs text-[#94A3B8]">Créée le {new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <div className="w-full bg-[#1F2937] rounded-full h-2.5">
                              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <p className="text-xs text-[#64748B] mt-1">{approvedSteps} / {totalSteps} étapes terminées</p>
                          </div>

                          <div className="relative pl-8">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#1F2937]" />
                            {req.steps?.map((step, idx) => {
                              const isDone = step.status === 'approved';
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
                                  <div className={`absolute -left-[29px] z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 ${circleBg}`}>
                                    {icon}
                                  </div>
                                  <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.12)] transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm font-semibold text-[#F8FAFC]">{step.stepName}</p>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                        isDone
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : isRejected
                                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                          : isSkipped
                                          ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                      }`}>
                                        {step.status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#94A3B8]">Rôle requis : {step.requiredRole}</p>
                                    {step.allowedUserIds?.length > 0 && (
                                      <p className="text-xs text-[#94A3B8] mt-1">Assignée à : {step.allowedUserIds.map(u => u.name || u.email || u.id).join(', ')}</p>
                                    )}
                                    {step.comments && (
                                      <div className="mt-2 p-2 bg-[#111827] rounded-lg border border-[rgba(255,255,255,0.06)]">
                                        <p className="text-xs text-[#64748B] uppercase tracking-wider">Commentaire</p>
                                        <p className="text-xs text-[#F8FAFC] mt-0.5">{step.comments}</p>
                                      </div>
                                    )}
                                    {step.approvedBy && (
                                      <p className="text-xs text-[#64748B] mt-2">Traitée par {step.approvedBy.name || step.approvedBy.email || step.approvedBy}{step.approvedAt ? ` le ${new Date(step.approvedAt).toLocaleString('fr-FR')}` : ''}</p>
                                    )}
                                    {step.timeout?.duration > 0 && step.status === 'pending' && (
                                      <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-400">
                                        <Clock className="w-3.5 h-3.5" /> <span>Délai : {step.timeout.duration}h – {step.timeout.action}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 text-right">
                            <button
                              onClick={() => navigate(`/dash/validation/requests/${req.id}/`)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              Voir le détail complet →
                            </button>
                          </div>
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