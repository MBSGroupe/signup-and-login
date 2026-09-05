import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${NEST_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setMessage(data.message || "Si cet email existe, un lien de réinitialisation a été envoyé.");
    } catch (err) {
      setMessage("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-emerald-400 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8">
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Mot de passe oublié</h1>
          <p className="text-[#94A3B8] text-sm mb-6">
            Entrez votre email et nous vous enverrons un lien de réinitialisation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}