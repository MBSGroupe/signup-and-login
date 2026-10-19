import wilayasData from '../assets/data/wilayas.json';

// Wilaya / CLOA are stored as the bare number ("5", "25") and shown as
// "25 - Constantine".

const simplify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const NAME_BY_CODE = new Map(wilayasData.map((w) => [String(Number(w.code)), w.name]));
const CODE_BY_NAME = new Map(wilayasData.map((w) => [simplify(w.name), String(Number(w.code))]));

// "05", "25 - Constantine", "Batna" → "5", "25", "5". Unknown values unchanged.
export function wilayaCode(value) {
  if (value === null || value === undefined) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return trimmed;
  const m = /^0*(\d{1,2})(?:\s*-.*)?$/.exec(trimmed);
  if (m) return String(Number(m[1]));
  return CODE_BY_NAME.get(simplify(trimmed)) ?? trimmed;
}

// Display form: "25 - Constantine". Unknown values are shown as stored.
export function wilayaLabel(value, empty = '—') {
  if (value === null || value === undefined || String(value).trim() === '') return empty;
  const code = wilayaCode(value);
  const name = NAME_BY_CODE.get(code);
  return name ? `${code} - ${name}` : String(value);
}

// Options for a wilaya / CLOA <select>: stores the number, shows the label.
export const WILAYA_OPTIONS = wilayasData.map((w) => ({
  value: w.code,
  label: `${w.code} - ${w.name}`,
}));
