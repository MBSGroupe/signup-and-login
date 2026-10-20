// src/Components/PageOutlet.jsx
// Layout outlet for lazily loaded pages: shows a loader while a page's code
// downloads and an error message (not a white screen) if it crashes. The
// boundary is keyed by path, so navigating away clears the error.
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

export function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" role="status" aria-label="Chargement">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
    </div>
  );
}

export default function PageOutlet() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}
