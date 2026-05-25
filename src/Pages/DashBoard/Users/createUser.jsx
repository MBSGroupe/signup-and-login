import { useState, useContext, useEffect } from "react";
import { UserContext } from '../../../Context/dataCont';
import Title from "../../../Components/Title";
import { fetchWithRefresh } from "../../../Components/api";
import wilayasData from "../../../assets/data/wilayas.json";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function CreateUser() {
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
            targetId: viewerId,
            operation: "create",
            model: "User"
          }),
        });
        
        const canCreateData = await canCreateRes.json();
        
        setCanCreate(canCreateData.canPerform);

        if (!canCreateData.canPerform) {
          setLoading(false);
          return;
        }

        // 2. Fetch creatable fields using the correct route
        const fieldsRes = await fetch(`${NEST_API_URL}/permissions/user/${viewerId}/creatable-fields?model=User`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        
        const fieldsData = await fieldsRes.json();

        
        // The API returns an object with { fields: [], configs: {} }
        setCreatableFields(fieldsData.fields || []);
        setFieldConfigs(fieldsData.configs || {});
        
        // 3. Initialize form with empty values for creatable fields
        const initialForm = { password: "", secondPassword: "" };
        (fieldsData.fields || []).forEach(field => {
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

    // Special validation for password
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

    // Prepare payload (only include creatable fields)
    const payload = {};
    creatableFields.forEach(field => {
      if (formData[field] !== undefined) {
        payload[field] = formData[field];
      }
    });
    const dateFields = ['startDate', 'dateOfBirth', 'activityStartDate', 'actvityStartDate'];
      dateFields.forEach(field => {
        if (payload[field]) {
          let val = payload[field];
          // If value is a YYYY-MM-DD string, append time part
          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            payload[field] = `${val}T00:00:00.000Z`;
          }
        }
      });
    payload.password = formData.password; 

    try {
      const response = await fetchWithRefresh(`${NEST_API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, authData.token, setAuthData);

      const data = await response.json();
      
      if (response.ok) {
        setIsError(false);
        setMessage("✅ Utilisateur créé avec succès!");
        
        // Reset form
        const resetForm = { password: "", secondPassword: "" };
        creatableFields.forEach(field => {
          if (field !== 'password') resetForm[field] = "";
        });
        setFormData(resetForm);
      } else {
        setIsError(true);
        setMessage(data.message || "❌ Échec de la création.");
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
  // Special handling for Algerian fields
  if (fieldName === 'wilaya') {
    return (
      <div key={fieldName} className="space-y-1">
        <label className="text-gray-700 text-sm font-medium">
          {config.label || "Wilaya"}
        </label>
        <select
          name={fieldName}
          value={value}
          onChange={handleChange}
          className="w-full p-3 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
      <div key={fieldName} className="space-y-1">
        <label className="text-gray-700 text-sm font-medium">
          {config.label || "Commune"}
        </label>
        <select
          name={fieldName}
          value={value}
          onChange={handleChange}
          disabled={!formData.wilaya}
          className="w-full p-3 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-yellow-400
            disabled:bg-gray-100 disabled:cursor-not-allowed"
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
  
  // For all other fields, use the config type
  if (config.type === 'select') {
    return (
      <div key={fieldName} className="space-y-1">
        <label className="text-gray-700 text-sm font-medium">
          {config.label || fieldName}
        </label>
        <select
          name={fieldName}
          value={value}
          onChange={handleChange}
          className="w-full p-3 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
      <div key={fieldName} className="space-y-1">
        <label className="text-gray-700 text-sm font-medium">
          {config.label || fieldName}
        </label>
        <input
          type="email"
          name={fieldName}
          value={value}
          onChange={handleChange}
          placeholder={config.placeholder || `Entrez ${fieldName}`}
          className="w-full p-3 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>
    );
  }
  
  if (config.type === 'date') {
    return (
      <div key={fieldName} className="space-y-1">
        <label className="text-gray-700 text-sm font-medium">
          {config.label || fieldName}
        </label>
        <input
          type="date"
          name={fieldName}
          value={value}
          onChange={handleChange}
          max={new Date().toISOString().split('T')[0]}
          className="w-full p-3 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>
    );
  }
  
  if (config.type === 'password') {
    return null; // password handled separately
  }
  
  // Default text input
  return (
    <div key={fieldName} className="space-y-1">
      <label className="text-gray-700 text-sm font-medium">
        {config.label || fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
      </label>
      <input
        type={config.type || 'text'}
        name={fieldName}
        value={value}
        onChange={handleChange}
        placeholder={config.placeholder || `Entrez ${fieldName}`}
        className="w-full p-3 border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </div>
  );
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Title title="Accès non autorisé" />
        <p className="text-gray-600 mt-4">
          Vous n'avez pas la permission de créer des utilisateurs.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-urbanist py-10 bg-gray-100">
      
      <div className="mb-8 text-center">
        <Title title="Créer un nouvel utilisateur" />
        <p className="text-gray-600 mt-2">
          Ajouter un nouvel utilisateur au système
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          {/* Render ONLY creatable fields from the API */}
          {creatableFields
            .filter(field => field !== 'password')
            .sort((a, b) => {
              const orderA = fieldConfigs[a]?.ui?.order || 0;
              const orderB = fieldConfigs[b]?.ui?.order || 0;
              return orderA - orderB;
            })
            .map(fieldName => renderField(fieldName))
          }
          
          {/* Password fields - always present */}
          <div className="space-y-1">
            <label className="text-gray-700 text-sm font-medium">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Entrez le mot de passe"
              className="w-full p-3 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-700 text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              name="secondPassword"
              value={formData.secondPassword}
              onChange={handleChange}
              placeholder="Confirmez le mot de passe"
              className="w-full p-3 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 font-semibold rounded-md text-gray-900
              bg-yellow-400 hover:bg-yellow-500 transition-colors"
          >
            Créer l'utilisateur
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-center font-medium ${
              isError ? "text-red-500" : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}