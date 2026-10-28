// src/Components/Export/exportApi.js

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

/** Rows above which the backend refuses an export (EXPORT_LIMITS.maxRows). */
export const EXPORT_MAX_ROWS = 50000;
/** Rows above which even a background export is refused (EXPORT_LIMITS.maxJobRows). */
export const EXPORT_MAX_JOB_ROWS = 500000;

// filename*=UTF-8''… first (exact name), then filename="…"
function fileNameFrom(disposition, fallback) {
  if (!disposition) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : fallback;
}

/** Rows the export would contain — POST /exports/:key/count. */
export async function countExport(authedFetch, reportKey, filters) {
  const res = await authedFetch(`${NEST_API_URL}/exports/${encodeURIComponent(reportKey)}/count`, {
    method: "POST",
    body: JSON.stringify({ filters }),
  });
  const body = await res.json();
  return body?.data?.rows ?? 0;
}

/**
 * Runs POST /exports/:key and saves the file.
 *   body: { format, lang, columns, filters }
 * Throws the backend error (403 not allowed, 413 too many rows…) with its
 * message, as authedFetch does.
 */
export async function downloadExport(authedFetch, reportKey, body) {
  const res = await authedFetch(`${NEST_API_URL}/exports/${encodeURIComponent(reportKey)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const fileName = await saveFile(res, `${reportKey}.${body.format === "csv" ? "csv" : "xlsx"}`);
  return { fileName, rows: Number(res.headers.get("X-Export-Rows")) || null };
}

/** A statistics page as XLSX — POST /exports/stats/:key { lang }. */
export async function downloadStatsExport(authedFetch, statsKey, lang) {
  const res = await authedFetch(`${NEST_API_URL}/exports/stats/${encodeURIComponent(statsKey)}`, {
    method: "POST",
    body: JSON.stringify({ lang }),
  });
  return saveFile(res, `stats_${statsKey}.xlsx`);
}

/** Saves a download response under the name the backend gave it. */
async function saveFile(res, fallback) {
  const blob = await res.blob();
  const fileName = fileNameFrom(res.headers.get("Content-Disposition"), fallback);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

// ── Background exports ("Mes exports") and schedules ───────────────

const json = async (res) => (await res.json())?.data;
const send = (authedFetch, method, path, body) =>
  authedFetch(`${NEST_API_URL}${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) }).then(json);

/** Queue an export: { kind: "report" | "stats", key, format, lang, columns, filters }. */
export const queueExport = (authedFetch, body) => send(authedFetch, "POST", "/export-jobs", body);
export const listExportJobs = (authedFetch) => send(authedFetch, "GET", "/export-jobs");
export const deleteExportJob = (authedFetch, id) => send(authedFetch, "DELETE", `/export-jobs/${encodeURIComponent(id)}`);
export async function downloadExportJob(authedFetch, job) {
  const res = await authedFetch(`${NEST_API_URL}/export-jobs/${encodeURIComponent(job.id)}/download`);
  return saveFile(res, job.fileName || `${job.reportKey}.xlsx`);
}

export const listSchedules = (authedFetch) => send(authedFetch, "GET", "/export-schedules");
export const createSchedule = (authedFetch, body) => send(authedFetch, "POST", "/export-schedules", body);
export const setScheduleActive = (authedFetch, id, active) =>
  send(authedFetch, "PATCH", `/export-schedules/${encodeURIComponent(id)}`, { active });
export const runScheduleNow = (authedFetch, id) => send(authedFetch, "POST", `/export-schedules/${encodeURIComponent(id)}/run`);
export const deleteSchedule = (authedFetch, id) => send(authedFetch, "DELETE", `/export-schedules/${encodeURIComponent(id)}`);
