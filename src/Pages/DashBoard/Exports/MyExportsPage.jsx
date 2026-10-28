// src/Pages/DashBoard/Exports/MyExportsPage.jsx
import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  History, Download, Trash2, Loader2, RefreshCw, CalendarClock, Play, Pause, CheckCircle2, XCircle, Clock, ArrowLeft,
} from "lucide-react";
import { UserContext } from "../../../Context/dataCont";
import { useError } from "../../../Context/ErrorContext";
import { useModal } from "../../../Context/ModalContext";
import {
  deleteExportJob, deleteSchedule, downloadExportJob, listExportJobs, listSchedules, runScheduleNow, setScheduleActive,
} from "../../../Components/Export/exportApi";

const STATUS = {
  queued: { label: "En attente", cls: "bg-slate-500/10 text-slate-300 border-slate-500/20", Icon: Clock },
  running: { label: "En préparation", cls: "bg-blue-500/10 text-blue-300 border-blue-500/20", Icon: Loader2 },
  done: { label: "Prêt", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", Icon: CheckCircle2 },
  failed: { label: "Échec", cls: "bg-rose-500/10 text-rose-300 border-rose-500/20", Icon: XCircle },
  expired: { label: "Expiré", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20", Icon: Clock },
};
const WEEKDAYS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

const dateTime = (v) => (v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");
const size = (b) => (b == null ? "—" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${(b / 1024 / 1024).toFixed(1)} Mo`);
const when = (s) => {
  const h = `${String(s.hour).padStart(2, "0")}:00`;
  if (s.frequency === "weekly") return `Chaque ${WEEKDAYS[s.weekday] ?? ""} à ${h}`;
  if (s.frequency === "monthly") return `Le ${s.monthDay === 1 ? "1er" : s.monthDay} de chaque mois à ${h}`;
  return `Chaque jour à ${h}`;
};

const th = "py-3 px-4 text-left text-[11px] uppercase tracking-wider text-[#64748B] font-semibold";
const td = "py-3 px-4 text-sm";
const iconBtn = "p-2 rounded-lg hover:bg-[#1F2937] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors disabled:opacity-40";

/**
 * Background exports (files kept 7 days, owner only) and scheduled sends of
 * the signed-in admin. Refreshes itself while a file is being prepared.
 */
export default function MyExportsPage() {
  const { authedFetch } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState(null);
  const [schedules, setSchedules] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([listExportJobs(authedFetch), listSchedules(authedFetch)]);
      setJobs(j ?? []);
      setSchedules(s ?? []);
    } catch (err) {
      showError(err?.message || "Chargement impossible");
      setJobs((x) => x ?? []);
      setSchedules((x) => x ?? []);
    }
  }, [authedFetch, showError]);

  useEffect(() => {
    load();
  }, [load]);

  // While something is being prepared, refresh every 3 s.
  const pending = (jobs ?? []).some((j) => j.status === "queued" || j.status === "running");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [pending, load]);

  const act = async (id, fn, done) => {
    setBusyId(id);
    try {
      await fn();
      if (done) showSuccess(done);
      await load();
    } catch (err) {
      showError(err?.message || "Action impossible");
    } finally {
      setBusyId(null);
    }
  };

  const removeJob = async (job) => {
    if (!(await confirm({ title: "Supprimer le fichier", message: `Supprimer « ${job.fileName || job.label.fr} » ?` }))) return;
    act(job.id, () => deleteExportJob(authedFetch, job.id), "Fichier supprimé");
  };
  const removeSchedule = async (s) => {
    if (!(await confirm({ title: "Supprimer la planification", message: `Ne plus envoyer « ${s.name} » ?` }))) return;
    act(s.id, () => deleteSchedule(authedFetch, s.id), "Planification supprimée");
  };

  return (
    <div className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-[#111827] rounded-2xl p-6 md:p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 flex flex-wrap items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <History className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mes exports</h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Fichiers préparés en arrière-plan (gardés 7 jours, visibles par vous seul) et envois planifiés.
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => navigate("/dash/exports")} className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#182233] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]">
              <ArrowLeft className="w-4 h-4" /> Exports
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#182233] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]">
              <RefreshCw className={`w-4 h-4 ${pending ? "animate-spin" : ""}`} /> Actualiser
            </button>
          </div>
        </div>

        {/* ── Files ─────────────────────────────────────────────── */}
        <section className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <h2 className="px-6 pt-5 pb-3 text-lg font-semibold">Fichiers</h2>
          {jobs === null ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
          ) : jobs.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[#64748B]">
              Aucun fichier. Dans la fenêtre d’export, « En arrière-plan » prépare le fichier ici.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-y border-[rgba(255,255,255,0.06)]">
                    <th className={th}>Export</th>
                    <th className={th}>Demandé le</th>
                    <th className={th}>Statut</th>
                    <th className={th}>Lignes</th>
                    <th className={th}>Taille</th>
                    <th className={th}>Disponible jusqu’au</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const st = STATUS[j.status] ?? STATUS.queued;
                    return (
                      <tr key={j.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30">
                        <td className={td}>
                          <div className="font-medium">{j.label.fr}</div>
                          <div className="text-xs text-[#64748B]">
                            {j.fileName || `${j.format.toUpperCase()}`}
                            {j.scheduled && " · envoi planifié"}
                          </div>
                          {j.status === "failed" && j.error && <div className="text-xs text-rose-400 mt-0.5">{j.error}</div>}
                        </td>
                        <td className={`${td} text-[#94A3B8]`}>{dateTime(j.createdAt)}</td>
                        <td className={td}>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${st.cls}`}>
                            <st.Icon className={`w-3.5 h-3.5 ${j.status === "running" ? "animate-spin" : ""}`} /> {st.label}
                          </span>
                        </td>
                        <td className={`${td} text-[#94A3B8]`}>{j.rows != null ? j.rows.toLocaleString("fr-FR") : "—"}</td>
                        <td className={`${td} text-[#94A3B8]`}>{size(j.size)}</td>
                        <td className={`${td} text-[#94A3B8]`}>{j.status === "done" ? dateTime(j.expiresAt) : "—"}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          <button
                            className={iconBtn}
                            disabled={j.status !== "done" || busyId === j.id}
                            onClick={() => act(j.id, () => downloadExportJob(authedFetch, j))}
                            title="Télécharger"
                            aria-label="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            className={iconBtn}
                            disabled={j.status === "running" || busyId === j.id}
                            onClick={() => removeJob(j)}
                            title="Supprimer"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Schedules ─────────────────────────────────────────── */}
        <section className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <h2 className="px-6 pt-5 pb-3 text-lg font-semibold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-400" /> Envois planifiés
          </h2>
          {schedules === null ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
          ) : schedules.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[#64748B]">
              Aucun envoi planifié. Dans la fenêtre d’export ou sur une page de statistiques, « Planifier… » crée un envoi par email.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-y border-[rgba(255,255,255,0.06)]">
                    <th className={th}>Envoi</th>
                    <th className={th}>Quand</th>
                    <th className={th}>Période</th>
                    <th className={th}>Destinataires</th>
                    <th className={th}>Prochain envoi</th>
                    <th className={th}>Dernier</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => {
                    const last = s.lastStatus ? STATUS[s.lastStatus] : null;
                    return (
                      <tr key={s.id} className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 ${s.active ? "" : "opacity-60"}`}>
                        <td className={td}>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-[#64748B]">{s.label.fr} · {s.format.toUpperCase()}</div>
                        </td>
                        <td className={`${td} text-[#94A3B8]`}>{when(s)}</td>
                        <td className={`${td} text-[#94A3B8]`}>{s.periodLabel}</td>
                        <td className={`${td} text-[#94A3B8] max-w-[220px]`}>
                          <span className="block truncate" title={s.recipients.join(", ")}>{s.recipients.join(", ")}</span>
                        </td>
                        <td className={`${td} text-[#94A3B8]`}>{s.active ? dateTime(s.nextRunAt) : "En pause"}</td>
                        <td className={td}>
                          {last ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${last.cls}`}>{last.label}</span>
                          ) : (
                            <span className="text-xs text-[#64748B]">—</span>
                          )}
                        </td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          <button className={iconBtn} disabled={busyId === s.id} onClick={() => act(s.id, () => runScheduleNow(authedFetch, s.id), "Envoi lancé")} title="Envoyer maintenant" aria-label="Envoyer maintenant">
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            className={iconBtn}
                            disabled={busyId === s.id}
                            onClick={() => act(s.id, () => setScheduleActive(authedFetch, s.id, !s.active), s.active ? "Mis en pause" : "Réactivé")}
                            title={s.active ? "Mettre en pause" : "Réactiver"}
                            aria-label={s.active ? "Mettre en pause" : "Réactiver"}
                          >
                            {s.active ? <Pause className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
                          </button>
                          <button className={iconBtn} disabled={busyId === s.id} onClick={() => removeSchedule(s)} title="Supprimer" aria-label="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
