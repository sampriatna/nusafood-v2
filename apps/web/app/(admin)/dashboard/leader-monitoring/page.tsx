"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  Eye,
  Send,
} from "lucide-react";
import {
  getLeaderMonitorDashboard,
  getLeaderStaffOptions,
  submitLeaderMonitor,
  updateLeaderMonitorFollowUp,
  fetchStaffList,
} from "@/lib/api/daily-report-client";
import type {
  LeaderMonitorDashboardData,
  LeaderMonitorTemplate,
  LeaderMonitorSubmission,
  LeaderMonitorStatus,
  LeaderItemScore,
  LeaderFollowUpStatus,
  StaffReportValidationStatus,
  Outlet,
} from "@nusafood/types";
import {
  LEADER_MONITOR_STATUS_OPTIONS,
  LEADER_SCORE_OPTIONS,
  STAFF_VALIDATION_OPTIONS,
  LEADER_FOLLOW_UP_OPTIONS,
  LEADER_SHIFTS,
} from "@nusafood/types";
import { cn } from "@/lib/utils";

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type View = "hub" | "form";

export default function LeaderMonitoringPage() {
  const [, startTransition] = useTransition();
  const [view, setView] = useState<View>("hub");
  const [date, setDate] = useState(todayLocal());
  const [outlet, setOutlet] = useState<Outlet | "ALL">("KBU");
  const [data, setData] = useState<LeaderMonitorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const [template, setTemplate] = useState<LeaderMonitorTemplate | null>(null);
  const [scores, setScores] = useState<Record<string, LeaderItemScore>>({});
  const [status, setStatus] = useState<LeaderMonitorStatus>("aman");
  const [shift, setShift] = useState<string>("Pagi");
  const [area, setArea] = useState("");
  const [problemNote, setProblemNote] = useState("");
  const [fixInstruction, setFixInstruction] = useState("");
  const [fixDeadline, setFixDeadline] = useState("");
  const [followUp, setFollowUp] = useState<LeaderFollowUpStatus>("open");
  const [relatedNames, setRelatedNames] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [staffValidation, setStaffValidation] = useState<StaffReportValidationStatus | "">("");
  const [submitting, setSubmitting] = useState(false);

  const [staffOptions, setStaffOptions] = useState<
    { staff_id: string; name: string; position: string; outlet: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const staffRes = await fetchStaffList({ status: "ACTIVE" });
      if (staffRes.success && staffRes.data) {
        const opt = await getLeaderStaffOptions(
          outlet === "ALL" ? undefined : outlet,
        );
        if (opt.success && opt.data) setStaffOptions(opt.data);
      }
      const dash = await getLeaderMonitorDashboard({
        date,
        outlet: outlet === "ALL" ? undefined : outlet,
      });
      if (dash.success && dash.data) setData(dash.data);
    } finally {
      setLoading(false);
    }
  }, [date, outlet]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const templates = data?.templates || [];

  const openForm = (t: LeaderMonitorTemplate) => {
    const initial: Record<string, LeaderItemScore> = {};
    for (const item of t.checklist) initial[item.id] = 2;
    startTransition(() => {
      setTemplate(t);
      setScores(initial);
      setStatus("aman");
      setShift(t.kind === "closing_control" ? "Malam" : t.kind === "jam_ramai_control" ? "Siang" : "Pagi");
      setArea(t.menu_label);
      setProblemNote("");
      setFixInstruction("");
      setFixDeadline("");
      setFollowUp("open");
      setRelatedNames("");
      setPhoto(undefined);
      setStaffValidation("");
      setView("form");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const derivedStatus = useMemo(() => {
    const vals = Object.values(scores);
    if (vals.some((v) => v === 0)) return "tidak_sesuai" as const;
    if (vals.some((v) => v === 1)) return "ada_catatan" as const;
    return "aman" as const;
  }, [scores]);

  useEffect(() => {
    if (view === "form") setStatus(derivedStatus);
  }, [derivedStatus, view]);

  const scoreTotal = Object.values(scores).reduce<number>((a, b) => a + b, 0);
  const scoreMax = (template?.checklist.length || 0) * 2;

  const handleSubmit = async () => {
    if (!template || submitting) return;
    const needsNote = status !== "aman";
    if (needsNote && !problemNote.trim()) {
      alert("Isi catatan masalah (wajib jika ada catatan / tidak sesuai).");
      return;
    }
    if (template.photo_mode === "required" && !photo) {
      alert("Foto bukti wajib.");
      return;
    }
    if (template.photo_mode === "required_if_issue" && needsNote && !photo) {
      alert("Foto wajib jika ada masalah.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaderMonitor({
        template_id: template.id,
        outlet_id: outlet === "ALL" ? "KBU" : outlet,
        shift,
        area,
        status,
        checklist_scores: Object.entries(scores).map(([item_id, score]) => ({
          item_id,
          score,
        })),
        related_staff_names: relatedNames,
        problem_note: problemNote,
        fix_instruction: fixInstruction,
        fix_deadline: fixDeadline || null,
        photo_base64: photo,
        follow_up_status: status === "aman" ? "selesai" : followUp,
        staff_validation: staffValidation || null,
        report_date: date,
      });

      if (result.success) {
        setFlash(`${template.menu_label} tersimpan`);
        setView("hub");
        setTemplate(null);
        await load();
        setTimeout(() => setFlash(null), 3500);
      } else {
        alert(result.error || "Gagal menyimpan");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const markFollowUp = async (sub: LeaderMonitorSubmission, statusFu: LeaderFollowUpStatus) => {
    const result = await updateLeaderMonitorFollowUp(sub.id, statusFu);
    if (result.success) await load();
    else alert(result.error || "Gagal update");
  };

  // —— FORM VIEW ——
  if (view === "form" && template) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-slate-800 text-white px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-slate-300 mb-1 disabled:opacity-40"
            onClick={() => !submitting && setView("hub")}
            disabled={submitting}
          >
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>
          <h1 className="text-xl font-bold leading-tight">{template.menu_label}</h1>
          {(template.target_time_start || template.target_time_end) && (
            <p className="text-slate-300 text-sm mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Target {template.target_time_start || "—"}–{template.target_time_end || "—"}
            </p>
          )}
        </header>

        <div className="p-4 space-y-4 max-w-lg mx-auto pb-32">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-bold">Staff submit ≠ otomatis benar</p>
            <p className="mt-1">
              Leader wajib cek fisik. Skor: 2 Aman · 1 Catatan · 0 Gagal.
            </p>
          </div>

          <div className="bg-white border rounded-xl p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">Standar hasil</p>
            {template.standard_result}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {LEADER_SHIFTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={cn(
                  "h-12 rounded-xl border-2 font-semibold text-sm active:scale-[0.98]",
                  shift === s ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold">Area</label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-12 text-base"
              placeholder="Contoh: Toilet customer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Checklist skor</h2>
              <span className="text-sm tabular-nums text-slate-500">
                {scoreTotal}/{scoreMax}
              </span>
            </div>
            {template.checklist.map((item) => {
              const sc = scores[item.id] ?? 2;
              return (
                <div key={item.id} className="bg-white border rounded-xl p-3 space-y-2">
                  <p className="text-[15px] text-slate-800 leading-snug">{item.item_text}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LEADER_SCORE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setScores((prev) => ({ ...prev, [item.id]: opt.value }))
                        }
                        className={cn(
                          "h-11 rounded-lg border-2 text-sm font-bold active:scale-[0.97]",
                          sc === opt.value
                            ? opt.value === 2
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                              : opt.value === 1
                                ? "border-amber-500 bg-amber-50 text-amber-900"
                                : "border-red-500 bg-red-50 text-red-900"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {opt.value} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold">Status overall</h2>
            {LEADER_MONITOR_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "w-full h-13 min-h-[52px] rounded-xl border-2 text-base font-semibold active:scale-[0.98]",
                  status === opt.value
                    ? opt.value === "aman"
                      ? "border-emerald-600 bg-emerald-50"
                      : opt.value === "ada_catatan"
                        ? "border-amber-500 bg-amber-50"
                        : "border-red-500 bg-red-50"
                    : "border-slate-200 bg-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {template.kind === "spot_check_area" && (
            <div className="space-y-2">
              <h2 className="font-semibold">Validasi laporan staff</h2>
              {STAFF_VALIDATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStaffValidation(opt.value)}
                  className={cn(
                    "w-full h-12 rounded-xl border-2 text-sm font-semibold text-left px-3",
                    staffValidation === opt.value
                      ? "border-slate-800 bg-slate-100"
                      : "border-slate-200 bg-white"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="font-semibold text-sm">Staff terkait</label>
            <Input
              value={relatedNames}
              onChange={(e) => setRelatedNames(e.target.value)}
              placeholder="Nama staff (pisah koma)"
              className="h-12 text-base"
              list="staff-name-list"
            />
            <datalist id="staff-name-list">
              {staffOptions.map((s) => (
                <option key={s.staff_id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-sm">
              Catatan masalah{status !== "aman" ? " *" : ""}
            </label>
            <Textarea
              value={problemNote}
              onChange={(e) => setProblemNote(e.target.value)}
              placeholder="Area bermasalah + masalah ditemukan"
              className="min-h-20 text-base"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-sm">Instruksi perbaikan</label>
            <Textarea
              value={fixInstruction}
              onChange={(e) => setFixInstruction(e.target.value)}
              placeholder="Apa yang harus diulang staff"
              className="min-h-16 text-base"
            />
          </div>

          {status !== "aman" && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Deadline perbaikan</label>
                <Input
                  type="time"
                  value={fixDeadline}
                  onChange={(e) => setFixDeadline(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">Follow up</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {LEADER_FOLLOW_UP_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFollowUp(opt.value)}
                      className={cn(
                        "h-11 rounded-lg border-2 text-xs font-bold",
                        followUp === opt.value
                          ? "border-slate-800 bg-slate-800 text-white"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <p className="font-semibold text-sm">
              Foto bukti
              {template.photo_mode === "required"
                ? " *"
                : template.photo_mode === "required_if_issue"
                  ? " (wajib jika ada masalah)"
                  : " (opsional)"}
            </p>
            <PhotoUploader label="" size="large" value={photo} onChange={setPhoto} />
          </div>
        </div>

        <div className="fixed bottom-0 inset-x-0 bg-white/95 border-t p-3">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-14 text-lg font-semibold active:scale-[0.98]"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                "Menyimpan…"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send className="h-5 w-5" /> Kirim Checklist Leader
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // —— HUB ——
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Leader Monitoring" showBack backHref="/dashboard" />

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-10">
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
          <p className="font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Monitoring Operasional Harian
          </p>
          <p>
            Staff submit bukan berarti pekerjaan otomatis benar. Leader wajib cek fisik.
            Jika foto lama, blur, beda area, atau lapangan tidak sesuai — tandai tidak
            valid / revisi.
          </p>
        </div>

        {flash && (
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {flash}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11"
          />
          <select
            className="h-11 rounded-md border px-2 text-sm bg-white"
            value={outlet}
            onChange={(e) => setOutlet(e.target.value as Outlet | "ALL")}
          >
            <option value="KBU">KBU</option>
            <option value="Kisamen">Kisamen</option>
            <option value="Samtaro Express">Samtaro Express</option>
            <option value="ALL">Semua</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Checklist hari ini" value={summary?.total_today ?? "—"} />
          <SummaryCard label="Area aman" value={summary?.area_aman ?? "—"} tone="green" />
          <SummaryCard
            label="Area bermasalah"
            value={summary?.area_bermasalah ?? "—"}
            tone="amber"
          />
          <SummaryCard
            label="Staff perlu perbaikan"
            value={summary?.staff_perlu_perbaikan ?? "—"}
            tone="red"
          />
          <SummaryCard label="Issue open" value={summary?.issue_open ?? "—"} tone="amber" />
          <SummaryCard label="Issue selesai" value={summary?.issue_selesai ?? "—"} tone="green" />
        </div>

        <section className="space-y-2.5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <ClipboardCheck className="h-4 w-4" />
            Isi checklist kontrol
          </h2>
          {loading && !templates.length ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openForm(t)}
                className="w-full text-left rounded-2xl border-2 border-slate-200 bg-white p-4 active:scale-[0.98] transition-transform shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{t.menu_label}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{t.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {t.checklist.length} titik · Foto{" "}
                      {t.photo_mode === "required"
                        ? "wajib"
                        : t.photo_mode === "required_if_issue"
                          ? "jika masalah"
                          : "opsional"}
                    </p>
                  </div>
                  <Eye className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                </div>
                <div className="mt-3 h-12 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center">
                  Mulai cek →
                </div>
              </button>
            ))
          )}
        </section>

        {(data?.staff_need_fix?.length || 0) > 0 && (
          <section className="space-y-2.5">
            <h2 className="font-semibold text-red-800 text-sm">
              Laporan staff perlu perbaikan
            </h2>
            {data!.staff_need_fix.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border-2 border-red-200 bg-red-50 p-3 space-y-2"
              >
                <p className="font-semibold text-slate-900">
                  {s.staff_name} · {s.report_title}
                </p>
                <p className="text-xs text-red-800 uppercase font-bold">
                  {s.leader_validation}
                </p>
                {s.leader_validation_note && (
                  <p className="text-sm text-slate-700">{s.leader_validation_note}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Quick validate from today's staff submissions needing attention —
            also link to daily reports */}
        <Link
          href="/dashboard/daily-reports"
          className="block rounded-xl border border-slate-200 bg-white p-4 text-sm"
        >
          <p className="font-semibold text-slate-900">Dashboard submit staff</p>
          <p className="text-slate-600 mt-1">
            Lihat siapa sudah/belum submit, lalu validasi dari sini atau Spot Check.
          </p>
        </Link>

        {(data?.submissions?.length || 0) > 0 && (
          <section className="space-y-2.5">
            <h2 className="font-semibold text-slate-800 text-sm">Hasil cek hari ini</h2>
            {data!.submissions.map((sub) => (
              <div
                key={sub.id}
                className={cn(
                  "rounded-xl border p-3 space-y-2",
                  sub.status === "aman"
                    ? "bg-emerald-50 border-emerald-200"
                    : sub.status === "ada_catatan"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                )}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-semibold text-slate-900">{sub.title || sub.kind}</p>
                  <span className="text-xs font-bold uppercase shrink-0">
                    {sub.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {sub.shift} · {sub.area} · skor {sub.score_total}/{sub.score_max} ·{" "}
                  {sub.leader_name}
                </p>
                {sub.problem_note && (
                  <p className="text-sm text-slate-700">{sub.problem_note}</p>
                )}
                {sub.status !== "aman" && sub.follow_up_status !== "selesai" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markFollowUp(sub, "on_progress")}
                    >
                      On Progress
                    </Button>
                    <Button size="sm" onClick={() => markFollowUp(sub, "selesai")}>
                      Selesai
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Hidden helper removed */}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "amber" | "red";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "green" && "bg-emerald-50 border-emerald-200",
        tone === "amber" && "bg-amber-50 border-amber-200",
        tone === "red" && "bg-red-50 border-red-200",
        !tone && "bg-slate-50 border-slate-200"
      )}
    >
      <p className="text-xs text-slate-600 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
