import { useContext, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { UserContext } from '../Context/dataCont';
import { fetchWithRefresh } from '../Components/api';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Grade names — must match grades.constants.ts on the backend
const GRADES = ['user', 'admin', 'super_admin'];

// Every condition the backend's evaluateRule supports
const CONDITION_OPTIONS = [
  { value: 'any',           label: 'Toujours (any)' },
  { value: 'self',          label: 'Soi-même (self)' },
  { value: 'same_tenant',   label: 'Même tenant (same_tenant)' },
  { value: 'tenant_admin',  label: 'Admin du tenant (tenant_admin)' },
  { value: 'higher_level',  label: 'Niveau supérieur (higher_level)' },
  { value: 'lower_level',   label: 'Niveau inférieur (lower_level)' },
  { value: 'same_level',    label: 'Même niveau (same_level)' },
  { value: 'owns_resource', label: 'Propriétaire (owns_resource)' },
  { value: 'same_wilaya',   label: 'Même wilaya (same_wilaya)' },
  { value: 'same_region',   label: 'Même région (same_region)' },
  { value: 'custom',        label: 'Condition personnalisée (custom)' },
];

// Ensure any incoming rule has exactly one target (grade XOR role.name)
const normalizeRule = (rule) => {
  if (!rule || typeof rule !== 'object') {
    return { grade: 'user', condition: 'any' };
  }
  const hasGrade = typeof rule.grade === 'string' && rule.grade.length > 0;
  const hasRole = !!rule.role?.name;
  const condition = rule.condition || 'any';
  const customCondition = rule.customCondition;

  if (hasGrade && hasRole) {
    // Legacy mixed — prefer the grade (safest default; admins can switch to role)
    const out = { grade: rule.grade, condition };
    if (customCondition) out.customCondition = customCondition;
    return out;
  }
  if (hasGrade) {
    const out = { grade: rule.grade, condition };
    if (customCondition) out.customCondition = customCondition;
    return out;
  }
  if (hasRole) {
    const out = { role: { name: rule.role.name }, condition };
    if (customCondition) out.customCondition = customCondition;
    return out;
  }
  return { grade: 'user', condition };
};

const targetTypeOf = (rule) => (rule.grade !== undefined ? 'grade' : 'role');
const targetValueOf = (rule) =>
  rule.grade !== undefined ? rule.grade : rule.role?.name || '';

export default function RuleListEditor({ rules, onChange }) {
  const { authData, setAuthData } = useContext(UserContext);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleFetchFailed, setRoleFetchFailed] = useState(false);

  // ─── Fetch roles once ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!authData?.token) {
        setLoadingRoles(false);
        return;
      }
      setLoadingRoles(true);
      setRoleFetchFailed(false);
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/roles`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const body = await res.json();
        const list = body?.data || body?.roles || body || [];
        if (!cancelled) {
          setRoles(Array.isArray(list) ? list : []);
          setRoleFetchFailed(false);
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
        if (!cancelled) {
          setRoles([]);
          setRoleFetchFailed(true);
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authData?.token, setAuthData]);

  // Normalize incoming rules every render — safe to re-emit
  const safeRules = (rules || []).map(normalizeRule);

  const commit = (next) => onChange(next);

  const addRule = () => {
    // Default to a grade rule — safest for the current migration
    commit([...safeRules, { grade: 'user', condition: 'any' }]);
  };

  const removeRule = (index) => {
    commit(safeRules.filter((_, i) => i !== index));
  };

  const switchTargetType = (index, newType) => {
    const next = [...safeRules];
    const current = next[index];
    const condition = current.condition || 'any';
    const customCondition = current.customCondition;

    if (newType === 'grade') {
      const grade = current.grade || 'user';
      const rule = { grade, condition };
      if (customCondition) rule.customCondition = customCondition;
      next[index] = rule;
    } else {
      const roleName =
        current.role?.name ||
        roles[0]?.name ||
        'architect';
      const rule = { role: { name: roleName }, condition };
      if (customCondition) rule.customCondition = customCondition;
      next[index] = rule;
    }
    commit(next);
  };

  const updateTargetValue = (index, value) => {
    const next = [...safeRules];
    const current = next[index];
    if (current.grade !== undefined) {
      next[index] = { ...current, grade: value };
    } else {
      next[index] = { ...current, role: { name: value } };
    }
    commit(next);
  };

  const updateCondition = (index, value) => {
    const next = [...safeRules];
    const updated = { ...next[index], condition: value };
    if (value !== 'custom') delete updated.customCondition;
    next[index] = updated;
    commit(next);
  };

  const updateCustomCondition = (index, value) => {
    const next = [...safeRules];
    next[index] = { ...next[index], customCondition: value };
    commit(next);
  };

  return (
    <div className="space-y-2">
      {loadingRoles && (
        <p className="text-xs text-[#64748B] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Chargement des rôles…
        </p>
      )}

      {roleFetchFailed && (
        <p className="text-xs text-amber-400">
          Impossible de charger les rôles depuis l'API. Les règles "rôle" existantes seront conservées telles quelles.
        </p>
      )}

      {safeRules.map((rule, idx) => {
        const targetType = targetTypeOf(rule);
        const targetValue = targetValueOf(rule);
        const currentRoleName = rule.role?.name;
        const roleExistsInList = roles.some((r) => r.name === currentRoleName);

        return (
          <div
            key={idx}
            className="bg-[#111827] p-2 rounded-lg border border-[rgba(255,255,255,0.06)] space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {/* Target type selector */}
              <select
                value={targetType}
                onChange={(e) => switchTargetType(idx, e.target.value)}
                className="bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-24"
              >
                <option value="grade">Grade</option>
                <option value="role">Rôle</option>
              </select>

              {/* Target value */}
              {targetType === 'grade' ? (
                <select
                  value={targetValue}
                  onChange={(e) => updateTargetValue(idx, e.target.value)}
                  className="flex-1 min-w-[140px] bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={targetValue}
                  onChange={(e) => updateTargetValue(idx, e.target.value)}
                  disabled={loadingRoles}
                  className="flex-1 min-w-[140px] bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {/* If the current rule references a role that no longer exists, show it as a warning option */}
                  {currentRoleName && !roleExistsInList && (
                    <option value={currentRoleName}>
                      {currentRoleName} (⚠ introuvable)
                    </option>
                  )}
                  {roles.length === 0 && !loadingRoles && (
                    <option value="">Aucun rôle disponible</option>
                  )}
                  {roles.map((r) => (
                    <option key={r.id || r.name} value={r.name}>
                      {r.name}
                      {r.label && r.label !== r.name ? ` — ${r.label}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Condition selector */}
              <select
                value={rule.condition || 'any'}
                onChange={(e) => updateCondition(idx, e.target.value)}
                className="bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors"
                title="Supprimer la règle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Custom condition name (only when condition === 'custom') */}
            {rule.condition === 'custom' && (
              <input
                type="text"
                value={rule.customCondition || ''}
                onChange={(e) => updateCustomCondition(idx, e.target.value)}
                placeholder="Nom de la condition (ex: is_same_region)"
                className="w-full bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRule}
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Ajouter une règle
      </button>

      {safeRules.length === 0 && (
        <p className="text-xs text-[#64748B]">Aucune règle définie</p>
      )}
    </div>
  );
}