// src/Hooks/useProtectedFileUrl.js
//
// /storage/* requires a JWT, and browsers can't attach an Authorization
// header to <img>/<iframe>/<a>. These helpers fetch the file with the token
// and hand back a same-origin blob: URL. Public URLs (Cloudinary…) are used
// as is.
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../Context/dataCont";
import { fetchWithRefresh } from "../Components/api";

const API_URL = import.meta.env.VITE_NEST_API_URL;
const BACKEND_BASE_URL = API_URL.replace(/\/api.*$/, "");

// Local storage serves files at /storage/<key>; anything else (Cloudinary,
// bundled assets, data:/blob: URLs) is loaded directly.
const isProtected = (url) => typeof url === "string" && url.includes("/storage/");

const toBackendUrl = (url) =>
  /^https?:\/\//.test(url) ? url : `${BACKEND_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

/** Fetch a protected file and return a blob: URL (caller revokes it). */
export async function fetchProtectedFileUrl(url, authData, setAuthData) {
  const res = await fetchWithRefresh(
    toBackendUrl(url),
    { method: "GET" },
    authData?.token,
    setAuthData,
    { type: authData?.user?.type },
  );
  if (!res.ok) {
    throw new Error(
      res.status === 403 ? "Accès refusé à ce fichier."
      : res.status === 404 ? "Fichier introuvable sur le serveur."
      : `Erreur ${res.status} lors du chargement du fichier.`,
    );
  }
  return URL.createObjectURL(await res.blob());
}

/** Open a (possibly protected) file in a new tab. */
export async function openProtectedFile(url, authData, setAuthData) {
  if (!url) return;
  if (!isProtected(url)) {
    window.open(url, "_blank", "noopener");
    return;
  }
  // Open the tab synchronously (popup blockers), then point it at the blob.
  const win = window.open("", "_blank");
  try {
    const blobUrl = await fetchProtectedFileUrl(url, authData, setAuthData);
    if (win) win.location.href = blobUrl;
    else window.location.href = blobUrl;
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}

/** Blob URL for `url` while mounted; `enabled=false` skips the fetch. */
export function useProtectedFileUrl(url, enabled = true) {
  const { authData, setAuthData } = useContext(UserContext);
  const [state, setState] = useState({ src: null, loading: false, error: null });

  useEffect(() => {
    if (!url || !enabled) {
      setState({ src: null, loading: false, error: null });
      return;
    }
    if (!isProtected(url)) {
      setState({ src: url, loading: false, error: null });
      return;
    }

    let cancelled = false;
    let objectUrl = null;
    setState({ src: null, loading: true, error: null });
    fetchProtectedFileUrl(url, authData, setAuthData)
      .then((blobUrl) => {
        if (cancelled) return URL.revokeObjectURL(blobUrl);
        objectUrl = blobUrl;
        setState({ src: blobUrl, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ src: null, loading: false, error: err.message });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Re-fetch when the file or the logged-in account changes, not on token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, authData?.user?.id]);

  return state;
}
