import { useEffect, useRef } from 'react';
import { IoClose } from 'react-icons/io5';

export default function UserDetailsModal({ user, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Helper to format values
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (value instanceof Date || (typeof value === 'string' && value.includes('T'))) {
      try {
        return new Date(value).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return value;
      }
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  };

  // Get sexe label
  const getSexeLabel = (value) => {
    if (value === 'M') return 'Homme';
    if (value === 'F') return 'Femme';
    return value || '-';
  };

  // All user fields organized by category
  const userFields = {
    'Informations Personnelles': [
      { key: 'name', label: 'Nom' },
      { key: 'lastname', label: 'Prénom' },
      { key: 'nomArabe', label: 'Nom (Arabe)', isArabic: true },
      { key: 'prenomArabe', label: 'Prénom (Arabe)', isArabic: true },
      { key: 'email', label: 'Email' },
      { key: 'emailPro', label: 'Email Professionnel' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'fixe', label: 'Téléphone Fixe' },
      { key: 'fax', label: 'Fax' },
      { key: 'sexe', label: 'Sexe', formatter: getSexeLabel },
      { key: 'dateOfBirth', label: 'Date de naissance' },
      { key: 'lieuNaissance', label: 'Lieu de naissance' },
      { key: 'enfants', label: 'Nombre d\'enfants' },
    ],
    'Informations Familiales': [
      { key: 'prenomPere', label: 'Prénom du père' },
      { key: 'prenomPereArabe', label: 'Prénom du père (Arabe)', isArabic: true },
      { key: 'nomPrenomMere', label: 'Nom et prénom de la mère' },
      { key: 'nomPrenomMereArabe', label: 'Nom et prénom de la mère (Arabe)', isArabic: true },
      { key: 'maritalStatus', label: 'Situation familiale' },
      { key: 'nationality', label: 'Nationalité' },
      { key: 'serviceNationalStatus', label: 'Service national' },
    ],
    'Informations Professionnelles': [
      { key: 'profession', label: 'Profession' },
      { key: 'specialty', label: 'Spécialité' },
      { key: 'wilaya', label: 'CLOA' },
      { key: 'registrationNumber', label: 'N° d\'inscription' },
      { key: 'nif', label: 'NIF' },
      { key: 'cachet', label: 'Cachet' },
      { key: 'gps', label: 'Coordonnées GPS' },
      { key: 'loi', label: 'Loi' },
      { key: 'dispositif', label: 'Dispositif' },
      { key: 'professionalMode', label: 'Mode d\'exercice' },
      { key: 'activityStartDate', label: 'Date de début d\'activité' },
      { key: 'startDate', label: 'Date de début de cotisation' },
      { key: 'employerId', label: 'ID Employeur' },
      { key: 'companyStatus', label: 'Statut SCP' },
      { key: 'declarationExistence', label: 'Déclaration d\'existence' },
      { key: 'moyensHumains', label: 'Moyens humains' },
      { key: 'humanResources', label: 'Ressources humaines' },
      { key: 'isAccredited', label: 'Architecte agréé' },
      { key: 'benefitStateAid', label: 'Bénéficiaire aide d\'État' },
      { key: 'registrationStatus', label: 'Statut d\'inscription' },
      { key: 'registrationDate', label: 'Date d\'inscription' },
    ],
    'Adresses': [
      
      { key: 'commune', label: 'Commune' },
      { key: 'region', label: 'Région' },
      { key: 'adressePersonnelle', label: 'Adresse personnelle' },
      { key: 'adressePersonnelleArabe', label: 'Adresse personnelle (Arabe)', isArabic: true },
      { key: 'adressePro', label: 'Adresse professionnelle' },
      { key: 'adresseProArabe', label: 'Adresse professionnelle (Arabe)', isArabic: true },
    ],
    'CNOA': [
      { key: 'civility', label: 'Civilité' },
      { key: 'oathLocation', label: 'Lieu du serment' },
      { key: 'oathDate', label: 'Date du serment' },
      { key: 'diplomaType', label: 'Type de diplôme' },
      { key: 'sessionClassique', label: 'Session Classique' },
      { key: 'anneeClassique', label: 'Année Classique' },
      { key: 'universiteClassique', label: 'Université Classique' },
      { key: 'sessionLMDL', label: 'Session LMD (Licence)' },
      { key: 'anneeLMDL', label: 'Année LMD (Licence)' },
      { key: 'universiteLMDL', label: 'Université LMD (Licence)' },
      { key: 'sessionLMDM', label: 'Session LMD (Master)' },
      { key: 'anneeLMDM', label: 'Année LMD (Master)' },
      { key: 'universiteLMDM', label: 'Université LMD (Master)' },
      { key: 'otherDiplomas', label: 'Autres diplômes' },
      { key: 'otherTrainings', label: 'Autres formations' },
      { key: 'lastAgreementDate', label: 'Date du dernier agrément' },
      { key: 'lastAgreementFileId', label: 'ID du fichier agrément' },
      { key: 'paymentReceipts', label: 'Reçus de paiement' },
      { key: 'isLateForYear', label: 'Année de retard' },
      { key: 'latePenalties', label: 'Pénalités de retard' },
    ],
    'Sécurité & Système': [
      { key: 'role', label: 'Rôle' },
      { key: 'status', label: 'Statut' },
      { key: 'credit', label: 'Crédit (DA)' },
      { key: 'isVerified', label: 'Vérifié' },
      { key: 'isAdminVerified', label: 'Validé par admin' },
      { key: 'isActive', label: 'Actif' },
      { key: 'loginAttempts', label: 'Tentatives de connexion' },
      { key: 'lastLogin', label: 'Dernière connexion' },
      { key: 'lastActivity', label: 'Dernière activité' },
      { key: 'createdAt', label: 'Créé le' },
      { key: 'updatedAt', label: 'Mis à jour le' },
    ],
  };

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
              {user.name} {user.lastname}
            </h2>
            <p className="text-[#94A3B8] text-sm">{user.email}</p>
            {user.nomArabe && (
              <p className="text-emerald-400/80 text-lg font-arabic" dir="rtl">
                {user.nomArabe} {user.prenomArabe}
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

        {/* Content */}
        <div className="p-6 space-y-8">
          {Object.entries(userFields).map(([category, fields]) => {
            // Check if any field in this category has a value
            const hasValue = fields.some(f => {
              const val = user[f.key];
              return val !== undefined && val !== null && val !== '';
            });
            if (!hasValue) return null;

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-emerald-400 border-b border-[rgba(255,255,255,0.06)] pb-2 mb-4 tracking-wide">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => {
                    const value = user[field.key];
                    if (value === undefined || value === null || value === '') return null;

                    let displayValue = field.formatter ? field.formatter(value) : formatValue(value);

                    return (
                      <div
                        key={field.key}
                        className="p-3 rounded-lg bg-[#182233] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                      >
                        <p className="text-[#64748B] text-xs font-medium uppercase tracking-wider">
                          {field.label}
                        </p>
                        <p
                          className={`text-[#F8FAFC] mt-1 text-sm break-words ${field.isArabic ? 'font-arabic text-right' : ''}`}
                          dir={field.isArabic ? 'rtl' : 'ltr'}
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

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .modal-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .modal-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .modal-scrollbar::-webkit-scrollbar-thumb {
          background: #22C55E;
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #16A34A;
        }
        .modal-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #22C55E rgba(31, 41, 55, 0.5);
        }
        .modal-scrollbar {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}