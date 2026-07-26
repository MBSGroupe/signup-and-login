import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FieldEditor from "../FieldEditor";
import RuleListEditor from "../RuleListEditor";
import { Plus, Trash2, Save, X, Layers, List } from "lucide-react";

// Status options (must match backend enum)
const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "flawed", label: "Défectueux" },
  { value: "archived", label: "Archivé" },
  { value: "stable", label: "Stable" }
];

export default function VersionForm({
  initialSchema = { fields: [], operations: [] },
  initialStatus = "active",
  onSubmit,
  submitLabel = "Enregistrer",
  loading = false,
}) {
  const navigate = useNavigate();
  const [schema, setSchema] = useState(initialSchema);
  const [status, setStatus] = useState(initialStatus);

  const addField = () => {
    setSchema({
      ...schema,
      fields: [
        ...schema.fields,
        { name: "", label: "", type: "text", creatableBy: [], editableBy: [], visibleTo: [], validation: {}, ui: { order: 0, group: "personal_info", colSpan: 12 } }
      ]
    });
  };

  const updateField = (index, updatedField) => {
    const newFields = [...schema.fields];
    newFields[index] = updatedField;
    setSchema({ ...schema, fields: newFields });
  };

  const deleteField = (index) => {
    const newFields = schema.fields.filter((_, i) => i !== index);
    setSchema({ ...schema, fields: newFields });
  };

  const addOperation = () => {
    setSchema({
      ...schema,
      operations: [...schema.operations, { operation: "", allowed: [] }]
    });
  };

  const deleteOperation = (index) => {
    const newOps = schema.operations.filter((_, i) => i !== index);
    setSchema({ ...schema, operations: newOps });
  };

  const handleOperationChange = (index, field, value) => {
    const newOps = [...schema.operations];
    newOps[index] = { ...newOps[index], [field]: value };
    setSchema({ ...schema, operations: newOps });
  };

  const handleOperationRuleChange = (opIndex, rules) => {
    const newOps = [...schema.operations];
    newOps[opIndex].allowed = rules;
    setSchema({ ...schema, operations: newOps });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(schema, status);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Status selection */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
          Statut de la version
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          className="w-full max-w-xs px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Fields section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <Layers className="w-5 h-5 text-emerald-400" />
            Champs
            <span className="text-xs text-[#64748B] font-normal ml-1">
              ({schema.fields.length})
            </span>
          </div>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Ajouter un champ
          </button>
        </div>

        {schema.fields.map((field, idx) => (
          <div key={idx} className="relative bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.12)] transition-all">
            <FieldEditor
              field={field}
              onChange={(updated) => updateField(idx, updated)}
              onDelete={() => deleteField(idx)}
            />
          </div>
        ))}
        {schema.fields.length === 0 && (
          <div className="text-center text-[#64748B] text-sm py-6 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
            Aucun champ défini. Cliquez sur "Ajouter un champ" pour commencer.
          </div>
        )}
      </div>

      {/* Operations section */}
      <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <List className="w-5 h-5 text-emerald-400" />
            Opérations
            <span className="text-xs text-[#64748B] font-normal ml-1">
              ({schema.operations.length})
            </span>
          </div>
          <button
            type="button"
            onClick={addOperation}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Ajouter une opération
          </button>
        </div>

        {schema.operations.map((op, idx) => (
          <div key={idx} className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(255,255,255,0.12)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                {op.operation || 'Nouvelle opération'}
              </h3>
              <button
                onClick={() => deleteOperation(idx)}
                type="button"
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  Nom de l'opération
                </label>
                <input
                  type="text"
                  value={op.operation || ''}
                  onChange={(e) => handleOperationChange(idx, 'operation', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Rôles autorisés
              </label>
              <RuleListEditor
                rules={op.allowed || []}
                onChange={(val) => handleOperationRuleChange(idx, val)}
              />
            </div>
          </div>
        ))}
        {schema.operations.length === 0 && (
          <div className="text-center text-[#64748B] text-sm py-6 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
            Aucune opération définie. Cliquez sur "Ajouter une opération" pour commencer.
          </div>
        )}
      </div>

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