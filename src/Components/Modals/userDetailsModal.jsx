import { useEffect, useRef, useState, useContext } from 'react';
import { IoClose } from 'react-icons/io5';
import { UserContext } from '../../Context/dataCont';
import { fetchWithRefresh } from '../../Components/api';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
const IS_DEV = import.meta.env.DEV;

// ─── Wilaya mapping ───────────────────────────────────────────────
const WILAYA_NAMES = {
  "01": "Adrar", "02": "Chlef", "03": "Laghouat", "04": "Oum El Bouaghi",
  "05": "Batna", "06": "Béjaïa", "07": "Biskra", "08": "Béchar",
  "09": "Blida", "10": "Bouira", "11": "Tamanrasset", "12": "Tébessa",
  "13": "Tlemcen", "14": "Tiaret", "15": "Tizi Ouzou", "16": "Alger",
  "17": "Djelfa", "18": "Jijel", "19": "Sétif", "20": "Saïda",
  "21": "Skikda", "22": "Sidi Bel Abbès", "23": "Annaba", "24": "Guelma",
  "25": "Constantine", "26": "Médéa", "27": "Mostaganem", "28": "M'Sila",
  "29": "Mascara", "30": "Ouargla", "31": "Oran", "32": "El Bayadh",
  "33": "Illizi", "34": "Bordj Bou Arréridj", "35": "Boumerdès", "36": "El Tarf",
  "37": "Tindouf", "38": "Tissemsilt", "39": "El Oued", "40": "Khenchela",
  "41": "Souk Ahras", "42": "Tipaza", "43": "Mila", "44": "Aïn Defla",
  "45": "Naâma", "46": "Aïn Témouchent", "47": "Ghardaïa", "48": "Relizane",
  "49": "El M'ghair", "50": "El Meniaa", "51": "Ouled Djellal",
  "52": "Bordj Badji Mokhtar", "53": "Béni Abbès", "54": "Timimoun",
  "55": "Touggourt", "56": "Djanet", "57": "El M'ghair", "58": "El Meniaa"
};

// ─── Field labels ─────────────────────────────────────────────────
const FIELD_LABELS = {
  region: 'CLOA d\'exercice',
  nin: 'NIN',
  sexe: 'Civilité',
  serviceNationalStatus: 'Service national',
  name: 'Nom',
  lastname: 'Prénom',
  nomArabe: 'Nom (Arabe)',
  prenomArabe: 'Prénom (Arabe)',
  dateOfBirth: 'Date de naissance',
  lieuNaissance: 'Lieu de naissance',
  numeroActeNaissance: 'N° acte de naissance',
  adressePersonnelle: 'Adresse personnelle',
  commune: 'Commune',
  wilaya: 'Wilaya',
  prenomPere: 'Prénom du père',
  prenomPereArabe: 'Prénom du père (Arabe)',
  nomPrenomMere: 'Nom et prénom de la mère',
  nomPrenomMereArabe: 'Nom et prénom de la mère (Arabe)',
  maritalStatus: 'Situation familiale',
  enfants: 'Nombre d\'enfants',
  fixe: 'Téléphone fixe',
  phone: 'Téléphone mobile',
  email: 'Email personnel',
  emailPro: 'Email professionnelle',
  diplomaType: 'Type de diplôme',
  sessionClassique: 'Session Classique',
  anneeClassique: 'Année Classique',
  universiteClassique: 'Université Classique',
  sessionLMDL: 'Session LMD (Licence)',
  anneeLMDL: 'Année LMD (Licence)',
  universiteLMDL: 'Université LMD (Licence)',
  sessionLMDM: 'Session LMD (Master)',
  anneeLMDM: 'Année LMD (Master)',
  universiteLMDM: 'Université LMD (Master)',
  otherDiplomas: 'Autres diplômes',
  formations: 'Formations',
  registrationNumber: 'N° d\'inscription',
  oathDate: 'Date de serment',
  oathLocation: 'Lieu du serment',
  professionalMode: 'Mode d\'exercice',
  installationDate: 'Date d\'installation',
  nif: 'NIF',
  adressePro: 'Adresse professionnelle',
  adresseProArabe: 'Adresse professionnelle (Arabe)',
  communePro: 'Commune (Pro)',
  wilayaPro: 'Wilaya (Pro)',
  benefitStateAid: 'Aide d\'État',
  moyensHumains: 'Moyens humains',
  associateName: 'Nom et prénom de l\'associé',
  associateRegistrationNumber: 'N° d\'inscription de l\'associé',
  recruitmentDate: 'Date de recrutement',
  employerName: 'Nom et prénom de l\'employeur',
  employerRegistrationNumber: 'N° d\'inscription de l\'employeur',
  employerAdresse: 'Adresse professionnelle (employeur)',
  employerAdresseArabe: 'Adresse professionnelle (employeur, Arabe)',
  employerCommune: 'Commune (employeur)',
  employerWilaya: 'Wilaya (employeur)',
};

const SECTIONS = [
  { id: 'cloa', label: 'CLOA d\'exercice', fields: ['region'] },
  {
    id: 'personal',
    label: 'Informations Personnelles',
    fields: [
      'nin', 'sexe', 'serviceNationalStatus', 'name', 'lastname',
      'nomArabe', 'prenomArabe', 'dateOfBirth', 'lieuNaissance',
      'numeroActeNaissance', 'adressePersonnelle', 'commune', 'wilaya'
    ]
  },
  {
    id: 'family',
    label: 'Informations Familiales',
    fields: [
      'prenomPere', 'prenomPereArabe', 'nomPrenomMere', 'nomPrenomMereArabe',
      'maritalStatus', 'enfants'
    ]
  },
  { id: 'contact', label: 'Contact', fields: ['fixe', 'phone', 'email', 'emailPro'] },
  {
    id: 'university',
    label: 'Diplômes universitaires',
    fields: [
      'diplomaType', 'sessionClassique', 'anneeClassique', 'universiteClassique',
      'sessionLMDL', 'anneeLMDL', 'universiteLMDL',
      'sessionLMDM', 'anneeLMDM', 'universiteLMDM'
    ]
  },
  { id: 'otherDiplomas', label: 'Autres diplômes', fields: ['otherDiplomas'] },
  { id: 'formations', label: 'Formations', fields: ['formations'] },
  {
    id: 'professional',
    label: 'Informations professionnelles',
    fields: [
      'registrationNumber', 'oathDate', 'oathLocation', 'professionalMode',
      'installationDate', 'nif', 'adressePro', 'adresseProArabe',
      'communePro', 'wilayaPro', 'benefitStateAid', 'moyensHumains',
      'associateName', 'associateRegistrationNumber',
      'recruitmentDate', 'employerName', 'employerRegistrationNumber',
      'employerAdresse', 'employerAdresseArabe', 'employerCommune', 'employerWilaya'
    ]
  }
];

// ─── Formatters ───────────────────────────────────────────────────
const formatSexe = (v) => (v === 'M' ? 'Homme' : v === 'F' ? 'Femme' : v || '-');
const formatProfessionalMode = (v) => (v === 'L' ? 'Libéral' : v === 'A' ? 'Associé' : v === 'S' ? 'Salarié' : v || '-');
const formatDiplomaType = (v) => (v === 'C' ? 'Classique' : v === 'L' ? 'LMD' : v || '-');

const formatWilaya = (value) => {
  if (!value) return '-';
  if (value.includes(' - ')) {
    const parts = value.split(' - ');
    return parts.length > 1 ? parts[1] : value;
  }
  const trimmed = String(value).trim().padStart(2, '0');
  return WILAYA_NAMES[trimmed] || value;
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'string' && (value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value))) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch {}
  }
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return 'Date invalide';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function UserDetailsModal({ user, onClose, authToken }) {
  const modalRef = useRef(null);
  const [userData, setUserData] = useState(user);
  const [visibleFields, setVisibleFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [permissionsStatus, setPermissionsStatus] = useState('loading'); // 'loading' | 'ok' | 'empty' | 'failed'
  const [loading, setLoading] = useState(true);
  const { setAuthData } = useContext(UserContext);

  const targetId = user?.id || user?._id;

  // ─── Fetch full user record + permissions ───────────────────────────
  useEffect(() => {
    if (!targetId || !authToken) {
      setLoading(false);
      setPermissionsStatus('failed');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [userResult, permResult] = await Promise.allSettled([
        fetchWithRefresh(
          `${NEST_API_URL}/users/${targetId}`,
          { method: 'GET' },
          authToken,
          setAuthData
        ),
        fetchWithRefresh(
          `${NEST_API_URL}/permissions/user/${targetId}/viewable-fields?model=User`,
          { method: 'GET' },
          authToken,
          setAuthData
        ),
      ]);

      if (cancelled) return;

      // ─── Full user record ─────────────────────────────────────────
      let fullUser = user;
      if (userResult.status === 'fulfilled' && userResult.value.ok) {
        try {
          const body = await userResult.value.json();
          const candidate = body?.data?.user || body?.data || body;
          if (candidate && typeof candidate === 'object') {
            fullUser = { ...user, ...candidate };
            if (IS_DEV) console.log('[UserDetailsModal] Full user loaded:', fullUser);
          }
        } catch (e) {
          if (IS_DEV) console.warn('[UserDetailsModal] /users/:id parse failed:', e);
        }
      } else if (userResult.status === 'fulfilled') {
        if (IS_DEV) console.warn('[UserDetailsModal] /users/:id returned', userResult.value.status);
      } else {
        if (IS_DEV) console.warn('[UserDetailsModal] /users/:id rejected:', userResult.reason);
      }
      setUserData(fullUser);

      // ─── Permissions ──────────────────────────────────────────────
      let fields = [];
      let configs = {};
      let status = 'ok';

      if (permResult.status === 'fulfilled' && permResult.value.ok) {
        try {
          const body = await permResult.value.json();
          fields = body?.data?.fields || body?.fields || [];
          configs = body?.data?.configs || body?.configs || {};
          if (!Array.isArray(fields)) fields = [];
          if (!fields.length) status = 'empty';
          if (IS_DEV) console.log('[UserDetailsModal] Permissions loaded:', { fields, configs });
        } catch (e) {
          if (IS_DEV) console.warn('[UserDetailsModal] Permissions parse failed:', e);
          status = 'failed';
        }
      } else if (permResult.status === 'fulfilled') {
        if (IS_DEV) console.warn('[UserDetailsModal] Permissions returned', permResult.value.status);
        status = 'failed';
      } else {
        if (IS_DEV) console.warn('[UserDetailsModal] Permissions rejected:', permResult.reason);
        status = 'failed';
      }

      if (!cancelled) {
        setVisibleFields(fields);
        setFieldConfigs(configs || {});
        setPermissionsStatus(status);
      }
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
    // NOTE: `user` intentionally not in deps — we snapshot on open. The API record is authoritative.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, authToken, setAuthData]);

  // ─── ESC + click-outside ─────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#111827] rounded-2xl p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-[#64748B] mt-4 text-center">Chargement…</p>
        </div>
      </div>
    );
  }

  // ─── Decide which fields to show ─────────────────────────────────────
  // If permissions loaded with a non-empty list → use it as a filter
  // Otherwise (empty or failed) → show all fields we have data for
  const hasFilter = permissionsStatus === 'ok' && visibleFields.length > 0;
  const visibleFieldSet = hasFilter ? new Set(visibleFields) : null;
  const isFieldVisible = (key) => !visibleFieldSet || visibleFieldSet.has(key);

  const getFormatter = (key) => {
    if (key === 'sexe') return formatSexe;
    if (key === 'professionalMode') return formatProfessionalMode;
    if (key === 'diplomaType') return formatDiplomaType;
    if (['region', 'wilaya', 'wilayaPro', 'employerWilaya', 'oathLocation'].includes(key)) {
      return formatWilaya;
    }
    return null;
  };

  const renderList = (items) => {
    if (!items || items.length === 0) return <span className="text-[#64748B]">Aucun élément</span>;
    return (
      <ul className="list-disc list-inside space-y-1 text-[#F8FAFC]">
        {items.map((item, idx) => (
          <li key={idx}>
            {item.titre || item.name} {item.etablissement && `(${item.etablissement})`} {item.annee && `- ${item.annee}`}
          </li>
        ))}
      </ul>
    );
  };

  const hasVisibleData = (section) => {
    return section.fields.some((key) => {
      if (!isFieldVisible(key)) return false;
      const val = userData[key];
      if (key === 'otherDiplomas' || key === 'formations') {
        return Array.isArray(val) && val.length > 0;
      }
      return val !== undefined && val !== null && val !== '';
    });
  };

  // ─── Empty state — but tell the user WHY ─────────────────────────────
  const nothingToShow = !SECTIONS.some(hasVisibleData);

  if (nothingToShow) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div
          ref={modalRef}
          className="bg-[#111827] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 modal-scrollbar"
        >
          <div className="flex flex-col items-center gap-3 py-12 text-[#64748B]">
            <IoClose size={24} className="text-[#64748B]" />
            <p className="text-sm">
              {permissionsStatus === 'failed'
                ? 'Impossible de charger les permissions.'
                : permissionsStatus === 'empty'
                  ? 'Aucune permission de visibilité définie, et aucune donnée disponible.'
                  : 'Aucune information disponible.'}
            </p>
          </div>
          <div className="sticky bottom-0 bg-[#111827] border-t border-[rgba(255,255,255,0.06)] p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="relative bg-[#111827] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 modal-scrollbar"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111827] border-b border-[rgba(255,255,255,0.06)] p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              {userData.name} {userData.lastname}
            </h2>
            <p className="text-[#94A3B8] text-sm">{userData.email}</p>
            {userData.nomArabe && (
              <p className="text-emerald-400/80 text-lg font-arabic" dir="rtl">
                {userData.nomArabe} {userData.prenomArabe}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1F2937] rounded-lg transition-colors"
          >
            <IoClose size={24} className="text-[#64748B] hover:text-[#F8FAFC]" />
          </button>
        </div>

        {/* Optional warning if permissions didn't load */}
        {permissionsStatus !== 'ok' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-xs text-amber-300">
            {permissionsStatus === 'empty'
              ? 'Aucune permission de visibilité n\'est définie — tous les champs disponibles sont affichés.'
              : 'Les permissions n\'ont pas pu être chargées — tous les champs disponibles sont affichés.'}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-8">
          {SECTIONS.map((section) => {
            if (!hasVisibleData(section)) return null;
            return (
              <div key={section.id}>
                <h3 className="text-lg font-semibold text-emerald-400 border-b border-[rgba(255,255,255,0.06)] pb-2 mb-4 tracking-wide">
                  {section.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((key) => {
                    if (!isFieldVisible(key)) return null;
                    const value = userData[key];
                    if (key === 'otherDiplomas' || key === 'formations') {
                      if (!Array.isArray(value) || value.length === 0) return null;
                      const label = FIELD_LABELS[key] || key;
                      return (
                        <div key={key} className="p-3 rounded-lg bg-[#182233] border border-[rgba(255,255,255,0.06)] col-span-full">
                          <p className="text-[#64748B] text-xs font-medium uppercase tracking-wider">{label}</p>
                          <div className="mt-1">{renderList(value)}</div>
                        </div>
                      );
                    }
                    if (value === undefined || value === null || value === '') return null;
                    const label = FIELD_LABELS[key] || key;
                    const formatter = getFormatter(key);
                    const displayValue = formatter ? formatter(value) : formatValue(value);
                    const isArabic = key.includes('Arabe') || key.includes('arab');

                    return (
                      <div
                        key={key}
                        className="p-3 rounded-lg bg-[#182233] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                      >
                        <p className="text-[#64748B] text-xs font-medium uppercase tracking-wider">{label}</p>
                        <p
                          className={`text-[#F8FAFC] mt-1 text-sm break-words ${isArabic ? 'font-arabic text-right' : ''}`}
                          dir={isArabic ? 'rtl' : 'ltr'}
                        >
                          {displayValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#111827] border-t border-[rgba(255,255,255,0.06)] p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            Fermer
          </button>
        </div>
      </div>

      <style>{`
        .modal-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .modal-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
        .modal-scrollbar::-webkit-scrollbar-thumb { background: #22C55E; border-radius: 10px; }
        .modal-scrollbar::-webkit-scrollbar-thumb:hover { background: #16A34A; }
        .modal-scrollbar { scrollbar-width: thin; scrollbar-color: #22C55E rgba(31, 41, 55, 0.5); scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}