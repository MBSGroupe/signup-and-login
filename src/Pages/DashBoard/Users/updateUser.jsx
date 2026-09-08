import { useState, useContext, useEffect } from "react";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../../../Components/Buttons/BackButton";
import { fetchWithRefresh } from "../../../Components/api";
import wilayasData from "../../../assets/data/wilayas.json";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Shield,
  Loader2,
  Save,
  X,
  Home,
  GraduationCap,
  BookOpen,
  Users,
  FileText,
  CreditCard,
  Building,
  Globe,
  Award,
  Clock
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─── Field configuration for each section ────────────────────────────
const SECTION_CONFIG = {
  personal: {
    label: "Informations Personnelles",
    icon: User,
    fields: [
      'name', 'lastname', 'nomArabe', 'prenomArabe',
      'sexe', 'dateOfBirth', 'lieuNaissance', 'numeroActeNaissance',
      'nationality', 'serviceNationalStatus'
    ]
  },
  familial: {
    label: "Informations Familiales",
    icon: Home,
    fields: [
      'prenomPere', 'prenomPereArabe', 'nomPrenomMere', 'nomPrenomMereArabe',
      'maritalStatus', 'situationFamiliale', 'enfants'
    ]
  },
  contact: {
    label: "Contact",
    icon: Phone,
    fields: ['phone', 'fixe', 'fax', 'email', 'emailPro']
  },
  diplomas: {
    label: "Diplômes",
    icon: GraduationCap,
    fields: [
      'diplomaType', 'sessionClassique', 'anneeClassique', 'universiteClassique',
      'sessionLMDL', 'anneeLMDL', 'universiteLMDL',
      'sessionLMDM', 'anneeLMDM', 'universiteLMDM',
      'otherDiplomas', 'otherTrainings'
    ]
  },
  professional: {
    label: "Informations Professionnelles",
    icon: Briefcase,
    fields: [
      'registrationNumber', 'registrationStatus', 'registrationDate',
      'professionalMode', 'specialty', 'profession',
      'oathDate', 'oathLocation', 'activityStartDate', 'startDate',
      'installationDate', 'recruitmentDate'
    ]
  },
  address: {
    label: "Adresses",
    icon: MapPin,
    fields: [
      'adressePersonnelle', 'adressePersonnelleArabe', 'commune', 'wilaya', 'region',
      'adressePro', 'adresseProArabe', 'communePro', 'wilayaPro',
      'employerAdresse', 'employerAdresseArabe', 'employerCommune', 'employerWilaya'
    ]
  },
  financial: {
    label: "Finances & Documents",
    icon: CreditCard,
    fields: [
      'nif', 'cachet', 'gps', 'moyensHumains', 'moyensDhumains',
      'benefitStateAid', 'isAccredited', 'dispositif',
      'credit', 'paymentReceipts', 'latePenalties',
      'lastAgreementDate', 'lastAgreementFileId', 'declarationExistence'
    ]
  },
  status: {
    label: "Statut & Rôle",
    icon: Shield,
    fields: ['role', 'status', 'isActive', 'isVerified', 'isAdminVerified']
  },
  employer: {
    label: "Employeur (Salarié)",
    icon: Building,
    fields: [
      'employerName', 'employerRegistrationNumber',
      'employerId', 'recruitmentDate'
    ]
  },
  associate: {
    label: "Associé",
    icon: Users,
    fields: ['associateName', 'associateRegistrationNumber', 'associateDetails']
  }
};

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
        const userRes = await fetchWithRefresh(
          `${NEST_API_URL}/users/${id}`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
        const userResult = await userRes.json();
        const userDataObj = userResult.data?.user || userResult.data || userResult;
        setUserData(userDataObj);

        // 2. Fetch permissions for this user
        const permRes = await fetchWithRefresh(
          `${NEST_API_URL}/permissions/user/${id}/editable-fields?model=User`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
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
  }, [id, authData, setAuthData]);

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
      'name', 'lastname', 'email', 'password',
      // Profile & visuals
      'profilePicture', 'dateOfBirth',
      // CNOA / Professional
      'civility', 'maritalStatus', 'nationality', 'serviceNationalStatus',
      'professionalMode', 'benefitStateAid', 'humanResources', 'moyensHumains', 'moyensDhumains',
      'isAccredited', 'oathLocation', 'diplomaType',
      'otherDiplomas', 'otherTrainings', 'companyStatus',
      'employerId', 'declarationExistence', 'lastAgreementDate', 'lastAgreementFileId',
      'paymentReceipts', 'latePenalties', 'registrationStatus', 'registrationDate',
      // Geographic
      'wilaya', 'region', 'sexe', 'commune', 'profession',
      'registrationNumber', 'specialty',
      // Permission & access
      'role', 'status', 'tenantId', 'activityStartDate', 'startDate',
      // Preferences
      'preferences', 'credit',
      // Additional CNOA
      'phone', 'nomArabe', 'prenomArabe', 'situationFamiliale',
      'lieuNaissance', 'adressePersonnelle', 'adressePersonnelleArabe',
      'adressePro', 'adresseProArabe',
      'fixe', 'fax', 'nif', 'oathDate', 'enfants',
      'dispositif', 'loi', 'cachet', 'gps', 'emailPro',
      // Family
      'prenomPere', 'prenomPereArabe', 'nomPrenomMere', 'nomPrenomMereArabe',
      'sessionClassique', 'anneeClassique', 'universiteClassique',
      'sessionLMDL', 'anneeLMDL', 'universiteLMDL',
      'sessionLMDM', 'anneeLMDM', 'universiteLMDM',
      // Employer
      'employerName', 'employerRegistrationNumber', 'employerAdresse', 'employerAdresseArabe',
      'employerCommune', 'employerWilaya', 'recruitmentDate',
      // Associate
      'associateName', 'associateRegistrationNumber', 'associateDetails',
      // Geolocation
      'communePro', 'wilayaPro',
      // Audit
      'createdBy', 'updatedBy', 'metadata', 'isActive', 'isVerified', 'isAdminVerified'
    ];

    // Build payload from formData, only including allowed fields
    const payload = {};
    for (const key of allowedUserUpdateFields) {
      if (formData[key] !== undefined) {
        payload[key] = formData[key];
      }
    }

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/users/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        authData.token,
        setAuthData
      );

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
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/files/upload/${id}`,
        {
          method: "POST",
          body: uploadData,
        },
        authData.token,
        setAuthData
      );

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

  // ─── Dynamic field renderer based on field type and config ──────────
  const renderField = (fieldName) => {
    if (!permissions?.configs || !permissions.configs[fieldName]) return null;

    const config = permissions.configs[fieldName];
    const value = formData[fieldName] !== undefined ? formData[fieldName] : "";

    const inputClasses = "w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B] hover:border-[rgba(255,255,255,0.12)]";
    const labelClasses = "block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5";

    // ─── Wilaya select ──────────────────────────────────────────────
    if (fieldName === 'wilaya' || fieldName === 'wilayaPro') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || "Wilaya"}</label>
          <select
            name={fieldName}
            value={value || ""}
            onChange={handleChange}
            className={inputClasses}
          >
            <option value="">Sélectionner une wilaya</option>
            {wilayasData?.map(w => (
              <option key={w.code} value={w.code}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // ─── Commune select ──────────────────────────────────────────────
    if (fieldName === 'commune' || fieldName === 'communePro' || fieldName === 'employerCommune') {
      const wilayaField = fieldName === 'commune' ? 'wilaya' : fieldName === 'communePro' ? 'wilayaPro' : 'employerWilaya';
      const selectedWilaya = formData[wilayaField];
      const communes = selectedWilaya ? wilayasData?.find(w => w.code === selectedWilaya)?.communes || [] : [];

      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label || "Commune"}</label>
          <select
            name={fieldName}
            value={value || ""}
            onChange={handleChange}
            className={inputClasses}
            disabled={!selectedWilaya}
          >
            <option value="">Sélectionner une commune</option>
            {communes.map(c => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // ─── Select fields ──────────────────────────────────────────────
    if (config.type === 'select' && config.validation?.options) {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label}</label>
          <select
            name={fieldName}
            value={value || ""}
            onChange={handleChange}
            className={inputClasses}
          >
            <option value="">Sélectionner...</option>
            {config.validation.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // ─── Email fields ──────────────────────────────────────────────
    if (config.type === 'email' || fieldName === 'email' || fieldName === 'emailPro') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label}</label>
          <input
            type="email"
            name={fieldName}
            value={value || ""}
            onChange={handleChange}
            placeholder={config.ui?.placeholder || ""}
            className={inputClasses}
          />
        </div>
      );
    }

    // ─── Date fields ──────────────────────────────────────────────
    if (config.type === 'date' || fieldName.includes('Date') || fieldName.includes('date')) {
      const dateValue = value ? new Date(value).toISOString().split('T')[0] : "";
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label}</label>
          <input
            type="date"
            name={fieldName}
            value={dateValue}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>
      );
    }

    // ─── Image/File upload ──────────────────────────────────────────
    if (config.type === 'image' || config.type === 'file') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className={labelClasses}>{config.label}</label>
          {value && config.type === 'image' && (
            <div
              className="relative w-24 h-24 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] mb-2 cursor-pointer"
              onClick={() => setShowProfilePicker(true)}
            >
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-xs text-white">Changer</span>
              </div>
            </div>
          )}
          <input
            type="file"
            accept={config.validation?.fileTypes?.join(',') || 'image/*'}
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
    }

    // ─── Boolean fields ─────────────────────────────────────────────
    if (config.type === 'boolean' || fieldName.startsWith('is') || fieldName.startsWith('has')) {
      return (
        <div key={fieldName} className="space-y-1.5">
          <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5">
            {config.label}
          </label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC]">
              <input
                type="radio"
                name={fieldName}
                value="true"
                checked={value === true || value === 'true'}
                onChange={() => handleChange({ target: { name: fieldName, value: true } })}
                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
              />
              Oui
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC]">
              <input
                type="radio"
                name={fieldName}
                value="false"
                checked={value === false || value === 'false' || value === ''}
                onChange={() => handleChange({ target: { name: fieldName, value: false } })}
                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
              />
              Non
            </label>
          </div>
        </div>
      );
    }

    // ─── Default text input ──────────────────────────────────────────
    return (
      <div key={fieldName} className="space-y-1.5">
        <label className={labelClasses}>{config.label}</label>
        <input
          type={config.type || 'text'}
          name={fieldName}
          value={value || ""}
          onChange={handleChange}
          placeholder={config.ui?.placeholder || ""}
          className={inputClasses}
        />
      </div>
    );
  };

  // ─── Get fields for a specific section ────────────────────────────
  const getSectionFields = (sectionKey) => {
    const section = SECTION_CONFIG[sectionKey];
    if (!section) return [];
    return section.fields.filter(field =>
      permissions?.fields?.includes(field) &&
      permissions?.configs?.[field]
    );
  };

  // ─── Render a section ──────────────────────────────────────────────
  const renderSection = (sectionKey) => {
    const section = SECTION_CONFIG[sectionKey];
    if (!section) return null;

    const fields = getSectionFields(sectionKey);
    if (fields.length === 0) return null;

    const Icon = section.icon;

    return (
      <div key={sectionKey} className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3 mb-6">
          <Icon className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-[#F8FAFC]">{section.label}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map(fieldName => renderField(fieldName))}
        </div>
      </div>
    );
  };

  // ─── Get the list of sections to render ────────────────────────────
  const getVisibleSections = () => {
    return Object.keys(SECTION_CONFIG).filter(key => getSectionFields(key).length > 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ">
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────────────── */}
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

        {/* ─── Form ────────────────────────────────────────────────────── */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            <form onSubmit={handleSubmit} className="space-y-10">

              {/* ─── Profile Picture ───────────────────────────────────── */}
              {permissions?.fields?.includes('profilePicture') && (
                <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">Photo de profil</h3>
                  </div>
                  <div className="flex items-center gap-6">
                    {formData.profilePicture ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/30">
                        <img
                          src={formData.profilePicture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = ''; }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-[#0A0F1C] border-2 border-dashed border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                        <User className="w-10 h-10 text-[#64748B]" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                        id="profile-upload"
                      />
                      <label
                        htmlFor="profile-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Changer la photo
                      </label>
                      <p className="text-xs text-[#64748B] mt-1">Formats acceptés : JPG, PNG, GIF</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Render all sections ──────────────────────────────── */}
              {getVisibleSections().map(key => renderSection(key))}

              {/* ─── Password field ───────────────────────────────────── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Sécurité</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                      Mot de passe <span className="text-rose-400 ml-1">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password || ''}
                      onChange={handleChange}
                      placeholder="Entrez votre mot de passe (8 caractères min)"
                      required
                      className="w-full px-4 py-2.5 bg-[#111827] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B] hover:border-[rgba(255,255,255,0.12)]"
                    />
                    <p className="text-xs text-[#64748B]">Minimum 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial</p>
                  </div>
                </div>
              </div>

              {/* ─── Actions ───────────────────────────────────────────── */}
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
    </div>
  );
}