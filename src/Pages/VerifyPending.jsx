import { useContext } from "react";
import { UserContext } from "../Context/dataCont";
import { Loader2, Mail, CheckCircle, ExternalLink } from "lucide-react";

export default function VerifyPending() {
  const { authData } = useContext(UserContext);
  console.log(authData)
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
            Verification Pending
          </h1>

          {/* Description */}
          <p className="mt-3 text-[#94A3B8] text-sm leading-relaxed">
            Please check your email inbox and click the verification link to activate your account.
          </p>

          {/* Email link */}
          <div className="mt-5 p-4 bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)]">
            <p className="text-[#64748B] text-xs uppercase tracking-wider mb-2">
              Verification sent to
            </p>
            <a
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              href={`https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(authData.user?.email)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail className="w-4 h-4" />
              {authData.user?.email}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Help text */}
          <p className="mt-4 text-xs text-[#64748B]">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}