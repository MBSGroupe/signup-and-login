import { useState, useContext, useEffect } from "react";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../../../Components/Buttons/BackButton";
import wilayasData from "../../../assets/data/wilayas.json";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Loader2, Save, X } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function UpdateUser() {
  const { authData, setAuthData } = useContext(UserContext);
  const { id } = useParams();
  const navigate = useNavigate();

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
          method: "GET",
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const userResult = await userRes.json();
        const userDataObj = userResult.data?.user || userResult.data || userResult;
        setUserData(userDataObj);

        // 2. Fetch permissions for this user
        const permRes = await fetch(`${NEST_API_URL}/permissions/user/${id}/editable-fields?model=User`, {
          method: "GET",
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const permResult = await permRes.json();
        const permData = permResult.data || permResult;
        setPermissions(permData);

        // 3. Initialize form with user data (only fields that exist)
        const initialForm = {};
        (permData.fields || []).forEach(field => {
          if (userDataObj[field] !== undefined) {
            initialForm[field] = userDataObj[field];
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
    
    // List of fields allowed by the backend UpdateUserDto
    const allowedUserUpdateFields = [
      // Core identity
      'name',
      'lastname',
      'email',
      'password',
      // Profile & visuals
      'profilePicture',
      'dateOfBirth',
      // CNOA / Professional
      'civility',
      'maritalStatus',
      'nationality',
      'serviceNationalStatus',
      'professionalMode',
      'benefitStateAid',
      'humanResources',
      'isAccredited',
      'oathLocation',
      'diplomaType',
      'otherDiplomas',
      'otherTrainings',
      'companyStatus',
      'employerId',
      'declarationExistence',
      'lastAgreementDate',
      'lastAgreementFileId',
      'paymentReceipts',
      'latePenalties',
      'registrationStatus',
      'registrationDate',
      // Geographic
      'wilaya',
      'region',
      'sexe',
      'commune',
      'profession',
      'registrationNumber',
      'specialty',
      // Permission & access
      'role',
      'status',
      'tenantId',
      'activityStartDate',
      'startDate',
      // Preferences
      'preferences',
      // Credit
      'credit',
      // Additional CNOA
      'phone',
      'nomArabe',
      'prenomArabe',
      'situationFamiliale',
      'lieuNaissance',
      'adressePersonnelle',
      'adressePro',
      'fixe',
      'fax',
      'nif',
      'oathDate',
      'moyensHumains',
      'enfants',
      'dispositif',
      'loi',
      'cachet',
      'gps',
      'emailPro',
      // Family / New CNOA
      'prenomPere',
      'prenomPereArabe',
      'nomPrenomMere',
      'nomPrenomMereArabe',
      'adresseProArabe',
      'adressePersonnelleArabe',
      'sessionClassique',
      'anneeClassique',
      'universiteClassique',
      'sessionLMDL',
      'anneeLMDL',
      'universiteLMDL',
      'sessionLMDM',
      'anneeLMDM',
      'universiteLMDM',
      'metadata',
      // Audit
      'createdBy',
      'updatedBy',
    ];
    
    // Build payload from formData, only including allowed fields
    const payload = {};
    for (const key of allowedUserUpdateFields) {
      if (formData[key] !== undefined) {
        payload[key] = formData[key];
      }
    }
    console.log(payload)

    try {
      const response = await fetch(`${NEST_API_URL}/users/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authData.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || result.data?.message || "Erreur de mise à jour");
        return;
      }

      // Update auth data if user updated themselves
      if (authData.user?.id === id) {
        const updatedUser = result.data?.user || result.data;
        setAuthData(prev => ({
          token: result.data?.token || prev.token,
          user: { ...prev.user, ...updatedUser }
        }));
      }

      setMessage("✅ Profil mis à jour avec succès");

    } catch (error) {
      console.error(error);
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
      const response = await fetch(`${NEST_API_URL}/files/upload/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: uploadData,
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Upload échoué");
        return;
      }

      const fileUrl = result.data?.file?.url || result.data?.url;
      if (fileUrl) {
        setFormData(prev => ({ ...prev, profilePicture: fileUrl }));
      }
      setShowProfilePicker(false);

    } catch (error) {
      console.error(error);
      setMessage("❌ Erreur lors de l'upload");
    }
  };

  // Dynamic field renderer based on field type and config
  const renderField = (fieldName) => {
    if (!permissions?.configs || !permissions.configs[fieldName]) return null;

    const config = permissions.configs[fieldName];
    const value = formData[fieldName] || "";

    // Helper for common input classes
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
            className={inputClasses}
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

    switch (config.type) {
      case 'select':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className={labelClasses}>{config.label}</label>
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

      case 'email':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className={labelClasses}>{config.label}</label>
            <input
              type="email"
              name={fieldName}
              value={value}
              onChange={handleChange}
              placeholder={config.ui?.placeholder}
              className={inputClasses}
            />
          </div>
        );

      case 'date':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className={labelClasses}>{config.label}</label>
            <input
              type="date"
              name={fieldName}
              value={value ? new Date(value).toISOString().split('T')[0] : ''}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        );

      case 'image':
      case 'file':
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className={labelClasses}>{config.label}</label>
            {value && config.type === 'image' && (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] mb-2 cursor-pointer" onClick={() => setShowProfilePicker(true)}>
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white">Changer</span>
                </div>
              </div>
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Choisir un fichier
            </label>
          </div>
        );

      default:
        return (
          <div key={fieldName} className="space-y-1.5">
            <label className={labelClasses}>{config.label}</label>
            <input
              type={config.type || 'text'}
              name={fieldName}
              value={value}
              onChange={handleChange}
              placeholder={config.ui?.placeholder}
              className={inputClasses}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button and title */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <BackButton fallbackPath="/dash/allUsers" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <User className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                {userData?.id === authData?.user?.id ? "Modifier Votre Profil" : "Modifier l'utilisateur"}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                {userData?.email || "Mettez à jour les informations"}
              </p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Render editable fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(permissions?.fields || [])
                .sort((a, b) => {
                  const orderA = permissions.configs[a]?.ui?.order || 0;
                  const orderB = permissions.configs[b]?.ui?.order || 0;
                  return orderA - orderB;
                })
                .map(fieldName => renderField(fieldName))
              }
            </div>

            {/* Password field – always required to confirm changes */}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Mot de passe <span className="text-rose-400 ml-1">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                placeholder="Entrez votre mot de passe"
                required
                className="w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]"
              />
            </div>

            {/* Action buttons */}
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
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                message.includes('✅') || message.includes('succès')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {message.includes('✅') || message.includes('succès') ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}