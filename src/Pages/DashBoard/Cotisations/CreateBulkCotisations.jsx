// src/Pages/Fees/CreateBulkCotisation.jsx
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../Context/dataCont';
import { fetchWithRefresh } from '../../../Components/api';
import wilayasData from '../../../assets/data/wilayas.json';
import { transformDates } from '../../../Utils/transformPayload';
import {
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  FileText,
  Check,
  X,
  Loader2,
  PlusCircle,
  Percent,
  Tag,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ── Fee enums — mirror what FeesService.bulkCreateFees expects ──────
const FEE_TYPES = [
  { value: 'annual', label: 'Cotisation annuelle' },
  { value: 'event', label: 'Événement' },
  { value: 'training', label: 'Formation' },
  { value: 'exceptional', label: 'Cotisation exceptionnelle' },
  { value: 'other', label: 'Autre' },
];

// ── Penalty enums — mirror FeesService.calculatePenalty ─────────────
const PENALTY_TYPES = [
  { value: 'none', label: 'Aucune pénalité' },
  { value: 'fixed', label: 'Montant fixe (DA)' },
  { value: 'percentage', label: 'Pourcentage (%)' },
];

const PENALTY_FREQUENCIES = [
  { value: 'once', label: 'Une seule fois' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'semi-annual', label: 'Semestrielle' },
  { value: 'yearly', label: 'Annuelle' },
];

// ── Grades recognised by the backend (User.grade) ───────────────────
const GRADES = [
  { value: 'user', label: 'Membres (grade user)' },
  { value: 'admin', label: 'Admins (grade admin)' },
  { value: 'super_admin', label: 'Super admins (grade super_admin)' },
];

const inputCls =
  'w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]';

const labelCls =
  'flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5';

export default function CreateBulkCotisation() {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  // ── Dynamic roles loaded from /roles ─────────────────────────────
  const [rolesList, setRolesList] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // ── Member filter ────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    role: 'user',
    wilaya: 'all',
  });

  // ── Fee payload ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '',
    feeType: 'annual',
    year: new Date().getFullYear(),
    amount: 0,
    dueDate: '',
    notes: '',
    penaltyType: 'none',
    penaltyRate: 0,
    penaltyFrequency: 'once',
  });

  // ── Load dynamic roles once ──────────────────────────────────────
  useEffect(() => {
    if (!authData?.token) return;
    const load = async () => {
      setLoadingRoles(true);
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/roles`,
          { method: 'GET' },
          authData.token,
          setAuthData,
        );
        const body = await res.json();
        const data = body?.data ?? body;
        const list = Array.isArray(data) ? data : data?.roles || [];
        setRolesList(list);
      } catch (err) {
        console.warn('Failed to load roles, falling back to grades only', err);
        setRolesList([]);
      } finally {
        setLoadingRoles(false);
      }
    };
    load();
  }, [authData?.token, setAuthData]);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFieldChange = (e) => {
    const { name, value, type } = e.target;
    const parsed = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setField(name, parsed);
  };

  // Reset penalty rate/frequency when penalties are disabled
  useEffect(() => {
    if (form.penaltyType === 'none') {
      setField('penaltyRate', 0);
      setField('penaltyFrequency', 'once');
    }
  }, [form.penaltyType]);

  const isPenaltyEnabled = form.penaltyType !== 'none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setResult(null);

    // ── Client-side validation ────────────────────────────────────
    if (!form.title?.trim()) {
      setMessage('❌ Veuillez saisir un titre pour la cotisation');
      setLoading(false);
      return;
    }
    if (!form.feeType) {
      setMessage('❌ Veuillez choisir un type de cotisation');
      setLoading(false);
      return;
    }
    if (!form.year || form.year < 2000 || form.year > 2100) {
      setMessage('❌ Année invalide');
      setLoading(false);
      return;
    }
    if (!form.amount || form.amount <= 0) {
      setMessage('❌ Le montant doit être supérieur à 0');
      setLoading(false);
      return;
    }
    if (!form.dueDate) {
      setMessage("❌ Veuillez saisir une date d'échéance");
      setLoading(false);
      return;
    }
    if (isPenaltyEnabled && (!form.penaltyRate || form.penaltyRate <= 0)) {
      setMessage('❌ Le taux de pénalité doit être supérieur à 0');
      setLoading(false);
      return;
    }
    if (
      isPenaltyEnabled &&
      form.penaltyType === 'percentage' &&
      form.penaltyRate > 100
    ) {
      setMessage('❌ Le pourcentage de pénalité ne peut pas dépasser 100%');
      setLoading(false);
      return;
    }

    // ── Build payload ─────────────────────────────────────────────
    const penaltyConfig = isPenaltyEnabled
      ? {
          type: form.penaltyType,
          rate: Number(form.penaltyRate),
          frequency: form.penaltyFrequency,
        }
      : null;

    const payload = {
      title: form.title.trim(),
      role: filters.role,
      wilaya: filters.wilaya,
      year: Number(form.year),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      feeType: form.feeType,
      penaltyConfig,
      notes: form.notes?.trim() || undefined,
    };

    const transformed = transformDates(payload, ['dueDate']);

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/fees/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transformed),
        },
        authData.token,
        setAuthData,
      );

      const responseData = await response.json();
      const data = responseData.data || responseData;

      if (response.ok && responseData.success !== false) {
        setResult(data);
        setMessage(`✅ Opération terminée : ${data.created} cotisation(s) créée(s)`);
      } else {
        setMessage(
          data.message ||
            responseData.message ||
            '❌ Erreur lors de la création',
        );
      }
    } catch (err) {
      console.error(err);
      setMessage('⚠️ Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      feeType: 'annual',
      year: new Date().getFullYear(),
      amount: 0,
      dueDate: '',
      notes: '',
      penaltyType: 'none',
      penaltyRate: 0,
      penaltyFrequency: 'once',
    });
    setResult(null);
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[3px] mt-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <PlusCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Création en masse de cotisations
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Créez des cotisations pour plusieurs membres à la fois
            </p>
          </div>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ── Section : filtres des membres ──────────────────── */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Filtres des membres
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>
                    <Tag className="w-3.5 h-3.5 text-emerald-400" /> Rôle / grade
                    {loadingRoles && (
                      <span className="text-[#64748B] normal-case text-[10px] ml-1">
                        (chargement…)
                      </span>
                    )}
                  </label>
                  <select
                    name="role"
                    value={filters.role}
                    onChange={handleFilterChange}
                    className={inputCls}
                  >
                    <option value="all">Tous les rôles</option>

                    <optgroup label="Grades">
                      {GRADES.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </optgroup>

                    {rolesList.length > 0 && (
                      <optgroup label="Rôles dynamiques">
                        {rolesList.map((r) => (
                          <option key={r.name} value={r.name}>
                            {r.label || r.name} ({r.name})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Les grades ciblent tous les utilisateurs de ce niveau.
                    Les rôles dynamiques ciblent uniquement les porteurs de ce rôle.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Wilaya
                  </label>
                  <select
                    name="wilaya"
                    value={filters.wilaya}
                    onChange={handleFilterChange}
                    className={inputCls}
                  >
                    <option value="all">Toutes les wilayas</option>
                    {wilayasData.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section : cotisation ───────────────────────────── */}
            <div className="space-y-4 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Informations de la cotisation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Titre */}
                <div className="md:col-span-2">
                  <label className={labelCls}>
                    <Tag className="w-3.5 h-3.5 text-emerald-400" /> Titre de la
                    cotisation <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleFieldChange}
                    placeholder="Ex : Cotisation annuelle 2026 — Région Centre"
                    required
                    maxLength={120}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Ce titre identifie la cotisation dans les workflows de validation.
                    Il doit correspondre à ce que vous mettrez dans le schéma de validation.
                  </p>
                </div>

                {/* Type */}
                <div className="md:col-span-2">
                  <label className={labelCls}>
                    <Tag className="w-3.5 h-3.5 text-emerald-400" /> Type de
                    cotisation <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="feeType"
                    value={form.feeType}
                    onChange={handleFieldChange}
                    required
                    className={inputCls}
                  >
                    {FEE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Année */}
                <div>
                  <label className={labelCls}>
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Année{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={form.year}
                    onChange={handleFieldChange}
                    min={2000}
                    max={2100}
                    required
                    className={inputCls}
                  />
                </div>

                {/* Montant */}
                <div>
                  <label className={labelCls}>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Montant
                    (DA) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFieldChange}
                    min={0}
                    step="1"
                    required
                    className={inputCls}
                  />
                </div>

                {/* Date d'échéance */}
                <div className="md:col-span-2">
                  <label className={labelCls}>
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Date
                    d'échéance <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleFieldChange}
                    required
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className={labelCls}>
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Notes
                    (optionnel)
                  </label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFieldChange}
                    rows={3}
                    placeholder="Informations complémentaires…"
                    className={inputCls + ' resize-y'}
                  />
                </div>
              </div>
            </div>

            {/* ── Section : pénalités ────────────────────────────── */}
            <div className="space-y-4 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Pénalités de retard
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Type de pénalité */}
                <div className={isPenaltyEnabled ? '' : 'md:col-span-2'}>
                  <label className={labelCls}>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Type de
                    pénalité
                  </label>
                  <select
                    name="penaltyType"
                    value={form.penaltyType}
                    onChange={handleFieldChange}
                    className={inputCls}
                  >
                    {PENALTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {form.penaltyType === 'fixed' &&
                      'Un montant en DA est ajouté à chaque période de retard.'}
                    {form.penaltyType === 'percentage' &&
                      'Un pourcentage du montant de la cotisation est ajouté à chaque période.'}
                    {form.penaltyType === 'none' &&
                      'Aucune pénalité ne sera appliquée.'}
                  </p>
                </div>

                {isPenaltyEnabled && (
                  <>
                    {/* Taux */}
                    <div>
                      <label className={labelCls}>
                        {form.penaltyType === 'fixed' ? (
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Percent className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        {form.penaltyType === 'fixed'
                          ? 'Montant (DA)'
                          : 'Pourcentage (%)'}{' '}
                        <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="penaltyRate"
                        value={form.penaltyRate}
                        onChange={handleFieldChange}
                        min={0}
                        max={form.penaltyType === 'percentage' ? 100 : undefined}
                        step={form.penaltyType === 'percentage' ? '0.01' : '1'}
                        required
                        className={inputCls}
                      />
                    </div>

                    {/* Fréquence */}
                    <div>
                      <label className={labelCls}>
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Fréquence
                      </label>
                      <select
                        name="penaltyFrequency"
                        value={form.penaltyFrequency}
                        onChange={handleFieldChange}
                        className={inputCls}
                      >
                        {PENALTY_FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Aperçu */}
              {isPenaltyEnabled && form.amount > 0 && form.penaltyRate > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200">
                  <strong className="text-amber-400">Exemple :</strong> pour une
                  cotisation de {form.amount} DA payée en retard, la pénalité sera de{' '}
                  {form.penaltyType === 'fixed'
                    ? `${form.penaltyRate} DA`
                    : `${((form.amount * form.penaltyRate) / 100).toFixed(2)} DA`}
                  {form.penaltyFrequency === 'once' && ' (une seule fois)'}
                  {form.penaltyFrequency === 'monthly' && ' par mois de retard'}
                  {form.penaltyFrequency === 'semi-annual' &&
                    ' par semestre de retard'}
                  {form.penaltyFrequency === 'yearly' && ' par année de retard'}.
                  <span className="block mt-1 text-[#94A3B8]">
                    La pénalité est plafonnée au montant de la cotisation.
                  </span>
                </div>
              )}
            </div>

            {/* ── Message & résultat ──────────────────────────────── */}
            {message && (
              <div
                className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  message.includes('✅') || message.includes('Opération terminée')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {message.includes('✅') || message.includes('Opération terminée') ? (
                  <Check className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                {message}
              </div>
            )}

            {result && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <p className="text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {result.created} cotisation(s) créée(s)
                </p>
                {result.skipped > 0 && (
                  <p className="text-yellow-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {result.skipped} utilisateur(s) avec une cotisation déjà existante
                    ignoré(s)
                  </p>
                )}
                {result.startDateSkipped > 0 && (
                  <p className="text-orange-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {result.startDateSkipped} utilisateur(s) exclus(s) (date de début
                    postérieure à l'échéance)
                  </p>
                )}
                <p className="text-[#94A3B8] text-sm pt-1 border-t border-[rgba(255,255,255,0.06)]">
                  Total utilisateurs concernés : {result.total}
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Créer une autre série
                </button>
              </div>
            )}

            {/* ── Actions ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    Créer les cotisations
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dash/allCotisations')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1F2937] hover:bg-[#182233] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all border border-[rgba(255,255,255,0.06)] font-medium"
              >
                <X className="w-5 h-5" />
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}