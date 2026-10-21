// Where stored files (/storage/<key>) are fetched from.
//
// Many File rows keep the absolute URL of the server that imported them
// (https://eventscnoa.dz/storage/…). Fetching that host from another
// environment (local, LAN, staging) fails on CORS and reads the wrong
// server's files, so any /storage/ path is sent to THIS environment's
// backend (VITE_NEST_API_URL). Other absolute URLs (Cloudinary…) are kept.

const API_URL = import.meta.env.VITE_NEST_API_URL || '';

// /storage/* is served outside the /api prefix.
export const BACKEND_BASE_URL = API_URL.replace(/\/api.*$/, '');

export const isStorageUrl = (url) => typeof url === 'string' && url.includes('/storage/');

/** Absolute URL to fetch `url` from: /storage/ paths on this backend, other absolute URLs as is. */
export function resolveStorageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const at = url.indexOf('/storage/');
  if (at >= 0) return `${BACKEND_BASE_URL}${url.slice(at)}`;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${BACKEND_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
