import { React, useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
import SectionTitle from "../Components/Title";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Shield,
  Home,
  Paperclip,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from "lucide-react";


const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// Wilaya data
const WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi",
  "05 - Batna", "06 - Béjaïa", "07 - Biskra", "08 - Béchar",
  "09 - Blida", "10 - Bouira", "11 - Tamanrasset", "12 - Tébessa",
  "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou", "16 - Alger",
  "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma",
  "25 - Constantine", "26 - Médéa", "27 - Mostaganem", "28 - M'Sila",
  "29 - Mascara", "30 - Ouargla", "31 - Oran", "32 - El Bayadh",
  "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès",
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued",
  "40 - Khenchela", "41 - Souk Ahras", "42 - Tipaza", "43 - Mila",
  "44 - Aïn Defla", "45 - Naâma", "46 - Aïn Témouchent",
  "47 - Ghardaïa", "48 - Relizane", "49 - El M'ghair",
  "50 - El Meniaa", "51 - Ouled Djellal", "52 - Bordj Badji Mokhtar",
  "53 - Béni Abbès", "54 - Timimoun", "55 - Touggourt",
  "56 - Djanet", "57 - El M'ghair", "58 - El Meniaa"
];

export default function FormulaireCNOA() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthData, authData } = useContext(UserContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const maxDate = `${yyyy}-${mm}-${dd}`;

const [formData, setFormData] = useState({
  // Personal Info
  name: "BENALI",
  lastname: "Samir",
  nomArabe: "بن علي",
  prenomArabe: "سمير",
  email: "saabimm@gmail.com",
  emailPro: "saabimm@gmail.com",
  phone: "0698123456",
  fixe: "",
  fax: "",
  dateOfBirth: "1985-03-15",
  lieuNaissance: "Alger",
  sexe: "M",
  enfants: "2",

  // Family Info
  prenomPere: "Mohamed",
  prenomPereArabe: "محمد",
  nomPrenomMere: "yasmine ait ouali",
  nomPrenomMereArabe: "ياسمين آيت واعلي",
  situationFamiliale: "",
  maritalStatus: "Marié(e)",
  nationality: "Algérienne",
  serviceNationalStatus: "Ayant effectué",

  // Professional Info
  profession: "Architecte",
  specialty: "Génie civil",
  registrationNumber: "12345/01/20L",
  nif: "291050700123456",
  cachet: "12345",
  gps: "",
  loi: "",
  dispositif: "",
  professionalMode: "Libéral",
  activityStartDate: "2020-01-15",
  startDate: "2020-01-15",
  companyStatus: "",
  declarationExistence: "",
  moyensHumains: "",
  humanResources: "",
  isAccredited: "",
  benefitStateAid: "",

  // CNOA
  civility: "Mr",
  oathLocation: "16",
  oathDate: "2020-01-10",
  diplomaType: "LMD",
  sessionClassique: "",
  anneeClassique: "",
  universiteClassique: "",
  sessionLMDL: "062",
  anneeLMDL: "2007",
  universiteLMDL: "usthb",
  sessionLMDM: "021",
  anneeLMDM: "2009",
  universiteLMDM: "usthb",
  otherDiplomas: "",
  otherTrainings: "",
  registrationStatus: "",
  registrationDate: "",

  // Address
  wilaya: "16 - Alger",
  commune: "Alger Centre",
  region: "",
  adressePersonnelle: "10 rue des frères boukrif, Alger Centre",
  adressePersonnelleArabe: "",
  adressePro: "10 rue des frères boukrif, Alger Centre",
  adresseProArabe: "10 شارع الإخوة بوكريف، الجزائر الوسطى",

  // Security
  password: "",
  secondPassword: "",
  role: "user",
  status: "pending",
});

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Conditional visibility rules (unchanged)
  const shouldShowField = (fieldName) => {
    const { sexe, civility, professionalMode, diplomaType } = formData;

    if (fieldName === 'civility' && sexe === 'M') {
      return ['', 'Mr'].includes(civility) ? '' : 'Mr';
    }
    if (fieldName === 'civility' && sexe === 'F') {
      return ['', 'Mme', 'Mlle'].includes(civility) ? civility : '';
    }

    if (fieldName === 'serviceNationalStatus' && sexe === 'F') {
      return false;
    }

    if (fieldName === 'sessionClassique' || fieldName === 'anneeClassique' || fieldName === 'universiteClassique') {
      return diplomaType === 'Classique' || diplomaType === '';
    }
    if (fieldName === 'sessionLMDL' || fieldName === 'anneeLMDL' || fieldName === 'universiteLMDL') {
      return diplomaType === 'LMD' || diplomaType === '';
    }
    if (fieldName === 'sessionLMDM' || fieldName === 'anneeLMDM' || fieldName === 'universiteLMDM') {
      return diplomaType === 'LMD' || diplomaType === '';
    }

    if (fieldName === 'companyStatus' && professionalMode === 'Associé') {
      return true;
    }
    if (fieldName === 'employerId' && (professionalMode === 'Salarié' || professionalMode === 'Associé')) {
      return true;
    }

    return true;
  };

  const getCivilityOptions = () => {
    if (formData.sexe === 'M') {
      return [{ value: 'Mr', label: 'Mr' }];
    } else if (formData.sexe === 'F') {
      return [
        { value: 'Mme', label: 'Mme' },
        { value: 'Mlle', label: 'Mlle' }
      ];
    }
    return [
      { value: 'Mr', label: 'Mr' },
      { value: 'Mme', label: 'Mme' },
      { value: 'Mlle', label: 'Mlle' }
    ];
  };

  const getServiceNationalOptions = () => {
    if (formData.sexe === 'F') return [];
    return [
      { value: 'Ayant effectué', label: 'Ayant effectué' },
      { value: 'Exempté', label: 'Exempté' },
      { value: 'En cours', label: 'En cours' },
      { value: 'Non concerné', label: 'Non concerné' }
    ];
  };

  const getDiplomaSessionOptions = (type) => {
    if (type === 'Classique') {
      return ['Juin', 'Juillet', 'Septembre'];
    }
    if (type === 'LMD') {
      return ['Juin', 'Septembre', 'Décembre'];
    }
    return [];
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const uploaded = [];

    for (const file of files) {
      try {
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("folder", "uploads");

        const response = await fetch(`${NEST_API_URL}/files/upload/temp`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authData?.token || ''}`,
          },
          body: uploadData,
        });

        const data = await response.json();
        if (response.ok) {
          uploaded.push({
            id: data.data.id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: data.data.url,
          });
        } else {
          setMessage(`Erreur lors de l'upload: ${data.message}`);
          setMessageType("error");
        }
      } catch (err) {
        console.error("Upload error:", err);
        setMessage("Erreur réseau lors de l'upload");
        setMessageType("error");
      }
    }

    setUploadedFiles((prev) => [...prev, ...uploaded]);
    setUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-rose-400" />;
    return <File className="w-5 h-5 text-[#64748B]" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.secondPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      setMessageType("error");
      return;
    }

    if (formData.password.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { secondPassword, ...submitData } = formData;
      
      const cleanedData = Object.keys(submitData).reduce((acc, key) => {
        if (submitData[key] !== '' && submitData[key] !== null && submitData[key] !== undefined) {
          acc[key] = submitData[key];
        }
        return acc;
      }, {});
      
      const finalData = {
        ...cleanedData,
        enfants: cleanedData.enfants ? parseInt(cleanedData.enfants) : null,
        humanResources: cleanedData.humanResources ? parseInt(cleanedData.humanResources) : null,
        isAccredited: cleanedData.isAccredited === "true" ? true : cleanedData.isAccredited === "false" ? false : null,
        benefitStateAid: cleanedData.benefitStateAid === "true" ? true : cleanedData.benefitStateAid === "false" ? false : null,
        files: uploadedFiles.map(f => f.id),
      };

      Object.keys(finalData).forEach(key => {
        if (finalData[key] === null || finalData[key] === undefined) {
          delete finalData[key];
        }
      });

      const response = await fetch(`${NEST_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const data = await response.json();
      console.log('Signup response:', data);

      if (response.ok) {
        // Token and user are nested inside data.data
        const token = data?.data?.token || data.token;
        const user = data?.data?.user || data.user;

        if (!token || !user) {
          setMessage('Réponse serveur incorrecte');
          setMessageType('error');
          return;
        }

        // Save to context – the provider will auto-persist to localStorage
        setAuthData({ user, token });

        setMessage('Inscription réussie ! Vérification en cours...');
        setMessageType('success');
        setTimeout(() => navigate('/auth/verify-pending'), 2000);
      } else {
        setMessage(data.message || "Erreur lors de l'inscription");
        setMessageType('error');
}
    } catch (err) {
      console.error("Signup error:", err);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (label, name, type = "text", options = null, required = false, placeholder = "", icon = null) => {
    if (!shouldShowField(name)) return null;

    const isArabicField = name.includes('Arabe') || name.includes('arab');
    const isTextarea = type === "textarea";
    const isSelect = type === "select";
    const isDate = type === "date";
    const isPassword = type === "password";

    return (
      <div key={name} className="space-y-1.5">
        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
          {icon && <span className="inline-block mr-1.5">{icon}</span>}
          {label} {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
        {isSelect ? (
          <select
            name={name}
            value={formData[name] || ""}
            onChange={handleChange}
            required={required}
            className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]
              ${isArabicField ? 'text-right font-arabic' : ''}`}
            dir={isArabicField ? 'rtl' : 'ltr'}
          >
            <option value="">Sélectionnez</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            name={name}
            placeholder={placeholder}
            value={formData[name] || ""}
            onChange={handleChange}
            rows="3"
            className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] resize-y
              ${isArabicField ? 'text-right font-arabic' : ''}`}
            dir={isArabicField ? 'rtl' : 'ltr'}
          />
        ) : isDate ? (
          <input
            type="date"
            name={name}
            min="1900-01-01"
            max={maxDate}
            value={formData[name] || ""}
            onChange={handleChange}
            required={required}
            className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]"
          />
        ) : isPassword ? (
          <input
            type="password"
            name={name}
            placeholder={placeholder}
            value={formData[name] || ""}
            onChange={handleChange}
            required={required}
            className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]"
          />
        ) : (
          <input
            type={type}
            name={name}
            placeholder={placeholder}
            value={formData[name] || ""}
            onChange={handleChange}
            required={required}
            className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]
              ${isArabicField ? 'text-right font-arabic' : ''}`}
            dir={isArabicField ? 'rtl' : 'ltr'}
          />
        )}
      </div>
    );
  };

  // Group sections with icons
  const sections = [
    { id: 'personal', title: 'Informations Personnelles', icon: User, fields: ['name','lastname','nomArabe','prenomArabe','email','emailPro','phone','fixe','fax','sexe','dateOfBirth','lieuNaissance','enfants'] },
    { id: 'family', title: 'Informations Familiales', icon: Home, fields: ['prenomPere','prenomPereArabe','nomPrenomMere','nomPrenomMereArabe','maritalStatus','nationality','serviceNationalStatus'] },
    { id: 'professional', title: 'Informations Professionnelles', icon: Briefcase, fields: ['profession','specialty','registrationNumber','nif','cachet','gps','loi','dispositif','professionalMode','activityStartDate','startDate','companyStatus','declarationExistence','moyensHumains','humanResources','isAccredited','benefitStateAid','registrationStatus','registrationDate'] },
    { id: 'diplomas', title: 'Diplômes', icon: GraduationCap, fields: ['diplomaType','sessionClassique','anneeClassique','universiteClassique','sessionLMDL','anneeLMDL','universiteLMDL','sessionLMDM','anneeLMDM','universiteLMDM','otherDiplomas','otherTrainings'] },
    { id: 'cnoa', title: 'Informations CNOA', icon: Shield, fields: ['civility','oathLocation','oathDate'] },
    { id: 'address', title: 'Adresse', icon: MapPin, fields: ['wilaya','commune','region','adressePersonnelle','adressePersonnelleArabe','adressePro','adresseProArabe'] },
    { id: 'security', title: 'Sécurité', icon: Shield, fields: ['password','secondPassword'] },
  ];

  // Group fields by section to render
  const getSectionFields = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return [];
    // For simplicity, we use the existing userFields definition but we'll render fields individually.
    // Since we have renderField that takes label etc., we need to define field configs.
    // To avoid duplication, we'll keep the existing field rendering logic from the original code.
    // However, we need to restructure rendering to use the sections with icons.
    // We'll keep the existing renderField calls but wrap them in section containers.
    // We'll restructure by creating a mapping of field keys to their labels, types, etc.
    // Actually the original has a big renderField calls inline in the JSX. We'll reorganize to use a field configuration array and render sections dynamically.
    // But since it's a large component, we can keep the original structure but change the visual styles.
    // To reduce complexity, we'll keep the original JSX with the same renderField calls but wrap each section with new styling.
    // However the original is already structured with sections. We'll just update the container styles and remove the old progress indicator.
    // We'll keep the same renderField calls but change the CSS classes to the new theme.
    // So we'll edit the JSX part to update the section wrappers.
    return [];
  };

  // We'll keep the original JSX structure but update all styles.
  // To avoid a huge rewrite, we'll keep the same renderField calls and section containers but change classes and colors.
  // We'll replace the background, border, text colors, and add emerald accent.
  // Also replace Io icons with Lucide equivalents in the section titles.

  return (
    <div className="min-h-screen bg-[#0A0F1C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <SectionTitle title="Formulaire d'inscription CNOA" />

        <div className="mt-8 bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
                Remplir le Formulaire
              </h2>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <span>Étape</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium">1/6</span>
              </div>
            </div>

            <form ref={formRef} className="space-y-10" onSubmit={handleSubmit}>
              {/* ===== SECTION: Informations Personnelles ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Informations Personnelles</h3>
                  <span className="ml-auto text-xs text-[#64748B]">Section 1/6</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Nom", "name", "text", null, true, "Votre nom", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Prénom", "lastname", "text", null, true, "Votre prénom", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Nom (Arabe)", "nomArabe", "text", null, false, "الاسم", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Prénom (Arabe)", "prenomArabe", "text", null, false, "اللقب", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Email", "email", "email", null, true, "email@exemple.com", <Mail className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Email Professionnel", "emailPro", "email", null, false, "pro@exemple.com", <Mail className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Téléphone", "phone", "text", null, false, "0555 55 55 55", <Phone className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Téléphone Fixe", "fixe", "text", null, false, "023 45 67 89", <Phone className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Fax", "fax", "text", null, false, "Fax", <File className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Sexe", "sexe", "select", [
                    { value: "M", label: "Homme" },
                    { value: "F", label: "Femme" }
                  ], true, "", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Date de naissance", "dateOfBirth", "date", null, true, "", <File className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Lieu de naissance", "lieuNaissance", "text", null, false, "Ville de naissance", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Nombre d'enfants", "enfants", "number", null, false, "0")}
                </div>
              </div>

              {/* ===== SECTION: Informations Familiales ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <Home className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Informations Familiales</h3>
                  <span className="ml-auto text-xs text-[#64748B]">Section 2/6</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Prénom du père", "prenomPere", "text", null, false, "Prénom du père")}
                  {renderField("Prénom du père (Arabe)", "prenomPereArabe", "text", null, false, "اسم الأب")}
                  {renderField("Nom et prénom de la mère", "nomPrenomMere", "text", null, false, "Nom et prénom de la mère")}
                  {renderField("Nom et prénom de la mère (Arabe)", "nomPrenomMereArabe", "text", null, false, "اسم الأم")}
                  {renderField("Situation familiale", "maritalStatus", "select", [
                    { value: "Célibataire", label: "Célibataire" },
                    { value: "Marié(e)", label: "Marié(e)" },
                    { value: "Divorcé(e)", label: "Divorcé(e)" },
                    { value: "Veuf(ve)", label: "Veuf(ve)" }
                  ], false)}
                  {renderField("Nationalité", "nationality", "text", null, false, "Nationalité")}
                  {renderField("Service national", "serviceNationalStatus", "select", 
                    getServiceNationalOptions(), false)}
                </div>
              </div>

              {/* ===== SECTION: Informations Professionnelles ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Informations Professionnelles</h3>
                  <span className="ml-auto text-xs text-[#64748B]">Section 3/6</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Profession", "profession", "select", [
                    { value: "Architecte", label: "Architecte" },
                    { value: "Ingénieur", label: "Ingénieur" },
                    { value: "Urbaniste", label: "Urbaniste" },
                    { value: "Paysagiste", label: "Paysagiste" }
                  ], false)}
                  {renderField("Spécialité", "specialty", "text", null, false, "Spécialité")}
                  {renderField("N° d'inscription", "registrationNumber", "text", null, true, "N° d'inscription à l'ordre")}
                  {renderField("NIF", "nif", "text", null, false, "NIF")}
                  {renderField("Cachet", "cachet", "text", null, false, "Numéro de cachet")}
                  {renderField("GPS", "gps", "text", null, false, "Coordonnées GPS")}
                  {renderField("Loi", "loi", "text", null, false, "Loi")}
                  {renderField("Dispositif", "dispositif", "text", null, false, "Dispositif")}
                  {renderField("Mode d'exercice", "professionalMode", "select", [
                    { value: "Libéral", label: "Libéral" },
                    { value: "Associé", label: "Associé" },
                    { value: "Salarié", label: "Salarié" }
                  ], false)}
                  {renderField("Date de début d'activité", "activityStartDate", "date", null, false)}
                  {renderField("Date de début de cotisation", "startDate", "date", null, false)}
                  {renderField("Statut de la SCP", "companyStatus", "text", null, false, "Statut SCP")}
                  {renderField("Déclaration d'existence", "declarationExistence", "text", null, false, "Déclaration d'existence")}
                  {renderField("Moyens humains", "moyensHumains", "text", null, false, "Moyens humains")}
                  {renderField("Ressources humaines", "humanResources", "number", null, false)}
                  {renderField("Architecte agréé", "isAccredited", "select", [
                    { value: "true", label: "Oui" },
                    { value: "false", label: "Non" }
                  ], false)}
                  {renderField("Bénéficiaire aide d'État", "benefitStateAid", "select", [
                    { value: "true", label: "Oui" },
                    { value: "false", label: "Non" }
                  ], false)}
                  {renderField("Statut d'inscription", "registrationStatus", "select", [
                    { value: "Inscrit", label: "Inscrit" },
                    { value: "Radié", label: "Radié" },
                    { value: "Suspendu", label: "Suspendu" }
                  ], false)}
                  {renderField("Date d'inscription", "registrationDate", "date", null, false)}
                </div>
              </div>

              {/* ===== SECTION: Diplômes ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Diplômes</h3>
                  <span className="ml-auto text-xs text-[#64748B]">Section 4/6</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Type de diplôme", "diplomaType", "select", [
                    { value: "Classique", label: "Classique" },
                    { value: "LMD", label: "LMD" }
                  ], false)}
                  {renderField("Session Classique", "sessionClassique", "select", 
                    getDiplomaSessionOptions('Classique').map(s => ({ value: s, label: s })), false)}
                  {renderField("Année Classique", "anneeClassique", "text", null, false, "Année")}
                  {renderField("Université Classique", "universiteClassique", "text", null, false, "Université")}
                  {renderField("Session LMD (Licence)", "sessionLMDL", "select", 
                    getDiplomaSessionOptions('LMD').map(s => ({ value: s, label: s })), false)}
                  {renderField("Année LMD (Licence)", "anneeLMDL", "text", null, false, "Année")}
                  {renderField("Université LMD (Licence)", "universiteLMDL", "text", null, false, "Université")}
                  {renderField("Session LMD (Master)", "sessionLMDM", "select", 
                    getDiplomaSessionOptions('LMD').map(s => ({ value: s, label: s })), false)}
                  {renderField("Année LMD (Master)", "anneeLMDM", "text", null, false, "Année")}
                  {renderField("Université LMD (Master)", "universiteLMDM", "text", null, false, "Université")}
                  <div className="sm:col-span-2 lg:col-span-3">
                    {renderField("Autres diplômes (JSON)", "otherDiplomas", "textarea", null, false, 
                      '[{"name": "Diplôme", "institution": "Université", "year": "2020"}]')}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    {renderField("Autres formations (JSON)", "otherTrainings", "textarea", null, false,
                      '[{"name": "Formation", "institution": "Institut", "year": "2020"}]')}
                  </div>
                </div>
              </div>

              {/* ===== SECTION: CNOA ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Informations CNOA</h3>
                  <span className="ml-auto text-xs text-[#64748B]">Section 5/6</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Civilité", "civility", "select", getCivilityOptions(), false)}
                  {renderField("Lieu du serment", "oathLocation", "text", null, false, "Lieu du serment")}
                  {renderField("Date du serment", "oathDate", "date", null, false)}
                </div>
              </div>

              {/* ===== SECTION: Adresse ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Adresse</h3>
                  <span className="ml-auto text-xs text-[#64748B]">Section 6/6</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Wilaya", "wilaya", "select", 
                    WILAYAS.map(w => ({ value: w, label: w })), false)}
                  {renderField("Commune", "commune", "text", null, false, "Commune")}
                  {renderField("Région", "region", "text", null, false, "Région")}
                  <div className="sm:col-span-2 lg:col-span-3">
                    {renderField("Adresse personnelle", "adressePersonnelle", "text", null, false, "Adresse personnelle")}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    {renderField("Adresse personnelle (Arabe)", "adressePersonnelleArabe", "text", null, false, "العنوان الشخصي")}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    {renderField("Adresse professionnelle", "adressePro", "text", null, false, "Adresse professionnelle")}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    {renderField("Adresse professionnelle (Arabe)", "adresseProArabe", "text", null, false, "العنوان المهني")}
                  </div>
                </div>
              </div>

              {/* ===== SECTION: Fichiers ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <Paperclip className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Fichiers</h3>
                </div>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center hover:border-emerald-500/40 transition-all duration-300 hover:bg-emerald-500/5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <Upload className="w-12 h-12 text-emerald-400 mx-auto mb-4 transition-transform duration-300 hover:scale-110" />
                      <p className="text-[#F8FAFC] text-lg font-medium">Cliquez ou glissez des fichiers ici</p>
                      <p className="text-[#64748B] text-sm mt-2">PNG, JPG, PDF, DOC - Max 10MB par fichier</p>
                    </label>
                  </div>

                  {uploadingFiles && (
                    <div className="flex items-center justify-center gap-3 text-emerald-400 py-4">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Upload en cours...</span>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-[#111827] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-emerald-500/30 transition-all duration-300 group">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(file.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-[#F8FAFC] text-sm font-medium truncate">{file.name}</p>
                              <p className="text-[#64748B] text-xs">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-rose-400 hover:text-rose-300 transition-colors p-1 hover:bg-rose-400/10 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ===== SECTION: Sécurité ===== */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Sécurité</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {renderField("Mot de passe", "password", "password", null, true, "Minimum 8 caractères")}
                  {renderField("Confirmer le mot de passe", "secondPassword", "password", null, true, "Confirmez votre mot de passe")}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-4 text-lg font-semibold text-white bg-emerald-500 hover:bg-emerald-600 
                    rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 
                    transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                    ${isLoading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    'S\'inscrire'
                  )}
                </button>
              </div>
            </form>

            {message && (
              <div className={`mt-6 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2 ${
                messageType === 'error' 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {messageType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-[#64748B] max-w-2xl mx-auto">
          <p className="text-sm">
            En continuant, vous acceptez nos <a href="#" className="text-emerald-400 hover:underline">Conditions d'utilisation</a> et notre <a href="#" className="text-emerald-400 hover:underline">Politique de confidentialité</a>.
          </p>
          <p className="text-sm mt-2">
            Vous avez déjà un compte ? <a href="/" className="text-emerald-400 hover:underline font-medium">Se connecter</a>
          </p>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #22C55E;
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #16A34A;
        }
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #22C55E rgba(31, 41, 55, 0.5);
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}