import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import { useError } from '../../../Context/ErrorContext';
import BackButton from '../../../Components/Buttons/BackButton';
import { resolveStorageUrl } from '../../../Utils/storageUrl';
import { WILAYA_OPTIONS, wilayaLabel } from '../../../Utils/wilayas';
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
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
  Save,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  FileQuestion,
  Hourglass,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_NEST_API_URL;
const BACKEND_BASE_URL = API_URL.replace(/\/api.*$/, '');

const PREBUILT_COMMENTS = [
  "Document conforme aux exigences.",
  "Pièce justificative manquante.",
  "Information incomplète – veuillez compléter.",
  "Vérification effectuée avec succès.",
  "Signature absente – veuillez signer.",
  "Date de validité expirée.",
  "Téléversement de document accepté.",
  "Demande de modifications envoyée.",
  "Dossier complet – prêt pour approbation.",
  "Dossier en attente de pièces supplémentaires.",
];

// ─── Helper: unwrap the ResponseInterceptor envelope ────────────────────
const unwrap = (body) => (body && typeof body === 'object' && 'data' in body && 'success' in body)
  ? body.data
  : body;

// ─── Helper: is this payloadSchema entry a file field? ──────────────────
const isFileField = (f) =>
  f?.ui?.widget === 'file' || f?.ui?.widget === 'image' || f?.type === 'file' || f?.type === 'image';

// Member data shown (read-only) on a verification step. Only these
// fields are visible to the approver; corrections go through a request
// from the member's own space.
const MEMBER_SECTIONS = [
  { label: "CLOA d'exercice", fields: [['region', "CLOA d'exercice"]] },
  {
    label: 'Informations personnelles',
    fields: [
      ['nin', 'NIN'], ['sexe', 'Civilité'], ['name', 'Nom'], ['lastname', 'Prénom'],
      ['nomArabe', 'Nom (arabe)'], ['prenomArabe', 'Prénom (arabe)'],
      ['dateOfBirth', 'Date de naissance'], ['lieuNaissance', 'Lieu de naissance'],
      ['numeroActeNaissance', "N° d'acte de naissance"], ['wilaya', 'Wilaya'],
    ],
  },
  {
    label: 'Informations familiales',
    fields: [
      ['prenomPere', 'Prénom du père'], ['prenomPereArabe', 'Prénom du père (arabe)'],
      ['nomPrenomMere', 'Nom et prénom de la mère'], ['nomPrenomMereArabe', 'Nom et prénom de la mère (arabe)'],
    ],
  },
  {
    label: 'Contact',
    fields: [['fixe', 'Téléphone fixe'], ['phone', 'Téléphone'], ['email', 'Email'], ['emailPro', 'Email professionnel']],
  },
  {
    label: 'Diplômes universitaires',
    fields: [
      ['diplomaType', 'Type de diplôme'], ['sessionClassique', 'Session classique'],
      ['anneeClassique', 'Année classique'], ['universiteClassique', 'Université classique'],
    ],
  },
  {
    label: 'Informations professionnelles',
    fields: [
      ['registrationNumber', "N° d'inscription"], ['oathDate', 'Date de serment'],
      ['oathLocation', 'Lieu de serment'], ['professionalMode', "Mode d'exercice"],
      ['installationDate', "Date d'installation"], ['nif', 'NIF'],
      ['adressePro', 'Adresse professionnelle'], ['adresseProArabe', 'Adresse professionnelle (arabe)'],
      ['gps', 'GPS'],
    ],
  },
];
const RTL_MEMBER_FIELDS = new Set([
  'nomArabe', 'prenomArabe', 'prenomPereArabe', 'nomPrenomMereArabe', 'adresseProArabe',
]);

// Reasons offered for a "Réserve" when the schema field defines none.
const DEFAULT_RESERVE_REASONS = [
  'Document Non Conforme aux exigences',
  'Date de Validité expirée',
];
const reserveReasonsOf = (field) =>
  Array.isArray(field?.review?.reasons) && field.review.reasons.length > 0
    ? field.review.reasons
    : DEFAULT_RESERVE_REASONS;

// ─── Helper: value typed by the reviewer → value sent to the server ─────
const toPayloadValue = (field, raw) => {
  if (field.type === 'boolean') return !!raw;
  if (field.type === 'number') return raw === '' || raw === null || raw === undefined ? null : Number(raw);
  return raw;
};

// ─── Helper: value stored in the payload → value shown in an input ──────
const toInputValue = (field, v) => {
  if (v === undefined || v === null) return field.type === 'boolean' ? false : '';
  if (field.type === 'date' && typeof v === 'string') return v.slice(0, 10);
  return v;
};

// ─── Helper: extract a human-readable message from an error response ────
const extractErrorMessage = (payload, resBody, fallbackStatus) => {
  const baseMessage =
    (payload && typeof payload === 'object' && payload.message) ||
    (resBody && typeof resBody === 'object' && resBody.message) ||
    (resBody && typeof resBody === 'string' && resBody) ||
    `Erreur ${fallbackStatus}`;

  const details =
    (Array.isArray(payload?.errors) && payload.errors) ||
    (Array.isArray(resBody?.errors) && resBody.errors) ||
    null;

  const joined = Array.isArray(baseMessage)
    ? baseMessage.join(' • ')
    : String(baseMessage);

  return details && details.length > 0
    ? `${joined} : ${details.join(' • ')}`
    : joined;
};

export default function ValidationRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const { showWarning, showError } = useError();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState({});
  const [isCustomComment, setIsCustomComment] = useState({});
  // Reviewer corrections: { main: { field: value }, steps: { [order]: { field: value } } }
  const [payloadEdits, setPayloadEdits] = useState({ main: {}, steps: {} });
  const [savingEdits, setSavingEdits] = useState(false);
  // Member profile shown read-only next to the request data.
  const [member, setMember] = useState(null);
  // Document review on a verification step:
  // { [stepOrder]: { [docKey]: { decision: 'ok'|'reserve', reasons: [], other: bool, custom: '' } } }
  const [docReviews, setDocReviews] = useState({});
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  // ── blob URL state for authenticated document previews ─────────
  const [blobUrl, setBlobUrl] = useState(null);
  // A member's upload seen by an admin arrives as a watermarked image only.
  const [blobViewOnly, setBlobViewOnly] = useState(false);
  const [blobLoading, setBlobLoading] = useState(false);
  const [blobError, setBlobError] = useState(null);

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      setError(null);
      try {
        // ─── 1. Fetch the request ────────────────────────────────────
        const res = await fetchWithRefresh(
          `${API_URL}/validation/request/${id}`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const body = await res.json();
        const reqData = unwrap(body);
        setRequest(reqData);
        setCurrentDocIndex(0);
        setImageErrors({});

        // The member concerned: the target user, or a file's owner.
        const target = reqData?.targetId;
        const memberId =
          reqData?.targetType === 'User' ? target?.id || target
          : reqData?.targetType === 'File' ? target?.ownerId
          : null;
        if (memberId) {
          try {
            const userRes = await fetchWithRefresh(
              `${API_URL}/users/${memberId}`,
              { method: 'GET' },
              authData.token,
              setAuthData,
            );
            if (userRes.ok) {
              const userBody = unwrap(await userRes.json());
              setMember(userBody?.user || userBody);
            }
          } catch (memberErr) {
            console.error('Failed to load the member profile', memberErr);
          }
        }
      } catch (err) {
        console.error('Failed to load validation request:', err);
        setError(
          err?.status === 404
            ? "Cette demande n'existe pas ou a été supprimée."
            : err?.message || "Erreur lors du chargement de la demande."
        );
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };

    if (authData?.token && id) {
      fetchRequest();
    }
  }, [id, authData?.token, setAuthData]);

  const getFilePreviewUrl = (file) => {
    // Absolute URL from the backend (a /storage/ one is sent to this
    // environment's backend, whatever host it names)
    if (file.url && (file.url.startsWith('http://') || file.url.startsWith('https://'))) {
      return resolveStorageUrl(file.url);
    }
    // A relative url/path (e.g. "/storage/declaration/<user>/<name>.pdf")
    let urlPath = file.url || file.path || '';
    if (!urlPath) {
      // Bare file ID — /storage/ is keyed by path, not ID, so the real
      // path is resolved via /api/files/:fileId when the document loads.
      return file.fileId ? `file-id:${file.fileId}` : null;
    }
    const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    return `${BACKEND_BASE_URL}${cleanPath}`;
  };

  const isFilePdf = (file) => {
    if (file.mimeType === 'application/pdf' || file.type === 'application/pdf') return true;
    const fileName = file.fileName || file.name || '';
    if (fileName.toLowerCase().endsWith('.pdf')) return true;
    // Fallback — inspect the URL/path for a .pdf extension
    const url = file.url || file.path || '';
    if (typeof url === 'string' && url.toLowerCase().includes('.pdf')) return true;
    return false;
  };

  // ─── Request data: the main form + each step form the requester sent ────
  const payloadSchema = Array.isArray(request?.validationSchema?.payloadSchema)
    ? request.validationSchema.payloadSchema
    : [];
  const payload = request?.payload || {};

  const dataSections = [
    {
      key: 'main',
      stepOrder: null,
      label: 'Formulaire de la demande',
      fields: payloadSchema,
      data: payload,
    },
    ...(request?.steps || [])
      .filter((s) => s.waitForUser && request?.stepPayloads?.[String(s.order)])
      .map((s) => ({
        key: `step-${s.order}`,
        stepOrder: s.order,
        label: s.stepName || `Étape ${s.order}`,
        fields: Array.isArray(s.payloadSchema) ? s.payloadSchema : [],
        data: request.stepPayloads[String(s.order)].data || {},
      })),
  ];

  // Every document field the requester filled (main form + step forms):
  // one entry per field, reviewed as a whole even with several files.
  const docFields = dataSections.flatMap((section) =>
    section.fields
      .filter(isFileField)
      .filter((f) => {
        const raw = section.data[f.name];
        return !(raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0));
      })
      .map((f) => ({
        key: `${section.key}:${f.name}`,
        field: f,
        label: section.stepOrder == null ? f.label || f.name : `${section.label} — ${f.label || f.name}`,
        raw: section.data[f.name],
      })),
  );

  // Flat list of files for the viewer.
  const declarationFiles = docFields.flatMap(({ key, field, label, raw }) => {
    const base = { label, fieldName: field.name, docKey: key };
    // Array of files
    if (Array.isArray(raw)) {
      return raw.map((item, i) => {
        const obj = typeof item === 'object' && item !== null ? item : { fileId: String(item) };
        return { ...obj, ...base, fileName: obj.name || obj.fileName || `${label} ${i + 1}` };
      });
    }
    // Resolved object
    if (typeof raw === 'object') {
      return [{ ...raw, ...base, fileName: raw.name || raw.fileName || label }];
    }
    // Legacy bare string ID
    return [{ fileId: String(raw), ...base, fileName: label }];
  });

  const totalDocs = declarationFiles.length;
  const currentFile = totalDocs > 0 ? declarationFiles[currentDocIndex] : null;
  const fileUrl = currentFile ? getFilePreviewUrl(currentFile) : null;
  const isPdf = currentFile ? isFilePdf(currentFile) : false;
  const hasError = fileUrl ? imageErrors[fileUrl] : false;

  // ── Fetch the current document with the JWT and expose a blob URL ──
  // Browsers can't attach Authorization headers to <iframe>/<img>/<a>, and
  // /storage/* is protected. So we fetch here, wrap in a Blob, and hand the
  // browser a same-origin blob: URL — no CSP, no 401.
  useEffect(() => {
    let revoked = false;
    let objectUrl = null;

    const load = async () => {
      setBlobError(null);
      setBlobUrl(null);
      setBlobViewOnly(false);

      if (!fileUrl) return;

      const isProtected = fileUrl.includes('/storage/');

      // Public URL (Cloudinary / S3 / anything not routed through /storage/)
      // can be used directly — the browser fetches it without our JWT.
      if (/^https?:\/\//.test(fileUrl) && !isProtected) {
        setBlobUrl(fileUrl);
        return;
      }

      setBlobLoading(true);
      try {
        let targetUrl = fileUrl;
        if (fileUrl.startsWith('file-id:')) {
          const fileId = fileUrl.slice('file-id:'.length);
          const metaRes = await fetchWithRefresh(
            `${API_URL}/files/${encodeURIComponent(fileId)}`,
            { method: 'GET' },
            authData.token,
            setAuthData,
          );
          const meta = metaRes.ok ? await metaRes.json().catch(() => null) : null;
          const record = meta?.data || meta;
          const storedUrl = record?.url || record?.path;
          if (!storedUrl) throw new Error('Fichier introuvable sur le serveur.');
          targetUrl = resolveStorageUrl(storedUrl);
        }

        const res = await fetchWithRefresh(
          targetUrl,
          { method: 'GET' },
          authData.token,
          setAuthData,
        );
        if (!res.ok) {
          throw new Error(
            res.status === 401 ? 'Session expirée — reconnectez-vous.'
            : res.status === 404 ? 'Fichier introuvable sur le serveur.'
            : `Erreur ${res.status} lors du chargement du document.`,
          );
        }
        // A misrouted proxy answers 200 with the SPA's index.html instead of
        // the file — surface that instead of rendering a broken blob.
        if ((res.headers.get('content-type') || '').includes('text/html')) {
          throw new Error('Le serveur a renvoyé une page HTML au lieu du fichier.');
        }
        const blob = await res.blob();
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobViewOnly(res.headers.get('X-Document-View') === 'watermarked');
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error('[ValidationRequestDetail] file fetch failed:', err);
        if (!revoked) setBlobError(err.message || 'Impossible de charger le document.');
      } finally {
        if (!revoked) setBlobLoading(false);
      }
    };

    load();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, authData.token, setAuthData]);

  const editCount =
    Object.keys(payloadEdits.main).length +
    Object.values(payloadEdits.steps).reduce((n, patch) => n + Object.keys(patch).length, 0);

  const sectionEdits = (section) =>
    section.stepOrder == null ? payloadEdits.main : payloadEdits.steps[section.stepOrder] || {};

  const setSectionEdit = (section, name, value) =>
    setPayloadEdits((prev) =>
      section.stepOrder == null
        ? { ...prev, main: { ...prev.main, [name]: value } }
        : {
            ...prev,
            steps: {
              ...prev.steps,
              [section.stepOrder]: { ...(prev.steps[section.stepOrder] || {}), [name]: value },
            },
          },
    );

  const goToPrev = () => {
    if (currentDocIndex > 0) setCurrentDocIndex(currentDocIndex - 1);
  };

  const goToNext = () => {
    if (currentDocIndex < totalDocs - 1) setCurrentDocIndex(currentDocIndex + 1);
  };

  // ─── Refetch helper — used to refresh after an error / conflict ─────
  const refetchRequest = async () => {
    try {
      const refetchRes = await fetchWithRefresh(
        `${API_URL}/validation/request/${id}`,
        { method: 'GET' },
        authData.token,
        setAuthData,
      );
      const refetchBody = await refetchRes.json();
      setRequest(unwrap(refetchBody));
    } catch (err) {
      console.error('Failed to refetch request:', err);
    }
  };

  // ─── Handle a single step action (approve / reject) ─────────────────
  // Reads backend errors (already-treated step, permission failure,
  // validation failure) and surfaces them to the user, then refetches
  // so the UI reflects the true state.
  // `text` = comment built by the document review (otherwise the dropdown's).
  const handleStepAction = async (stepOrder, action, text = null) => {
    const comment = text ?? (comments[stepOrder] || '');
    if (!comment && action !== 'skip') {
      showWarning('Veuillez ajouter un commentaire');
      return;
    }

    setActionLoading(true);
    const body = action === 'approve'
      ? { comments: comment }
      : { reason: comment };

    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/${id}/${action}/${stepOrder}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        authData.token,
        setAuthData,
      );

      // Always try to parse the JSON body — success AND error responses.
      const resBody = await res.json().catch(() => null);
      const payload = unwrap(resBody);

      // ── Error path — surface the backend message ──────────────────
      if (!res.ok) {
        const finalMessage = extractErrorMessage(payload, resBody, res.status);
        showError(finalMessage);

        // The step is probably gone / already treated → pull fresh state
        // so the UI reflects reality (no stale "Approuver" button).
        await refetchRequest();
        return;
      }

      // ── Success path ─────────────────────────────────────────────
      const updatedRequest = payload?.request || payload;

      if (updatedRequest && updatedRequest.id) {
        setRequest(updatedRequest);
      } else {
        await refetchRequest();
      }

      setComments(prev => ({ ...prev, [stepOrder]: '' }));
      setIsCustomComment(prev => ({ ...prev, [stepOrder]: false }));
      setDocReviews(prev => ({ ...prev, [stepOrder]: {} }));
    } catch (err) {
      console.error('Error during step action:', err);
      showError(
        err?.message ||
        "Erreur réseau lors du traitement de l'étape. Veuillez réessayer.",
      );
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
      changes_requested: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      awaiting_user: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
      case 'changes_requested': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'awaiting_user': return <Hourglass className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getTargetIcon = (type) => {
    switch (type) {
      case 'User':
      case 'Admin': return <User className="w-4 h-4" />;
      case 'File': return <FileText className="w-4 h-4" />;
      case 'Cotisation': return <CreditCard className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTargetDisplay = (targetType, target, fullReq = null) => {
    if (fullReq?.payload?.title || fullReq?.data?.title) {
      return fullReq.payload?.title || fullReq.data?.title;
    }
    if (!target) {
      return fullReq?.validationSchema?.name || fullReq?.schemaName || 'Demande';
    }
    switch (targetType) {
      case 'User':
      case 'Admin':
        return target.fullName || `${target.name || ''} ${target.lastname || ''}`.trim() || target.id;
      case 'File':
        return target.fileName || target.name || `Document (${target.folder || 'unknown'})`;
      case 'Cotisation':
        return target.type || target.feeType || `Cotisation ${target.year || ''}` || target.id;
      default:
        if (typeof target === 'object') {
          return target.name || target.title || target.fullName || target.id || fullReq?.validationSchema?.name || 'Demande';
        }
        return target;
    }
  };

  // Pretty-print a scalar payload value
  const renderScalarValue = (v) => {
    if (v === undefined || v === null || v === '') return '-';
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('fr-FR');
    }
    return String(v);
  };

  // ─── Save reviewer corrections to the request data ─────────────────
  const handleSavePayloadEdits = async () => {
    if (editCount === 0) return;
    const fieldsOf = (stepOrder) =>
      dataSections.find((s) => s.stepOrder === stepOrder)?.fields || [];
    const typed = (fields, patch) =>
      Object.fromEntries(
        Object.entries(patch).map(([name, raw]) => {
          const field = fields.find((f) => f.name === name) || {};
          return [name, toPayloadValue(field, raw)];
        }),
      );
    const body = {
      payload: typed(fieldsOf(null), payloadEdits.main),
      stepPayloads: Object.fromEntries(
        Object.entries(payloadEdits.steps).map(([order, patch]) => [
          order,
          typed(fieldsOf(Number(order)), patch),
        ]),
      ),
    };

    setSavingEdits(true);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests/${id}/payload`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        authData.token,
        setAuthData,
      );
      const resBody = await res.json().catch(() => null);
      const data = unwrap(resBody);
      if (!res.ok) {
        showError(extractErrorMessage(data, resBody, res.status));
        return;
      }
      if (data?.id) setRequest(data);
      else await refetchRequest();
      setPayloadEdits({ main: {}, steps: {} });
    } catch (err) {
      console.error('Failed to save request data', err);
      showError(err?.message || "Erreur réseau lors de l'enregistrement.");
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

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="bg-rose-500/10 rounded-2xl border border-rose-500/20 p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-rose-300 text-lg font-medium">Erreur de chargement</p>
          <p className="text-rose-400/80 text-sm mt-1">{error}</p>
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

  const viewerId = String(authData.user?.id ?? '');
  const viewerGrade = authData.user?.grade ?? null;
  const viewerRoleName =
    authData.user?.roleName ??
    authData.user?.role?.name ??
    null;

  // Mirrors ValidationService._checkPermission on the backend:
  //   - match by ID first (authoritative for explicit-list steps)
  //   - if assignedByRole !== false, also allow role/grade match
  //   - when assignedByRole === false, strict ID matching only
  const stepMatchesViewer = (step) => {
    const idList = Array.isArray(step.allowedUserIds) ? step.allowedUserIds : [];

    const matchesById = idList.some((entry) => {
      const id = typeof entry === 'string' ? entry : entry?.id;
      return id != null && String(id) === viewerId;
    });
    if (matchesById) return true;

    const roleBased = step.assignedByRole !== false;
    if (!roleBased) return false;

    if (step.requiredGrade && viewerGrade && step.requiredGrade === viewerGrade) {
      return true;
    }
    if (
      step.requiredRole &&
      viewerRoleName &&
      step.requiredRole === viewerRoleName
    ) {
      return true;
    }
    // `requiredRole` can also hold a grade name ('admin', 'super_admin')
    if (
      step.requiredRole &&
      viewerGrade &&
      ['user', 'admin', 'super_admin'].includes(step.requiredRole) &&
      step.requiredRole === viewerGrade
    ) {
      return true;
    }
    return false;
  };

  const userSteps = (request?.steps || []).filter(
    (step) => step.isActive === true && stepMatchesViewer(step),
  );

  const inputCls =
    'w-full px-2 py-1.5 bg-[#111827] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] text-sm focus:outline-none focus:border-emerald-500';

  // One request-data field: an input when the reviewer may edit, else text.
  const renderDataField = (section, field, editable) => {
    const edits = sectionEdits(section);
    const edited = Object.prototype.hasOwnProperty.call(edits, field.name);
    const value = edited ? edits[field.name] : section.data[field.name];
    const label = field.label || field.name;
    const onChange = (v) => setSectionEdit(section, field.name, v);
    const enumValues = Array.isArray(field.validation?.enum) ? field.validation.enum : null;

    const isWilaya = field.name === 'region' || field.name === 'wilaya';

    let control;
    if (!editable || field.type === 'json') {
      control = (
        <span className="text-sm text-[#F8FAFC] font-medium break-words">
          {isWilaya && value ? wilayaLabel(value) : renderScalarValue(value)}
        </span>
      );
    } else if (isWilaya) {
      control = (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">—</option>
          {WILAYA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    } else if (field.type === 'boolean') {
      control = (
        <input
          type="checkbox"
          checked={!!toInputValue(field, value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-emerald-500"
        />
      );
    } else if (enumValues) {
      control = (
        <select value={toInputValue(field, value)} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">—</option>
          {enumValues.map((opt) => (
            <option key={String(opt)} value={opt}>{String(opt)}</option>
          ))}
        </select>
      );
    } else if (field.ui?.widget === 'textarea') {
      control = (
        <textarea
          rows={3}
          value={toInputValue(field, value)}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-y`}
        />
      );
    } else {
      const type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
      control = (
        <input
          type={type}
          value={toInputValue(field, value)}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
    }

    return (
      <div
        key={`${section.key}-${field.name}`}
        className={`p-3 bg-[#111827] rounded-lg border ${edited ? 'border-emerald-500/40' : 'border-[rgba(255,255,255,0.04)]'}`}
      >
        <span className="text-xs text-[#64748B] uppercase tracking-wider block mb-1">
          {label}
          {field.validation?.required && <span className="text-rose-400"> *</span>}
        </span>
        {control}
      </div>
    );
  };

  // Left panel: the request's own data (main form + step forms), files aside.
  const renderDataPanel = (editable) => {
    const sections = dataSections
      .map((section) => ({ ...section, scalars: section.fields.filter((f) => !isFileField(f)) }))
      .filter((section) => section.scalars.length > 0);

    return (
      <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
        <h6 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Données de la demande
        </h6>
        {sections.length === 0 ? (
          <p className="text-sm text-[#64748B]">
            {getTargetDisplay(request.targetType, request.targetId, request)} — aucune donnée saisie.
          </p>
        ) : (
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.key}>
                {dataSections.length > 1 && (
                  <p className="text-xs font-semibold text-emerald-400 mb-2">{section.label}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.scalars.map((f) => renderDataField(section, f, editable))}
                </div>
              </div>
            ))}
          </div>
        )}
        {editable && editCount > 0 && (
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setPayloadEdits({ main: {}, steps: {} })}
              disabled={savingEdits}
              className="px-3 py-2 text-xs text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 rounded-xl"
            >
              Annuler
            </button>
            <button
              onClick={handleSavePayloadEdits}
              disabled={savingEdits}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
            >
              {savingEdits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingEdits ? 'Enregistrement…' : `Enregistrer (${editCount})`}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Member profile, read-only: only the fields an approver may see.
  const renderMemberPanel = () => {
    if (!member) return null;
    const display = (name, value) => {
      if (value === undefined || value === null || value === '') return null;
      if (name === 'region' || name === 'wilaya') return wilayaLabel(value, null);
      if (name === 'sexe') return value === 'M' ? 'Homme' : value === 'F' ? 'Femme' : value;
      return renderScalarValue(value);
    };
    const sections = MEMBER_SECTIONS.map((section) => ({
      ...section,
      rows: section.fields
        .map(([name, label]) => ({ name, label, value: display(name, member[name]) }))
        .filter((row) => row.value !== null && row.value !== '-'),
    })).filter((section) => section.rows.length > 0);
    if (sections.length === 0) return null;

    return (
      <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
        <h6 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          Informations du membre
        </h6>
        <p className="text-[11px] text-amber-300/90 mb-3">
          Lecture seule — toute correction ou modification doit faire l'objet d'une demande via
          l'espace membre.
        </p>
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold text-emerald-400 mb-1.5">{section.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {section.rows.map((row) => {
                  const rtl = RTL_MEMBER_FIELDS.has(row.name);
                  return (
                    <div key={row.name} className="text-sm">
                      <span className="text-[#64748B] text-xs block">{row.label}</span>
                      <span className={`text-[#F8FAFC] ${rtl ? 'block text-right' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
                        {row.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Document review (verification step) ─────────────────────────
  const reviewOf = (stepOrder, key) => docReviews[stepOrder]?.[key] || null;

  const setReview = (stepOrder, key, patch) =>
    setDocReviews((prev) => {
      const current = prev[stepOrder]?.[key] || { decision: null, reasons: [], other: false, custom: '' };
      return { ...prev, [stepOrder]: { ...(prev[stepOrder] || {}), [key]: { ...current, ...patch } } };
    });

  const toggleReason = (stepOrder, key, reason) => {
    const reasons = reviewOf(stepOrder, key)?.reasons || [];
    setReview(stepOrder, key, {
      reasons: reasons.includes(reason) ? reasons.filter((r) => r !== reason) : [...reasons, reason],
    });
  };

  // What the reviewer decided for this step, and the comment it produces.
  const reviewSummary = (stepOrder) => {
    const rows = docFields.map((doc) => ({ doc, review: reviewOf(stepOrder, doc.key) }));
    const undecided = rows.filter(({ review }) => !review?.decision);
    const reserves = rows.filter(({ review }) => review?.decision === 'reserve');
    const incomplete = reserves.filter(
      ({ review }) => review.reasons.length === 0 && !(review.other && review.custom.trim()),
    );
    const lines = reserves.map(({ doc, review }) => {
      const motifs = [...review.reasons, ...(review.other && review.custom.trim() ? [review.custom.trim()] : [])];
      return `- ${doc.label} : ${motifs.join(' ; ')}`;
    });
    return {
      ready: undecided.length === 0 && incomplete.length === 0,
      undecided: undecided.length,
      incomplete: incomplete.length,
      hasReserve: reserves.length > 0,
      comment:
        reserves.length > 0
          ? `Réserves :\n${lines.join('\n')}`
          : 'Tous les documents sont conformes.',
    };
  };

  const goToDoc = (key) => {
    const index = declarationFiles.findIndex((f) => f.docKey === key);
    if (index !== -1) setCurrentDocIndex(index);
  };

  const renderDocReview = (step) => {
    const summary = reviewSummary(step.order);
    return (
      <div className="space-y-3">
        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
          Contrôle des documents <span className="text-rose-400">*</span>
        </label>
        {docFields.map((doc) => {
          const review = reviewOf(step.order, doc.key);
          const reasons = reserveReasonsOf(doc.field);
          return (
            <div key={doc.key} className="p-3 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goToDoc(doc.key)}
                  className="text-sm font-semibold text-[#F8FAFC] hover:text-emerald-400 text-left"
                  title="Afficher ce document"
                >
                  {doc.label}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReview(step.order, doc.key, { decision: 'ok' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      review?.decision === 'ok'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                    }`}
                  >
                    Conforme
                  </button>
                  <button
                    type="button"
                    onClick={() => setReview(step.order, doc.key, { decision: 'reserve' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      review?.decision === 'reserve'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'text-rose-400 border-rose-500/40 hover:bg-rose-500/10'
                    }`}
                  >
                    Réserve
                  </button>
                </div>
              </div>

              {review?.decision === 'reserve' && (
                <div className="mt-3 space-y-1.5 pl-1">
                  {reasons.map((reason) => (
                    <label key={reason} className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                      <input
                        type="checkbox"
                        checked={review.reasons.includes(reason)}
                        onChange={() => toggleReason(step.order, doc.key, reason)}
                        className="w-4 h-4 accent-rose-500"
                      />
                      {reason}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                    <input
                      type="checkbox"
                      checked={review.other}
                      onChange={(e) => setReview(step.order, doc.key, { other: e.target.checked })}
                      className="w-4 h-4 accent-rose-500"
                    />
                    Autre (commentaire personnalisé)
                  </label>
                  {review.other && (
                    <textarea
                      rows={2}
                      value={review.custom}
                      onChange={(e) => setReview(step.order, doc.key, { custom: e.target.value })}
                      placeholder="Précisez la réserve…"
                      className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-y"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!summary.ready && (
          <p className="text-xs text-[#64748B]">
            {summary.undecided > 0
              ? `${summary.undecided} document(s) à contrôler.`
              : 'Indiquez au moins un motif pour chaque réserve.'}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {summary.hasReserve ? (
            <button
              onClick={() => handleStepAction(step.order, 'reject', summary.comment)}
              disabled={actionLoading || !summary.ready}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/20 transition-all text-sm font-medium disabled:opacity-50"
            >
              <ThumbsDown className="w-4 h-4" /> Envoyer
            </button>
          ) : (
            <button
              onClick={() => handleStepAction(step.order, 'approve', summary.comment)}
              disabled={actionLoading || !summary.ready}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" /> Approuver et envoyer
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/validation/requests" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Eye className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                {request.validationSchema?.name || request.schemaName || `Demande #${request.id?.slice(-6)}`}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Détails et validation {request.validationSchema?.name || request.schemaName ? `(#${request.id?.slice(-6)})` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 mb-6 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">{getTargetIcon(request.targetType)}</span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Cible</p>
                <p className="text-[#F8FAFC] font-medium">
                  {request.targetType} – {getTargetDisplay(request.targetType, request.targetId)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Info className="w-4 h-4" /></span>
              <div>
                <p className="text-xs text-[#64748B] uppercase tracking-wider">Statut</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStepStatusBadge(request.status)}`}>
                  {getStepStatusIcon(request.status)} {request.status}
                </span>
              </div>
            </div>
            {request.expiresAt && (
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Calendar className="w-4 h-4" /></span>
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wider">Expire le</p>
                  <p className="text-[#F8FAFC] font-medium">{new Date(request.expiresAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

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
            const stepTypeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

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
                        {getStepStatusIcon(step.status)} {step.status}
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

                {step.status === 'awaiting_user' && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <Hourglass className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-100">
                        <p className="font-semibold">En attente du demandeur</p>
                        <p className="text-xs text-amber-200/80 mt-1">
                          {step.userInstructions || 'Le demandeur doit compléter cette étape avant votre validation.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step.status === 'pending' && (
                  <>
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <h5 className="text-sm font-medium text-[#F8FAFC] mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-400" />
                        {stepType === 'verification'
                          ? 'Vérification du dossier & des données'
                          : 'Dossier & données de la demande'}
                      </h5>
                      {(() => {
                        // Left: request data (always editable) and, on a
                        // verification, the member's profile (read-only).
                        // Right: the documents.
                        const isVerification = stepType === 'verification';
                        const showDocs = isVerification || totalDocs > 0;
                        return (
                        <div className={`grid grid-cols-1 gap-6 ${showDocs ? 'md:grid-cols-2' : ''}`}>
                          <div className="space-y-4">
                            {renderDataPanel(true)}
                            {isVerification && renderMemberPanel()}
                          </div>
                          {showDocs && (
                          <div className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                            <h6 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                              Documents fournis ({totalDocs})
                            </h6>
                            {totalDocs === 0 ? (
                              <p className="text-sm text-[#64748B]">Aucun document joint à cette demande.</p>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-[#F8FAFC]">
                                    {currentFile?.label ||
                                      currentFile?.fileName ||
                                      currentFile?.name ||
                                      `Document ${currentDocIndex + 1}`}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#64748B]">
                                      {currentDocIndex + 1} / {totalDocs}
                                    </span>
                                    {blobUrl && !blobViewOnly && (
                                      <a
                                        href={blobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                                      >
                                        Ouvrir
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div className="relative bg-[#111827] rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden flex items-center justify-center h-[500px]">
                                  {blobLoading ? (
                                    <div className="flex flex-col items-center gap-2 text-[#64748B]">
                                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                                      <span className="text-xs">Chargement du document…</span>
                                    </div>
                                  ) : blobUrl && !hasError ? (
                                    blobViewOnly ? (
                                      <div
                                        className="w-full h-full overflow-auto select-none"
                                        onContextMenu={(e) => e.preventDefault()}
                                      >
                                        <img
                                          src={blobUrl}
                                          alt={`Document ${currentDocIndex + 1}`}
                                          className="w-full h-auto"
                                          draggable={false}
                                          onDragStart={(e) => e.preventDefault()}
                                        />
                                      </div>
                                    ) : isPdf ? (
                                      <iframe
                                        src={blobUrl}
                                        className="w-full h-full"
                                        title={`Document ${currentDocIndex + 1}`}
                                        frameBorder="0"
                                        onError={() => {
                                          setImageErrors(prev => ({ ...prev, [blobUrl]: true }));
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={blobUrl}
                                        alt={`Document ${currentDocIndex + 1}`}
                                        className="max-h-full max-w-full object-contain"
                                        onError={() => {
                                          setImageErrors(prev => ({ ...prev, [blobUrl]: true }));
                                        }}
                                      />
                                    )
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[#64748B] px-6 text-center">
                                      <FileQuestion className="w-12 h-12 mb-2" />
                                      <span className="text-sm">
                                        {blobError || `Fichier: ${currentFile?.label || 'Document'}`}
                                      </span>
                                    </div>
                                  )}

                                  {totalDocs > 1 && (
                                    <>
                                      <button
                                        onClick={goToPrev}
                                        disabled={currentDocIndex === 0}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#0A0F1C]/70 hover:bg-[#0A0F1C] border border-white/10 text-white disabled:opacity-30 transition-all"
                                      >
                                        <ChevronLeft className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={goToNext}
                                        disabled={currentDocIndex === totalDocs - 1}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#0A0F1C]/70 hover:bg-[#0A0F1C] border border-white/10 text-white disabled:opacity-30 transition-all"
                                      >
                                        <ChevronRight className="w-5 h-5" />
                                      </button>
                                    </>
                                  )}
                                </div>

                                {totalDocs > 1 && (
                                  <div className="flex items-center justify-center gap-1.5 mt-2">
                                    {declarationFiles.map((_, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setCurrentDocIndex(i)}
                                        className="transition-all"
                                      >
                                        {i === currentDocIndex ? (
                                          <CircleDot className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Circle className="w-2.5 h-2.5 text-[#64748B] hover:text-white" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-[#64748B] mt-3">
                              Veuillez examiner le dossier puis approuver ou rejeter.
                            </p>
                          </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      {/* Verification with documents: one decision per document. */}
                      {stepType === 'verification' && docFields.length > 0 ? (
                        renderDocReview(step)
                      ) : (
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
                        </div>
                      </div>
                      )}
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