/**
 * Value of a "number" form field, as sent to the server.
 *
 * A long identifier typed in a number field (an 18-digit NIN) must stay
 * text: as a JS number it is rounded past 2^53 (…123456 becomes …123456
 * rounded to a multiple of 16), and the wrong value is what gets saved.
 * Whole numbers that are exact are sent as numbers, as before.
 */
export const toNumberFieldValue = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const text = String(raw).trim();
  const num = Number(text);
  if (Number.isNaN(num)) return text;
  if (Number.isInteger(num) && !Number.isSafeInteger(num)) return text;
  return num;
};
