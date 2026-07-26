// components/Modals/EditFeeDefinitionModal.jsx
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../Context/dataCont";
import { fetchWithRefresh } from "../../Components/api";
import { transformDates } from "../../Utils/transformPayload";
import {
  X,
  Save,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Percent,
  Clock,
  RefreshCw,
  Check,
  Edit
} from "lucide-react";

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
        const data = responseData.data || responseData;
        if (res.ok && responseData.success !== false) {
          const fields = data.fields || [];
          const configs = data.configs || {};
          setEditableFields(fields);
          setFieldConfigs(configs);
          const initialData = {};
          fields.forEach(field => {
            if (field === "penaltyConfig") return;
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

    const fieldIcons = {
      title: <Tag className="w-4 h-4 text-emerald-400" />,
      amount: <DollarSign className="w-4 h-4 text-emerald-400" />,
      dueDate: <Calendar className="w-4 h-4 text-emerald-400" />,
      notes: <FileText className="w-4 h-4 text-emerald-400" />,
      feeType: <Tag className="w-4 h-4 text-emerald-400" />,
      year: <Calendar className="w-4 h-4 text-emerald-400" />,
    };

    const baseInputClasses = "w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]";

    switch (type) {
      case 'number':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName]}
              {label}
              {required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              type="number"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              min={min}
              max={max}
              step="any"
              className={baseInputClasses}
            />
          </div>
        );
      case 'date':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName]}
              {label}
              {required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              type="date"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              className={baseInputClasses}
            />
          </div>
        );
      case 'text':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName]}
              {label}
              {required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              type="text"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              maxLength={config.validation?.maxLength}
              className={baseInputClasses}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName]}
              {label}
              {required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <textarea
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              rows={3}
              className={`${baseInputClasses} resize-y`}
            />
          </div>
        );
      case 'select':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
              {fieldIcons[fieldName]}
              {label}
              {required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <select
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={required}
              className={baseInputClasses}
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
          <div key={fieldName} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={fieldName}
              name={fieldName}
              checked={!!value}
              onChange={handleChange}
              className="w-4 h-4 rounded border-[rgba(255,255,255,0.06)] bg-[#0A0F1C] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor={fieldName} className="text-sm text-[#94A3B8]">{label}</label>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPenaltyConfig = () => {
    if (!editableFields.includes("penaltyConfig")) return null;
    const isDisabled = penaltyType === "none";
    return (
      <div key="penaltyConfig" className="bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
          <Percent className="w-4 h-4 text-emerald-400" />
          Configuration des pénalités
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-xs text-[#64748B]">Type</label>
            <select
              value={penaltyType}
              onChange={handlePenaltyTypeChange}
              className="w-full px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
            >
              <option value="none">Aucune</option>
              <option value="percentage">Pourcentage</option>
              <option value="fixed">Fixe</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-[#64748B]">Taux / Montant</label>
            <input
              type="number"
              value={penaltyRate}
              onChange={handlePenaltyRateChange}
              disabled={isDisabled}
              min="0"
              step="1"
              className={`w-full px-3 py-2 bg-[#111827] border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                isDisabled
                  ? 'border-[rgba(255,255,255,0.06)] text-[#64748B] cursor-not-allowed'
                  : 'border-[rgba(255,255,255,0.06)] text-[#F8FAFC]'
              }`}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-[#64748B]">Fréquence</label>
            <select
              value={penaltyFrequency}
              onChange={handlePenaltyFrequencyChange}
              disabled={isDisabled}
              className={`w-full px-3 py-2 bg-[#111827] border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                isDisabled
                  ? 'border-[rgba(255,255,255,0.06)] text-[#64748B] cursor-not-allowed'
                  : 'border-[rgba(255,255,255,0.06)] text-[#F8FAFC]'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 bg-[#111827] border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Edit className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Modifier la campagne</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1F2937] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B] hover:text-[#F8FAFC]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {editableFields.filter(f => f !== "penaltyConfig").map(fieldName => renderField(fieldName))}
          {renderPenaltyConfig()}

          <div className="flex items-start gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <input
              type="checkbox"
              id="propagate"
              checked={propagate}
              onChange={(e) => setPropagate(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[rgba(255,255,255,0.06)] bg-[#0A0F1C] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="propagate" className="text-sm text-[#94A3B8] leading-relaxed">
              <span className="font-medium text-[#F8FAFC]">Appliquer aux cotisations existantes</span>
              <br />
              <span className="text-xs text-[#64748B]">Propager ces modifications à toutes les cotisations individuelles déjà créées pour cette campagne.</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
      `}</style>
    </div>
  );
}