import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from '../../../Context/dataCont';
import Title from "../../../Components/Title";
import BackButton from "../../../Components/Buttons/BackButton";
import { fetchWithRefresh } from "../../../Components/api";
import wilayasData from "../../../assets/data/wilayas.json";
import { UserPlus, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Loader2, Save, X, CheckCircle, AlertCircle } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function CreateUser() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatableFields, setCreatableFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  
  const { authData, setAuthData } = useContext(UserContext);
  const viewerId = authData?.user?.id || authData?.user?._id;
  
  const [formData, setFormData] = useState({
    password: "",
    secondPassword: "",
  });
  
  useEffect(() => {
    const fetchCreatableFields = async () => {
      try {
        // 1. First check if user can create
        const canCreateRes = await fetch(`${NEST_API_URL}/permissions/${viewerId}/check-operation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.token}`,
          },
          body: JSON.stringify({
            operation: "create",
            model: "User"
          }),
        });
        
        const canCreateData = await canCreateRes.json();
        
        setCanCreate(canCreateData.data?.canPerform || false);

        if (!canCreateData.data?.canPerform) {
          setLoading(false);
          return;
        }

        // 2. Fetch creatable fields using the correct route
        const fieldsRes = await fetch(`${NEST_API_URL}/permissions/user/${viewerId}/creatable-fields?model=User`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        
        const fieldsData = await fieldsRes.json();
        
        // Extract from wrapper: { success: true, data: { fields: [], configs: {} } }
        const data = fieldsData.data || fieldsData;
        setCreatableFields(data.fields || []);
        setFieldConfigs(data.configs || {});
        
        // 3. Initialize form with empty values for creatable fields
        const initialForm = { password: "", secondPassword: "" };
        (data.fields || []).forEach(field => {
          if (field !== 'password') {
            initialForm[field] = "";
          }
        });
        setFormData(initialForm);
        
      } catch (error) {
        console.error("Error fetching creatable fields:", error);
        setCanCreate(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (authData?.token && viewerId) {
      fetchCreatableFields();
    }
  }, [authData, viewerId]);
  
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = creatableFields.filter(field => 
      fieldConfigs[field]?.validation?.required
    );
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        setIsError(true);
        setMessage(`Le champ ${fieldConfigs[field]?.label || field} est requis.`);
        return;
      }
    }

    if (!formData.password) {
      setIsError(true);
      setMessage("Le mot de passe est requis.");
      return;
    }

    if (formData.password !== formData.secondPassword) {
      setIsError(true);
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    // Prepare payload
    const payload = {};
    creatableFields.forEach(field => {
      if (formData[field] !== undefined) {
        payload[field] = formData[field];
      }
    });

    // Convert date fields to ISO-8601 strings
    const dateFields = ['startDate', 'dateOfBirth', 'activityStartDate', 'actvityStartDate'];
    dateFields.forEach(field => {
      if (payload[field]) {
        let val = payload[field];
        if (val instanceof Date) {
          payload[field] = val.toISOString();
        }
        else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
          payload[field] = `${val}T00:00:00.000Z`;
        }
        // If it's already an ISO string, leave it
      }
    });

    // Handle the typo field (actvityStartDate -> activityStartDate)
    if (payload.actvityStartDate && !payload.activityStartDate) {
      payload.activityStartDate = payload.actvityStartDate;
      delete payload.actvityStartDate;
    }

    payload.password = formData.password;

    console.log('Payload being sent:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetchWithRefresh(`${NEST_API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, authData.token, setAuthData);

      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsError(false);
        setMessage("✅ Utilisateur créé avec succès!");
        
        const resetForm = { password: "", secondPassword: "" };
        creatableFields.forEach(field => {
          if (field !== 'password') resetForm[field] = "";
        });
        setFormData(resetForm);
      } else {
        setIsError(true);
        setMessage(data.message || data.data?.message || "❌ Échec de la création.");
      }
    } catch (err) {
      console.error("Network error:", err);
      setIsError(true);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
    }
  };

  const renderField = (fieldName) => {
    const config = fieldConfigs[fieldName] || {};
    const value = formData[fieldName] || "";
    
    // Common classes
    const inputClasses = "w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]";
    const labelClasses = "block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5";
    
    if (fieldName === 'wilaya') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || "Wilaya"}</label>
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            className={inputClasses}
          >
            <option value="">Sélectionner une wilaya</option>
            {wilayasData?.map(w => (
              <option key={w.code} value={w.code}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      );
    }
    
    if (fieldName === 'commune') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || "Commune"}</label>
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            disabled={!formData.wilaya}
            className={`${inputClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Sélectionner une commune</option>
            {formData.wilaya && wilayasData
              ?.find(w => w.code === formData.wilaya)
              ?.communes?.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
      );
    }
    
    if (config.type === 'select') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || fieldName}</label>
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            className={inputClasses}
          >
            <option value="">Sélectionner...</option>
            {config.validation?.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    
    if (config.type === 'email') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || fieldName}</label>
          <input
            type="email"
            name={fieldName}
            value={value}
            onChange={handleChange}
            placeholder={config.placeholder || `Entrez ${fieldName}`}
            className={inputClasses}
          />
        </div>
      );
    }
    
    if (config.type === 'date') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || fieldName}</label>
          <input
            type="date"
            name={fieldName}
            value={value}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            className={inputClasses}
          />
        </div>
      );
    }
    
    if (config.type === 'password') {
      return null;
    }
    
    return (
      <div key={fieldName} className="space-y-1.5">
        <label className={labelClasses}>{config.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}</label>
        <input
          type={config.type || 'text'}
          name={fieldName}
          value={value}
          onChange={handleChange}
          placeholder={config.placeholder || `Entrez ${fieldName}`}
          className={inputClasses}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des permissions...</p>
        </div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex flex-col items-center justify-center ml-[30px] mt-16">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center shadow-2xl shadow-black/50">
          <Shield className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#F8FAFC]">Accès non autorisé</h2>
          <p className="text-[#94A3B8] text-sm mt-2">
            Vous n'avez pas la permission de créer des utilisateurs.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-3xl mx-auto">
        {/* Back button & header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <BackButton fallbackPath="/dash/allUsers" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <UserPlus className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Créer un utilisateur
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Ajouter un nouvel utilisateur au système
              </p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {creatableFields
                .filter(field => field !== 'password')
                .sort((a, b) => {
                  const orderA = fieldConfigs[a]?.ui?.order || 0;
                  const orderB = fieldConfigs[b]?.ui?.order || 0;
                  return orderA - orderB;
                })
                .map(fieldName => renderField(fieldName))
              }
            </div>

            {/* Password fields */}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Entrez le mot de passe"
                  className="w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  name="secondPassword"
                  value={formData.secondPassword}
                  onChange={handleChange}
                  placeholder="Confirmez le mot de passe"
                  className="w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200"
              >
                <UserPlus className="w-4 h-4" />
                Créer l'utilisateur
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-5 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              isError
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}