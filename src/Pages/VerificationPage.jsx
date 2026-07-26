import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyPage() {
  const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");
  const [message, setMessage] = useState("Verifying your email...");
  const [status, setStatus] = useState("loading"); // loading, success, error
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setMessage("Missing token.");
      setStatus("error");
      return;
    }

    const verifyUser = async () => {
      try {
        // ✅ Send token as query parameter to match backend @Query('token')
        const response = await fetch(`${NEST_API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // No body needed – token is in the URL
        });

        const data = await response.json();

        if (response.ok) {
          const msg = data?.data?.message || data.message || "Email verified successfully!";
          setMessage(msg);
          setStatus("success");
          if (mode !== "email-change") {
            setTimeout(() => navigate("/auth/profile"), 1500);
          }
        } else {
          const errMsg = data?.data?.message || data.message || "Verification failed. Please try again.";
          setMessage(errMsg);
          setStatus("error");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setMessage("Verification failed. The link may be invalid or expired.");
        setStatus("error");
      }
    };

    verifyUser();
  }, [token, mode, navigate]);

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
              ? "Verifying"
              : status === "success"
              ? "Verified!"
              : "Verification Failed"}
          </h1>
          <p className="mt-3 text-[#94A3B8] text-sm leading-relaxed">{message}</p>
          {status === "error" && (
            <button
              onClick={() => navigate("/auth/login")}
              className="mt-6 px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              Return to Login
            </button>
          )}
          {status === "success" && mode === "email-change" && (
            <p className="mt-4 text-xs text-[#64748B]">
              You can now close this window and continue.
            </p>
          )}
          {status === "success" && mode !== "email-change" && (
            <p className="mt-4 text-xs text-[#64748B] animate-pulse">
              Redirecting to onboarding...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}