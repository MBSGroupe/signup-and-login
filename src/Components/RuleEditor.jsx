// Components/Permissions/RuleEditor.jsx
import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────

const GRADES = ["user", "admin", "super_admin"];

const SIMPLE_CONDITIONS = [
  { value: "any", label: "any (aucune restriction)" },
  { value: "self", label: "self" },
  { value: "same_region", label: "same region" },
  { value: "same_wilaya", label: "same wilaya" },
  { value: "same_role", label: "same role" },
  { value: "same_level", label: "same level" },
  { value: "higher_level", label: "higher level" },
  { value: "lower_level", label: "lower level" },
  { value: "same_tenant", label: "same tenant" },
  { value: "owns_resource", label: "owns resource" },
  { value: "custom", label: "custom..." },
];

const COMPOSITE_CONDITIONS = [
  { value: "and", label: "AND — toutes" },
  { value: "or", label: "OR — au moins une" },
  { value: "not", label: "NOT — aucune" },
];

const SIMPLE_SCOPES = [
  { value: "same_region", label: "Même région (colonne de la ligne)" },
  { value: "same_wilaya", label: "Même wilaya" },
  { value: "same_role", label: "Même rôle" },
  { value: "self", label: "Lui-même" },
  { value: "same_region_of_owner", label: "Région du propriétaire (owner)" },
  { value: "same_region_of_user", label: "Région de l'utilisateur" },
  { value: "same_region_of_target_user", label: "Région du user cible" },
  { value: "field_equals", label: "champ = valeur" },
  { value: "field_in", label: "champ ∈ liste" },
  { value: "relation_field_in", label: "relation.champ ∈ liste" },
  { value: "relation_field_equals", label: "relation.champ = valeur" },
];

const COMPOSITE_SCOPES = [
  { value: "and", label: "AND — toutes" },
  { value: "or", label: "OR — au moins une" },
];

const CONDITION_COMPOSITES = ["and", "or", "not"];
const SCOPE_COMPOSITES = ["and", "or"];

// ─── Shared styles (emerald dark theme) ────────────────────────────────

const INPUT_CLS =
  "px-2.5 py-1.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all";

const SELECT_CLS = INPUT_CLS + " pr-7";

const DELETE_BTN_CLS =
  "p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded";

const SUBLINK_CLS =
  "self-start inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300";

const FIELD_LABEL_CLS =
  "text-[10px] uppercase tracking-wider text-[#64748B] font-semibold";

// ─── Selects ───────────────────────────────────────────────────────────

function ConditionSelect({ value, onChange }) {
  return (
    <select value={value} onChange={onChange} className={SELECT_CLS}>
      <optgroup label="Simple">
        {SIMPLE_CONDITIONS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </optgroup>
      <optgroup label="Composition">
        {COMPOSITE_CONDITIONS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </optgroup>
    </select>
  );
}

function ScopeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={onChange} className={SELECT_CLS}>
      <optgroup label="Simple">
        {SIMPLE_SCOPES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </optgroup>
      <optgroup label="Composition">
        {COMPOSITE_SCOPES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </optgroup>
    </select>
  );
}

// ─── Condition tree ────────────────────────────────────────────────────

function ConditionNode({ cond, onChange, onDelete, depth = 0 }) {
  const isComposite = CONDITION_COMPOSITES.includes(cond.condition);
  const children = cond.conditions || [];

  const set = (patch) => onChange({ ...cond, ...patch });
  const setChildren = (next) => set({ conditions: next });

  const handleConditionChange = (value) => {
    if (CONDITION_COMPOSITES.includes(value)) {
      set({
        condition: value,
        conditions: children.length ? children : [{ condition: "any" }],
      });
    } else {
      set({ condition: value, conditions: undefined, customCondition: undefined });
    }
  };

  const addChild = () => setChildren([...children, { condition: "any" }]);
  const updateChild = (i, next) => {
    const copy = [...children];
    copy[i] = next;
    setChildren(copy);
  };
  const removeChild = (i) => setChildren(children.filter((_, j) => j !== i));

  return (
    <div
      className={
        depth > 0
          ? "flex flex-wrap items-center gap-2 pl-4 border-l border-[rgba(255,255,255,0.06)]"
          : "flex flex-wrap items-center gap-2"
      }
    >
      <ConditionSelect
        value={cond.condition}
        onChange={(e) => handleConditionChange(e.target.value)}
      />

      {cond.condition === "custom" && (
        <input
          type="text"
          value={cond.customCondition || ""}
          onChange={(e) => set({ customCondition: e.target.value })}
          placeholder="nom de la condition"
          className={INPUT_CLS + " w-44"}
        />
      )}

      {isComposite && (
        <div className="flex flex-col gap-1.5 w-full">
          {children.map((child, i) => (
            <ConditionNode
              key={i}
              cond={child}
              onChange={(c) => updateChild(i, c)}
              onDelete={() => removeChild(i)}
              depth={depth + 1}
            />
          ))}
          <button type="button" onClick={addChild} className={SUBLINK_CLS}>
            <Plus className="w-3 h-3" /> Ajouter une sous-condition
          </button>
        </div>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className={DELETE_BTN_CLS}
          title="Supprimer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Scope tree ────────────────────────────────────────────────────────

function ScopeNode({ scope, onChange, onDelete, depth = 0 }) {
  const isComposite = SCOPE_COMPOSITES.includes(scope.type);
  const children = scope.scopes || [];

  const isRelation =
    scope.type === "relation_field_in" || scope.type === "relation_field_equals";
  const isField = scope.type === "field_equals" || scope.type === "field_in";

  const set = (patch) => onChange({ ...scope, ...patch });
  const setChildren = (next) => set({ scopes: next });

  const handleTypeChange = (value) => {
    if (SCOPE_COMPOSITES.includes(value)) {
      set({
        type: value,
        scopes: children.length ? children : [{ type: "same_region" }],
      });
    } else {
      set({
        type: value,
        scopes: undefined,
        field: undefined,
        relation: undefined,
        value: undefined,
      });
    }
  };

  const addChild = () => setChildren([...children, { type: "same_region" }]);
  const updateChild = (i, next) => {
    const copy = [...children];
    copy[i] = next;
    setChildren(copy);
  };
  const removeChild = (i) => setChildren(children.filter((_, j) => j !== i));

  const setList = (raw) =>
    set({ value: raw.split(",").map((s) => s.trim()).filter(Boolean) });

  return (
    <div
      className={
        depth > 0
          ? "flex flex-col gap-1.5 pl-4 border-l border-purple-500/20"
          : "flex flex-col gap-1.5"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ScopeSelect value={scope.type} onChange={(e) => handleTypeChange(e.target.value)} />

        {scope.type === "same_region" && (
          <input
            type="text"
            value={scope.field || "region"}
            onChange={(e) => set({ field: e.target.value })}
            placeholder="champ"
            className={INPUT_CLS + " w-32"}
          />
        )}

        {scope.type === "same_wilaya" && (
          <input
            type="text"
            value={scope.field || "wilaya"}
            onChange={(e) => set({ field: e.target.value })}
            placeholder="champ"
            className={INPUT_CLS + " w-32"}
          />
        )}

        {isField && (
          <>
            <input
              type="text"
              value={scope.field || ""}
              onChange={(e) => set({ field: e.target.value })}
              placeholder="champ"
              className={INPUT_CLS + " w-32"}
            />
            <input
              type="text"
              value={
                scope.type === "field_in"
                  ? (scope.value || []).join(", ")
                  : scope.value ?? ""
              }
              onChange={(e) =>
                scope.type === "field_in"
                  ? setList(e.target.value)
                  : set({ value: e.target.value })
              }
              placeholder={scope.type === "field_in" ? "v1, v2" : "valeur"}
              className={INPUT_CLS + " w-40"}
            />
          </>
        )}

        {isRelation && (
          <>
            <input
              type="text"
              value={scope.relation || ""}
              onChange={(e) => set({ relation: e.target.value })}
              placeholder="relation"
              className={INPUT_CLS + " w-28"}
            />
            <input
              type="text"
              value={scope.field || ""}
              onChange={(e) => set({ field: e.target.value })}
              placeholder="champ"
              className={INPUT_CLS + " w-28"}
            />
            <input
              type="text"
              value={
                scope.type === "relation_field_in"
                  ? (scope.value || []).join(", ")
                  : scope.value ?? ""
              }
              onChange={(e) =>
                scope.type === "relation_field_in"
                  ? setList(e.target.value)
                  : set({ value: e.target.value })
              }
              placeholder={scope.type === "relation_field_in" ? "v1, v2" : "valeur"}
              className={INPUT_CLS + " w-40"}
            />
          </>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={DELETE_BTN_CLS}
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {isComposite && (
        <div className="flex flex-col gap-1.5 pl-4 border-l border-purple-500/20">
          {children.map((child, i) => (
            <ScopeNode
              key={i}
              scope={child}
              onChange={(s) => updateChild(i, s)}
              onDelete={() => removeChild(i)}
              depth={depth + 1}
            />
          ))}
          <button type="button" onClick={addChild} className={SUBLINK_CLS}>
            <Plus className="w-3 h-3" /> Ajouter un scope
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Rule editor ───────────────────────────────────────────────────────

export default function RuleEditor({ rule, onChange, onDelete, availableRoles = [] }) {
  const [scopeOpen, setScopeOpen] = useState(!!rule?.scope);

  const targetType = rule?.grade ? "grade" : rule?.role ? "role" : "grade";
  const targetValue = rule?.grade || rule?.role?.name || "";

  const handleTargetType = (type) => {
    if (type === "grade") {
      onChange({ ...rule, grade: targetValue || "admin", role: undefined });
    } else {
      onChange({ ...rule, role: { name: targetValue || "" }, grade: undefined });
    }
  };

  const handleTargetValue = (value) => {
    if (targetType === "grade") onChange({ ...rule, grade: value });
    else onChange({ ...rule, role: { name: value } });
  };

  const setScope = (scope) => {
    if (!scope) {
      const copy = { ...rule };
      delete copy.scope;
      onChange(copy);
    } else {
      onChange({ ...rule, scope });
    }
  };

  const toggleScopeOpen = () => {
    if (scopeOpen && rule.scope) return;
    setScopeOpen((p) => !p);
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
      {/* Target + condition */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={FIELD_LABEL_CLS}>Cible</span>

        <select
          value={targetType}
          onChange={(e) => handleTargetType(e.target.value)}
          className={SELECT_CLS}
        >
          <option value="grade">grade</option>
          <option value="role">rôle</option>
        </select>

        {targetType === "grade" ? (
          <select
            value={targetValue}
            onChange={(e) => handleTargetValue(e.target.value)}
            className={SELECT_CLS + " w-32"}
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        ) : availableRoles.length > 0 ? (
          <select
            value={targetValue}
            onChange={(e) => handleTargetValue(e.target.value)}
            className={SELECT_CLS + " w-44"}
          >
            <option value="">— choisir —</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={targetValue}
            onChange={(e) => handleTargetValue(e.target.value)}
            placeholder="nom du rôle"
            className={INPUT_CLS + " w-44"}
          />
        )}

        <span className={FIELD_LABEL_CLS + " ml-2"}>Condition</span>

        <ConditionNode
          cond={{
            condition: rule.condition || "any",
            conditions: rule.conditions,
            customCondition: rule.customCondition,
          }}
          onChange={(next) =>
            onChange({
              ...rule,
              condition: next.condition,
              conditions: next.conditions,
              customCondition: next.customCondition,
            })
          }
        />

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
            title="Supprimer la règle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scope */}
      <div className="border-t border-[rgba(255,255,255,0.04)] pt-2">
        <button
          type="button"
          onClick={toggleScopeOpen}
          className="inline-flex items-center gap-1.5 text-[11px] text-purple-300 hover:text-purple-200"
        >
          {scopeOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {rule.scope ? "Restriction de lignes (scope)" : "Ajouter une restriction de lignes"}
        </button>

        {scopeOpen && (
          <div className="mt-1.5">
            {rule.scope ? (
              <ScopeNode
                scope={rule.scope}
                onChange={setScope}
                onDelete={() => {
                  setScope(undefined);
                  setScopeOpen(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setScope({ type: "same_region", field: "region" })}
                className={SUBLINK_CLS}
              >
                <Plus className="w-3 h-3" /> Créer un scope
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}