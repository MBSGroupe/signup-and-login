import { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyPage() {
  const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");
  const [message, setMessage] = useState("Vérification de votre email...");
  const [status, setStatus] = useState("loading"); // loading, success, error
  const navigate = useNavigate();
  const { setAuthData } = useContext(UserContext);

  useEffect(() => {
    if (!token) {
      setMessage("Jeton manquant.");
      setStatus("error");
      return;
    }

    const verifyUser = async () => {
      try {
        const response = await fetch(`${NEST_API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          const msg = data?.data?.message || data.message || "Email vérifié avec succès !";
          setMessage(msg);
          setStatus("success");

          if (mode !== "email-change") {
            // Effacer toute donnée d'authentification stockée – la vérification n'est pas une connexion
            localStorage.removeItem("authData");
            setAuthData({ user: null, token: null });
            // 👇 Rediriger vers la page de connexion avec paramètre
            setTimeout(() => navigate("/?verified=true"), 2000);
          }
        } else {
          const errMsg = data?.data?.message || data.message || "La vérification a échoué. Veuillez réessayer.";
          setMessage(errMsg);
          setStatus("error");
        }
      } catch (error) {
        console.error("Erreur de vérification:", error);
        setMessage("La vérification a échoué. Le lien est peut-être invalide ou expiré.");
        setStatus("error");
      }
    };

    verifyUser();
  }, [token, mode, navigate, setAuthData]);

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />;
      case "success":
        return <CheckCircle className="w-16 h-16 text-emerald-400" />;
      case "error":
        return <XCircle className="w-16 h-16 text-rose-400" />;
      default:
        return null;
    }
  };

  const getTitleColor = () => {
    switch (status) {
      case "loading":
        return "text-[#F8FAFC]";
      case "success":
        return "text-emerald-400";
      case "error":
        return "text-rose-400";
      default:
        return "text-[#F8FAFC]";
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-8 text-center">
          <div className="flex justify-center mb-6">{getIcon()}</div>
          <h1
            className={`text-2xl font-bold tracking-tight ${getTitleColor()} transition-colors duration-300`}
          >
            {status === "loading"
              ? "Vérification en cours"
              : status === "success"
              ? "Email vérifié !"
              : "Échec de la vérification"}
          </h1>
          <p className="mt-3 text-[#94A3B8] text-sm leading-relaxed">{message}</p>
          {status === "error" && (
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              Retour à la connexion
            </button>
          )}
          {status === "success" && mode === "email-change" && (
            <p className="mt-4 text-xs text-[#64748B]">
              Vous pouvez maintenant fermer cette fenêtre et continuer.
            </p>
          )}
          {status === "success" && mode !== "email-change" && (
            <p className="mt-4 text-xs text-[#64748B] animate-pulse">
              Redirection vers la page de connexion...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}