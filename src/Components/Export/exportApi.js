// src/Components/Export/exportApi.js

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

/** Rows above which the backend refuses an export (EXPORT_LIMITS.maxRows). */
export const EXPORT_MAX_ROWS = 50000;

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
  const blob = await res.blob();
  const fileName = fileNameFrom(
    res.headers.get("Content-Disposition"),
    `${reportKey}.${body.format === "csv" ? "csv" : "xlsx"}`,
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { fileName, rows: Number(res.headers.get("X-Export-Rows")) || null };
}
