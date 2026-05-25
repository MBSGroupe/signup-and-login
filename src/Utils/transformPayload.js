/**
 * Converts date fields in an object from 'YYYY-MM-DD' to ISO-8601 datetime 'YYYY-MM-DDTHH:MM:SSZ'
 * @param {Object} payload - The object to transform
 * @param {Array} dateFields - List of field names (including dot notation) that contain dates
 * @returns {Object} - New object with transformed dates
 */
export function transformDates(payload, dateFields = []) {
  const newPayload = { ...payload };

  const defaultDateFields = [
    'startDate',
    'dateOfBirth',
    'dueDate',
    'activityStartDate',
    'actvityStartDate', // typo variant
    'lastLogin',
    'lockUntil',
    'passwordChangedAt',
    'expiresAt'
  ];

  const fieldsToCheck = dateFields.length > 0 ? dateFields : defaultDateFields;

  for (const field of fieldsToCheck) {
    if (newPayload[field]) {
      const value = newPayload[field];
      // If value looks like YYYY-MM-DD (no time part)
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        newPayload[field] = `${value}T00:00:00.000Z`;
      }
    }
  }

  // Also handle nested objects (e.g., user.preferences? not needed)
  return newPayload;
}