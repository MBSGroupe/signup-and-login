// src/Components/ScopeSummaryPanel.jsx
import {
  Shield,
  Globe,
  Filter,
  AlertCircle,
  MapPin,
  Building2,
  ShieldCheck,
  User,
} from 'lucide-react';

const LABEL_CLS =
  'text-[10px] font-mono uppercase tracking-[0.15em] text-[#64748B] font-medium';

// ─── Whitelist — ONLY these keys are ever rendered to the UI ───────
// Every other key (IDs, operators, unknown fields) is silently ignored.
const SAFE_KEYS = {
  region: { label: 'Région', icon: MapPin },
  wilaya: { label: 'Wilaya', icon: MapPin },
  commune: { label: 'Commune', icon: MapPin },
  tenantId: { label: 'Organisation', icon: Building2 },
  tenant: { label: 'Organisation', icon: Building2 },
  role: { label: 'Rôle', icon: Shield },
  roleName: { label: 'Rôle', icon: Shield },
  grade: { label: 'Grade', icon: User },
  nationality: { label: 'Nationalité', icon: Globe },
  nationalite: { label: 'Nationalité', icon: Globe },
};

// Prisma filter operators we must recurse into (never render)
const OPERATOR_KEYS = new Set([
  'OR',
  'AND',
  'NOT',
  'equals',
  'in',
  'not',
  'notIn',
  'contains',
  'startsWith',
  'endsWith',
  'lt',
  'lte',
  'gt',
  'gte',
]);

// ─── Extractor — walks the scope and pulls only whitelisted values ──
function extractReadableScope(scope) {
  const out = [];
  const seen = new Set();

  const push = (label, value) => {
    if (value === null || value === undefined) return;
    const str = String(value).trim();
    if (!str) return;
    const key = `${label}::${str}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, value: str });
  };

  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      // Operators — recurse, don't render
      if (OPERATOR_KEYS.has(key)) {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') walk(value);
        continue;
      }

      const safe = SAFE_KEYS[key];
      if (!safe) continue; // unknown key → skip entirely (never render IDs)

      if (typeof value === 'string' || typeof value === 'number') {
        push(safe.label, value);
        continue;
      }

      if (value && typeof value === 'object') {
        if ('equals' in value) push(safe.label, value.equals);
        if ('in' in value && Array.isArray(value.in)) {
          value.in.slice(0, 4).forEach((v) => push(safe.label, v));
          if (value.in.length > 4) {
            push(safe.label, `+${value.in.length - 4} autres`);
          }
        }
        walk(value);
      }
    }
  };

  walk(scope);
  return out;
}

// ─── Public component ───────────────────────────────────────────────
export default function ScopeSummaryPanel({
  scope,
  entityLabel = 'données',
}) {
  // ── Undefined: API didn't send a scope field ──
  if (scope === undefined) {
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-white/[0.04] border border-[rgba(255,255,255,0.08)] text-[#64748B] shrink-0">
          <AlertCircle className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des {entityLabel}</p>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Non fournie par l'API
          </p>
        </div>
      </div>
    );
  }

  // ── Null: global access ──
  if (scope === null) {
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <Globe className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des {entityLabel}</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Accès global — aucune restriction
          </p>
          <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
            Votre rôle autorise la lecture de l'ensemble des {entityLabel}.
          </p>
        </div>
      </div>
    );
  }

  // ── Empty object: no applicable rule ──
  const isEmpty =
    typeof scope === 'object' &&
    !Array.isArray(scope) &&
    Object.keys(scope).length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <Filter className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des {entityLabel}</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Aucune règle de portée applicable
          </p>
          <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
            Le filtre retourné est vide — aucune donnée ne sera visible.
          </p>
        </div>
      </div>
    );
  }

  // ── Real scope: extract whitelisted, human-readable fields only ──
  const readable = extractReadableScope(scope);

  if (readable.length === 0) {
    // Scope exists but contains only IDs / operators / unknown keys.
    // Never render them — show a friendly summary instead.
    return (
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des {entityLabel}</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Vue restreinte
          </p>
          <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
            Le périmètre de vos {entityLabel} est déterminé automatiquement
            par votre rôle et vos affectations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <Filter className="w-4 h-4" />
        </span>
        <div>
          <p className={LABEL_CLS}>Portée des {entityLabel}</p>
          <p className="text-sm text-[#F8FAFC] font-medium mt-0.5">
            Vue personnalisée selon votre rôle
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {readable.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A0F1C] border border-[rgba(255,255,255,0.08)] text-xs font-mono"
          >
            <span className="text-[#64748B]">{item.label}</span>
            <span className="text-[#475569]">·</span>
            <span className="text-emerald-300">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}