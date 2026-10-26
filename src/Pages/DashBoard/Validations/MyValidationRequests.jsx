// src/Pages/DashBoard/Validations/MyValidationRequests.jsx
// An admin's own requests: schemas targeting admins (filtered by role on
// the server), requests about their account, and steps waiting for them.
import { useCallback, useContext, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Clock,
  Edit,
  Hourglass,
  Loader2,
  Plus,
  Shield,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { UserContext } from '../../../Context/dataCont';
import { useError } from '../../../Context/ErrorContext';
import { useModal } from '../../../Context/ModalContext';
import { fetchWithRefresh } from '../../../Components/api';
import SchemaFormModal from '../../../Components/Modals/SchemaFormModal';

const API_URL = import.meta.env.VITE_NEST_API_URL;

const unwrap = (body) =>
  body && typeof body === 'object' && 'data' in body && 'success' in body ? body.data : body;

const messageOf = (data, fallback) => {
  const m = data?.message;
  if (Array.isArray(m)) return m.join(' • ');
  return m ? String(m) : fallback;
};

const OPEN_STATUSES = ['pending', 'partial'];

const REQUEST_STATUS = {
  pending: { label: 'En cours', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  partial: { label: 'En cours', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  approved: { label: 'Validée', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Rejetée', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  cancelled: { label: 'Annulée', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  expired: { label: 'Expirée', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

const STEP_STATUS = {
  pending: { label: 'En attente', icon: Clock, cls: 'text-blue-400' },
  awaiting_user: { label: 'Votre action est attendue', icon: Hourglass, cls: 'text-amber-400' },
  approved: { label: 'Approuvée', icon: CheckCircle, cls: 'text-emerald-400' },
  rejected: { label: 'Rejetée', icon: XCircle, cls: 'text-rose-400' },
  expired: { label: 'Expirée', icon: XCircle, cls: 'text-orange-400' },
  skipped: { label: 'Sautée', icon: SkipForward, cls: 'text-gray-400' },
};

export default function MyValidationRequests() {
  const { authData, setAuthData } = useContext(UserContext);
  const { showSuccess, showError } = useError();
  const { confirm } = useModal();
  const adminId = authData?.user?.id;

  const [schemas, setSchemas] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // { schema } for a new request, { stepContext } for a waiting step.
  const [modal, setModal] = useState(null);

  const getJson = useCallback(
    async (path) => {
      const res = await fetchWithRefresh(`${API_URL}${path}`, { method: 'GET' }, authData.token, setAuthData);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(messageOf(body, `Erreur ${res.status}`));
      return unwrap(body);
    },
    [authData?.token, setAuthData],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [available, mine] = await Promise.all([
        getJson('/validation/schemas/available'),
        getJson('/validation/requests/mine'),
      ]);
      setSchemas(Array.isArray(available) ? available : []);
      setRequests(Array.isArray(mine) ? mine : []);
    } catch (err) {
      showError(err.message || 'Impossible de charger vos demandes.');
    } finally {
      setLoading(false);
    }
  }, [getJson, showError]);

  useEffect(() => {
    if (authData?.token) load();
  }, [authData?.token, load]);

  const schemaNameOf = (req) => req.validationSchema?.name || req.schemaName || 'Demande';

  const openRequestFor = (schema) =>
    requests.find(
      (r) => OPEN_STATUSES.includes(r.status) && schemaNameOf(r) === schema.name,
    );

  // Schema without a form: confirm, then create the request directly.
  const startWithoutForm = async (schema) => {
    const ok = await confirm({
      title: 'Confirmer la demande',
      message: `Êtes-vous sûr de vouloir initier « ${schema.name} » ?`,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetchWithRefresh(
        `${API_URL}/validation/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: adminId, targetType: 'Admin', schemaName: schema.name }),
        },
        authData.token,
        setAuthData,
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(messageOf(body, 'Erreur lors de la création de la demande'));
      showSuccess(`Demande « ${schema.name} » initiée avec succès !`);
      await load();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startRequest = (schema) => {
    if ((schema.payloadSchema || []).some((f) => f?.filledBy !== 'reviewer')) {
      setModal({ schema });
    } else {
      startWithoutForm(schema);
    }
  };

  const closeModal = () => setModal(null);
  const afterSubmit = async () => {
    closeModal();
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">Mes demandes</h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Démarches ouvertes à votre rôle et suivi de vos demandes.
            </p>
          </div>
        </div>

        {/* ── My requests ─────────────────────────────────────────── */}
        <section className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" /> Suivi
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-[#64748B]">Aucune demande pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const status = REQUEST_STATUS[req.status] || REQUEST_STATUS.pending;
                const waitingStep = (req.steps || []).find((s) => s.status === 'awaiting_user');
                return (
                  <div key={req.id} className="bg-[#0A0F1C] rounded-xl border border-white/10 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[#F8FAFC]">{schemaNameOf(req)}</p>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Créée le {new Date(req.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.cls}`}>
                        {waitingStep ? 'Action requise' : status.label}
                      </span>
                    </div>

                    {waitingStep && (
                      <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-[220px]">
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            Action requise : {waitingStep.stepName || `Étape ${waitingStep.order}`}
                          </p>
                          <p className="text-sm text-[#F8FAFC] mt-1.5">
                            {waitingStep.userInstructions ||
                              'Des informations complémentaires sont attendues pour poursuivre votre demande.'}
                          </p>
                          {waitingStep.comments && (
                            <p className="text-xs text-amber-200 mt-1.5">Motif : {waitingStep.comments}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setModal({
                              stepContext: {
                                requestId: req.id,
                                step: waitingStep,
                                previousData: req.stepPayloads?.[String(waitingStep.order)]?.data || null,
                              },
                            })
                          }
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" /> Compléter
                        </button>
                      </div>
                    )}

                    <ol className="mt-4 space-y-2">
                      {(req.steps || []).map((step) => {
                        const s = STEP_STATUS[step.status] || STEP_STATUS.pending;
                        const Icon = s.icon;
                        return (
                          <li key={step.order} className="flex items-start gap-3 text-sm">
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.cls}`} />
                            <div>
                              <span className="text-[#F8FAFC]">{step.stepName || `Étape ${step.order}`}</span>
                              <span className={`ml-2 text-xs ${s.cls}`}>{s.label}</span>
                              {step.comments && step.status !== 'awaiting_user' && (
                                <p className="text-xs text-[#94A3B8] mt-0.5">« {step.comments} »</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Available schemas ───────────────────────────────────── */}
        <section className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6">
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-400" /> Démarches disponibles
          </h2>
          {schemas.length === 0 ? (
            <p className="text-sm text-[#64748B]">Aucune démarche n'est ouverte à votre rôle.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {schemas.map((schema) => {
                const open = openRequestFor(schema);
                return (
                  <div key={schema.id} className="bg-[#0A0F1C] rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{schema.name}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1.5">
                        {schema.description || `Initiez un parcours de validation pour ${schema.name}.`}
                      </p>
                      {Array.isArray(schema.steps) && (
                        <p className="text-xs text-[#64748B] mt-3">
                          {schema.steps.length} étape{schema.steps.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/5">
                      {open ? (
                        <p className="text-xs text-blue-300 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Une demande est déjà en cours.
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => startRequest(schema)}
                          className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" /> Faire la demande
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <SchemaFormModal
        isOpen={!!modal}
        onClose={closeModal}
        onGoToValidations={afterSubmit}
        onSuccess={afterSubmit}
        targetUserId={adminId}
        authToken={authData?.token}
        schema={modal?.schema || null}
        stepContext={modal?.stepContext || null}
        user={authData?.user}
        viewerIsAdmin
      />
    </div>
  );
}
