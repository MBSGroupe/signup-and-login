import { useState, useContext, useEffect } from "react";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { useParams } from "react-router-dom";

// Import your wilaya data
import wilayasData from "../../../assets/data/wilayas.json"; // Adjust path as needed

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function UpdateUser() {
  const { authData, setAuthData } = useContext(UserContext);
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({});
  const [permissions, setPermissions] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showProfilePicker, setShowProfilePicker] = useState(false);

  // Fetch permissions AND user data on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch user data
        const userRes = await fetch(`${NEST_API_URL}/users/${id}`, {
          method : "GET",
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const userData = await userRes.json();
        setUserData(userData.user);
        
        // 2. Fetch permissions for this user
        const permRes = await fetch(`${NEST_API_URL}/permissions/user/${id}/editable-fields?model=User`, {
          method : "GET",
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const permData = await permRes.json();
        setPermissions(permData);
        
        // 3. Initialize form with user data (only fields that exist)
        const initialForm = {};
        permData.fields.forEach(field => {
          if (userData.user[field] !== undefined) {
            initialForm[field] = userData.user[field];
          }
        });
        setFormData(initialForm);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setMessage("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    
    if (id && authData?.token) {
      fetchData();
    }
  }, [id, authData]);
  
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    

    const payload = {
      ...formData,
      password: formData.password
    };
    
    try {
      const response = await fetch(`${NEST_API_URL}/users/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authData.token}`,
          "Content-Type": "application/json", 
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      console.log("data",payload)
      
      if (!response.ok) {
        setMessage(data.message || "Erreur de mise à jour");
        return;
      }
      
      // Update auth data if user updated themselves
      if (authData.user._id === id) {
        setAuthData(prev => ({
          token: data.token || prev.token,
          user: { ...prev.user, ...data.user }
        }));
      }
      
      setMessage("✅ Profil mis à jour avec succès");
      
    } catch (error) {
      setMessage("❌ Erreur serveur");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("folder", "profile");
    
    try {
      const response = await fetch(`${NEST_API_URL}/files/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: uploadData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setMessage(data.message || "Upload échoué");
        return;
      }
      
      setFormData(prev => ({ ...prev, profilePicture: data.file.url }));
      setShowProfilePicker(false);
      
    } catch (error) {
      setMessage("❌ Erreur lors de l'upload");
    }
  };
  
  // Dynamic field renderer based on field type and config
const renderField = (fieldName) => {
  if (!permissions?.configs || !permissions.configs[fieldName]) return null;
  
  const config = permissions.configs[fieldName];
  const value = formData[fieldName] || "";
  
  // Special handling for wilaya and commune
  if (fieldName === 'wilaya') {
    return (
      <div key={fieldName} className="space-y-1">
        <label className="text-yellow-300 text-sm block">
          {config.label || "Wilaya"}
        </label>
        <select
          name={fieldName}
          value={value}
          onChange={handleChange}
          className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
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
        <label className="text-yellow-300 text-sm block">
          {config.label || "Commune"}
        </label>
        <select
          name={fieldName}
          value={value}
          onChange={handleChange}
          className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
          disabled={!formData.wilaya}
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
  
  // Regular select fields from schema options
  switch (config.type) {
    case 'select':
      return (
        <div key={fieldName} className="space-y-1">
          <label className="text-yellow-300 text-sm block">
            {config.label}
          </label>
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
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
      
    case 'email':
      return (
        <div key={fieldName} className="space-y-1">
          <label className="text-yellow-300 text-sm block">
            {config.label}
          </label>
          <input
            type="email"
            name={fieldName}
            value={value}
            onChange={handleChange}
            placeholder={config.ui?.placeholder}
            className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
          />
        </div>
      );
      
    case 'date':
      return (
        <div key={fieldName} className="space-y-1">
          <label className="text-yellow-300 text-sm block">
            {config.label}
          </label>
          <input
            type="date"
            name={fieldName}
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={handleChange}
            className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
          />
        </div>
      );
      
    case 'image':
    case 'file':
      return (
        <div key={fieldName} className="space-y-1">
          <label className="text-yellow-300 text-sm block">
            {config.label}
          </label>
          {value && config.type === 'image' && (
            <img
              src={value}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg mb-2 cursor-pointer"
              onClick={() => setShowProfilePicker(true)}
            />
          )}
          <input
            type="file"
            accept={config.validation?.fileTypes?.join(',')}
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 bg-yellow-300 text-gray-900 rounded-lg cursor-pointer"
          >
            Choisir un fichier
          </label>
        </div>
      );
      
    default:
      return (
        <div key={fieldName} className="space-y-1">
          <label className="text-yellow-300 text-sm block">
            {config.label}
          </label>
          <input
            type={config.type || 'text'}
            name={fieldName}
            value={value}
            onChange={handleChange}
            placeholder={config.ui?.placeholder}
            className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
          />
        </div>
      );
  }
}

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col justify-center items-center min-h-screen py-10 font-urbanist bg-gray-900">
      
      <div className="mb-8 text-center">
        <Title
          title={userData?._id === authData?.user?._id 
            ? "Modifier Votre Profil" 
            : "Modifier l'utilisateur"}
          className="text-yellow-300"
        />
      </div>
      
      <div className="w-full max-w-2xl bg-gray-800/70 backdrop-blur-xl rounded-2xl 
                      border border-yellow-300/20 shadow-xl p-8">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Render fields in order from permissions */}
          {permissions?.fields
            .sort((a, b) => {
              const orderA = permissions.configs[a]?.ui?.order || 0;
              const orderB = permissions.configs[b]?.ui?.order || 0;
              return orderA - orderB;
            })
            .map(fieldName => renderField(fieldName))
          }
          
          {/* Always include password field */}
          <div className="space-y-1">
            <label className="text-yellow-300 text-sm block">
              Mot de passe (requis pour confirmer)
            </label>
            <input
              type="password"
              name="password"
              value={formData.password || ''}
              onChange={handleChange}
              placeholder="Entrez votre mot de passe"
              required
              className="w-full bg-gray-700 text-yellow-200 rounded-lg p-3 border border-yellow-300/30"
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-semibold
                       bg-yellow-300 text-gray-900 hover:bg-yellow-200
                       disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
        
        {message && (
          <p className="mt-4 text-center text-yellow-300 font-medium">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}