import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save, X, Layers, List, AlertCircle, RefreshCw } from "lucide-react";
import FieldEditor from "../FieldEditor";
import RuleListEditor from "../RuleListEditor";
import { UserContext } from "../../Context/dataCont";
import { fetchWithRefresh } from "../../Components/api";

// ─── Config ────────────────────────────────────────────────────────────
// Change this if your backend exposes roles at a different path.
const API_URL = import.meta.env.VITE_NEST_API_URL;
const ROLES_ENDPOINT = `${API_URL}/roles`;

// ─── Constants ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "flawed", label: "Défectueux" },
  { value: "archived", label: "Archivé" },
  { value: "stable", label: "Stable" },
];

const createEmptyField = () => ({
  name: "",
  label: "",
  type: "text",
  creatableBy: [],
  editableBy: [],
  visibleTo: [],
  validation: {},
  ui: { order: 0, group: "personal_info", colSpan: 12 },
});

const createEmptyOperation = () => ({ operation: "", allowed: [] });

// ─── Styles ────────────────────────────────────────────────────────────

const LABEL_CLS =
  "block text-xs font-medium text-[#94A3B8] uppercase tracking-wider";

const INPUT_CLS =
  "w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200";

const CARD_CLS =
  "bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all";

const PRIMARY_BTN_CLS =
  "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200";

// ─── Sub-components ────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, addLabel, onAdd }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
        <Icon className="w-5 h-5 text-emerald-400" />
        {title}
        <span className="text-xs text-[#64748B] font-normal ml-1">({count})</span>
      </div>
      <button type="button" onClick={onAdd} className={PRIMARY_BTN_CLS}>
        <Plus className="w-4 h-4" />
        {addLabel}
      </button>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className={`text-center text-[#64748B] text-sm py-6 ${CARD_CLS}`}>
      {children}
    </div>
  );
}

// ─── Roles loader ──────────────────────────────────────────────────────

/**
 * Fetches the role list once and returns an array of role NAMES (strings).
 *
 * The editors (`FieldEditor`, `RuleListEditor`) were written to consume an
 * array of strings — passing objects crashes React. So we collapse the
 * response down to a `string[]`.
 *
 * If `providedRoles` is a non-empty array, we skip the fetch entirely.
 */
function useRoles(authData, setAuthData, providedRoles) {
  const [roleNames, setRoleNames] = useState(
    Array.isArray(providedRoles)
      ? providedRoles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean)
      : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    // Caller already supplied roles — nothing to do.
    if (Array.isArray(providedRoles) && providedRoles.length > 0) {
      setRoleNames(
        providedRoles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean),
      );
      return;
    }

    if (!authData?.token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(
        ROLES_ENDPOINT,
        { method: "GET" },
        authData.token,
        setAuthData,
      );

      if (!res.ok) {
        throw new Error(`Erreur ${res.status} lors du chargement des rôles`);
      }

      const body = await res.json();
      // Unwrap common envelopes: { data: [...] }, { roles: [...] }, plain [...]
      const raw = (body && typeof body === "object" && "data" in body)
        ? body.data
        : body;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.roles)
          ? raw.roles
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

      // Collapse to strings — the editors only need names.
      const names = list
        .map((r) => (typeof r === "string" ? r : r?.name ?? r?.id ?? null))
        .filter((n) => typeof n === "string" && n.length > 0);

      // De-duplicate (defensive — some backends repeat rows across tenants)
      const unique = Array.from(new Set(names));

      setRoleNames(unique);
    } catch (err) {
      console.error("[VersionForm] failed to load roles:", err);
      setError(err?.message || "Impossible de charger les rôles");
      setRoleNames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData?.token, JSON.stringify(providedRoles)]);

  return { roleNames, loading, error, reload: load };
}

// ─── Main ──────────────────────────────────────────────────────────────

export default function VersionForm({
  initialSchema = { fields: [], operations: [] },
  initialStatus = "active",
  onSubmit,
  submitLabel = "Enregistrer",
  loading = false,
  availableRoles = null, // optional override — array of strings or objects
}) {
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);

  const [schema, setSchema] = useState(initialSchema);
  const [status, setStatus] = useState(initialStatus);

  // ── Fetch roles once, use everywhere (returns string[]) ────────────
  const { roleNames, loading: rolesLoading, error: rolesError, reload: reloadRoles } =
    useRoles(authData, setAuthData, availableRoles);

  // Fields
  const addField = () =>
    setSchema((p) => ({ ...p, fields: [...p.fields, createEmptyField()] }));

  const updateField = (i, field) =>
    setSchema((p) => {
      const fields = [...p.fields];
      fields[i] = field;
      return { ...p, fields };
    });

  const deleteField = (i) =>
    setSchema((p) => ({ ...p, fields: p.fields.filter((_, j) => j !== i) }));

  // Operations
  const addOperation = () =>
    setSchema((p) => ({
      ...p,
      operations: [...p.operations, createEmptyOperation()],
    }));

  const updateOperation = (i, patch) =>
    setSchema((p) => {
      const operations = [...p.operations];
      operations[i] = { ...operations[i], ...patch };
      return { ...p, operations };
    });

  const deleteOperation = (i) =>
    setSchema((p) => ({
      ...p,
      operations: p.operations.filter((_, j) => j !== i),
    }));

  // Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(schema, status);
  };
  const handleCancel = () => navigate(-1);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Roles status banner ─────────────────────────────────── */}
      {rolesError && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-200 font-medium">{rolesError}</p>
            <p className="text-xs text-rose-300/70 mt-0.5">
              Les rôles affichés peuvent être incomplets. Réessayez ou rechargez la page.
            </p>
          </div>
          <button
            type="button"
            onClick={reloadRoles}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-100 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recharger
          </button>
        </div>
      )}

      {rolesLoading && !rolesError && (
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
          Chargement des rôles…
        </div>
      )}

      {/* Status */}
      <div className="space-y-1.5">
        <label className={LABEL_CLS}>Statut de la version</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          className={`${INPUT_CLS} max-w-xs`}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Fields */}
      <section className="space-y-4">
        <SectionHeader
          icon={Layers}
          title="Champs"
          count={schema.fields.length}
          addLabel="Ajouter un champ"
          onAdd={addField}
        />

        {schema.fields.map((field, idx) => (
          <div key={idx} className={`${CARD_CLS} p-4`}>
            <FieldEditor
              field={field}
              onChange={(updated) => updateField(idx, updated)}
              onDelete={() => deleteField(idx)}
              availableRoles={roleNames}
            />
          </div>
        ))}

        {schema.fields.length === 0 && (
          <EmptyState>
            Aucun champ défini. Cliquez sur « Ajouter un champ » pour commencer.
          </EmptyState>
        )}
      </section>

      {/* Operations */}
      <section className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <SectionHeader
          icon={List}
          title="Opérations"
          count={schema.operations.length}
          addLabel="Ajouter une opération"
          onAdd={addOperation}
        />

        {schema.operations.map((op, idx) => (
          <div key={idx} className={`${CARD_CLS} p-5`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-semibold text-[#F8FAFC] font-mono">
                {op.operation || "Nouvelle opération"}
              </h3>
              <button
                type="button"
                onClick={() => deleteOperation(idx)}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                aria-label="Supprimer l'opération"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Nom de l'opération</label>
              <input
                type="text"
                value={op.operation || ""}
                onChange={(e) => updateOperation(idx, { operation: e.target.value })}
                className={INPUT_CLS + " font-mono"}
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <label className={LABEL_CLS}>Rôles autorisés</label>
              <RuleListEditor
                rules={op.allowed || []}
                onChange={(allowed) => updateOperation(idx, { allowed })}
                availableRoles={roleNames}
              />
            </div>
          </div>
        ))}

        {schema.operations.length === 0 && (
          <EmptyState>
            Aucune opération définie. Cliquez sur « Ajouter une opération » pour commencer.
          </EmptyState>
        )}
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}