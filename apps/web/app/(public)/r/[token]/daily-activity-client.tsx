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
  Loader2,
  MapPin,
  Send,
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
import { cn } from "@/lib/utils";

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
};

type SubmitResponse = DailyReportSubmission | null;

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

  const requiredTemplates = useMemo(
    () => templates.filter((template) => template.is_required_daily),
    [templates],
  );

  const otherTemplates = useMemo(
    () => templates.filter((template) => !template.is_required_daily),
    [templates],
  );

  const alreadySubmitted = (templateId: string) =>
    todaySubmissions.find(
      (submission) => submission.report_template_id === templateId,
    );

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
  const checkedCount = selectedItems.filter((item) => checkedMap[item.id])
    .length;
  const totalCount = selectedItems.length;
  const conditionNeedsNote = Boolean(
    statusCondition &&
      REPORT_CONDITION_OPTIONS.find(
        (option) => option.value === statusCondition,
      )?.requiresNote,
  );

  async function handleSubmit() {
    if (!staff || !selectedTemplate || pageState === "submitting") return;

    if (!statusCondition) {
      alert("PILIH STATUS KONDISI");
      return;
    }
    if (selectedTemplate.requires_photo && !photoUrl) {
      alert("HARAP UPLOAD FOTO BUKTI");
      return;
    }
    if (conditionNeedsNote && !note.trim()) {
      alert("ISI CATATAN KENDALA");
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
      alert("Centang minimal beberapa checklist yang sudah dikerjakan.");
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
          <p className="text-sm font-medium text-muted-foreground">Memuat...</p>
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
    const isPA =
      staff?.position_group === "PA" || selectedTemplate.position_group === "PA";

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
          {selectedTemplate.target_time_start ||
          selectedTemplate.target_time_end ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-primary-foreground/80">
              <Clock className="size-3.5" />
              Target {selectedTemplate.target_time_start || "--"}-
              {selectedTemplate.target_time_end || "--"}
            </p>
          ) : null}
        </header>

        <main className="mx-auto max-w-lg space-y-4 p-4">
          <section className="space-y-1.5 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-primary" />
              Standar hasil
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {selectedTemplate.standard_result || selectedTemplate.description}
            </p>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Checklist kerja</h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                {checkedCount}/{totalCount}
              </span>
            </div>
            <div className="space-y-2">
              {selectedItems.map((item) => {
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
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        checked
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-muted-foreground/30 bg-background",
                      )}
                    >
                      {checked ? <CheckCircle2 className="size-4" /> : null}
                    </span>
                    <span className="pt-0.5 text-[15px] leading-snug">
                      {item.item_text}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Camera className="size-4" />
              {selectedTemplate.requires_photo
                ? "Bukti foto (wajib)"
                : "Foto (opsional)"}
            </p>
            <PhotoUploader
              key={selectedTemplate.id}
              label=""
              required={selectedTemplate.requires_photo}
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
            <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4 shrink-0" />
                Peringatan foto
              </p>
              <p>
                Foto wajib asli, terbaru, dan sesuai area yang dikerjakan.
                Dilarang foto lama, blur, area berbeda, atau satu foto untuk
                banyak kegiatan.
              </p>
              {isPA ? (
                <p className="font-medium">
                  Jangan asal submit. Kalau toilet kotor tapi laporan bersih,
                  tanaman belum disiram tapi laporan selesai, atau pakai foto
                  lama - itu manipulasi laporan.
                </p>
              ) : null}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Status kondisi</h2>
            <p className="text-xs text-muted-foreground">
              Jika bukan Aman, tulis catatan agar Leader bisa follow up.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStatusCondition(option.value)}
                  className={cn(
                    "min-h-[52px] rounded-xl border-2 bg-card px-3 py-3 text-base font-semibold transition-transform active:scale-[0.98]",
                    statusCondition === option.value &&
                      (option.value === "aman"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-amber-500 bg-amber-50 text-amber-900"),
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <label className="block font-semibold">
              Catatan laporan{conditionNeedsNote ? " *" : " (opsional)"}
            </label>
            {isPA ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Jangan cuma tulis &quot;sudah&quot;. Isi: kondisi awal - yang
                dikerjakan - kondisi akhir - kendala (jika ada).
              </p>
            ) : null}
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isPA
                  ? "Contoh: Toilet customer dibersihkan. Kloset disikat, lantai dipel, wastafel dilap, sampah dikosongkan. Kondisi akhir bersih, tidak bau. Kendala tidak ada."
                  : "Contoh: sabun tinggal sedikit"
              }
              className="min-h-24 text-base"
              disabled={isSubmitting}
            />
          </section>
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
                  Kirim Kegiatan
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

  function renderCard(template: ReportTemplate) {
    const done = alreadySubmitted(template.id);
    const percent = checklistPercent(done);
    const isKendala =
      template.kind === "issue_quick" || template.category === "Kendala";

    return (
      <button
        key={template.id}
        type="button"
        onClick={() => openForm(template)}
        className={cn(
          "w-full rounded-2xl border-2 p-4 text-left shadow-sm transition-transform active:scale-[0.98]",
          isKendala
            ? "border-amber-300 bg-amber-50 hover:border-amber-500"
            : "border-emerald-200 bg-card hover:border-emerald-500",
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{template.title}</h2>
                {template.is_required_daily ? (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Wajib
                  </span>
                ) : null}
                {done ? (
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      done.status_condition === "aman"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {done.status_condition === "aman"
                      ? `Selesai ${percent ?? "?"}%`
                      : conditionLabel(done.status_condition)}
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {template.standard_result || template.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{template.checklist_items?.length ?? 0} checklist</span>
                {template.requires_photo ? (
                  <span className="inline-flex items-center gap-1">
                    <Camera className="size-3" /> Foto
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold",
              isKendala
                ? "bg-amber-500 text-white"
                : done
                  ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "bg-primary text-primary-foreground",
            )}
          >
            {isKendala
              ? "Lapor kendala ->"
              : done
                ? "Update kegiatan ->"
                : "Isi kegiatan ->"}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary px-4 py-4 text-primary-foreground">
        <p className="mb-0.5 text-sm text-primary-foreground/80">
          Kegiatan Harian (SOP)
        </p>
        <h1 className="text-2xl font-bold">{staff?.name ?? "Staff"}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
            <MapPin className="size-3.5" />
            {staff?.outlet ?? "-"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
            <Briefcase className="size-3.5" />
            {staff?.position ?? "-"}
            {staff?.position_group ? ` · ${staff.position_group}` : ""}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-10">
        {flashOk ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="size-5 shrink-0" />
            {flashOk} terkirim
          </div>
        ) : null}

        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Centang checklist - foto - pilih kondisi.{" "}
          <span className="font-semibold text-foreground">
            Wajib: {doneRequired}/{requiredTemplates.length}
          </span>
        </div>

        <section className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4" />
            Kegiatan wajib hari ini
          </h2>
          {requiredTemplates.length === 0 ? (
            <div className="space-y-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Belum ada kegiatan wajib untuk jabatan &quot;
                {staff?.position ?? "-"}&quot;.
              </p>
              <p>
                Minta admin buat template dengan posisi sesuai di Pengaturan -
                Template Kegiatan.
              </p>
            </div>
          ) : (
            requiredTemplates.map(renderCard)
          )}
        </section>

        {otherTemplates.length > 0 ? (
          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Lainnya / Lapor kendala</h2>
            {otherTemplates.map(renderCard)}
          </section>
        ) : null}
      </main>
    </div>
  );
}
