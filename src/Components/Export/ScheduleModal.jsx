// src/Components/Export/ScheduleModal.jsx
import { useContext, useState } from "react";
import { X, CalendarClock, Loader2, Mail, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../Context/dataCont";
import { useError } from "../../Context/ErrorContext";
import { createSchedule } from "./exportApi";

const FREQUENCIES = [
  { value: "daily", label: "Chaque jour" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
];
const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const PERIODS = [
  { value: "none", label: "Tout (les filtres choisis, sans période)" },
  { value: "previous_day", label: "La veille" },
  { value: "previous_week", label: "La semaine précédente (lundi → dimanche)" },
  { value: "previous_month", label: "Le mois précédent" },
];

const field =
  "w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500";

/**
 * Plan an export to run on its own and be emailed. It runs as you, with
 * your rights at the time of each run; recipients must be administrator
 * accounts (checked by the backend).
 *
 *   kind      "report" | "stats"
 *   reportKey catalog key
 *   label     { fr, ar } of the report
 *   params    { format, lang, columns, filters } chosen in the export window
 *   hasPeriod the report filters on dates (from / to)
 */
export default function ScheduleModal({ kind, reportKey, label, params = {}, hasPeriod, onClose }) {
  const { authData, authedFetch } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const navigate = useNavigate();

  const [name, setName] = useState(label.fr);
  const [frequency, setFrequency] = useState("monthly");
  const [weekday, setWeekday] = useState(1);
  const [monthDay, setMonthDay] = useState(1);
  const [hour, setHour] = useState(7);
  const [period, setPeriod] = useState(hasPeriod ? "previous_month" : "none");
  const [recipients, setRecipients] = useState(authData?.user?.email || "");
  const [busy, setBusy] = useState(false);

  const emails = recipients.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const replacesDates = period !== "none" && (params.filters?.from || params.filters?.to);

  const save = async () => {
    setBusy(true);
    try {
      await createSchedule(authedFetch, {
        kind,
        key: reportKey,
        format: params.format,
        lang: params.lang,
        columns: params.columns,
        filters: params.filters,
        name: name.trim() || label.fr,
        frequency,
        ...(frequency === "weekly" ? { weekday: Number(weekday) } : {}),
        ...(frequency === "monthly" ? { monthDay: Number(monthDay) } : {}),
        hour: Number(hour),
        period,
        recipients: emails,
      });
      showSuccess("Envoi planifié");
      onClose();
      navigate("/dash/exports/history");
    } catch (err) {
      showError(err?.message || "La planification a échoué");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      // Opened over the export window: its backdrop closes this one only.
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!busy) onClose();
      }}
    >
      <div
        className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 w-full max-w-xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-title"
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 id="schedule-title" className="text-xl font-bold text-[#F8FAFC] tracking-tight">Planifier l’envoi</h3>
              <p className="text-sm text-[#64748B] mt-0.5">{label.fr}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg hover:bg-[#1F2937]" aria-label="Fermer">
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Nom de l’envoi</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={field} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Fréquence</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={field}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            {frequency === "weekly" && (
              <label className="block">
                <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Jour</span>
                <select value={weekday} onChange={(e) => setWeekday(e.target.value)} className={field}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i + 1}>{d}</option>
                  ))}
                </select>
              </label>
            )}
            {frequency === "monthly" && (
              <label className="block">
                <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Le</span>
                <select value={monthDay} onChange={(e) => setMonthDay(e.target.value)} className={field}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d === 1 ? "1er" : d} du mois</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">À (heure d’Alger)</span>
              <select value={hour} onChange={(e) => setHour(e.target.value)} className={field}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
          </div>

          {hasPeriod && (
            <label className="block">
              <span className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Période couverte par chaque envoi</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={field}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {replacesDates && (
                <span className="block text-xs text-amber-400 mt-1.5">Les dates choisies dans les filtres seront remplacées par cette période à chaque envoi.</span>
              )}
            </label>
          )}

          <label className="block">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#64748B] mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Destinataires
            </span>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              rows={2}
              placeholder="email@cnoa.dz, autre@cnoa.dz"
              className={`${field} resize-none`}
            />
            <span className="block text-xs text-[#64748B] mt-1.5">
              {emails.length} destinataire{emails.length > 1 ? "s" : ""} · comptes administrateurs uniquement (10 au plus)
            </span>
          </label>

          <p className="flex items-start gap-2 text-xs text-[#64748B]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Chaque envoi est préparé avec vos droits au moment de l’envoi, avec les colonnes, la langue et les filtres
            choisis. Le fichier est joint au message (s’il fait moins de 8 Mo) et reste 7 jours dans « Mes exports ». Les
            destinataires reçoivent ce que vous pouvez exporter.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgba(255,255,255,0.06)]">
          <button onClick={onClose} disabled={busy} className="px-5 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl border border-[rgba(255,255,255,0.06)]">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={busy || !emails.length}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
            Planifier
          </button>
        </div>
      </div>
    </div>
  );
}
