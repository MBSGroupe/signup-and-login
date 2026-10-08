// src/Components/api/uploadValidationFile.js
// Shared helpers for the schema-driven validation form flow.

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

/** Unwrap the ResponseInterceptor envelope: { success, data } → data */
export const unwrap = (body) =>
  body && typeof body === 'object' && 'data' in body && 'success' in body
    ? body.data
    : body;

/**
 * Slugify a schema name into a stable folder name for uploaded files.
 *   "Déclaration"            → "declaration"
 *   "Changement d'adresse"   → "changement-d-adresse"
 */
export const getSchemaFolder = (sch) => {
  const raw = (sch?.name || sch?.title || 'declaration').toString();
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'declaration'
  );
};

/**
 * Upload a single file for a validation request.
 * Returns { fileId, name, url, size, mimeType } — send only `fileId`
 * in the request payload; the backend resolves it on read.
 */
export async function uploadValidationFile({
  file,
  folder,
  documentType,
  targetUserId,
  authToken,
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('documentType', documentType);

  const url = targetUserId
    ? `${NEST_API_URL}/files/${targetUserId}`
    : `${NEST_API_URL}/files/upload/temp`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'X-Client-Type': 'app',
    },
    body: formData,
  });

  const raw = await res.json().catch(() => null);
  const data = unwrap(raw);

  if (!res.ok) {
    throw new Error(
      data?.message || `Échec du téléversement du document ${documentType}`,
    );
  }

  const uploaded = data?.file || data;
  return {
    fileId: uploaded?.id || uploaded?._id || uploaded?.fileId,
    name: file.name,
    url: uploaded?.url || uploaded?.path,
    size: file.size,
    mimeType: file.type,
  };
}