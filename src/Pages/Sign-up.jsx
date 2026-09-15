import { React, useState, useContext, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
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
  Users,
  Eye,
  ArrowLeft,
} from "lucide-react";

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import cnoaLogo from "../assets/LOGOCLOA.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

const BASE_FILE_TYPES = [
  { key: 'photo', label: 'Photo', required: true },
  { key: 'CNRC', label: 'Carte Nationale', required: true },
  { key: 'recu2026', label: 'Reçu 2027', required: true },
  { key: 'ACTENAISSANCE', label: 'Acte de naissance', required: true },
  { key: 'DIPLOMES', label: 'Diplôme(s)', required: true },
  { key: 'SERMENTTABLE', label: 'Serment', required: true },
  { key: 'RECUDUS', label: 'Recus des dus (si pas à jours)', required: false },
  { key: 'situationCNRC', label: 'Situation CNRC', required: true },
  { key: 'c20', label: 'Certificat d\'existence', required: true },
  { key: 'nonAffiliationcnas', label: 'Non-affiliation CNAS', required: true },
  { key: 'affiliationcnas', label: 'Affiliation CNAS', required: true },
  { key: 'contrattravail', label: 'Contrat de travail', required: true },
  { key: 'statut', label: 'Statut SCP', required: true },
];

const ALLOWED_FILE_TYPES = {
  common: ['photo', 'CNRC', 'recu2026', 'SERMENTTABLE', 'DIPLOMES', 'RECUDUS', 'ACTENAISSANCE', 'situationCNRC'],
  liberal: ['nonAffiliationcnas', 'c20'],
  associe: ['nonAffiliationcnas', 'c20', 'statut'],
  salarie: ['affiliationcnas', 'contrattravail']
};

const OPTIONAL_FIELDS = ['enfants'];
const HIDDEN_FIELDS = [];

const ALL_FORM_FIELDS = [
  'region',
  'nin', 'sexe', 'serviceNationalStatus',
  'name', 'lastname', 'nomArabe', 'prenomArabe',
  'dateOfBirth', 'lieuNaissance', 'numeroActeNaissance',
  'adressePersonnelle', 'adressePersonnelleArabe', 'commune', 'wilaya',
  'prenomPere', 'prenomPereArabe', 'nomPrenomMere', 'nomPrenomMereArabe',
  'maritalStatus', 'nationality', 'enfants',
  'fixe', 'phone', 'email',
  'diplomaType',
  'sessionClassique', 'anneeClassique', 'universiteClassique',
  'sessionLMDL', 'anneeLMDL', 'universiteLMDL',
  'sessionLMDM', 'anneeLMDM', 'universiteLMDM',
  'registrationNumber', 'oathDate', 'oathLocation', 'professionalMode',
  'installationDate', 'nif', 'adressePro', 'adresseProArabe',
  'benefitStateAid', 'moyensHumains', 'gps',
  'recruitmentDate', 'employerName', 'employerRegistrationNumber',
  'employerAdresse', 'employerAdresseArabe', 'employerCommune', 'employerWilaya',
  'password', 'secondPassword',
];

const REGISTRATION_NUMBER_REGEX = /^\d{5}\/\d{2}\/\d{2}[ALS]$/;
const NIN_REGEX = /^\d{18}$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

const PASSWORD_RULES = [
  { key: "min",       label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "max",       label: `Au plus ${PASSWORD_MAX_LENGTH} caractères`, test: (p) => p.length <= PASSWORD_MAX_LENGTH },
  { key: "uppercase", label: "Au moins une lettre majuscule",             test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "Au moins une lettre minuscule",             test: (p) => /[a-z]/.test(p) },
  { key: "number",    label: "Au moins un chiffre",                       test: (p) => /[0-9]/.test(p) },
  { key: "special",   label: "Au moins un caractère spécial",             test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const allPasswordRulesPass = (password) =>
  PASSWORD_RULES.every((r) => r.test(password));

// ─────────────────────────────────────────────────────────────────
//  Review modal field metadata — the labels used by the signup form.
//  Kept in the same order as the form sections.
// ─────────────────────────────────────────────────────────────────
const REVIEW_SECTIONS = [
  {
    key: 'cloa',
    label: "CLOA d'exercice",
    icon: MapPin,
    fields: [['region', "CLOA d'exercice"]],
  },
  {
    key: 'personal',
    label: 'Informations Personnelles',
    icon: User,
    fields: [
      ['nin', 'NIN'],
      ['sexe', 'Civilité'],
      ['serviceNationalStatus', 'Service national'],
      ['name', 'Nom'],
      ['lastname', 'Prénom'],
      ['nomArabe', 'Nom (Arabe)'],
      ['prenomArabe', 'Prénom (Arabe)'],
      ['dateOfBirth', 'Date de naissance'],
      ['lieuNaissance', 'Lieu de naissance'],
      ['numeroActeNaissance', "N° acte de naissance"],
      ['adressePersonnelle', 'Adresse personnelle'],
      ['adressePersonnelleArabe', 'Adresse personnelle (Arabe)'],
      ['commune', 'Commune de résidence'],
      ['wilaya', 'Wilaya de résidence'],
      ['maritalStatus', 'Situation familiale'],
      ['nationality', 'Nationalité'],
      ['enfants', "Nombre d'enfants"],
    ],
  },
  {
    key: 'family',
    label: 'Informations Familiales',
    icon: Home,
    fields: [
      ['prenomPere', 'Prénom du père'],
      ['prenomPereArabe', 'Prénom du père (Arabe)'],
      ['nomPrenomMere', 'Nom et prénom de la mère'],
      ['nomPrenomMereArabe', 'Nom et prénom de la mère (Arabe)'],
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: Phone,
    fields: [
      ['fixe', 'Téléphone fixe'],
      ['phone', 'Téléphone mobile'],
      ['email', 'Email'],
    ],
  },
  {
    key: 'diplomas',
    label: 'Diplômes universitaires',
    icon: GraduationCap,
    fields: [
      ['diplomaType', 'Type de diplôme'],
      ['sessionClassique', 'Session Classique'],
      ['anneeClassique', 'Année Classique'],
      ['universiteClassique', 'Université Classique'],
      ['sessionLMDL', 'Session LMD (Licence)'],
      ['anneeLMDL', 'Année LMD (Licence)'],
      ['universiteLMDL', 'Université LMD (Licence)'],
      ['sessionLMDM', 'Session LMD (Master)'],
      ['anneeLMDM', 'Année LMD (Master)'],
      ['universiteLMDM', 'Université LMD (Master)'],
    ],
  },
  {
    key: 'professional',
    label: 'Informations professionnelles',
    icon: Briefcase,
    fields: [
      ['registrationNumber', "N° d'inscription"],
      ['oathDate', 'Date de serment'],
      ['oathLocation', 'Lieu du serment'],
      ['professionalMode', "Mode d'exercice"],
      ['installationDate', "Date d'installation"],
      ['nif', 'NIF'],
      ['adressePro', 'Adresse professionnelle'],
      ['adresseProArabe', 'Adresse professionnelle (Arabe)'],
      ['benefitStateAid', "Aide d'État"],
      ['moyensHumains', 'Moyens humains'],
      ['gps', 'GPS (Localisation)'],
      ['recruitmentDate', 'Date de recrutement'],
      ['employerName', "Nom et prénom de l'employeur"],
      ['employerRegistrationNumber', "N° d'inscription de l'employeur"],
      ['employerAdresse', 'Adresse professionnelle (employeur)'],
      ['employerAdresseArabe', 'Adresse professionnelle (employeur, Arabe)'],
      ['employerCommune', 'Commune (employeur)'],
      ['employerWilaya', 'Wilaya (employeur)'],
    ],
  },
];

const RTL_FIELDS = new Set([
  'nomArabe',
  'prenomArabe',
  'prenomPereArabe',
  'nomPrenomMereArabe',
  'adressePersonnelleArabe',
  'adresseProArabe',
  'employerAdresseArabe',
]);

function formatReviewValue(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (fieldName === 'sexe') {
    if (value === 'M') return 'Masculin';
    if (value === 'F') return 'Féminin';
    return value;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }
  return String(value);
}

function LocationPicker({ value, onChange }) {
  const [position, setPosition] = useState(
    value ? value.split(',').map(Number) : [36.7538, 3.0588]
  );

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onChange(`${lat},${lng}`);
      },
    });
    return null;
  };

  return (
    <div className="space-y-2">
      <MapContainer center={position} zoom={13} style={{ height: '220px', width: '100%', borderRadius: '8px' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position} />
        <MapClickHandler />
      </MapContainer>
      <p className="text-xs text-[#64748B]">Cliquez sur la carte pour définir les coordonnées GPS.</p>
      {value && (
        <p className="text-xs text-emerald-400">GPS sélectionné : {value}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Review modal
// ─────────────────────────────────────────────────────────────────
function ReviewModal({ open, onBack, onConfirm, submitting, data, fileUploads, otherDiplomas, formations, associates }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0A0F1C]/85 backdrop-blur-sm overflow-y-auto p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-2xl shadow-black/60 my-6">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Eye className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-semibold text-[#F8FAFC] tracking-tight">
              Vérifiez vos informations
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Relisez attentivement chaque champ avant de confirmer votre inscription.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 md:px-8 py-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {REVIEW_SECTIONS.map((section) => {
            const Icon = section.icon;
            const visible = section.fields
              .map(([name, label]) => {
                const formatted = formatReviewValue(data[name], name);
                return formatted !== null ? { name, label, formatted } : null;
              })
              .filter(Boolean);

            if (visible.length === 0) return null;

            return (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                    {section.label}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {visible.map((f) => {
                    const isRtl = RTL_FIELDS.has(f.name);
                    return (
                      <div
                        key={f.name}
                        className="border-b border-[rgba(255,255,255,0.05)] pb-2"
                      >
                        <p className="text-[11px] uppercase tracking-wider text-[#64748B]">
                          {f.label}
                        </p>
                        <p
                          className={`text-sm text-[#F8FAFC] font-medium mt-0.5 ${
                            isRtl ? 'font-arabic text-right' : ''
                          }`}
                          dir={isRtl ? 'rtl' : 'ltr'}
                        >
                          {f.formatted}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Other diplomas */}
          {otherDiplomas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                Autres diplômes
              </h3>
              <ul className="space-y-1.5">
                {otherDiplomas.map((d, i) => (
                  <li key={i} className="text-sm text-[#F8FAFC] flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>
                      <span className="font-medium">{d.titre}</span>
                      {(d.etablissement || d.annee) && (
                        <span className="text-[#94A3B8]">
                          {' — '}
                          {[d.etablissement, d.annee].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formations */}
          {formations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                Formations
              </h3>
              <ul className="space-y-1.5">
                {formations.map((f, i) => (
                  <li key={i} className="text-sm text-[#F8FAFC] flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>
                      <span className="font-medium">{f.titre}</span>
                      {(f.etablissement || f.annee) && (
                        <span className="text-[#94A3B8]">
                          {' — '}
                          {[f.etablissement, f.annee].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Associates */}
          {associates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                Associés
              </h3>
              <ul className="space-y-1.5">
                {associates.map((a, i) => (
                  <li key={i} className="text-sm text-[#F8FAFC] flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>
                      <span className="font-medium">{a.name}</span>
                      {a.registrationNumber && (
                        <span className="text-[#94A3B8]"> — {a.registrationNumber}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Files */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3">
              Documents joints
            </h3>
            <ul className="space-y-1.5">
              {Object.entries(fileUploads)
                .filter(([, file]) => file instanceof File)
                .map(([key, file]) => {
                  const def = BASE_FILE_TYPES.find((t) => t.key === key);
                  return (
                    <li key={key} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>
                        <span className="text-[#94A3B8]">{def?.label || key} :</span>{' '}
                        <span className="text-[#F8FAFC]">{file.name}</span>
                      </span>
                    </li>
                  );
                })}
              {Object.values(fileUploads).filter((f) => f instanceof File).length === 0 && (
                <li className="text-sm text-[#64748B]">Aucun document joint.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer — actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 px-6 md:px-8 py-5 border-t border-[rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#CBD5E1] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour et modifier
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmer l'inscription
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FormulaireCNOA() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const { setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const maxDate = `${yyyy}-${mm}-${dd}`;

  const [formData, setFormData] = useState({
    region: "",
    nin: "", sexe: "", serviceNationalStatus: "",
    name: "", lastname: "", nomArabe: "", prenomArabe: "",
    dateOfBirth: "", lieuNaissance: "", numeroActeNaissance: "",
    adressePersonnelle: "", adressePersonnelleArabe: "", commune: "", wilaya: "",
    prenomPere: "", prenomPereArabe: "", nomPrenomMere: "", nomPrenomMereArabe: "",
    maritalStatus: "", nationality: "", enfants: "",
    fixe: "", phone: "", email: "",
    diplomaType: "",
    sessionClassique: "", anneeClassique: "", universiteClassique: "",
    sessionLMDL: "", anneeLMDL: "", universiteLMDL: "",
    sessionLMDM: "", anneeLMDM: "", universiteLMDM: "",
    registrationNumber: "", oathDate: "", oathLocation: "", professionalMode: "",
    installationDate: "", nif: "", adressePro: "", adresseProArabe: "",
    benefitStateAid: "", moyensHumains: "", gps: "",
    recruitmentDate: "", employerName: "", employerRegistrationNumber: "",
    employerAdresse: "", employerAdresseArabe: "", employerCommune: "", employerWilaya: "",
    password: "", secondPassword: "",
    role: "user", status: "pending", loi: false,
  });

  const [otherDiplomas, setOtherDiplomas] = useState([]);
  const [newDiploma, setNewDiploma] = useState({ titre: "", etablissement: "", annee: "" });
  const [diplomaFile, setDiplomaFile] = useState(null);

  const [formations, setFormations] = useState([]);
  const [newFormation, setNewFormation] = useState({ titre: "", etablissement: "", annee: "" });
  const [formationFile, setFormationFile] = useState(null);

  const [associates, setAssociates] = useState([]);
  const [newAssociate, setNewAssociate] = useState({ name: "", registrationNumber: "" });

  const [fileUploads, setFileUploads] = useState(
    BASE_FILE_TYPES.reduce((acc, ft) => ({ ...acc, [ft.key]: null }), {})
  );
  const [uploadingFileType, setUploadingFileType] = useState(null);

  const [invalidFields, setInvalidFields] = useState({});
  const [touched, setTouched] = useState({});

  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(formData.password) })),
    [formData.password],
  );
  const passwordValid = allPasswordRulesPass(formData.password);
  const passwordsMatch =
    formData.password.length > 0 &&
    formData.password === formData.secondPassword;
  const showPasswordMatchError =
    touched.secondPassword &&
    formData.secondPassword.length > 0 &&
    !passwordsMatch;

  const handleFileUploadForType = (typeKey, file) => {
    if (!file) return;
    setUploadingFileType(typeKey);
    setFileUploads(prev => ({ ...prev, [typeKey]: file }));
    setUploadingFileType(null);
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
    setList([...list, item]);
    setItem({ titre: "", etablissement: "", annee: "" });
    setFile(null);
  };

  const removeItem = (list, setList, index) => {
    setList(list.filter((_, i) => i !== index));
  };

  const addAssociate = () => {
    if (!newAssociate.name || !newAssociate.registrationNumber) {
      setMessage("Veuillez remplir le nom et le numéro d'inscription de l'associé.");
      setMessageType("error");
      return;
    }
    setAssociates([...associates, newAssociate]);
    setNewAssociate({ name: "", registrationNumber: "" });
  };

  const removeAssociate = (index) => {
    setAssociates(associates.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    if (name === 'nin' || name === 'nif' || name === 'fixe' || name === 'fax') {
      newValue = newValue.replace(/\D/g, '');
    }

    if (name === 'phone') {
      const startsWithPlus = typeof newValue === 'string' && newValue.startsWith('+');
      const digitsOnly = typeof newValue === 'string' ? newValue.replace(/\D/g, '') : '';
      newValue = startsWithPlus ? `+${digitsOnly}` : digitsOnly;
    }

    if (name === 'enfants') {
      newValue = typeof newValue === 'string' ? newValue.replace(/\D/g, '') : newValue;
      if (newValue !== '' && newValue !== undefined && newValue !== null) {
        const num = Math.max(0, Math.min(20, parseInt(newValue, 10)));
        newValue = isNaN(num) ? '' : String(num);
      }
    }

    setInvalidFields(prev => ({ ...prev, [name]: false }));
    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'maritalStatus' && newValue === 'Célibataire') {
        updated.enfants = "";
      }
      return updated;
    });
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const shouldShowField = (fieldName) => {
    const { sexe, professionalMode, maritalStatus, diplomaType } = formData;

    if (fieldName === 'serviceNationalStatus' && sexe === 'F') return false;
    if (fieldName === 'enfants' && maritalStatus === 'Célibataire') return false;

    const classiqueFields = ['sessionClassique', 'anneeClassique', 'universiteClassique'];
    const lmdFields = ['sessionLMDL', 'anneeLMDL', 'universiteLMDL', 'sessionLMDM', 'anneeLMDM', 'universiteLMDM'];
    if (classiqueFields.includes(fieldName)) return diplomaType === 'Classique';
    if (lmdFields.includes(fieldName)) return diplomaType === 'LMD';

    const isLiberal = professionalMode === 'Libéral' || professionalMode === 'Associé';
    const isSalarie = professionalMode === 'Salarié';
    const liberalFields = ['installationDate', 'nif', 'adressePro', 'adresseProArabe', 'benefitStateAid', 'moyensHumains', 'gps'];
    const salarieFields = ['recruitmentDate', 'employerName', 'employerRegistrationNumber', 'employerAdresse', 'employerAdresseArabe', 'employerCommune', 'employerWilaya'];
    if (liberalFields.includes(fieldName)) return isLiberal;
    if (salarieFields.includes(fieldName)) return isSalarie;

    return true;
  };

  const isFieldRequired = (fieldName) =>
    shouldShowField(fieldName) && !OPTIONAL_FIELDS.includes(fieldName);

  const getServiceNationalOptions = () => {
    if (formData.sexe === 'F') return [];
    return [
      { value: 'Ayant effectué', label: 'Ayant effectué' },
      { value: 'Exempté', label: 'Exempté' },
      { value: 'En cours', label: 'En cours' },
      { value: 'Non concerné', label: 'Non concerné' }
    ];
  };

  const getFieldErrorMessage = (name) => {
    if (name === 'nin') return "Le NIN doit comporter exactement 18 chiffres.";
    if (name === 'registrationNumber') return "Format invalide (ex. 12345/16/24L).";
    if (name === 'secondPassword') return "Les mots de passe ne correspondent pas.";
    if (name === 'password') return "Le mot de passe ne respecte pas les règles ci-dessous.";
    if (name === 'associatesList') return "Veuillez ajouter au moins un associé.";
    if (name === 'files') return "Certains documents obligatoires sont manquants.";
    return "Ce champ est obligatoire.";
  };

  const buildValidationMessage = (fieldErrors, missingFiles) => {
    if (missingFiles.length > 0) {
      return `Veuillez joindre tous les documents obligatoires : ${missingFiles.map(ft => ft.label).join(', ')}`;
    }
    if (fieldErrors.password) {
      const failing = passwordRuleResults.filter(r => !r.passed).map(r => r.label.toLowerCase());
      if (failing.length > 0) return `Le mot de passe doit respecter : ${failing.join(' • ')}`;
    }
    if (fieldErrors.secondPassword) return "Les mots de passe ne correspondent pas.";
    if (fieldErrors.nin) return "Le NIN doit comporter exactement 18 chiffres.";
    if (fieldErrors.registrationNumber) return "Format du numéro d'inscription invalide (ex: 12345/16/24L).";
    if (fieldErrors.associatesList) return "Veuillez ajouter au moins un associé dans la liste pour le mode Associé.";
    return "Veuillez remplir tous les champs obligatoires en rouge.";
  };

  const renderField = (label, name, type = "text", options = null, _legacyRequired = false, placeholder = "", icon = null) => {
    if (!shouldShowField(name)) return null;
    const required = isFieldRequired(name);
    const isArabicField = name.includes('Arabe') || name.includes('arab');
    const isSelect = type === "select";
    const isDate = type === "date";
    const isPassword = type === "password";
    const isTextarea = type === "textarea";
    const isInvalid = invalidFields[name];

    const baseInputClass = `w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-200 ${isInvalid ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500 hover:border-[rgba(255,255,255,0.12)]'}`;

    return (
      <div key={name} className="space-y-1.5" data-field-name={name}>
        <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
          <span className={required ? "text-[#CBD5E1]" : "text-[#94A3B8]"}>
            {icon && <span className="inline-block mr-1.5">{icon}</span>}
            {label}
            {required && <span className="text-rose-400 ml-1 font-bold">*</span>}
          </span>
          {!required && (
            <span className="text-[10px] font-semibold normal-case tracking-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
              optionnel
            </span>
          )}
        </label>
        {isSelect ? (
          <select name={name} value={formData[name] || ""} onChange={handleChange} className={baseInputClass}>
            <option value="">Sélectionnez</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea name={name} placeholder={placeholder} value={formData[name] || ""} onChange={handleChange} rows="3" className={`${baseInputClass} resize-y`} />
        ) : isDate ? (
          <input type="date" name={name} min="1900-01-01" max={maxDate} value={formData[name] || ""} onChange={handleChange} className={baseInputClass} />
        ) : isPassword ? (
          <input type="password" name={name} placeholder={placeholder} value={formData[name] || ""} onChange={handleChange} onBlur={handleBlur} className={baseInputClass} />
        ) : (
          <div className="relative">
            <input
              type={type}
              name={name}
              min={name === 'enfants' || type === 'number' ? "0" : undefined}
              max={name === 'enfants' ? "20" : undefined}
              placeholder={placeholder}
              value={formData[name] || ""}
              onChange={handleChange}
              onKeyDown={name === 'enfants' ? (e) => {
                if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
              } : undefined}
              maxLength={name === 'nin' ? 18 : undefined}
              className={`${baseInputClass} ${name === 'nin' ? 'pr-20' : ''} ${isArabicField ? 'text-right font-arabic' : ''}`}
              dir={isArabicField ? 'rtl' : 'ltr'}
            />
            {name === 'nin' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold transition-all duration-200 ${
                  (formData.nin?.length || 0) === 18
                    ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                    : (formData.nin?.length || 0) > 0
                      ? 'text-amber-400 bg-amber-500/20 border border-amber-500/30'
                      : 'text-[#64748B] bg-[#1E293B] border border-[rgba(255,255,255,0.06)]'
                }`}>
                  {formData.nin?.length || 0}/18
                </span>
              </div>
            )}
          </div>
        )}
        {isInvalid && (
          <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {getFieldErrorMessage(name)}
          </p>
        )}
      </div>
    );
  };

  const validateAndScroll = () => {
    const invalid = {};

    for (const name of ALL_FORM_FIELDS) {
      if (HIDDEN_FIELDS.includes(name)) continue;
      if (!shouldShowField(name)) continue;
      if (OPTIONAL_FIELDS.includes(name)) continue;
      const value = formData[name];
      if (value === '' || value === null || value === undefined) {
        invalid[name] = true;
      }
    }

    if (formData.registrationNumber && !REGISTRATION_NUMBER_REGEX.test(formData.registrationNumber)) {
      invalid.registrationNumber = true;
    }
    if (formData.nin && !NIN_REGEX.test(formData.nin)) {
      invalid.nin = true;
    }
    if (!passwordValid) {
      invalid.password = true;
    }
    if (formData.password !== formData.secondPassword) {
      invalid.secondPassword = true;
    }
    if (formData.professionalMode === 'Associé' && associates.length === 0) {
      invalid['associatesList'] = true;
    }

    const visibleFileTypes = getVisibleFileTypes();
    const missingFiles = visibleFileTypes.filter(
      (ft) => ft.required && (!fileUploads[ft.key] || !(fileUploads[ft.key] instanceof File))
    );

    if (missingFiles.length > 0) {
      invalid.files = true;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[signup validation] invalid fields:', Object.keys(invalid));
    }

    setInvalidFields(invalid);

    if (missingFiles.length > 0) {
      const el = document.querySelector('[data-field-name="filesGrid"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return { ok: false, invalid, missingFiles };
    }

    const firstInvalid = Object.keys(invalid)[0];
    if (firstInvalid) {
      const el = document.querySelector(`[data-field-name="${firstInvalid}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return { ok: false, invalid, missingFiles: [] };
    }

    return { ok: true, invalid, missingFiles: [] };
  };

  // ─── Step 1: validate, then open the review modal ─────────────────
  const handleReview = (e) => {
    e.preventDefault();

    const { ok, invalid, missingFiles } = validateAndScroll();
    if (!ok) {
      setMessage(buildValidationMessage(invalid, missingFiles));
      setMessageType("error");
      return;
    }

    if (!formData.loi) {
      setMessage("Vous devez accepter la déclaration légale pour continuer.");
      setMessageType("error");
      return;
    }

    setMessage("");
    setMessageType("");
    setShowReview(true);
  };

  // ─── Step 2: the actual submit, called from the modal ─────────────
  const submitForm = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const form = new FormData();
      const { secondPassword, ...dataToSend } = formData;
      Object.keys(dataToSend).forEach(key => {
        const value = dataToSend[key];
        if (value !== undefined && value !== null && value !== '') {
          form.append(key, String(value));
        }
      });

      const ALWAYS_SEND = [
        'region', 'nin', 'name', 'lastname', 'nomArabe', 'prenomArabe',
        'email', 'phone', 'fixe', 'dateOfBirth', 'lieuNaissance', 'sexe',
        'prenomPere', 'prenomPereArabe', 'nomPrenomMere', 'nomPrenomMereArabe',
        'maritalStatus', 'nationality', 'registrationNumber', 'professionalMode',
        'oathLocation', 'oathDate', 'diplomaType', 'wilaya', 'commune',
        'adressePersonnelle', 'adressePersonnelleArabe', 'numeroActeNaissance',
        'password',
      ];
      for (const key of ALWAYS_SEND) {
        if (!form.has(key)) form.append(key, formData[key] ?? '');
      }

      form.append('otherDiplomas', JSON.stringify(otherDiplomas));
      form.append('formations', JSON.stringify(formations));
      form.append('associates', JSON.stringify(associates));

      Object.keys(fileUploads).forEach(key => {
        const file = fileUploads[key];
        if (file && file instanceof File) {
          form.append(`files[${key}]`, file, file.name);
        }
      });

      const response = await fetch(`${NEST_API_URL}/auth/signup`, {
        method: "POST",
        body: form,
      });

      const data = await response.json();
      if (response.ok) {
        const user = data?.data?.user || data.user;
        if (!user) {
          setShowReview(false);
          setMessage('Réponse serveur incorrecte');
          setMessageType('error');
          return;
        }
        setShowReview(false);
        setMessage('Inscription réussie ! Vérification en cours...');
        setMessageType('success');
        setTimeout(() => navigate('/verify-pending'), 2000);
      } else {
        setShowReview(false);
        setMessage(data.message || "Erreur lors de l'inscription");
        setMessageType('error');
      }
    } catch (err) {
      console.error("Signup error:", err);
      setShowReview(false);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const getVisibleFileTypes = () => {
    const mode = formData.professionalMode;
    let allowed = [...ALLOWED_FILE_TYPES.common];
    if (mode === 'Libéral') {
      allowed = [...allowed, ...ALLOWED_FILE_TYPES.liberal];
    } else if (mode === 'Associé') {
      allowed = [...allowed, ...ALLOWED_FILE_TYPES.associe];
    } else if (mode === 'Salarié') {
      allowed = [...allowed, ...ALLOWED_FILE_TYPES.salarie];
    }
    return BASE_FILE_TYPES.filter(ft => allowed.includes(ft.key));
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img src={cnoaLogo} alt="CNOA Logo" className="w-24 h-24 object-contain mb-2" />
          <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight text-center">Ordre National des Architectes</h1>
          <h3 className="text-3xl font-bold text-[#F8FAFC] tracking-tight text-center">Déclaration 2027</h3>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            <form ref={formRef} className="space-y-10" onSubmit={handleReview}>

              {/* 0. CLOA d'exercice */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">CLOA d'exercice</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {renderField("CLOA d'exercice", "region", "select", WILAYAS.map(w => ({ value: w, label: w })), true, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                </div>
              </div>

              {/* 1. Informations Personnelles */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Informations Personnelles</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("NIN", "nin", "text", null, true, "Numéro d'identité nationale", <Shield className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Civilité", "sexe", "select", [{ value: "M", label: "Masculin" }, { value: "F", label: "Féminin" }], true, "", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Service national", "serviceNationalStatus", "select", getServiceNationalOptions(), true, "", <Shield className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Nom", "name", "text", null, true, "Votre nom", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Prénom", "lastname", "text", null, true, "Votre prénom", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Nom (Arabe)", "nomArabe", "text", null, true, "الاسم", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Prénom (Arabe)", "prenomArabe", "text", null, true, "اللقب", <User className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Date de naissance", "dateOfBirth", "date", null, true, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Lieu de naissance", "lieuNaissance", "text", null, true, "Ville de naissance", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("N° acte de naissance", "numeroActeNaissance", "text", null, true, "Numéro d'acte", <FileText className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Adresse personnelle", "adressePersonnelle", "text", null, true, "Adresse", <Home className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Adresse personnelle (Arabe)", "adressePersonnelleArabe", "text", null, true, "العنوان الشخصي", <Home className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Commune de résidence", "commune", "text", null, true, "Commune", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Wilaya De résidence", "wilaya", "select", WILAYAS.map(w => ({ value: w, label: w })), true, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                   {renderField("Situation familiale", "maritalStatus", "select", [
                    { value: "Célibataire", label: "Célibataire" },
                    { value: "Marié(e)", label: "Marié(e)" },
                    { value: "Divorcé(e)", label: "Divorcé(e)" },
                    { value: "Veuf(ve)", label: "Veuf(ve)" }
                  ], true)}
                  {renderField("Nombre d'enfants", "enfants", "number", null, false, "0")}
                </div>
              </div>

              {/* 2. Informations Familiales */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Home className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Informations Familiales</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Prénom du père", "prenomPere", "text", null, true, "Prénom du père")}
                  {renderField("Prénom du père (Arabe)", "prenomPereArabe", "text", null, true, "اسم الأب")}
                  {renderField("Nom et prénom de la mère", "nomPrenomMere", "text", null, true, "Nom et prénom de la mère")}
                  {renderField("Nom et prénom de la mère (Arabe)", "nomPrenomMereArabe", "text", null, true, "اسم الأم")}
                  {renderField("Nationalité", "nationality", "text", null, true, "Algérienne")}

                </div>
              </div>

              {/* 3. Contact */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Contact</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("Téléphone fixe", "fixe", "text", null, true, "023 45 67 89", <Phone className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Téléphone mobile", "phone", "text", null, true, "0555 55 55 55", <Phone className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Email", "email", "email", null, true, "exemple@elmi3mari.dz", <Mail className="w-4 h-4 text-emerald-400" />)}
                </div>
              </div>

              {/* 4. Diplômes universitaires */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Diplômes universitaires</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1">
                    <div className="space-y-1.5" data-field-name="diplomaType">
                      <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">
                        Type de diplôme <span className="text-rose-400 ml-1 font-bold">*</span>
                      </label>
                      <select
                        name="diplomaType"
                        value={formData.diplomaType || ""}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.diplomaType ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`}
                      >
                        <option value="">Sélectionnez</option>
                        <option value="Classique">Classique</option>
                        <option value="LMD">LMD</option>
                      </select>
                      {invalidFields.diplomaType && (
                        <p className="text-xs text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.
                        </p>
                      )}
                    </div>
                  </div>

                  {formData.diplomaType === 'Classique' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-1.5" data-field-name="sessionClassique">
                        <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Session Classique <span className="text-rose-400 ml-1 font-bold">*</span></label>
                        <select name="sessionClassique" value={formData.sessionClassique || ""} onChange={handleChange} className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.sessionClassique ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`}>
                          <option value="">Sélectionnez</option>
                          <option value="Juin">Juin</option>
                          <option value="Juillet">Juillet</option>
                          <option value="Septembre">Septembre</option>
                        </select>
                        {invalidFields.sessionClassique && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                      </div>
                      <div className="space-y-1.5" data-field-name="anneeClassique">
                        <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Année Classique <span className="text-rose-400 ml-1 font-bold">*</span></label>
                        <input type="text" name="anneeClassique" value={formData.anneeClassique || ""} onChange={handleChange} placeholder="Année" className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.anneeClassique ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`} />
                        {invalidFields.anneeClassique && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                      </div>
                      <div className="space-y-1.5" data-field-name="universiteClassique">
                        <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Université Classique <span className="text-rose-400 ml-1 font-bold">*</span></label>
                        <input type="text" name="universiteClassique" value={formData.universiteClassique || ""} onChange={handleChange} placeholder="Université" className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.universiteClassique ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`} />
                        {invalidFields.universiteClassique && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                      </div>
                    </div>
                  )}

                  {formData.diplomaType === 'LMD' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Licence</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="space-y-1.5" data-field-name="sessionLMDL">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Session LMD (Licence) <span className="text-rose-400 ml-1 font-bold">*</span></label>
                            <select name="sessionLMDL" value={formData.sessionLMDL || ""} onChange={handleChange} className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.sessionLMDL ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`}>
                              <option value="">Sélectionnez</option>
                              <option value="Juin">Juin</option>
                              <option value="Septembre">Septembre</option>
                              <option value="Décembre">Décembre</option>
                            </select>
                            {invalidFields.sessionLMDL && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                          </div>
                          <div className="space-y-1.5" data-field-name="anneeLMDL">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Année LMD (Licence) <span className="text-rose-400 ml-1 font-bold">*</span></label>
                            <input type="text" name="anneeLMDL" value={formData.anneeLMDL || ""} onChange={handleChange} placeholder="Année" className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.anneeLMDL ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`} />
                            {invalidFields.anneeLMDL && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                          </div>
                          <div className="space-y-1.5" data-field-name="universiteLMDL">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Université LMD (Licence) <span className="text-rose-400 ml-1 font-bold">*</span></label>
                            <input type="text" name="universiteLMDL" value={formData.universiteLMDL || ""} onChange={handleChange} placeholder="Université" className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.universiteLMDL ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`} />
                            {invalidFields.universiteLMDL && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Master</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="space-y-1.5" data-field-name="sessionLMDM">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Session LMD (Master) <span className="text-rose-400 ml-1 font-bold">*</span></label>
                            <select name="sessionLMDM" value={formData.sessionLMDM || ""} onChange={handleChange} className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.sessionLMDM ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`}>
                              <option value="">Sélectionnez</option>
                              <option value="Juin">Juin</option>
                              <option value="Septembre">Septembre</option>
                              <option value="Décembre">Décembre</option>
                            </select>
                            {invalidFields.sessionLMDM && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                          </div>
                          <div className="space-y-1.5" data-field-name="anneeLMDM">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Année LMD (Master) <span className="text-rose-400 ml-1 font-bold">*</span></label>
                            <input type="text" name="anneeLMDM" value={formData.anneeLMDM || ""} onChange={handleChange} placeholder="Année" className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.anneeLMDM ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`} />
                            {invalidFields.anneeLMDM && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                          </div>
                          <div className="space-y-1.5" data-field-name="universiteLMDM">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">Université LMD (Master) <span className="text-rose-400 ml-1 font-bold">*</span></label>
                            <input type="text" name="universiteLMDM" value={formData.universiteLMDM || ""} onChange={handleChange} placeholder="Université" className={`w-full px-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${invalidFields.universiteLMDM ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500'}`} />
                            {invalidFields.universiteLMDM && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Autres diplômes — optional */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Autres diplômes</h3>
                  <span className="text-[10px] font-semibold normal-case tracking-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md ml-auto">optionnel</span>
                </div>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Titre</label>
                    <input type="text" value={newDiploma.titre} onChange={(e) => setNewDiploma({ ...newDiploma, titre: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Établissement</label>
                    <input type="text" value={newDiploma.etablissement} onChange={(e) => setNewDiploma({ ...newDiploma, etablissement: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs text-[#64748B]">Année</label>
                    <input type="text" value={newDiploma.annee} onChange={(e) => setNewDiploma({ ...newDiploma, annee: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <button type="button" onClick={() => addItem(otherDiplomas, setOtherDiplomas, newDiploma, setNewDiploma, diplomaFile, setDiplomaFile)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1">
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
                        </div>
                        <button type="button" onClick={() => removeItem(otherDiplomas, setOtherDiplomas, idx)} className="text-rose-400 hover:text-rose-300 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Formations — optional */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Formations</h3>
                  <span className="text-[10px] font-semibold normal-case tracking-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md ml-auto">optionnel</span>
                </div>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Titre</label>
                    <input type="text" value={newFormation.titre} onChange={(e) => setNewFormation({ ...newFormation, titre: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#64748B]">Établissement</label>
                    <input type="text" value={newFormation.etablissement} onChange={(e) => setNewFormation({ ...newFormation, etablissement: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs text-[#64748B]">Année</label>
                    <input type="text" value={newFormation.annee} onChange={(e) => setNewFormation({ ...newFormation, annee: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <button type="button" onClick={() => addItem(formations, setFormations, newFormation, setNewFormation, formationFile, setFormationFile)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1">
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
                        </div>
                        <button type="button" onClick={() => removeItem(formations, setFormations, idx)} className="text-rose-400 hover:text-rose-300 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Informations professionnelles */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Informations professionnelles</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderField("N° d'inscription", "registrationNumber", "text", null, true, "NNNNN/NN/NNL", <BookOpen className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Date de serment", "oathDate", "date", null, true, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Lieu du serment", "oathLocation", "text", null, true, "Lieu du serment", <MapPin className="w-4 h-4 text-emerald-400" />)}
                  {renderField("Mode d'exercice", "professionalMode", "select", [
                    { value: "Libéral", label: "Libéral" },
                    { value: "Associé", label: "Associé" },
                    { value: "Salarié", label: "Salarié" }
                  ], true, "", <Briefcase className="w-4 h-4 text-emerald-400" />)}
                </div>

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
                          {renderField("Date d'installation", "installationDate", "date", null, true, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                          {renderField("NIF", "nif", "text", null, true, "Numéro d'identification fiscale", <FileText className="w-4 h-4 text-emerald-400" />)}
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle", "adressePro", "text", null, true, "Adresse pro.", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle (Arabe)", "adresseProArabe", "text", null, true, "العنوان المهني", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          {renderField("Aide d'État", "benefitStateAid", "select", [
                            { value: "ANSEJ/NESDA", label: "ANSEJ/NESDA" },
                            { value: "ANDI/AAPI", label: "ANDI / AAPI" },
                            { value: "Non", label: "Non" }
                          ], true)}
                          {renderField("Moyens humains", "moyensHumains", "text", null, true, "Moyens humains", <Users className="w-4 h-4 text-emerald-400" />)}
                          <div className="sm:col-span-2 lg:col-span-3" data-field-name="gps">
                            <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider mb-1">
                              GPS (Localisation) <span className="text-rose-400 ml-1 font-bold">*</span>
                            </label>
                            <LocationPicker
                              value={formData.gps}
                              onChange={(coords) => {
                                setFormData((prev) => ({ ...prev, gps: coords }));
                                setInvalidFields((prev) => ({ ...prev, gps: false }));
                              }}
                            />
                            {invalidFields.gps && (
                              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Ce champ est obligatoire.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      {formData.professionalMode === 'Associé' && (
                        <div className="sm:col-span-2 lg:col-span-3" data-field-name="associatesList">
                          <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider mb-2">
                            Liste des associés <span className="text-rose-400 ml-1 font-bold">*</span>
                          </label>
                          <div className="space-y-2 mb-4">
                            {associates.map((assoc, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-[#111827] p-3 rounded-lg border border-[rgba(255,255,255,0.06)]">
                                <div>
                                  <span className="text-[#F8FAFC] font-medium">{assoc.name}</span>
                                  <span className="text-[#94A3B8] text-sm ml-2">({assoc.registrationNumber})</span>
                                </div>
                                <button type="button" onClick={() => removeAssociate(idx)} className="text-rose-400 hover:text-rose-300">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs text-[#64748B]">Nom et prénom de l'associé</label>
                              <input type="text" value={newAssociate.name} onChange={(e) => setNewAssociate({ ...newAssociate, name: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs text-[#64748B]">N° d'inscription</label>
                              <input type="text" value={newAssociate.registrationNumber} onChange={(e) => setNewAssociate({ ...newAssociate, registrationNumber: e.target.value })} className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-2 focus:ring-emerald-500/50" />
                            </div>
                            <button type="button" onClick={addAssociate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1">
                              <Plus className="w-4 h-4" /> Ajouter
                            </button>
                          </div>
                          {invalidFields.associatesList && (
                            <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Veuillez ajouter au moins un associé.
                            </p>
                          )}
                        </div>
                      )}
                      {formData.professionalMode === 'Salarié' && (
                        <>
                          {renderField("Date de recrutement", "recruitmentDate", "date", null, true, "", <Calendar className="w-4 h-4 text-emerald-400" />)}
                          {renderField("Nom et prénom de l'employeur", "employerName", "text", null, true, "Employeur", <User className="w-4 h-4 text-emerald-400" />)}
                          {renderField("N° d'inscription de l'employeur", "employerRegistrationNumber", "text", null, true, "N° inscription", <BookOpen className="w-4 h-4 text-emerald-400" />)}
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle", "employerAdresse", "text", null, true, "Adresse", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            {renderField("Adresse professionnelle (Arabe)", "employerAdresseArabe", "text", null, true, "العنوان المهني", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          </div>
                          {renderField("Commune", "employerCommune", "text", null, true, "Commune", <MapPin className="w-4 h-4 text-emerald-400" />)}
                          {renderField("Wilaya", "employerWilaya", "select", WILAYAS.map(w => ({ value: w, label: w })), true, "", <MapPin className="w-4 h-4 text-emerald-400" />)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 8. Documents obligatoires */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]" data-field-name="filesGrid">
                <div className="flex items-center gap-3 mb-6">
                  <Paperclip className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Documents obligatoires</h3>
                  <span className="text-xs text-[#94A3B8] ml-auto">Format accepté : PDF uniquement</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getVisibleFileTypes().map((ft) => {
                    const isMissing = invalidFields.files && ft.required && (!fileUploads[ft.key] || !(fileUploads[ft.key] instanceof File));
                    return (
                      <div
                        key={ft.key}
                        className={`bg-[#111827] p-3 rounded-xl border ${isMissing ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[rgba(255,255,255,0.06)]'}`}
                      >
                        <label className="flex items-center justify-between text-xs font-medium uppercase tracking-wider mb-1">
                          <span className={ft.required ? "text-[#CBD5E1]" : "text-[#94A3B8]"}>
                            {ft.label}
                            {ft.required && <span className="text-rose-400 ml-1 font-bold">*</span>}
                          </span>
                          {!ft.required && (
                            <span className="text-[10px] font-semibold normal-case tracking-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              optionnel
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-2">
                          {fileUploads[ft.key] ? (
                            <>
                              <span className="text-sm text-[#F8FAFC] truncate flex-1">{fileUploads[ft.key].name}</span>
                              <button type="button" onClick={() => removeFileForType(ft.key)} className="text-rose-400 hover:text-rose-300">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                id={`file-${ft.key}`}
                                accept=".pdf,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                      setMessage(`Le fichier "${file.name}" n'est pas un PDF. Veuillez sélectionner un fichier PDF.`);
                                      setMessageType('error');
                                      e.target.value = null;
                                      return;
                                    }
                                    handleFileUploadForType(ft.key, file);
                                    setInvalidFields(prev => ({ ...prev, files: false }));
                                  }
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
                                <span className="text-xs text-[#64748B] mt-1 block">PDF uniquement</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {invalidFields.files && (
                  <p className="text-xs text-rose-400 mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Des documents obligatoires sont manquants (bordure rouge).
                  </p>
                )}
              </div>

              {/* 9. Sécurité */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Sécurité</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5" data-field-name="password">
                    <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">
                      Mot de passe <span className="text-rose-400 ml-1 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <input
                        type="password"
                        name="password"
                        placeholder="Minimum 8 caractères"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-9 pr-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 transition-all ${invalidFields.password ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500 focus:ring-emerald-500/50'}`}
                      />
                    </div>
                    {formData.password.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {passwordRuleResults.map((r) => (
                          <li
                            key={r.key}
                            className={`flex items-center gap-1.5 ${r.passed ? "text-emerald-400" : "text-[#64748B]"}`}
                          >
                            {r.passed ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0" />}
                            {r.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    {invalidFields.password && (
                      <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldErrorMessage('password')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5" data-field-name="secondPassword">
                    <label className="block text-xs font-medium text-[#CBD5E1] uppercase tracking-wider">
                      Confirmer le mot de passe <span className="text-rose-400 ml-1 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <input
                        type="password"
                        name="secondPassword"
                        placeholder="Confirmez"
                        value={formData.secondPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-9 pr-4 py-2.5 bg-[#111827] text-[#F8FAFC] border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          (invalidFields.secondPassword || showPasswordMatchError)
                            ? 'border-rose-500 ring-2 ring-rose-500/50'
                            : 'border-[rgba(255,255,255,0.06)] focus:border-emerald-500 focus:ring-emerald-500/50'
                        }`}
                      />
                    </div>
                    {showPasswordMatchError && (
                      <p className="text-xs text-rose-400 mt-1">Les mots de passe ne correspondent pas.</p>
                    )}
                    {!showPasswordMatchError && invalidFields.secondPassword && (
                      <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldErrorMessage('secondPassword')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 10. Déclaration légale */}
              <div className="bg-[#182233] rounded-xl p-6 border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="w-5 h-5 text-emerald-400 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">Déclaration légale</h3>
                    <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
                      Je déclare vouloir exercer la profession d'architecte pour l'année 2027,<br />
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

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading || !formData.loi}
                  className={`w-full py-4 text-lg font-semibold text-white bg-emerald-500 hover:bg-emerald-600 
                    rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 
                    transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                    ${(isLoading || !formData.loi) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                >
                  <span className="flex items-center justify-center gap-3">
                    <Eye className="w-6 h-6" />
                    Vérifier avant d'envoyer
                  </span>
                </button>
              </div>

            </form>

            {message && (
              <div className={`mt-6 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2 ${messageType === 'error'
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
          <p className="text-m mt-2">
            Vous avez déjà un compte ? <a href="/" className="text-emerald-400 hover:underline font-medium">Se connecter</a>
          </p>
        </div>
      </div>

      {/* Review modal */}
      <ReviewModal
        open={showReview}
        onBack={() => setShowReview(false)}
        onConfirm={submitForm}
        submitting={isLoading}
        data={formData}
        fileUploads={fileUploads}
        otherDiplomas={otherDiplomas}
        formations={formations}
        associates={associates}
      />
    </div>
  );
}