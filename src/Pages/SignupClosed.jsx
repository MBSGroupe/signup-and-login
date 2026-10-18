import { Link } from 'react-router-dom';
import { UserX } from 'lucide-react';

// Shown on /signup when VITE_SIGNUP_ENABLED=false
export default function SignupClosed() {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
      <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-10 max-w-md w-full text-center shadow-2xl shadow-black/50">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <UserX className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-[#F8FAFC]">Inscriptions fermées</h1>
        <p className="text-[#94A3B8] text-sm mt-2">
          Les inscriptions sont actuellement fermées. Veuillez réessayer ultérieurement.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-all"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
