// src/Pages/DashBoard/EtatsDeSortie/VerificationPage.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
  Calendar,
  IdCard,
  User,
  Briefcase,
  MapPin,
  AlertTriangle,
  BadgeCheck
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL || 'http://localhost:3000';

export default function VerifyDegree() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Lien de vérification invalide ou manquant');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`${NEST_API_URL}/verify/degree/${token}`, {
          headers: {
            Accept: 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'La vérification du document a échoué');
        }

        const payload = result.data ?? result;
        console.log(payload)
        setData(payload);
      } catch (err) {
        setError(err.message || 'Une erreur est survenue lors de la vérification');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  // Extraction exacte depuis les champs Prisma User (name, lastname, professionalMode, adressePro, etc.)
  const holderName =
    data?.holder ||
    data?.architectName ||
    (data?.lastname && data?.name ? `${data.lastname.toUpperCase()} ${data.name}` : null) ||
    data?.name ||
    data?.fullName ||
    data?.nomPrenom ||
    "Nom et Prénom de l'Architecte";

  // Civilité automatique selon le champ 'sexe' de Prisma ('M' -> Monsieur / 'F' -> Madame)
  let civilityPrefix = 'Monsieur / Madame ';
  let civilityLabel = 'Monsieur / Madame';
  if (data?.civility) {
    civilityLabel = data.civility;
    civilityPrefix = `${data.civility} `;
  } else if (data?.sexe) {
    const s = String(data.sexe).toUpperCase();
    if (s === 'M' || s === 'HOMME' || s === 'MASCULIN') {
      civilityLabel = 'Monsieur';
      civilityPrefix = 'Monsieur ';
    } else if (s === 'F' || s === 'FEMME' || s === 'FEMININ') {
      civilityLabel = 'Madame';
      civilityPrefix = 'Madame ';
    }
  }

  // Numéro d'inscription (Prisma: registrationNumber)
  const registrationNo = data?.registrationNumber || data?.matricule || data?.numeroInscription || "Numéro d'inscription";

  // Mode d'exercice (Prisma: professionalMode)
  const exerciseMode = data?.professionalMode || data?.exerciseMode || data?.profession || data?.modeExercice || 'Libéral';

  // Adresse professionnelle (Prisma: adressePro)
  const professionalAddress = data?.adressePro;

  const validYear = data?.year || data?.annee || '2026';
  const startDate = data?.startDate || data?.dateDebut || '1er janvier 2026';
  const endDate = data?.endDate || data?.dateFin || '31 décembre 2026';
  const documentStatus = data?.status || data?.registrationStatus || 'Valide';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Styles CSS pour la bordure verte et la lueur */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), 0 0 50px rgba(16, 185, 129, 0.15), inset 0 0 15px rgba(16, 185, 129, 0.05);
            border-color: rgba(16, 185, 129, 0.6);
          }
          50% {
            box-shadow: 0 0 35px rgba(16, 185, 129, 0.55), 0 0 75px rgba(16, 185, 129, 0.3), inset 0 0 25px rgba(16, 185, 129, 0.1);
            border-color: rgba(52, 211, 153, 0.9);
          }
        }
        .green-glowing-card {
          position: relative;
          border-radius: 1.5rem;
          border: 2px solid rgba(16, 185, 129, 0.7);
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .grid-bg-pattern {
          background-size: 36px 36px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .green-glowing-card { box-shadow: none !important; border: 2px solid #059669 !important; background: white !important; color: black !important; }
        }
      `}</style>

      {/* Halo lumineux d'ambiance d'arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 grid-bg-pattern pointer-events-none opacity-60" />

      {/* EN-TÊTE INSTITUTIONNEL (Logo + Titre officiel) */}
      <div className="text-center mb-8 z-10 max-w-xl px-2">
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl transform scale-125" />
          <img
            src="/LOGOCLOA.png"
            alt="Logo Ordre National des Architectes"
            className="relative h-24 sm:h-28 w-auto mx-auto object-contain drop-shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-transform duration-300 hover:scale-105"
          />
        </div>
        <p className="text-emerald-400 font-semibold tracking-widest text-xs uppercase mb-1">
          République Algérienne Démocratique et Populaire
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          Conseil National de l'Ordre des Architectes
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Authentification
        </p>
      </div>

      {/* ÉTAT 1 : CHARGEMENT */}
      {loading && (
        <div className="relative z-10 w-full max-w-2xl green-glowing-card p-10 text-center bg-[#0d1527]/95 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <ShieldCheck className="w-7 h-7 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-lg font-semibold text-white">Vérification en cours...</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Interrogation sécurisée du tableau de l'Ordre National des Architectes.
            </p>
          </div>
        </div>
      )}

      {/* ÉTAT 2 : ERREUR / DOCUMENT NON VÉRIFIÉ */}
      {!loading && error && (
        <div className="relative z-10 w-full max-w-2xl rounded-3xl p-8 bg-[#131c31]/95 backdrop-blur-xl border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentification Échouée</h2>
          <p className="text-slate-300 text-sm bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* ÉTAT 3 : SUCCÈS (ATTESTATION OFFICIELLE VÉRIFIÉE AVEC BORDURE VERTE LUMINEUSE) */}
      {!loading && !error && data?.verified && (
        <div className="relative z-10 w-full max-w-2xl">
          {/* CARRE / CARTE PRINCIPALE AVEC BORDURE VERTE */}
          <div className="green-glowing-card p-6 sm:p-8 bg-[#0b1329]/95 backdrop-blur-2xl text-left">

            {/* Ruban / En-tête de Certification */}
            <div className="pb-5 border-b border-emerald-500/20">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Document vérifié
                  </h2>
                </div>
                <span className="hidden sm:inline-flex text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg shrink-0">
                  Année {validYear}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-300">
                Le Conseil National de l'Ordre des Architectes certifie que :
              </p>
            </div>

            {/* Grille des informations de l'Architecte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">

              {/* Nom & Prénom */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                  {civilityLabel}
                </div>
                <div className="text-white font-bold text-base tracking-wide">
                  {holderName}
                </div>
              </div>

              {/* Numéro d'inscription à l'Ordre */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <IdCard className="w-4 h-4 text-emerald-400" />
                  Numéro d'inscription à l'Ordre
                </div>
                <div className="text-white font-bold text-base tracking-wide">
                  {registrationNo}
                </div>
              </div>

              {/* Mode d'exercice */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  Mode d'exercice
                </div>
                <div className="text-slate-100 font-semibold text-sm">
                  {exerciseMode}
                </div>
              </div>

              {/* Adresse professionnelle */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Adresse professionnelle
                </div>
                <div className="text-slate-200 font-medium text-xs sm:text-sm leading-snug">
                  {professionalAddress}
                </div>
              </div>

            </div>

            {/* ENCART OFFICIEL : Inscription régulière & Habilitation légale */}
            <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/30 border border-emerald-500/30 text-xs sm:text-sm leading-relaxed text-slate-200 mb-6 shadow-inner">

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Est régulièrement <strong className="text-white font-semibold">inscrit(e) au tableau de l'Ordre des Architectes</strong> et est à jour de ses obligations réglementaires et cotisations ordinales pour <strong className="text-emerald-300 font-semibold">l'année {validYear}</strong>.
                </p>
              </div>

              <div className="pt-2.5 border-t border-emerald-500/20 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  En conséquence, <strong className="text-white font-semibold">{civilityPrefix}{holderName}</strong> est légalement habilité(e) et éligible à exercer la profession d'architecte, à établir des projets sur l'ensemble du territoire national pour la période allant du <span className="text-emerald-300 font-semibold">{startDate}</span> au <span className="text-emerald-300 font-semibold">{endDate}</span>.
                </p>
              </div>

            </div>

            {/* Statut du document */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 uppercase font-semibold">Statut</span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {documentStatus}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ÉTAT 4 : NON TROUVÉ */}
      {!loading && !error && !data?.verified && (
        <div className="relative z-10 w-full max-w-2xl rounded-3xl p-8 bg-[#131c31]/95 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)] text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Document Introuvable</h2>
          <p className="text-slate-300 text-sm mb-4">
            Le document que vous cherchez n'existe pas dans le tableau de l'Ordre ou a été révoqué.
          </p>
        </div>
      )}
    </div>
  );
}
