/**
 * Thin authorization helper for the frontend.
 *
 * The backend is the source of truth. This helper reads *only* data the
 * backend has already computed and shipped to the client via the
 * permission endpoints. It never re-implements rule evaluation.
 *
 * Return values are one of:
 *   'allow'    — the backend's shipped permission set explicitly grants this
 *   'deny'     — the backend's shipped permission set explicitly denies this
 *   'unknown'  — the frontend has no permission data for this (target, model),
 *                so the caller must attempt the operation and handle a 403
 *
 * Never treat 'unknown' as 'allow'. On 'unknown', the caller either:
 *   - falls back to a grade check (for nav / route gating), or
 *   - attempts the request and handles AUTHZ_OPERATION_DENIED / AUTHZ_FIELD_DENIED.
 */

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Operation-level check.
 *
 * @param {object} permissions  — the object returned by usePermissions()
 * @param {string} operation    — e.g. 'read', 'update', 'create', 'delete'
 * @returns {'allow'|'deny'|'unknown'}
 */
export function can(permissions, operation) {
  if (!permissions || !permissions.loaded) return "unknown";
  const ops = permissions.operations;
  if (!isPlainObject(ops) || typeof ops[operation] !== "boolean") {
    return "unknown";
  }
  return ops[operation] ? "allow" : "deny";
}

/**
 * Field-level check for a specific operation.
 *
 * @param {object} permissions  — the object returned by usePermissions()
 * @param {'view'|'edit'|'create'} op
 * @param {string} fieldName
 * @returns {'allow'|'deny'|'unknown'}
 */
export function canField(permissions, op, fieldName) {
  if (!permissions || !permissions.loaded) return "unknown";
  if (typeof fieldName !== "string" || fieldName.length === 0) return "unknown";

  let list;
  if (op === "view") list = permissions.canView;
  else if (op === "edit") list = permissions.canUpdate;
  else if (op === "create") list = permissions.canCreate;
  else return "unknown";

  if (!Array.isArray(list)) return "unknown";
  return list.includes(fieldName) ? "allow" : "deny";
}

/**
 * Convenience: is a field editable?
 *   true  → explicitly allowed
 *   false → explicitly denied
 *   null  → unknown
 */
export function isFieldEditable(permissions, fieldName) {
  const r = canField(permissions, "edit", fieldName);
  if (r === "allow") return true;
  if (r === "deny") return false;
  return null;
}

/**
 * Convenience: is a field viewable?
 */
export function isFieldViewable(permissions, fieldName) {
  const r = canField(permissions, "view", fieldName);
  if (r === "allow") return true;
  if (r === "deny") return false;
  return null;
}

/**
 * Grade comparison helper.
 *
 * Grade is stable and comes straight from the JWT/login response.
 * Use this for coarse nav/route gating; use `can` / `canField` for
 * operation and field gating.
 */
const GRADE_LEVEL = { user: 0, admin: 1, super_admin: 2 };

export function gradeAtLeast(userGrade, requiredGrade) {
  if (!(userGrade in GRADE_LEVEL) || !(requiredGrade in GRADE_LEVEL)) return false;
  return GRADE_LEVEL[userGrade] >= GRADE_LEVEL[requiredGrade];
}