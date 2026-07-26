import { Plus, Trash2 } from 'lucide-react';

const availableRoles = [
  { name: 'user', level: 0 },
  { name: 'moderator', level: 1 },
  { name: 'admin', level: 2 },
  { name: 'super_admin', level: 3 },
  { name: 'any', level: null }
];

const conditionOptions = [
  'self', 'any', 'same_tenant', 'tenant_admin', 'higher_level', 'lower_level', 'same_level', 'custom'
];

export default function RuleListEditor({ rules, onChange }) {
  const addRule = () => {
    onChange([...rules, { role: { name: 'user', level: 0 }, condition: 'any' }]);
  };

  const removeRule = (index) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    if (field === 'role') {
      const selectedRole = availableRoles.find(r => r.name === value);
      newRules[index].role = { name: value, level: selectedRole.level };
    } else {
      newRules[index][field] = value;
    }
    onChange(newRules);
  };

  return (
    <div className="space-y-2">
      {rules.map((rule, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-[#111827] p-2 rounded-lg border border-[rgba(255,255,255,0.06)]">
          <select
            value={rule.role.name}
            onChange={(e) => updateRule(idx, 'role', e.target.value)}
            className="flex-1 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {availableRoles.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
          <select
            value={rule.condition}
            onChange={(e) => updateRule(idx, 'condition', e.target.value)}
            className="bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {conditionOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => removeRule(idx)}
            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRule}
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Ajouter une règle
      </button>
      {rules.length === 0 && (
        <p className="text-xs text-[#64748B]">Aucune règle définie</p>
      )}
    </div>
  );
}