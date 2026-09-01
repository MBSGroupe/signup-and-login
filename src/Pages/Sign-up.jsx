import { React, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
import SectionTitle from "../Components/Title";
import {
  Upload,
  X,
  FileText,
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
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  Users
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

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

const FILE_TYPES = [
  { key: 'photo', label: 'Photo' },
  { key: 'CNRC', label: 'Carte Nationale' },
  { key: 'recu2026', label: 'Reçu 2026' },
  { key: 'ACTENAISSANCE', label: 'Acte de naissance' },
  { key: 'DIPLOMES', label: 'Diplôme(s)' },
  { key: 'c20', label: 'Certificat d\'existence' },
  { key: 'nonAffiliationcnas', label: 'Non-affiliation CNAS' },
  { key: 'affiliationcnas', label: 'Affiliation CNAS' },
  { key: 'contrattravail', label: 'Contrat de travail' },
  { key: 'PIECEIDENTITE', label: 'Pièce d\'identité' },
  { key: 'SERMENTTABLE', label: 'Serment' },
  { key: 'statut', label: 'Statut' },
  { key: 'RECUDUS', label: 'Reçu divers' },
];

export default function FormulaireCNOA() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthData, authData } = useContext(UserContext);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const maxDate = `${yyyy}-${mm}-${dd}`;

  // ─── FORM STATE ──────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    cloaExercice: "",
    nin: "",
    sexe: "",
    serviceNationalStatus: "",
    name: "",
    lastname: "",
    nomArabe: "",
    prenomArabe: "",
    dateOfBirth: "",
    lieuNaissance: "",
    numeroActeNaissance: "",
    adressePersonnelle: "",
    commune: "",
    wilaya: "",
    prenomPere: "",
    prenomPereArabe: "",
    nomPrenomMere: "",
    nomPrenomMereArabe: "",
    maritalStatus: "",
    enfants: "",
    fixe: "",
    phone: "",
    email: "",
    emailPro: "",
    // Diplomas
    diplomaType: "",
    sessionClassique: "",
    anneeClassique: "",
    universiteClassique: "",
    sessionLMDL: "",
    anneeLMDL: "",
    universiteLMDL: "",
    sessionLMDM: "",
    anneeLMDM: "",
    universiteLMDM: "",
    // Professional
    registrationNumber: "",
    oathDate: "",
    oathLocation: "",
    professionalMode: "",
    installationDate: "",
    nif: "",
    adressePro: "",
    adresseProArabe: "",
    communePro: "",
    wilayaPro: "",
    benefitStateAid: "",
    moyensHumains: "",
    associateName: "",
    associateRegistrationNumber: "",
    recruitmentDate: "",
    employerName: "",
    employerRegistrationNumber: "",
    employerAdresse: "",
    employerAdresseArabe: "",
    employerCommune: "",
    employerWilaya: "",
    password: "",
    secondPassword: "",
    role: "user",
    status: "pending",
    loi: false,
  });

  const [otherDiplomas, setOtherDiplomas] = useState([]);
  const [newDiploma, setNewDiploma] = useState({ titre: "", etablissement: "", annee: "" });
  const [diplomaFile, setDiplomaFile] = useState(null);

  const [formations, setFormations] = useState([]);
  const [newFormation, setNewFormation] = useState({ titre: "", etablissement: "", annee: "" });
  const [formationFile, setFormationFile] = useState(null);

  const [fileUploads, setFileUploads] = useState(
    FILE_TYPES.reduce((acc, ft) => ({ ...acc, [ft.key]: null }), {})
  );
  const [uploadingFileType, setUploadingFileType] = useState(null);

  const handleFileUploadForType = async (typeKey, file) => {
    if (!file) return;
    setUploadingFileType(typeKey);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "uploads");

      const response = await fetch(`${NEST_API_URL}/files/upload/temp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData?.token || ''}` },
        body: uploadData,
      });
      const data = await response.json();
      if (response.ok) {
        setFileUploads(prev => ({
          ...prev,
          [typeKey]: {
            id: data.data.id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: data.data.url,
          }
        }));
      } else {
        setMessage(`Erreur upload ${typeKey}: ${data.message}`);
        setMessageType("error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage(`Erreur réseau pour ${typeKey}`);
      setMessageType("error");
    } finally {
      setUploadingFileType(null);
    }
  };

  const removeFileForType = (typeKey) => {
    setFileUploads(prev => ({ ...prev, [typeKey]: null }));
  };

  const addItem = (list, setList, item, setItem, file, setFile) => {
    if (!item.titre || !item.etablissement || !item.annee) {
      setMessage("Veuillez remplir tous les champs.");
      setMessageType("error");
      return;
    }
    const entry = { ...item };
    if (file) {
      entry.fileId = file.id;
      entry.fileName = file.name;
    }
    setList([...list, entry]);
    setItem({ titre: "", etablissement: "", annee: "" });
    setFile(null);
  };

  const removeItem = (list, setList, index) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const shouldShowField = (fieldName) => {
    const { sexe, professionalMode } = formData;
    if (fieldName === 'serviceNationalStatus' && sexe === 'F') return false;

    const isLiberal = professionalMode === 'Libéral' || professionalMode === 'Associé' || professionalMode === '';
    const isAssocie = professionalMode === 'Associé';
    const isSalarie = professionalMode === 'Salarié';

    const liberalFields = ['installationDate', 'nif', 'adressePro', 'adresseProArabe', 'communePro', 'wilayaPro', 'benefitStateAid', 'moyensHumains'];
    const associeFields = ['associateName', 'associateRegistrationNumber'];
    const salarieFields = ['recruitmentDate', 'employerName', 'employerRegistrationNumber', 'employerAdresse', 'employerAdresseArabe', 'employerCommune', 'employerWilaya'];

    if (liberalFields.includes(fieldName)) return isLiberal;
    if (associeFields.includes(fieldName)) return isAssocie;
    if (salarieFields.includes(fieldName)) return isSalarie;

    // Exclude diploma fields from being rendered elsewhere (they are handled in the custom section)
    if (fieldName.startsWith('session') || fieldName.startsWith('annee') || fieldName.startsWith('universite')) return false;

    return true;
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

  const renderField = (label, name, type = "text", options = null, required = false, placeholder = "", icon = null) => {
    if (!shouldShowField(name)) return null;
    const isArabicField = name.includes('Arabe') || name.includes('arab');
    const isSelect = type === "select";
    const isDate = type === "date";
    const isPassword = type === "password";
    const isTextarea = type === "textarea";

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
            className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]"
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
            className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 
              transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] resize-y"
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.loi) {
      setMessage("Vous devez accepter la déclaration légale pour continuer.");
      setMessageType("error");
      return;
    }
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
        otherDiplomas: otherDiplomas,
        formations: formations,
        files: Object.fromEntries(
          Object.entries(fileUploads)
            .filter(([_, val]) => val !== null)
            .map(([key, val]) => [key, val.id])
        ),
      };

      const response = await fetch(`${NEST_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const data = await response.json();
      if (response.ok) {
        const token = data?.data?.token || data.token;
        const user = data?.data?.user || data.user;
        if (!token || !user) {
          setMessage('Réponse serveur incorrecte');
          setMessageType('error');
          return;
        }
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

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <SectionTitle title="Formulaire d'inscription CNOA" />

        <div className="mt-8 bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            <form ref={formRef} className="space-y-10" onSubmit={handleSubmit}>

              {/* ─── 0. CLOA d'exercice ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">CLOA d'exercice</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {renderField("CLOA d'exercice", "cloaExercice", "select", WILAYAS.map(w => ({ value: w, label: w })), true, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                </div>
              </div>

              {/* ─── 1. Informations Personnelles ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Informations Personnelles</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("NIN", "nin", "text", null, false, "Numéro d'identité nationale", <Shield className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Sexe", "sexe", "select", [{ value: "M", label: "Masculin" }, { value: "F", label: "Féminin" }], true, "", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Service national", "serviceNationalStatus", "select", getServiceNationalOptions(), false, "", <Shield className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Nom", "name", "text", null, true, "Votre nom", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Prénom", "lastname", "text", null, true, "Votre prénom", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Nom (Arabe)", "nomArabe", "text", null, false, "الاسم", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Prénom (Arabe)", "prenomArabe", "text", null, false, "اللقب", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Date de naissance", "dateOfBirth", "date", null, true, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Lieu de naissance", "lieuNaissance", "text", null, false, "Ville de naissance", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("N° acte de naissance", "numeroActeNaissance", "text", null, false, "Numéro d'acte", <FileText className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Adresse personnelle", "adressePersonnelle", "text", null, false, "Adresse", <Home className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Commune", "commune", "text", null, false, "Commune", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Wilaya", "wilaya", "select", WILAYAS.map(w => ({ value: w, label: w })), false, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                </div>
              </div>

              {/* ─── 2. Informations Familiales ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Home className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Informations Familiales</h3>
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
                  {renderField("Nombre d'enfants", "enfants", "number", null, false, "0")}
                </div>
              </div>

              {/* ─── 3. Contact ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Contact</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Téléphone fixe", "fixe", "text", null, false, "023 45 67 89", <Phone className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Téléphone mobile", "phone", "text", null, false, "0555 55 55 55", <Phone className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Email personnel", "email", "email", null, true, "email@exemple.com", <Mail className="w-4 h-4 text-emerald-400" />)}
                </div>
              </div>

              {/* ─── 4. Diplômes universitaires (fixed) ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Diplômes universitaires</h3>
                </div>
                <div className="space-y-4">
                  {/* Type selection */}
                  <div className="grid grid-cols-1">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                        Type de diplôme
                      </label>
                      <select
                        name="diplomaType"
                        value={formData.diplomaType || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      >
                        <option value="">Sélectionnez</option>
                        <option value="Classique">Classique</option>
                        <option value="LMD">LMD</option>
                      </select>
                    </div>
                  </div>

                  {/* Classique fields */}
                  {formData.diplomaType === 'Classique' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Session Classique</label>
                        <select
                          name="sessionClassique"
                          value={formData.sessionClassique || ""}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        >
                          <option value="">Sélectionnez</option>
                          <option value="Juin">Juin</option>
                          <option value="Juillet">Juillet</option>
                          <option value="Septembre">Septembre</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Année Classique</label>
                        <input
                          type="text"
                          name="anneeClassique"
                          value={formData.anneeClassique || ""}
                          onChange={handleChange}
                          placeholder="Année"
                          className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Université Classique</label>
                        <input
                          type="text"
                          name="universiteClassique"
                          value={formData.universiteClassique || ""}
                          onChange={handleChange}
                          placeholder="Université"
                          className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* LMD fields */}
                  {formData.diplomaType === 'LMD' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Licence</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Session LMD (Licence)</label>
                            <select
                              name="sessionLMDL"
                              value={formData.sessionLMDL || ""}
                              onChange={handleChange}
                              className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            >
                              <option value="">Sélectionnez</option>
                              <option value="Juin">Juin</option>
                              <option value="Septembre">Septembre</option>
                              <option value="Décembre">Décembre</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Année LMD (Licence)</label>
                            <input
                              type="text"
                              name="anneeLMDL"
                              value={formData.anneeLMDL || ""}
                              onChange={handleChange}
                              placeholder="Année"
                              className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Université LMD (Licence)</label>
                            <input
                              type="text"
                              name="universiteLMDL"
                              value={formData.universiteLMDL || ""}
                              onChange={handleChange}
                              placeholder="Université"
                              className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Master</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Session LMD (Master)</label>
                            <select
                              name="sessionLMDM"
                              value={formData.sessionLMDM || ""}
                              onChange={handleChange}
                              className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            >
                              <option value="">Sélectionnez</option>
                              <option value="Juin">Juin</option>
                              <option value="Septembre">Septembre</option>
                              <option value="Décembre">Décembre</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Année LMD (Master)</label>
                            <input
                              type="text"
                              name="anneeLMDM"
                              value={formData.anneeLMDM || ""}
                              onChange={handleChange}
                              placeholder="Année"
                              className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Université LMD (Master)</label>
                            <input
                              type="text"
                              name="universiteLMDM"
                              value={formData.universiteLMDM || ""}
                              onChange={handleChange}
                              placeholder="Université"
                              className="w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── 5. Autres diplômes ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Autres diplômes</h3>
                </div>
                {/* ... (same as before) ... */}
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Titre</label>
                    <input
                      type="text"
                      value={newDiploma.titre}
                      onChange={(e) => setNewDiploma({ ...newDiploma, titre: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Établissement</label>
                    <input
                      type="text"
                      value={newDiploma.etablissement}
                      onChange={(e) => setNewDiploma({ ...newDiploma, etablissement: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs text-[#64748B]">Année</label>
                    <input
                      type="text"
                      value={newDiploma.annee}
                      onChange={(e) => setNewDiploma({ ...newDiploma, annee: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs text-[#64748B]">Fichier (optionnel)</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleFileUploadForType('diploma_' + Date.now(), file);
                          setDiplomaFile(file);
                        }
                      }}
                      className="w-full text-xs text-[#64748B] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(otherDiplomas, setOtherDiplomas, newDiploma, setNewDiploma, diplomaFile, setDiplomaFile)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                {otherDiplomas.length > 0 && (
                  <div className="space-y-2">
                    {otherDiplomas.map((dip, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#111827] p-3 rounded-lg border border-[rgba(255,255,255,0.06)]">
                        <div>
                          <span className="text-[#F8FAFC] font-medium">{dip.titre}</span>
                          <span className="text-[#94A3B8] text-sm ml-2">({dip.etablissement}, {dip.annee})</span>
                          {dip.fileName && <span className="text-emerald-400 text-xs ml-2">📎 {dip.fileName}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(otherDiplomas, setOtherDiplomas, idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── 6. Formations ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Formations</h3>
                </div>
                {/* ... (same as before) ... */}
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Titre</label>
                    <input
                      type="text"
                      value={newFormation.titre}
                      onChange={(e) => setNewFormation({ ...newFormation, titre: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Établissement</label>
                    <input
                      type="text"
                      value={newFormation.etablissement}
                      onChange={(e) => setNewFormation({ ...newFormation, etablissement: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs text-[#64748B]">Année</label>
                    <input
                      type="text"
                      value={newFormation.annee}
                      onChange={(e) => setNewFormation({ ...newFormation, annee: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs text-[#64748B]">Fichier (optionnel)</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleFileUploadForType('formation_' + Date.now(), file);
                          setFormationFile(file);
                        }
                      }}
                      className="w-full text-xs text-[#64748B] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(formations, setFormations, newFormation, setNewFormation, formationFile, setFormationFile)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                {formations.length > 0 && (
                  <div className="space-y-2">
                    {formations.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#111827] p-3 rounded-lg border border-[rgba(255,255,255,0.06)]">
                        <div>
                          <span className="text-[#F8FAFC] font-medium">{f.titre}</span>
                          <span className="text-[#94A3B8] text-sm ml-2">({f.etablissement}, {f.annee})</span>
                          {f.fileName && <span className="text-emerald-400 text-xs ml-2">📎 {f.fileName}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(formations, setFormations, idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── 7. Informations professionnelles ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Informations professionnelles</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("N° d'inscription", "registrationNumber", "text", null, true, "N° d'inscription", <BookOpen className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Date de serment", "oathDate", "date", null, false, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Lieu du serment", "oathLocation", "text", null, false, "Lieu du serment", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Email professionnelle", "emailPro", "email", null, false, "pro@exemple.com", <Mail className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Mode d'exercice", "professionalMode", "select", [
                    { value: "Libéral", label: "Libéral" },
                    { value: "Associé", label: "Associé" },
                    { value: "Salarié", label: "Salarié" }
                  ], false, "", <Briefcase className="w-4 h-4 text-emerald-400" />)}
                </div>

                {/* Conditional fields based on professionalMode */}
                {formData.professionalMode && (
                  <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                    <h4 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider mb-4">
                      {formData.professionalMode === 'Libéral' && 'Détails (Libéral)'}
                      {formData.professionalMode === 'Associé' && 'Détails (Associé)'}
                      {formData.professionalMode === 'Salarié' && 'Détails (Salarié)'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(formData.professionalMode === 'Libéral' || formData.professionalMode === 'Associé') && (
                        <>
                          {renderField("Date d'installation", "installationDate", "date", null, false, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                          {renderField("NIF", "nif", "text", null, false, "Numéro d'identification fiscale", <FileText className="w-4 h-4 text-emerald-400" />)}
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle", "adressePro", "text", null, false, "Adresse pro.", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle (Arabe)", "adresseProArabe", "text", null, false, "العنوان المهني", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          {renderField("Commune", "communePro", "text", null, false, "Commune", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          {renderField("Wilaya", "wilayaPro", "select", WILAYAS.map(w => ({ value: w, label: w })), false, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          {renderField("Aide d'État", "benefitStateAid", "select", [
                            { value: "ANSEJ/NESDA", label: "ANSEJ/NESDA" },
                            { value: "ANDI/AAPI", label: "ANDI / AAPI" },
                            { value: "Non", label: "Non" }
                          ], false)}
                          {renderField("Moyens humains", "moyensHumains", "text", null, false, "Moyens humains", <Users className="w-4 h-4 text-emerald-400" />)}
                        </>
                      )}
                      {formData.professionalMode === 'Associé' && (
                        <>
                          {renderField("Nom et prénom de l'associé", "associateName", "text", null, false, "Nom de l'associé", <User className="w-4 h-4 text-emerald-400" />)}
                          {renderField("N° d'inscription de l'associé", "associateRegistrationNumber", "text", null, false, "N° inscription", <BookOpen className="w-4 h-4 text-emerald-400" />)}
                        </>
                      )}
                      {formData.professionalMode === 'Salarié' && (
                        <>
                          {renderField("Date de recrutement", "recruitmentDate", "date", null, false, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                          {renderField("Nom et prénom de l'employeur", "employerName", "text", null, false, "Employeur", <User className="w-4 h-4 text-emerald-400" />)}
                          {renderField("N° d'inscription de l'employeur", "employerRegistrationNumber", "text", null, false, "N° inscription", <BookOpen className="w-4 h-4 text-emerald-400" />)}
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle", "employerAdresse", "text", null, false, "Adresse", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle (Arabe)", "employerAdresseArabe", "text", null, false, "العنوان المهني", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          {renderField("Commune", "employerCommune", "text", null, false, "Commune", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          {renderField("Wilaya", "employerWilaya", "select", WILAYAS.map(w => ({ value: w, label: w })), false, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── 8. Documents obligatoires ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Paperclip className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Documents obligatoires</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FILE_TYPES.map((ft) => (
                    <div key={ft.key} className="bg-[#111827] p-3 rounded-xl border border-[rgba(255,255,255,0.06)]">
                      <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1">
                        {ft.label}
                      </label>
                      <div className="flex items-center gap-2">
                        {fileUploads[ft.key] ? (
                          <>
                            <span className="text-sm text-[#F8FAFC] truncate flex-1">{fileUploads[ft.key].name}</span>
                            <button
                              type="button"
                              onClick={() => removeFileForType(ft.key)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="file"
                              id={`file-${ft.key}`}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) handleFileUploadForType(ft.key, file);
                                e.target.value = null;
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor={`file-${ft.key}`}
                              className="flex-1 text-center py-2 border-2 border-dashed border-[rgba(255,255,255,0.06)] rounded-lg cursor-pointer hover:border-emerald-500/40 transition-all hover:bg-emerald-500/5"
                            >
                              {uploadingFileType === ft.key ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                              ) : (
                                <Upload className="w-5 h-5 mx-auto text-[#64748B] hover:text-emerald-400 transition-colors" />
                              )}
                              <span className="text-xs text-[#64748B] mt-1 block">Ajouter</span>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── 9. Sécurité ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Sécurité</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {renderField("Mot de passe", "password", "password", null, true, "Minimum 8 caractères")}
                  {renderField("Confirmer le mot de passe", "secondPassword", "password", null, true, "Confirmez")}
                </div>
              </div>

              {/* ─── 10. Déclaration légale ─── */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="w-5 h-5 text-emerald-400 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">Déclaration légale</h3>
                    <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
                      Je déclare vouloir exercer la profession d'architecte pour l'année 2026,<br />
                      et déclare sur l'honneur que les renseignements ci-dessus sont exacts,<br />
                      et j'autorise l'Ordre des Architectes à utiliser mes renseignements<br />
                      dans le respect des lois en vigueur, et des Règlements de l'Ordre des Architectes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="loi"
                    checked={formData.loi}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-[rgba(255,255,255,0.1)] bg-[#111827] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <label className="text-sm text-[#F8FAFC]">
                    J'accepte les termes de la déclaration ci-dessus.
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading || !formData.loi}
                  className={`w-full py-4 text-lg font-semibold text-white bg-emerald-500 hover:bg-emerald-600 
                    rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 
                    transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                    ${(isLoading || !formData.loi) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
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
    </div>
  );
}