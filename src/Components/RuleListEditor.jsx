// Components/Permissions/RuleListEditor.jsx
import { Plus } from "lucide-react";
import RuleEditor from "./RuleEditor";

export default function RuleListEditor({
  rules = [],
  onChange,
  availableRoles = [],
  addLabel = "Ajouter une règle",
}) {
  const update = (i, next) => {
    const copy = [...rules];
    copy[i] = next;
    onChange(copy);
  };

  const remove = (i) => onChange(rules.filter((_, j) => j !== i));
  const add = () => onChange([...rules, { grade: "user", condition: "any" }]);

  return (
    <div className="flex flex-col gap-2">
      {rules.map((rule, i) => (
        <RuleEditor
          key={i}
          rule={rule}
          onChange={(next) => update(i, next)}
          onDelete={() => remove(i)}
          availableRoles={availableRoles}
        />
      ))}

      {rules.length === 0 && (
        <div className="text-center text-[#64748B] text-xs py-3 bg-[#0A0F1C] rounded-xl border border-dashed border-[rgba(255,255,255,0.06)]">
          Aucune règle. Cliquez sur « {addLabel} » pour commencer.
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        {addLabel}
      </button>
    </div>
  );
}