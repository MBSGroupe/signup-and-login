// components/Modals/EditFeeDefinitionModal.jsx
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../Context/dataCont";
import { fetchWithRefresh } from "../../Components/api";
import { transformDates } from "../../Utils/transformPayload";

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function EditFeeDefinitionModal({ definition, onClose, onUpdated }) {
  const { authData, setAuthData } = useContext(UserContext);
  const viewerId = authData.user.id || authData.user._id;
  const [loading, setLoading] = useState(false);
  const [editableFields, setEditableFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [formData, setFormData] = useState({});
  const [propagate, setPropagate] = useState(false);

  // Penalty config specific state (nested)
  const [penaltyType, setPenaltyType] = useState(definition.penaltyConfig?.type || "none");
  const [penaltyRate, setPenaltyRate] = useState(definition.penaltyConfig?.rate || 0);
  const [penaltyFrequency, setPenaltyFrequency] = useState(definition.penaltyConfig?.frequency || "none");

  useEffect(() => {
    const fetchEditableFields = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/permissions/user/${viewerId}/editable-fields?model=FeeDefinition`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
        const responseData = await res.json();
        // Extract from wrapper: { success: true, data: { fields: [], configs: {} } }
        const data = responseData.data || responseData;
        if (res.ok && responseData.success !== false) {
          const fields = data.fields || [];
          const configs = data.configs || {};
          setEditableFields(fields);
          setFieldConfigs(configs);
          // Initialize formData with current definition values for editable fields
          const initialData = {};
          fields.forEach(field => {
            if (field === "penaltyConfig") return; // handled separately
            if (definition[field] !== undefined) {
              if (configs[field]?.type === 'date' && definition[field]) {
                initialData[field] = new Date(definition[field]).toISOString().split('T')[0];
              } else {
                initialData[field] = definition[field];
              }
            }
          });
          setFormData(initialData);
        } else {
          console.error("Failed to load editable fields:", data.message);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEditableFields();
  }, [definition, authData.token, setAuthData, viewerId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePenaltyTypeChange = (e) => setPenaltyType(e.target.value);
  const handlePenaltyRateChange = (e) => setPenaltyRate(Number(e.target.value));
  const handlePenaltyFrequencyChange = (e) => setPenaltyFrequency(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let updates = {};
      for (const field of editableFields) {
        if (field === "penaltyConfig") continue;
        if (formData[field] !== undefined) {
          const config = fieldConfigs[field];
          if (config?.type === 'number') {
            updates[field] = parseFloat(formData[field]);
          } else if (config?.type === 'date') {
            updates[field] = formData[field];
          } else {
            updates[field] = formData[field];
          }
        }
      }

      if (editableFields.includes("penaltyConfig")) {
        if (penaltyType !== "none") {
          updates.penaltyConfig = {
            type: penaltyType,
            rate: penaltyRate,
            frequency: penaltyFrequency
          };
        } else {
          updates.penaltyConfig = {
            type: "none",
            rate: 0,
            frequency: "none"
          };
        }
      }

      updates = transformDates(updates, ['dueDate']);
      const url = `${API_URL}/fees/definitions/${definition.id}?propagate=${propagate}`;
      const res = await fetchWithRefresh(
        url,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
        authData.token,
        setAuthData
      );
      const responseData = await res.json();
      if (res.ok && responseData.success !== false) {
        if (onUpdated) onUpdated();
        onClose();
      } else {
        alert(responseData.message || responseData.data?.message || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  // Render a simple field based on its type
  const renderField = (fieldName) => {
    const config = fieldConfigs[fieldName];
    if (!config) return null;
    const value = formData[fieldName] ?? '';
    const type = config.type;
    const label = config.label || fieldName;
    const required = config.validation?.required || false;
    const min = config.validation?.min;
    const max = config.validation?.max;
    const options = config.validation?.options || [];

    switch (type) {
      case 'number':
        return (
          <div key={fieldName}>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <input
              type="number"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              min={min}
              max={max}
              step="any"
              className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        );
      case 'date':
        return (
          <div key={fieldName}>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <input
              type="date"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        );
      case 'text':
        return (
          <div key={fieldName}>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <input
              type="text"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              maxLength={config.validation?.maxLength}
              className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName}>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <textarea
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        );
      case 'select':
        return (
          <div key={fieldName}>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <select
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Sélectionner</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      case 'checkbox':
        return (
          <div key={fieldName} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={fieldName}
              name={fieldName}
              checked={!!value}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label htmlFor={fieldName} className="text-sm text-gray-300">{label}</label>
          </div>
        );
      default:
        return null;
    }
  };

  // Render penalty config section (only if 'penaltyConfig' is editable)
  const renderPenaltyConfig = () => {
    if (!editableFields.includes("penaltyConfig")) return null;
    const isDisabled = penaltyType === "none";
    return (
      <div key="penaltyConfig" className="border border-gray-700 rounded-lg p-4 mt-2">
        <label className="block text-sm font-medium text-gray-300 mb-2">Configuration des pénalités</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={penaltyType}
              onChange={handlePenaltyTypeChange}
              className="w-full px-2 py-1 bg-gray-900 rounded text-white border border-gray-700 text-sm"
            >
              <option value="none">Aucune</option>
              <option value="percentage">Pourcentage</option>
              <option value="fixed">Fixe</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Taux / Montant</label>
            <input
              type="number"
              value={penaltyRate}
              onChange={handlePenaltyRateChange}
              disabled={isDisabled}
              min="0"
              step="1"
              className={`w-full px-2 py-1 bg-gray-900 rounded border text-sm ${
                isDisabled 
                  ? 'border-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'border-gray-700 text-white'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fréquence</label>
            <select
              value={penaltyFrequency}
              onChange={handlePenaltyFrequencyChange}
              disabled={isDisabled}
              className={`w-full px-2 py-1 bg-gray-900 rounded border text-sm ${
                isDisabled 
                  ? 'border-gray-600 text-gray-500 cursor-not-allowed' 
                  : 'border-gray-700 text-white'
              }`}
            >
              <option value="none">Aucune</option>
              <option value="once">Unique</option>
              <option value="monthly">Mensuelle</option>
              <option value="yearly">Annuelle</option>
              <option value="semi-annual">Semestrielle</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-xl p-6 w-96 max-h-[90vh] overflow-y-auto border border-yellow-400/30 shadow-2xl">
        <h3 className="text-xl font-bold text-yellow-300 mb-4">Modifier la campagne</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editableFields.filter(f => f !== "penaltyConfig").map(fieldName => renderField(fieldName))}
          {renderPenaltyConfig()}
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="propagate"
              checked={propagate}
              onChange={(e) => setPropagate(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="propagate" className="text-sm text-gray-300">
              Appliquer aux cotisations existantes de tous les membres
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-500 text-white disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}