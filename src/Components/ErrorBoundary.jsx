// src/Components/ErrorBoundary.jsx
// Catches render errors in a page so one broken component shows a message
// instead of a white screen. Reset by giving it a new `key` (e.g. the route).
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-[#111827] border border-white/5 rounded-2xl p-8 shadow-xl">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-lg font-semibold text-[#F8FAFC]">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Cette page n'a pas pu s'afficher. Réessayez, ou revenez à l'accueil si le problème persiste.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-sm"
            >
              Recharger la page
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-[#1F2937] text-[#F8FAFC] hover:bg-[#2A3A4A] text-sm"
            >
              Accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}
