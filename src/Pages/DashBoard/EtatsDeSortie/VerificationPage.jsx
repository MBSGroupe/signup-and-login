// src/Pages/DashBoard/EtatsDeSortie/VerificationPage.jsx
//
// Public page behind the QR code of certified documents. Shows what the
// Order recorded when the document was issued (to compare with the paper),
// its status (valide / remplacé / révoqué / expiré), and lets the verifier
// check that a PDF is exactly the issued file: its SHA-256 is computed in
// the browser and only that fingerprint is sent, never the file.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  IdCard,
  User,
  FileCheck2,
  FileX2,
  Hash,
  CalendarDays,
  Upload,
  Loader2,
} from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL || 'http://localhost:3000';

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const FIELD_ICON = 'w-4 h-4 text-emerald-400';

// Card look per status: valid is the glowing green card, anything else is
// a warning that the document must not be relied on.
const STATUS = {
  valid: {
    title: 'Document authentique et valide',
    badge: 'Valide',
    Icon: CheckCircle,
    card: 'green-glowing-card',
    accent: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  superseded: {
    title: 'Document remplacé',
    badge: 'Remplacé',
    Icon: AlertTriangle,
    card: 'status-card border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.18)]',
    accent: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    explain: (d) =>
      `Ce document est authentique, mais une version plus récente a été émise${
        d.supersededAt ? ` le ${formatDate(d.supersededAt)}` : ''
      }. Cette version n'est plus valable : demandez au titulaire le document en vigueur.`,
  },
  expired: {
    title: 'Document expiré',
    badge: 'Expiré',
    Icon: AlertTriangle,
    card: 'status-card border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.18)]',
    accent: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    explain: (d) =>
      `Ce document est authentique, mais sa période de validité a pris fin${
        d.expiresAt ? ` le ${formatDate(d.expiresAt)}` : ''
      }.`,
  },
  revoked: {
    title: 'Document révoqué',
    badge: 'Révoqué',
    Icon: XCircle,
    card: 'status-card border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]',
    accent: 'text-red-400',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    explain: (d) =>
      `Ce document a été révoqué par le Conseil National de l'Ordre des Architectes${
        d.revokedAt ? ` le ${formatDate(d.revokedAt)}` : ''
      }. Il n'a plus aucune valeur.`,
  },
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function sha256Hex(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const unwrap = (body) => body?.data ?? body;

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
        const response = await fetch(`${NEST_API_URL}/verify/degree/${encodeURIComponent(token)}`, {
          headers: { Accept: 'application/json' },
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error(
            "Aucun document ne correspond à ce QR code. Il n'a pas été émis par l'Ordre ou le lien a été modifié.",
          );
        }
        if (!response.ok) {
          throw new Error(result.message || 'La vérification du document a échoué');
        }
        setData(unwrap(result));
      } catch (err) {
        setError(err.message || 'Une erreur est survenue lors de la vérification');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const status = data ? STATUS[data.status] || STATUS.revoked : null;
  // The attestation text is the agreement's: only for a valid agreement.
  const isValidAgreement =
    data?.status === 'valid' && String(data.documentType || '').startsWith('agrement') && data.expiresAt;
  const agreementYear = isValidAgreement ? new Date(data.expiresAt).getFullYear() : null;
  const holderLine = data ? `${data.civility ? `${data.civility} ` : ''}${data.holder}` : '';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
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
        .status-card {
          position: relative;
          border-radius: 1.5rem;
          border-width: 2px;
          border-style: solid;
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
          .green-glowing-card, .status-card { box-shadow: none !important; background: white !important; color: black !important; }
        }
      `}</style>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 grid-bg-pattern pointer-events-none opacity-60" />

      {/* EN-TÊTE INSTITUTIONNEL */}
      <div className="text-center mb-8 z-10 max-w-xl px-2">
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl transform scale-125" />
          <img
            src="/LOGOCLOA.png"
            alt="Logo Ordre National des Architectes"
            className="relative h-24 sm:h-28 w-auto mx-auto object-contain drop-shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
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
          Authentification des documents
        </p>
      </div>

      {/* CHARGEMENT */}
      {loading && (
        <div className="relative z-10 w-full max-w-2xl green-glowing-card p-10 text-center bg-[#0d1527]/95 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <ShieldCheck className="w-7 h-7 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-lg font-semibold text-white">Vérification en cours...</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Interrogation sécurisée du registre de l'Ordre National des Architectes.
            </p>
          </div>
        </div>
      )}

      {/* INCONNU / ERREUR */}
      {!loading && error && (
        <div className="relative z-10 w-full max-w-2xl rounded-3xl p-8 bg-[#131c31]/95 backdrop-blur-xl border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentification échouée</h2>
          <p className="text-slate-300 text-sm bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* RÉSULTAT */}
      {!loading && !error && data && status && (
        <div className="relative z-10 w-full max-w-2xl space-y-5">
          <div className={`${status.card} p-6 sm:p-8 bg-[#0b1329]/95 backdrop-blur-2xl text-left`}>
            {/* En-tête : statut */}
            <div className="pb-5 border-b border-white/10">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <status.Icon className={`w-8 h-8 shrink-0 ${status.accent}`} />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{status.title}</h2>
                </div>
                <span className={`inline-flex text-xs font-semibold px-3 py-1 rounded-lg border shrink-0 ${status.badgeClass}`}>
                  {status.badge}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-300">{data.documentName}</p>
              {status.explain && (
                <p className={`mt-3 text-sm leading-relaxed rounded-xl p-3 border bg-black/20 ${status.badgeClass}`}>
                  {status.explain(data)}
                </p>
              )}
            </div>

            {/* Titulaire & références */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">
              <Field icon={<User className={FIELD_ICON} />} label="Titulaire" value={holderLine} strong />
              <Field icon={<IdCard className={FIELD_ICON} />} label="Numéro d'inscription à l'Ordre" value={data.registrationNumber} strong />
              <Field
                icon={<Hash className={FIELD_ICON} />}
                label="Numéro de certificat"
                value={`${data.certificateNumber || '—'}${data.version > 1 ? ` · version ${data.version}` : ''}`}
                mono
              />
              <Field
                icon={<CalendarDays className={FIELD_ICON} />}
                label="Émis le"
                value={`${formatDate(data.issuedAt)}${data.expiresAt ? ` · valable jusqu'au ${formatDate(data.expiresAt)}` : ''}`}
              />
              {(data.summary || []).map((row) => (
                <Field key={row.label} icon={<CheckCircle2 className={FIELD_ICON} />} label={row.label} value={row.value} />
              ))}
            </div>

            {(data.summary || []).length === 0 && (
              <p className="mb-6 text-xs text-slate-400">
                Le détail du contenu n'a pas été enregistré pour ce document (émis avant la mise en place de
                cette vérification). Utilisez la vérification du fichier ci-dessous si vous disposez du PDF.
              </p>
            )}

            {/* Attestation (agrément en cours de validité) */}
            {isValidAgreement && (
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/30 border border-emerald-500/30 text-xs sm:text-sm leading-relaxed text-slate-200 mb-6 shadow-inner">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    Est régulièrement <strong className="text-white font-semibold">inscrit(e) au tableau de l'Ordre des Architectes</strong> et
                    est à jour de ses obligations réglementaires et cotisations ordinales pour{' '}
                    <strong className="text-emerald-300 font-semibold">l'année {agreementYear}</strong>.
                  </p>
                </div>
                <div className="pt-2.5 border-t border-emerald-500/20 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    En conséquence, <strong className="text-white font-semibold">{holderLine}</strong> est légalement habilité(e) à
                    exercer la profession d'architecte et à établir des projets sur l'ensemble du territoire national
                    jusqu'au <span className="text-emerald-300 font-semibold">{formatDate(data.expiresAt)}</span>.
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              Comparez ces informations avec le document présenté. Toute différence signifie que le document a été
              modifié.
            </p>
          </div>

          {data.canCheckFile && <FileCheck token={token} />}
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, value, strong = false, mono = false }) {
  return (
    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
        {icon}
        {label}
      </div>
      <div
        className={`${strong ? 'text-white font-bold text-base' : 'text-slate-100 font-medium text-sm'} ${
          mono ? 'font-mono break-all' : ''
        } leading-snug`}
      >
        {value || '—'}
      </div>
    </div>
  );
}

/**
 * "Is this PDF the issued file?" The fingerprint is computed here; the file
 * itself never leaves the verifier's machine.
 */
function FileCheck({ token }) {
  const [state, setState] = useState({ phase: 'idle' }); // idle | checking | match | mismatch | unknown | error
  const supported = typeof window !== 'undefined' && !!window.crypto?.subtle;

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) {
      setState({ phase: 'error', message: 'Fichier trop volumineux (20 Mo maximum).' });
      return;
    }
    setState({ phase: 'checking', name: file.name });
    try {
      const sha256 = await sha256Hex(file);
      const res = await fetch(`${NEST_API_URL}/verify/degree/${encodeURIComponent(token)}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sha256 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'La vérification a échoué');
      const { match } = unwrap(body);
      setState({ phase: match === true ? 'match' : match === false ? 'mismatch' : 'unknown', name: file.name });
    } catch (err) {
      setState({ phase: 'error', message: err.message });
    }
  };

  return (
    <div className="no-print rounded-3xl p-6 bg-[#0d1527]/95 border border-white/10 text-left">
      <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
        <FileCheck2 className="w-5 h-5 text-emerald-400" />
        Vérifier un fichier PDF
      </h3>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Vous avez reçu ce document en PDF ? Vérifiez qu'il est exactement le fichier émis par l'Ordre. Le fichier
        reste sur votre appareil : seule son empreinte numérique est comparée. Une copie scannée ou imprimée ne peut
        pas être vérifiée ainsi ; comparez alors les informations ci-dessus.
      </p>

      {!supported ? (
        <p className="text-xs text-amber-400">Cette vérification nécessite une connexion sécurisée (HTTPS).</p>
      ) : (
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer text-sm font-medium">
          {state.phase === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Choisir le PDF
          <input type="file" accept="application/pdf,.pdf" hidden onChange={onFile} disabled={state.phase === 'checking'} />
        </label>
      )}

      {state.phase === 'match' && (
        <p className="mt-4 flex items-start gap-2 text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          « {state.name} » est identique au document émis. Il n'a pas été modifié.
        </p>
      )}
      {state.phase === 'mismatch' && (
        <p className="mt-4 flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-800/40 rounded-xl p-3">
          <FileX2 className="w-5 h-5 shrink-0" />
          « {state.name} » ne correspond pas au document émis : il a été modifié, ou il s'agit d'un autre document.
        </p>
      )}
      {state.phase === 'unknown' && (
        <p className="mt-4 text-sm text-amber-300">
          L'empreinte de cette version n'a pas été enregistrée : comparez les informations ci-dessus.
        </p>
      )}
      {state.phase === 'error' && <p className="mt-4 text-sm text-red-300">{state.message}</p>}
    </div>
  );
}
