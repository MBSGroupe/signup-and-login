import RuleListEditor from './RuleListEditor';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';

const fieldTypes = [
  'text', 'email', 'password', 'number', 'tel', 'date', 'datetime', 'textarea',
  'select', 'multiselect', 'checkbox', 'radio', 'file', 'image', 'richtext'
];

const uiGroups = [
  'personal_info', 'professional_info', 'contact_info',
  'security', 'preferences', 'admin_only', 'public'
];

export default function FieldEditor({ field, onChange, onDelete }) {
  const handleChange = (key, value) => {
    onChange({ ...field, [key]: value });
  };

  const handleNestedChange = (path, value) => {
    const parts = path.split('.');
    const newField = { ...field };
    let target = newField;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;
    onChange(newField);
  };

  // Toggle switch component for checkboxes
  const ToggleSwitch = ({ checked, onChange, label }) => (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#94A3B8]">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
          checked ? 'bg-emerald-500' : 'bg-[#1F2937]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );

  return (
    <div className="border border-[rgba(255,255,255,0.06)] bg-[#0A0F1C] rounded-xl p-5 mb-4 hover:border-[rgba(255,255,255,0.12)] transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
          <h3 className="text-sm font-semibold text-[#F8FAFC]">
            {field.name || 'Nouveau champ'}
            <span className="ml-2 text-xs font-normal text-[#64748B]">({field.type || 'text'})</span>
          </h3>
        </div>
        <button
          onClick={onDelete}
          type="button"
          className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic info */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Nom</label>
          <input
            type="text"
            value={field.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Label</label>
          <input
            type="text"
            value={field.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Type</label>
          <select
            value={field.type || 'text'}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          >
            {fieldTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Ordre UI</label>
          <input
            type="number"
            value={field.ui?.order || 0}
            onChange={(e) => handleNestedChange('ui.order', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Groupe UI</label>
          <select
            value={field.ui?.group || 'personal_info'}
            onChange={(e) => handleNestedChange('ui.group', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          >
            {uiGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">ColSpan</label>
          <input
            type="number"
            min="1"
            max="12"
            value={field.ui?.colSpan || 12}
            onChange={(e) => handleNestedChange('ui.colSpan', parseInt(e.target.value) || 12)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Validation */}
      <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Validation</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <ToggleSwitch
              checked={field.validation?.required || false}
              onChange={(val) => handleNestedChange('validation.required', val)}
              label="Requis"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-[#64748B]">Message requis</label>
            <input
              type="text"
              value={field.validation?.requiredMessage || ''}
              onChange={(e) => handleNestedChange('validation.requiredMessage', e.target.value)}
              className="w-full px-3 py-1.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-[#64748B]">minLength</label>
            <input
              type="number"
              value={field.validation?.minLength || ''}
              onChange={(e) => handleNestedChange('validation.minLength', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-1.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-[#64748B]">maxLength</label>
            <input
              type="number"
              value={field.validation?.maxLength || ''}
              onChange={(e) => handleNestedChange('validation.maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-1.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="mt-5 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Création (creatableBy)</h4>
          <RuleListEditor
            rules={field.creatableBy || []}
            onChange={(val) => handleChange('creatableBy', val)}
          />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Édition (editableBy)</h4>
          <RuleListEditor
            rules={field.editableBy || []}
            onChange={(val) => handleChange('editableBy', val)}
          />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Visibilité (visibleTo)</h4>
          <RuleListEditor
            rules={field.visibleTo || []}
            onChange={(val) => handleChange('visibleTo', val)}
          />
        </div>
      </div>
    </div>
  );
}