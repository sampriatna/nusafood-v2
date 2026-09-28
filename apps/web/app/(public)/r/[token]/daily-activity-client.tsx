"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Compass,
  Lightbulb,
  Loader2,
  MapPin,
  MessageCircle,
  PhoneCall,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_CONDITION_OPTIONS,
  type DailyActivityApiResponse,
  type DailyReportSubmission,
  type ReportConditionStatus,
  type ReportTemplate,
} from "@/lib/daily-activity-types";
import {
  WORK_SHIFT_CODES,
  WORK_SHIFT_DEFINITIONS,
  parseSopDescription,
  shiftHours,
  shiftTimeLabel,
  stripOperationalPrefix,
  templateAppliesToShift,
  type WorkShiftCode,
} from "@/lib/daily-activity-sop";
import { cn } from "@/lib/utils";
import { defaultInstruction, type ResolvedRule } from "@/lib/sop-coordination";
import type { SopTrackRecord } from "@/lib/services/sop-context.service";
import { POSITION_GROUP_LABELS } from "@/lib/position-groups";

type PageState = "loading" | "error" | "list" | "form" | "submitting";

type DailyReportStaffView = {
  staff_id: string;
  name: string;
  outlet: string;
  position: string;
  position_group?: string | null;
};

type StaffReportTokenData = {
  staff: DailyReportStaffView;
  templates: ReportTemplate[];
  today_submissions: DailyReportSubmission[];
  link_active: boolean;
  coordination?: ResolvedRule[];
  track_record?: SopTrackRecord | null;
};

type SubmitResponse = DailyReportSubmission | null;
type ShiftResponse = {
  shift_code: WorkShiftCode | null;
  is_waiter?: boolean;
  shift_options?: WorkShiftCode[];
};

type Props = {
  token: string;
  initialData?: StaffReportTokenData;
  initialError?: string;
};

function resolveInitialPageState(
  initialData?: StaffReportTokenData,
  initialError?: string,
): PageState {
  if (initialError) return "error";
  if (initialData) {
    if (!initialData.link_active) return "error";
    return "list";
  }
  return "loading";
}

function resolveInitialError(
  initialData?: StaffReportTokenData,
  initialError?: string,
): string {
  if (initialError) return initialError;
  if (initialData && !initialData.link_active) {
    return "Link report sudah nonaktif.\nHubungi admin.";
  }
  return "";
}

function checklistPercent(submission?: DailyReportSubmission) {
  if (!submission) return null;
  if (typeof submission.checklist_percent === "number") {
    return submission.checklist_percent;
  }
  if (!submission.checklist_total) return null;
  return Math.round(
    ((submission.checklist_checked ?? 0) / submission.checklist_total) * 100,
  );
}

function conditionLabel(value?: ReportConditionStatus | null) {
  return (
    REPORT_CONDITION_OPTIONS.find((option) => option.value === value)?.label ??
    "Belum pilih"
  );
}

function timeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function jakartaMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

type TimingState = "now" | "late" | "next" | "anytime" | "done";

function timingState(
  template: ReportTemplate,
  done: boolean,
  nowMinutes: number,
): TimingState {
  if (done) return "done";
  const start = timeToMinutes(template.target_time_start);
  const end = timeToMinutes(template.target_time_end);
  if (start === null && end === null) return "anytime";
  if (start !== null && nowMinutes < start) return "next";
  if (end !== null && nowMinutes > end) return "late";
  return "now";
}

function timingLabel(state: TimingState): string {
  if (state === "now") return "Kerjakan sekarang";
  if (state === "late") return "Belum selesai";
  if (state === "next") return "Berikutnya";
  if (state === "done") return "Selesai";
  return "Bisa dikerjakan";
}

export function DailyActivityClient({
  token,
  initialData,
  initialError,
}: Props) {
  const [, startTransition] = useTransition();
  const [pageState, setPageState] = useState<PageState>(() =>
    resolveInitialPageState(initialData, initialError),
  );
  const [errorMessage, setErrorMessage] = useState(() =>
    resolveInitialError(initialData, initialError),
  );
  const [staff, setStaff] = useState<DailyReportStaffView | null>(
    initialData?.staff ?? null,
  );
  const [templates, setTemplates] = useState<ReportTemplate[]>(
    initialData?.templates ?? [],
  );
  const [todaySubmissions, setTodaySubmissions] = useState<
    DailyReportSubmission[]
  >(initialData?.today_submissions ?? []);
  const [flashOk, setFlashOk] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [statusCondition, setStatusCondition] = useState<
    ReportConditionStatus | ""
  >("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [coordination, setCoordination] = useState<ResolvedRule[]>(
    initialData?.coordination ?? [],
  );
  const [trackRecord, setTrackRecord] = useState<SopTrackRecord | null>(
    initialData?.track_record ?? null,
  );
  const [pledged, setPledged] = useState(false);

  const [shiftCode, setShiftCode] = useState<WorkShiftCode | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftPickerOpen, setShiftPickerOpen] = useState(false);
  const [serverSaysWaiter, setServerSaysWaiter] = useState(false);
  const [shiftOptions, setShiftOptions] = useState<WorkShiftCode[]>([...WORK_SHIFT_CODES]);
  const todayKey = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
    [],
  );
  const [nowMinutes, setNowMinutes] = useState(() => jakartaMinutesNow());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(jakartaMinutesNow()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialData || initialError) return;

    if (!token) {
      setErrorMessage("Link tidak valid.\nHubungi atasan Anda.");
      setPageState("error");
      return;
    }

    let cancelled = false;

    async function load() {
      setPageState("loading");
      try {
        const res = await fetch(
          `/api/staff-reports/by-token/${encodeURIComponent(token)}`,
          { credentials: "include" },
        );
        const json =
          (await res.json()) as DailyActivityApiResponse<StaffReportTokenData>;

        if (cancelled) return;

        if (!json.success || !json.data) {
          setErrorMessage(
            json.error || "Link tidak valid.\nHubungi atasan Anda.",
          );
          setPageState("error");
          return;
        }

        if (!json.data.link_active) {
          setErrorMessage("Link report sudah nonaktif.\nHubungi admin.");
          setPageState("error");
          return;
        }

        setStaff(json.data.staff);
        setTemplates(json.data.templates ?? []);
        setTodaySubmissions(json.data.today_submissions ?? []);
        setCoordination(json.data.coordination ?? []);
        setTrackRecord(json.data.track_record ?? null);
        setPageState("list");
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Gagal memuat data.\nPeriksa koneksi internet Anda.",
          );
          setPageState("error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, initialData, initialError]);

  useEffect(() => {
    if (!token || initialError) {
      setShiftLoading(false);
      return;
    }
    let cancelled = false;
    async function loadShift() {
      try {
        const res = await fetch(
          `/api/staff-reports/shift?token=${encodeURIComponent(token)}`,
          { credentials: "include", cache: "no-store" },
        );
        const json = (await res.json()) as DailyActivityApiResponse<ShiftResponse>;
        if (cancelled) return;
        if (json.success && json.data) {
          setShiftCode(json.data.shift_code ?? null);
          setServerSaysWaiter(Boolean(json.data.is_waiter));
          if (json.data.shift_options?.length) setShiftOptions(json.data.shift_options);
        }
      } finally {
        if (!cancelled) setShiftLoading(false);
      }
    }
    void loadShift();
    return () => {
      cancelled = true;
    };
  }, [token, initialError]);

  const isWaiter =
    serverSaysWaiter || staff?.position_group === "Waiters" || staff?.position === "Waiters";

  const visibleTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const shifts = parseSopDescription(template.description).shift_codes;
        return templateAppliesToShift(shifts, shiftCode, template.category);
      }),
    [templates, shiftCode],
  );

  const requiredTemplates = useMemo(
    () => visibleTemplates.filter((template) => template.is_required_daily),
    [visibleTemplates],
  );

  const otherTemplates = useMemo(
    () => visibleTemplates.filter((template) => !template.is_required_daily),
    [visibleTemplates],
  );

  const alreadySubmitted = (templateId: string) =>
    todaySubmissions.find(
      (submission) => submission.report_template_id === templateId,
    );

  async function saveShift(next: WorkShiftCode) {
    if (shiftSaving) return;
    setShiftSaving(true);
    try {
      const res = await fetch("/api/staff-reports/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, shift_code: next }),
      });
      const json = (await res.json()) as DailyActivityApiResponse<ShiftResponse>;
      if (!json.success || !json.data) {
        alert(json.error || "Gagal menyimpan shift.");
        return;
      }
      setShiftCode(json.data.shift_code);
      setShiftPickerOpen(false);
    } catch {
      alert("Gagal menyimpan shift. Periksa koneksi internet.");
    } finally {
      setShiftSaving(false);
    }
  }

  function openForm(template: ReportTemplate) {
    const existing = alreadySubmitted(template.id);
    const initial: Record<string, boolean> = {};
    for (const item of template.checklist_items ?? []) {
      const previous = existing?.checklist_answers?.find(
        (answer) => answer.checklist_item_id === item.id,
      );
      initial[item.id] = Boolean(previous?.checked);
    }

    startTransition(() => {
      setSelectedTemplate(template);
      setCheckedMap(initial);
      setStatusCondition(existing?.status_condition ?? "");
      setNote(existing?.note ?? "");
      setPhotoUrl(existing?.photo_url ?? undefined);
      setPledged(false);
      setPageState("form");
    });

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function backToList() {
    startTransition(() => {
      setSelectedTemplate(null);
      setPageState("list");
    });
  }

  const selectedItems = selectedTemplate?.checklist_items ?? [];
  const checkedCount = selectedItems.filter((item) => checkedMap[item.id]).length;
  const totalCount = selectedItems.length;
  const requiredIncomplete = selectedItems.filter(
    (item) => item.is_required && !checkedMap[item.id],
  ).length;
  const conditionNeedsNote = Boolean(
    statusCondition &&
      REPORT_CONDITION_OPTIONS.find(
        (option) => option.value === statusCondition,
      )?.requiresNote,
  );

  async function handleSubmit() {
    if (!staff || !selectedTemplate || pageState === "submitting") return;

    if (!statusCondition) {
      alert("Pilih status kondisi kegiatan.");
      return;
    }
    if (statusCondition === "aman" && requiredIncomplete > 0) {
      alert(
        "Status Aman hanya boleh dipilih jika semua langkah wajib selesai. Jika ada yang belum bisa dikerjakan, pilih status kendala dan jelaskan kondisinya.",
      );
      return;
    }
    if (selectedTemplate.requires_photo && !photoUrl) {
      alert("Upload foto bukti sesuai kondisi terbaru.");
      return;
    }
    if (conditionNeedsNote && !note.trim()) {
      alert("Isi catatan kendala agar leader tahu apa yang harus ditindaklanjuti.");
      return;
    }
    if (!pledged) {
      alert("Centang pernyataan bahwa laporan ini sesuai kondisi asli.");
      return;
    }

    const checklistAnswers = selectedItems.map((item) => ({
      checklist_item_id: item.id,
      checked: Boolean(checkedMap[item.id]),
    }));

    if (
      checklistAnswers.length > 0 &&
      checklistAnswers.every((answer) => !answer.checked)
    ) {
      alert("Centang langkah yang memang sudah dikerjakan.");
      return;
    }

    setPageState("submitting");

    try {
      const res = await fetch("/api/staff-reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          report_template_id: selectedTemplate.id,
          status_condition: statusCondition,
          note,
          photo_url: photoUrl,
          checklist_answers: checklistAnswers,
        }),
      });
      const json =
        (await res.json()) as DailyActivityApiResponse<SubmitResponse>;

      if (!json.success) {
        setPageState("form");
        alert(json.error || "Gagal mengirim. Coba lagi.");
        return;
      }

      const submission: DailyReportSubmission =
        json.data ?? {
          id: `local-${selectedTemplate.id}`,
          staff_id: staff.staff_id,
          report_template_id: selectedTemplate.id,
          status_condition: statusCondition,
          note,
          photo_url: photoUrl,
          checklist_answers: checklistAnswers,
          checklist_checked: checklistAnswers.filter((answer) => answer.checked)
            .length,
          checklist_total: checklistAnswers.length,
          checklist_percent:
            checklistAnswers.length > 0
              ? Math.round(
                  (checklistAnswers.filter((answer) => answer.checked).length /
                    checklistAnswers.length) *
                    100,
                )
              : 100,
          submitted_at: new Date().toISOString(),
        };

      setTodaySubmissions((prev) => [
        ...prev.filter(
          (item) => item.report_template_id !== selectedTemplate.id,
        ),
        submission,
      ]);
      setFlashOk(selectedTemplate.title);
      setSelectedTemplate(null);
      setPageState("list");
      setTimeout(() => setFlashOk(null), 4000);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setPageState("form");
      alert("Gagal mengirim. Periksa koneksi internet.");
    }
  }

  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto size-9 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Memuat SOP...</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-destructive/20 bg-card p-6 text-center">
          <AlertTriangle className="mx-auto size-12 text-destructive" />
          <h1 className="text-xl font-bold">Link Tidak Valid</h1>
          <p className="whitespace-pre-line text-muted-foreground">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if ((pageState === "form" || pageState === "submitting") && selectedTemplate) {
    const isSubmitting = pageState === "submitting";
    const parsedMeta = parseSopDescription(selectedTemplate.description);
    const fallbackCopy = defaultInstruction(selectedTemplate.category);
    // Template lama belum punya copy "kenapa / dampak / cara kerja" → pakai bawaan per kategori.
    const meta = {
      ...parsedMeta,
      why_text: parsedMeta.why_text || fallbackCopy.why,
      operational_impact: parsedMeta.operational_impact || fallbackCopy.impact,
      instruction_note:
        parsedMeta.why_text || parsedMeta.operational_impact
          ? parsedMeta.instruction_note
          : fallbackCopy.how,
    };
    const goal = stripOperationalPrefix(
      selectedTemplate.standard_result || meta.fallback || selectedTemplate.title,
    );

    return (
      <div className="min-h-screen bg-muted/30 pb-28">
        <header className="sticky top-0 z-10 bg-primary px-4 py-3 text-primary-foreground shadow-sm">
          <button
            type="button"
            className="mb-1 inline-flex items-center gap-1 text-sm text-primary-foreground/80 active:opacity-70 disabled:opacity-40"
            onClick={backToList}
            disabled={isSubmitting}
          >
            <ChevronLeft className="size-4" />
            Kembali
          </button>
          <h1 className="text-xl font-bold leading-tight">
            {selectedTemplate.title}
          </h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-primary-foreground/80">
            {shiftCode ? <span>{shiftTimeLabel(shiftCode, todayKey)}</span> : null}
            {selectedTemplate.target_time_start || selectedTemplate.target_time_end ? (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                Target {selectedTemplate.target_time_start || "--"}–
                {selectedTemplate.target_time_end || "--"}
              </span>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-lg space-y-4 p-4">
          <section className="space-y-2 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Target className="size-4" />
              GOAL
            </div>
            <p className="text-[15px] font-medium leading-relaxed">{goal}</p>
          </section>

          {meta.why_text ? (
            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Lightbulb className="size-4 text-amber-600" />
                Kenapa ini penting?
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {meta.why_text}
              </p>
            </section>
          ) : null}

          {meta.operational_impact ? (
            <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
                <AlertTriangle className="size-4" />
                Dampak operasional jika dilewatkan
              </div>
              <p className="text-sm leading-relaxed text-amber-950/80">
                {meta.operational_impact}
              </p>
            </section>
          ) : null}

          {meta.instruction_note ? (
            <section className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Compass className="size-4 text-primary" />
                Cara kerja
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {meta.instruction_note}
              </p>
            </section>
          ) : null}

          {coordination.length ? (
            <CoordinationSection
              rules={coordination}
              context={`[SOP ${selectedTemplate.title}] ${staff?.name ?? ""} (${staff?.outlet ?? ""})`}
            />
          ) : null}

          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Langkah kerja</h2>
                <p className="text-xs text-muted-foreground">
                  Centang hanya yang benar-benar sudah dikerjakan.
                </p>
              </div>
              <span className="rounded-lg bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums">
                {checkedCount}/{totalCount}
              </span>
            </div>
            <div className="space-y-2">
              {selectedItems.map((item, index) => {
                const checked = Boolean(checkedMap[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setCheckedMap((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-transform active:scale-[0.98]",
                      checked
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-border bg-background",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-bold transition-colors",
                        checked
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-muted-foreground/30 bg-background text-muted-foreground",
                      )}
                    >
                      {checked ? <CheckCircle2 className="size-4" /> : index + 1}
                    </span>
                    <span className="pt-0.5 text-[15px] leading-snug">
                      {item.item_text}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedTemplate.requires_photo ? (
            <section className="space-y-3 rounded-2xl border bg-card p-4">
              <div>
                <p className="flex items-center gap-2 font-bold">
                  <Camera className="size-4" />
                  Bukti kondisi akhir
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Foto asli dan terbaru. Ambil kondisi yang membantu leader melihat hasil kerja, bukan sekadar memenuhi upload.
                </p>
              </div>
              <PhotoUploader
                key={selectedTemplate.id}
                label=""
                required
                size="large"
                value={photoUrl}
                onChange={setPhotoUrl}
                upload={
                  staff
                    ? {
                        taskId: `daily-${staff.staff_id}`,
                        token,
                        context: "daily_report",
                      }
                    : undefined
                }
              />
            </section>
          ) : null}

          <section className="space-y-2 rounded-2xl border bg-card p-4">
            <h2 className="font-bold">Kondisi setelah dikerjakan</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Pilih Aman hanya jika semua langkah wajib selesai. Kalau ada yang belum beres, laporkan apa adanya agar bisa ditindaklanjuti.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {REPORT_CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStatusCondition(option.value)}
                  className={cn(
                    "min-h-[50px] rounded-xl border-2 bg-background px-3 py-3 text-left text-[15px] font-semibold transition-transform active:scale-[0.98]",
                    statusCondition === option.value &&
                      (option.value === "aman"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-amber-500 bg-amber-50 text-amber-900"),
                  )}
                >
                  {option.value === "aman" ? "Aman — semua langkah selesai" : option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border bg-card p-4">
            <label className="block font-bold">
              Catatan{conditionNeedsNote ? " *" : " (opsional)"}
            </label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Untuk handover/kendala, tulis singkat: apa yang terjadi, status sekarang, dan siapa yang perlu melanjutkan.
            </p>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Contoh: Stok susu tinggal 2 liter jam 15.00, sudah info ke Leader (Budi) dan Purchasing."
              className="min-h-24 text-base"
              disabled={isSubmitting}
            />
          </section>

          <label
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 p-4",
              pledged ? "border-emerald-500 bg-emerald-50" : "border-dashed border-primary/40 bg-card",
            )}
          >
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-emerald-600"
              checked={pledged}
              onChange={(event) => setPledged(event.target.checked)}
              disabled={isSubmitting}
            />
            <span className="text-sm leading-relaxed">
              <span className="font-bold">Saya menyatakan laporan ini sesuai kondisi asli.</span>{" "}
              Yang saya centang benar-benar sudah dikerjakan dan foto diambil hari ini. Leader
              melakukan cek fisik secara acak dan membandingkan dengan laporan ini.
            </span>
          </label>
        </main>

        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="mx-auto max-w-lg">
            <Button
              className="h-14 w-full text-lg font-semibold transition-transform active:scale-[0.98]"
              disabled={isSubmitting}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="size-5" />
                  Simpan Hasil SOP
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const doneRequired = requiredTemplates.filter((template) =>
    alreadySubmitted(template.id),
  ).length;

  const sortedRequired = [...requiredTemplates].sort((a, b) =>
    (a.target_time_start || "99:99").localeCompare(b.target_time_start || "99:99"),
  );
  const actionTemplates = sortedRequired.filter((template) => {
    const state = timingState(template, Boolean(alreadySubmitted(template.id)), nowMinutes);
    return state === "now" || state === "late" || state === "anytime";
  });
  const upcomingTemplates = sortedRequired.filter(
    (template) =>
      timingState(template, Boolean(alreadySubmitted(template.id)), nowMinutes) ===
      "next",
  );
  const doneTemplates = sortedRequired.filter(
    (template) =>
      timingState(template, Boolean(alreadySubmitted(template.id)), nowMinutes) ===
      "done",
  );

  function renderCard(template: ReportTemplate) {
    const done = alreadySubmitted(template.id);
    const percent = checklistPercent(done);
    const isKendala =
      template.kind === "issue_quick" || template.category === "Kendala";
    const meta = parseSopDescription(template.description);
    const state = timingState(template, Boolean(done), nowMinutes);
    const goal = stripOperationalPrefix(
      template.standard_result || meta.fallback || template.title,
    );

    return (
      <button
        key={template.id}
        type="button"
        onClick={() => openForm(template)}
        className={cn(
          "w-full rounded-2xl border-2 p-4 text-left shadow-sm transition-transform active:scale-[0.98]",
          isKendala
            ? "border-amber-300 bg-amber-50"
            : state === "late"
              ? "border-amber-300 bg-card"
              : state === "now"
                ? "border-primary/50 bg-card"
                : "border-border bg-card",
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {!isKendala ? (
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-bold",
                      state === "done"
                        ? "bg-emerald-100 text-emerald-800"
                        : state === "late"
                          ? "bg-amber-100 text-amber-900"
                          : state === "now"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {timingLabel(state)}
                  </span>
                ) : null}
                {template.target_time_start ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {template.target_time_start}
                    {template.target_time_end ? `–${template.target_time_end}` : ""}
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg font-bold leading-tight">{template.title}</h2>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {goal}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{template.checklist_items?.length ?? 0} langkah</span>
                {template.requires_photo ? (
                  <span className="inline-flex items-center gap-1">
                    <Camera className="size-3" /> Foto kondisi akhir
                  </span>
                ) : null}
                {done ? (
                  <span className="font-semibold text-emerald-700">
                    {done.status_condition === "aman"
                      ? `Selesai ${percent ?? "?"}%`
                      : conditionLabel(done.status_condition)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold",
              isKendala
                ? "bg-amber-500 text-white"
                : done
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "bg-primary text-primary-foreground",
            )}
          >
            {isKendala
              ? "Lapor kendala"
              : done
                ? "Lihat / update SOP"
                : "Mulai SOP"}
          </div>
        </div>
      </button>
    );
  }

  const showShiftPicker =
    isWaiter && !shiftLoading && (!shiftCode || shiftPickerOpen);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary px-4 py-4 text-primary-foreground">
        <p className="mb-0.5 text-sm text-primary-foreground/80">SOP Kerja Hari Ini</p>
        <h1 className="text-2xl font-bold">{staff?.name ?? "Staff"}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
            <MapPin className="size-3.5" />
            {staff?.outlet ?? "-"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
            <Briefcase className="size-3.5" />
            {staff?.position ?? "-"}
          </span>
          {shiftCode ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
              <Clock className="size-3.5" />
              {shiftTimeLabel(shiftCode, todayKey)}
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-10">
        {flashOk ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="size-5 shrink-0" />
            {flashOk} tersimpan
          </div>
        ) : null}

        {shiftLoading && isWaiter ? (
          <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat shift hari ini...
          </div>
        ) : null}

        {showShiftPicker ? (
          <section className="space-y-4 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Sebelum mulai SOP
              </p>
              <h2 className="mt-1 text-xl font-bold">Kamu shift berapa hari ini?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Pilihan ini menentukan SOP yang memang menjadi tanggung jawabmu. Shift pagi mengerjakan opening, shift terakhir melakukan final closing outlet.
              </p>
            </div>
            <div className="space-y-2">
              {shiftOptions.map((code) => {
                const shift = { ...WORK_SHIFT_DEFINITIONS[code], ...shiftHours(code, todayKey) };
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={shiftSaving}
                    onClick={() => void saveShift(code)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-transform active:scale-[0.98]",
                      shiftCode === code
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background",
                    )}
                  >
                    <div>
                      <p className="text-lg font-bold">{code}</p>
                      <p className="text-sm font-medium">
                        {shift.start}–{shift.end}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {shift.description}
                      </p>
                    </div>
                    {shiftSaving ? null : shiftCode === code ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {shiftCode ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShiftPickerOpen(false)}
              >
                Batal ganti shift
              </Button>
            ) : null}
          </section>
        ) : (
          <>
            {isWaiter && shiftCode ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Shift hari ini</p>
                  <p className="font-bold">{shiftTimeLabel(shiftCode, todayKey)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShiftPickerOpen(true)}
                >
                  Koreksi shift
                </Button>
              </div>
            ) : null}

            {trackRecord ? <TrackRecordCard record={trackRecord} /> : null}

            <div className="rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Progress SOP wajib</p>
                  <p className="text-xs text-muted-foreground">
                    Kerjakan sesuai waktu dan kondisi operasional, bukan sekadar mengejar centang.
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums">
                  {doneRequired}/{requiredTemplates.length}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${requiredTemplates.length ? Math.round((doneRequired / requiredTemplates.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {actionTemplates.length > 0 ? (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <ClipboardList className="size-4 text-primary" />
                  Perlu perhatian sekarang
                </h2>
                {actionTemplates.map(renderCard)}
              </section>
            ) : null}

            {upcomingTemplates.length > 0 ? (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <Clock className="size-4" /> Berikutnya
                </h2>
                {upcomingTemplates.map(renderCard)}
              </section>
            ) : null}

            {doneTemplates.length > 0 ? (
              <section className="space-y-2.5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="size-4" /> Selesai hari ini
                </h2>
                {doneTemplates.map(renderCard)}
              </section>
            ) : null}

            {requiredTemplates.length === 0 ? (
              <div className="space-y-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Belum ada SOP wajib yang cocok untuk posisi/shift hari ini.
                </p>
                <p>Jika ini tidak sesuai jadwalmu, hubungi leader.</p>
              </div>
            ) : null}

            {otherTemplates.length > 0 ? (
              <section className="space-y-2.5 pt-1">
                <h2 className="text-sm font-bold">Butuh bantuan / ada masalah?</h2>
                {otherTemplates.map(renderCard)}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function positionLabel(position: string): string {
  return (POSITION_GROUP_LABELS as Record<string, string>)[position] ?? position;
}

/** "Kalau ada masalah, hubungi siapa" — nama yang bertugas hari ini + tombol WA. */
function CoordinationSection({ rules, context }: { rules: ResolvedRule[]; context: string }) {
  return (
    <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-sky-950">
          <PhoneCall className="size-4" />
          Koordinasi — kalau ada masalah, hubungi
        </div>
        <p className="mt-1 text-xs text-sky-950/70">
          Jangan disimpan sendiri. Nama di bawah adalah yang bertugas hari ini.
        </p>
      </div>
      <ul className="space-y-2.5">
        {rules.map((rule) => (
          <li key={rule.when} className="rounded-xl border bg-background p-3">
            <p className="text-sm font-semibold leading-snug">
              {rule.urgent ? (
                <span className="mr-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-800">
                  SEGERA
                </span>
              ) : null}
              {rule.when}
            </p>
            <div className="mt-2 space-y-1.5">
              {rule.targets.map((target) => (
                <div key={target.position} className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">{positionLabel(target.position)}:</span>
                  {target.contacts.length ? (
                    target.contacts.slice(0, 3).map((c) =>
                      c.wa_link ? (
                        <a
                          key={c.staff_id}
                          href={`${c.wa_link}?text=${encodeURIComponent(`${context}\n${rule.when}: `)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white active:opacity-80"
                        >
                          <MessageCircle className="size-3.5" />
                          {c.name}
                          {c.shift ? ` · ${c.shift}` : ""}
                        </a>
                      ) : (
                        <span key={c.staff_id} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                          {c.name}
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      belum ada di jadwal hari ini — lapor ke leader
                    </span>
                  )}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Rekam jejak cek leader 7 hari — staff tahu laporannya benar-benar dilihat. */
function TrackRecordCard({ record }: { record: SopTrackRecord }) {
  const VALIDATION_LABEL: Record<string, string> = {
    revisi: "Revisi",
    tidak_valid: "Tidak valid",
    manipulasi: "Manipulasi",
  };
  const checked = record.valid + record.revisi + record.tidak_valid;
  return (
    <section className="space-y-2 rounded-xl border border-primary/20 bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" />
        Laporanmu dicek leader
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Leader cek fisik secara acak dan mencocokkan foto. {record.days} hari terakhir:{" "}
        <b className="text-foreground">{record.total}</b> laporan,{" "}
        <b className="text-foreground">{checked}</b> sudah dicek —{" "}
        <span className="text-emerald-700">{record.valid} valid</span>
        {record.revisi ? <>, <span className="text-amber-700">{record.revisi} revisi</span></> : null}
        {record.tidak_valid ? <>, <span className="text-red-700">{record.tidak_valid} tidak valid</span></> : null}.
      </p>
      {record.latest_findings.length ? (
        <ul className="space-y-1.5">
          {record.latest_findings.map((f, i) => (
            <li key={`${f.date}-${i}`} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <b>{VALIDATION_LABEL[f.validation] ?? f.validation}</b> · {f.title} ·{" "}
              {new Date(`${f.date}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              {f.note ? <> — “{f.note}”</> : null}
              {f.by ? <span className="text-amber-950/70"> ({f.by})</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
