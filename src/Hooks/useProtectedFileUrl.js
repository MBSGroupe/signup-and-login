// src/Hooks/useProtectedFileUrl.js
//
// /storage/* requires a JWT, and browsers can't attach an Authorization
// header to <img>/<iframe>/<a>. These helpers fetch the file with the token
// and hand back a same-origin blob: URL. Public URLs (Cloudinary…) are used
// as is.
//
// A member's upload opened by anyone else (admins included) comes back as a
// watermarked image, never the file: `viewOnly` is then true, and screens
// must not offer to open / save it.
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../Context/dataCont";
import { fetchWithRefresh } from "../Components/api";
import { isStorageUrl as isProtected, resolveStorageUrl as toBackendUrl } from "../Utils/storageUrl";

// Local storage serves files at /storage/<key> (always from this
// environment's backend, whatever host the stored URL names); anything else
// (Cloudinary, bundled assets, data:/blob: URLs) is loaded directly.

/**
 * Fetch a protected file. Returns { url: blob URL (caller revokes it),
 * viewOnly: the server sent a watermarked view instead of the file, type }.
 */
export async function fetchProtectedFile(url, authData, setAuthData) {
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
  const blob = await res.blob();
  return {
    url: URL.createObjectURL(blob),
    viewOnly: res.headers.get("X-Document-View") === "watermarked",
    type: blob.type,
  };
}

/** Fetch a protected file and return a blob: URL (caller revokes it). */
export async function fetchProtectedFileUrl(url, authData, setAuthData) {
  return (await fetchProtectedFile(url, authData, setAuthData)).url;
}

/** Open a (possibly protected) file in a new tab. Not for view-only documents: use DocumentViewerModal. */
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
  const [state, setState] = useState({ src: null, loading: false, error: null, viewOnly: false, type: null });

  useEffect(() => {
    if (!url || !enabled) {
      setState({ src: null, loading: false, error: null, viewOnly: false, type: null });
      return;
    }
    if (!isProtected(url)) {
      setState({ src: url, loading: false, error: null, viewOnly: false, type: null });
      return;
    }

    let cancelled = false;
    let objectUrl = null;
    setState({ src: null, loading: true, error: null, viewOnly: false, type: null });
    fetchProtectedFile(url, authData, setAuthData)
      .then(({ url: blobUrl, viewOnly, type }) => {
        if (cancelled) return URL.revokeObjectURL(blobUrl);
        objectUrl = blobUrl;
        setState({ src: blobUrl, loading: false, error: null, viewOnly, type });
      })
      .catch((err) => {
        if (!cancelled) setState({ src: null, loading: false, error: err.message, viewOnly: false, type: null });
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
