import { useState, useContext } from "react";
import { UserContext } from "../Context/dataCont";
import { Loader2, Mail, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function VerifyPending() {
  const { authData } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Si authData existe, pré-remplir l'email
  const emailToShow = authData?.user?.email || email;

  const handleResend = async () => {
    if (!emailToShow) {
      setMessage("Veuillez entrer votre email.");
      return;
    }
    setIsResending(true);
    setMessage("");
    try {
      const response = await fetch(`${NEST_API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToShow }),
      });
      const data = await response.json();
      setMessage(data.message || "Un email de vérification a été envoyé.");
    } catch (err) {
      setMessage("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-8 text-center">
          {/* Icône */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
            Vérification en attente
          </h1>

          {/* Description */}
          <p className="mt-3 text-[#94A3B8] text-sm leading-relaxed">
            Veuillez vérifier votre boîte mail et cliquer sur le lien de vérification pour activer votre compte.
          </p>

          {/* Champ email */}
          <div className="mt-5 p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
            <p className="text-[#64748B] text-xs uppercase tracking-wider mb-2">
              Votre email
            </p>
            <input
              type="email"
              value={emailToShow}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full px-3 py-2 bg-[#111827] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Bouton de renvoi */}
          <button
            onClick={handleResend}
            disabled={isResending}
            className="mt-4 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Renvoyer l'email
              </>
            )}
          </button>

          {message && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              message.includes('Erreur') ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}