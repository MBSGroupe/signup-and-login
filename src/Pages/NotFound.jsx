// src/Pages/NotFound.jsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-6xl font-bold text-emerald-400">404</p>
        <h1 className="mt-4 text-xl font-semibold text-[#F8FAFC]">Page introuvable</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          L'adresse demandée n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-sm"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
