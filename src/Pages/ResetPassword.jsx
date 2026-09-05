import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage("Jeton invalide ou manquant.");
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmNewPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${NEST_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage(data.message || "Échec de la réinitialisation du mot de passe.");
      }
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
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Définir un nouveau mot de passe</h1>
          <p className="text-[#94A3B8] text-sm mb-6">
            Entrez votre nouveau mot de passe ci-dessous.
          </p>

          {success ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg mb-4">
              <CheckCircle className="w-5 h-5" />
              Mot de passe réinitialisé avec succès ! Redirection...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </button>
            </form>
          )}

          {message && (
            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}