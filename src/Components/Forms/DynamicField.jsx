// Components/Forms/DynamicField.jsx
import { useEffect, useMemo } from "react";

/**
 * Renders a single form field based on its config.
 *
 * Config shape (mirrors backend field configs):
 *   { label, type, placeholder, validation: { required, options, fileTypes }, ui: { placeholder } }
 *
 * Types supported: text, email, password, number, date, tel,
 *                  select, boolean, wilaya, commune, image, file
 */
export default function DynamicField({
  name,
  value,
  onChange,
  config = {},
  wilayasData = [],
  parentWilayaCode,
  disabled = false,
  required = false,
}) {
  const label = config.label || prettify(name);
  const type = config.type || inferType(name);
  const placeholder = config.ui?.placeholder || config.placeholder || "";

  const inputCls =
    "w-full px-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] " +
    "placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 " +
    "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const labelCls =
    "block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5";

  // ── Wilaya ────────────────────────────────────────────────────────
  if (type === "wilaya" || name === "wilaya" || name === "wilayaPro" || name === "employerWilaya" || name === "region") {
    return (
      <FieldWrapper label={label} required={required}>
        <select
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          className={inputCls}
        >
          <option value="">Sélectionner une wilaya</option>
          {wilayasData.map((w) => (
            <option key={w.code} value={w.code}>
              {w.code} - {w.name}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  // ── Commune (filtered by parent wilaya) ──────────────────────────
  if (type === "commune" || name === "commune" || name === "communePro" || name === "employerCommune") {
    const communes = useMemo(
      () => (parentWilayaCode
        ? wilayasData.find((w) => w.code === parentWilayaCode)?.communes || []
        : []),
      [parentWilayaCode, wilayasData],
    );

    return (
      <FieldWrapper label={label} required={required}>
        <select
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled || !parentWilayaCode}
          className={inputCls}
        >
          <option value="">
            {parentWilayaCode ? "Sélectionner une commune" : "Sélectionnez d'abord une wilaya"}
          </option>
          {communes.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  // ── Boolean ──────────────────────────────────────────────────────
  if (type === "boolean" || name.startsWith("is") || name.startsWith("has")) {
    const isTrue = value === true || value === "true";
    return (
      <FieldWrapper label={label} required={required}>
        <div className="flex items-center gap-4 py-2">
          <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC] cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={isTrue}
              onChange={() => onChange({ target: { name, value: true } })}
              disabled={disabled}
              className="w-4 h-4 accent-emerald-500"
            />
            Oui
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[#F8FAFC] cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={!isTrue}
              onChange={() => onChange({ target: { name, value: false } })}
              disabled={disabled}
              className="w-4 h-4 accent-emerald-500"
            />
            Non
          </label>
        </div>
      </FieldWrapper>
    );
  }

  // ── Select with options ──────────────────────────────────────────
  if (type === "select" && Array.isArray(config.validation?.options)) {
    return (
      <FieldWrapper label={label} required={required}>
        <select
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          className={inputCls}
        >
          <option value="">Sélectionner...</option>
          {config.validation.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  // ── Date ─────────────────────────────────────────────────────────
  if (type === "date") {
    const dateValue = value ? new Date(value).toISOString().split("T")[0] : "";
    return (
      <FieldWrapper label={label} required={required}>
        <input
          type="date"
          name={name}
          value={dateValue}
          onChange={onChange}
          disabled={disabled}
          className={inputCls}
        />
      </FieldWrapper>
    );
  }

  // ── Email ────────────────────────────────────────────────────────
  if (type === "email") {
    return (
      <FieldWrapper label={label} required={required}>
        <input
          type="email"
          name={name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputCls}
        />
      </FieldWrapper>
    );
  }

  // ── Password ─────────────────────────────────────────────────────
  if (type === "password") {
    return (
      <FieldWrapper label={label} required={required}>
        <input
          type="password"
          name={name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="new-password"
          className={inputCls}
        />
      </FieldWrapper>
    );
  }

  // ── Text / number / tel / fallback ───────────────────────────────
  return (
    <FieldWrapper label={label} required={required}>
      <input
        type={type === "text" ? "text" : type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputCls}
      />
    </FieldWrapper>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function FieldWrapper({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function prettify(name) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function inferType(name) {
  if (name.toLowerCase().includes("email")) return "email";
  if (name.toLowerCase().includes("password")) return "password";
  if (name.toLowerCase().includes("date")) return "date";
  if (name === "phone" || name === "fixe" || name === "fax") return "tel";
  return "text";
}