// Generic document API. A document is identified by its template key; the
// backend template decides the source model, layout, storage and email.
import { fetchWithRefresh } from './api';

const API_URL = import.meta.env.VITE_NEST_API_URL;
// /storage/* is served outside the /api prefix.
const BACKEND_BASE_URL = API_URL.replace(/\/api.*$/, '');

// The backend wraps every response as { success, data } (global
// ResponseInterceptor); some handlers add their own envelope too.
const unwrap = (body) => {
  let value = body;
  while (
    value && typeof value === 'object' && !Array.isArray(value) &&
    'data' in value && Object.keys(value).every((k) => ['success', 'data', 'message'].includes(k))
  ) {
    value = value.data;
  }
  return value;
};

const readError = async (res, fallback) => {
  try {
    const data = await res.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
};

/** Templates available for a source model ("User", "Payment"…), filtered by the viewer's grade. */
export async function listDocuments(model, auth) {
  const res = await fetchWithRefresh(
    `${API_URL}/pdf/documents${model ? `?model=${encodeURIComponent(model)}` : ''}`,
    { method: 'GET' },
    auth.token,
    auth.setAuthData,
  );
  if (!res.ok) throw new Error(await readError(res, 'Impossible de charger les documents'));
  const docs = unwrap(await res.json());
  return Array.isArray(docs) ? docs : [];
}

/** Render a document without storing it. Returns a Blob. */
export async function previewDocument(templateKey, entityId, auth, params) {
  const res = await fetchWithRefresh(
    `${API_URL}/pdf/preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, entityId, ...(params ? { params } : {}) }),
    },
    auth.token,
    auth.setAuthData,
  );
  if (!res.ok) throw new Error(await readError(res, "Échec de la génération de l'aperçu"));
  return res.blob();
}

/**
 * Generate (and store) a document through the queue, then fetch it.
 * Returns { blob, downloadUrl, result }.
 */
export async function generateDocument(templateKey, entityId, auth, params, { timeoutMs = 60000 } = {}) {
  const jobRes = await fetchWithRefresh(
    `${API_URL}/pdf/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, entityId, ...(params ? { params } : {}) }),
    },
    auth.token,
    auth.setAuthData,
  );
  if (!jobRes.ok) throw new Error(await readError(jobRes, 'Échec de la création de la tâche'));
  const { jobId } = unwrap(await jobRes.json()) || {};
  if (!jobId) throw new Error('Réponse inattendue du serveur');

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2000));
    let status;
    try {
      const res = await fetchWithRefresh(`${API_URL}/pdf/jobs/${jobId}`, { method: 'GET' }, auth.token, auth.setAuthData);
      if (!res.ok) continue;
      status = unwrap(await res.json()) || {};
    } catch {
      continue;
    }
    if (status.status === 'failed') throw new Error(`La génération a échoué : ${status.error || 'erreur inconnue'}`);
    if (status.status === 'completed') {
      if (!status.downloadUrl) throw new Error("La génération est terminée mais aucun lien PDF n'a été retourné.");
      const blob = await fetchStoredPdf(status.downloadUrl, auth);
      return { blob, downloadUrl: status.downloadUrl, result: status.result };
    }
  }
  throw new Error('Délai dépassé – la génération a pris trop de temps.');
}

/** Email a document. The template decides whether the stored or a fresh PDF is attached. */
export async function emailDocument(templateKey, entityId, recipientEmail, auth, params) {
  const res = await fetchWithRefresh(
    `${API_URL}/pdf/email`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, entityId, recipientEmail, ...(params ? { params } : {}) }),
    },
    auth.token,
    auth.setAuthData,
  );
  if (!res.ok) throw new Error(await readError(res, "Échec de l'envoi"));
}

/** Revoke a certified document (File id): its QR then verifies as "révoqué". */
export async function revokeDocument(fileId, reason, auth) {
  const res = await fetchWithRefresh(
    `${API_URL}/pdf/files/${encodeURIComponent(fileId)}/revoke`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    auth.token,
    auth.setAuthData,
  );
  if (!res.ok) throw new Error(await readError(res, 'Échec de la révocation'));
  return unwrap(await res.json());
}

/** Undo a revocation. */
export async function reinstateDocument(fileId, auth) {
  const res = await fetchWithRefresh(
    `${API_URL}/pdf/files/${encodeURIComponent(fileId)}/reinstate`,
    { method: 'POST' },
    auth.token,
    auth.setAuthData,
  );
  if (!res.ok) throw new Error(await readError(res, 'Échec du rétablissement'));
  return unwrap(await res.json());
}

/** Fetch a stored PDF (absolute URL, or a /storage/… path on the backend). */
export async function fetchStoredPdf(url, auth) {
  const fullUrl = /^https?:\/\//.test(url) ? url : `${BACKEND_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const res = fullUrl.startsWith('https://res.cloudinary.com')
    ? await fetch(fullUrl)
    : await fetchWithRefresh(fullUrl, { method: 'GET' }, auth.token, auth.setAuthData);
  if (!res.ok) throw new Error('Impossible de récupérer le PDF');
  // A misrouted proxy answers 200 with the SPA's index.html instead of the PDF.
  if ((res.headers.get('content-type') || '').includes('text/html')) {
    throw new Error('Le serveur a renvoyé une page HTML au lieu du PDF.');
  }
  return res.blob();
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
