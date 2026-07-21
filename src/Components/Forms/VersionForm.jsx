import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Title from "../../Components/Title";
import BackButton from "../../Components/Buttons/BackButton";
import FieldEditor from "../FieldEditor";
import RuleListEditor from "../RuleListEditor";

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
  title = "Version",
  loading = false,
  backPath = "/dash/validation/schemas" // fallback for BackButton
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
    <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath={backPath} />
      </div>
      <Title title={title} />
      <div className="mt-6 bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6">
        <form onSubmit={handleSubmit}>
          {/* Status selection */}
          <div className="mb-6">
            <label className="block text-gray-300 font-medium mb-2">Statut de la version</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-gray-200 focus:ring-2 focus:ring-yellow-400"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <h2 className="text-lg font-semibold text-yellow-300 mb-4">Champs</h2>
          {schema.fields.map((field, idx) => (
            <FieldEditor
              key={idx}
              field={field}
              onChange={(updated) => updateField(idx, updated)}
              onDelete={() => deleteField(idx)}
            />
          ))}
          <button
            type="button"
            onClick={addField}
            className="mb-6 px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500"
          >
            + Ajouter un champ
          </button>

          <h2 className="text-lg font-semibold text-yellow-300 mb-4">Opérations</h2>
          {schema.operations.map((op, idx) => (
            <div key={idx} className="border border-gray-700 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-yellow-300 font-medium">{op.operation || 'Nouvelle opération'}</h3>
                <button onClick={() => deleteOperation(idx)} type="button" className="text-red-400 hover:text-red-300">Supprimer</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Nom de l'opération</label>
                  <input
                    type="text"
                    value={op.operation || ''}
                    onChange={(e) => handleOperationChange(idx, 'operation', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-gray-400 text-sm mb-1">Rôles autorisés</label>
                <RuleListEditor
                  rules={op.allowed || []}
                  onChange={(val) => handleOperationRuleChange(idx, val)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addOperation}
            className="mb-6 px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500"
          >
            + Ajouter une opération
          </button>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}