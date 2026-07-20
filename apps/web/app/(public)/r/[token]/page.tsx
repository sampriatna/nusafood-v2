"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  MapPin,
  Briefcase,
  Camera,
  ClipboardList,
  Clock,
  Target,
  ChevronLeft,
  MessageCircle,
} from "lucide-react";
import { getStaffReportByToken, submitDailyReport } from "@/lib/api/daily-report-client";
import type {
  ReportTemplate,
  DailyReportSubmission,
  ReportConditionStatus,
  KendalaNotifyInfo,
} from "@nusafood/types";
import { REPORT_CONDITION_OPTIONS } from "@nusafood/types";
import { cn } from "@/lib/utils";

type PageState = "loading" | "error" | "list" | "form" | "submitting" | "success";

export default function StaffStaticReportPage() {
  const params = useParams();
  const token = (params.token as string) || "";
  const [, startTransition] = useTransition();
  const formTopRef = useRef<HTMLDivElement>(null);

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [staffName, setStaffName] = useState("");
  const [outlet, setOutlet] = useState("");
  const [position, setPosition] = useState("");
  const [positionGroup, setPositionGroup] = useState("");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [todaySubmissions, setTodaySubmissions] = useState<DailyReportSubmission[]>([]);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [kendalaNotify, setKendalaNotify] = useState<KendalaNotifyInfo | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [statusCondition, setStatusCondition] = useState<ReportConditionStatus | "">("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    if (!token) {
      setErrorMessage("Link tidak valid.\nHubungi atasan Anda.");
      setPageState("error");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await getStaffReportByToken(token);
        if (cancelled) return;
        if (result.success && result.data) {
          setStaffName(result.data.staff.name);
          setOutlet(result.data.staff.outlet);
          setPosition(result.data.staff.position);
          setPositionGroup(result.data.staff.position_group);
          setTemplates(result.data.templates);
          setTodaySubmissions(result.data.today_submissions || []);
          setPageState("list");
        } else {
          setErrorMessage(result.error || "Link tidak valid.\nHubungi atasan Anda.");
          setPageState("error");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Gagal memuat data.\nPeriksa koneksi internet Anda.");
          setPageState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const requiredTemplates = useMemo(
    () => templates.filter((t) => t.is_required_daily),
    [templates]
  );
  const otherTemplates = useMemo(
    () => templates.filter((t) => !t.is_required_daily),
    [templates]
  );

  const alreadySubmitted = (templateId: string) =>
    todaySubmissions.find((s) => s.report_template_id === templateId);

  const openForm = (template: ReportTemplate) => {
    // Instant — no network
    const existing = alreadySubmitted(template.id);
    const initial: Record<string, boolean> = {};
    for (const item of template.checklist_items || []) {
      const prev = existing?.checklist_answers?.find((a) => a.checklist_item_id === item.id);
      initial[item.id] = Boolean(prev?.checked);
    }
    startTransition(() => {
      setSelectedTemplate(template);
      setCheckedMap(initial);
      setStatusCondition(existing?.status_condition || "");
      setNote(existing?.note || "");
      setPhoto(existing?.photo_url || undefined);
      setPageState("form");
    });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const backToList = () => {
    startTransition(() => {
      setSelectedTemplate(null);
      setPageState("list");
    });
  };

  const toggleCheck = (id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = selectedTemplate
    ? (selectedTemplate.checklist_items || []).filter((i) => checkedMap[i.id]).length
    : 0;
  const totalCount = selectedTemplate?.checklist_items?.length || 0;
  const conditionNeedsNote =
    statusCondition &&
    REPORT_CONDITION_OPTIONS.find((o) => o.value === statusCondition)?.requiresNote;

  const handleSubmit = async () => {
    if (!selectedTemplate || pageState === "submitting") return;

    if (!statusCondition) {
      alert("PILIH STATUS KONDISI");
      return;
    }
    if (selectedTemplate.requires_photo && !photo) {
      alert("HARAP UPLOAD FOTO BUKTI");
      return;
    }
    if (conditionNeedsNote && !note.trim()) {
      alert("ISI CATATAN KENDALA");
      return;
    }

    const answers = (selectedTemplate.checklist_items || []).map((item) => ({
      checklist_item_id: item.id,
      checked: Boolean(checkedMap[item.id]),
    }));

    if (answers.length > 0 && answers.every((a) => !a.checked)) {
      alert("Centang minimal beberapa checklist yang sudah dikerjakan.");
      return;
    }

    setPageState("submitting");
    try {
      const result = await submitDailyReport({
        token,
        report_template_id: selectedTemplate.id,
        status_condition: statusCondition,
        note,
        photo_base64: photo,
        checklist_answers: answers,
      });

      if (result.success && result.data) {
        // Optimistic local update — no full reload
        setTodaySubmissions((prev) => {
          const rest = prev.filter(
            (s) => s.report_template_id !== selectedTemplate.id
          );
          return [...rest, result.data!];
        });
        setFlashOk(selectedTemplate.title);
        if (result.notify?.needed) {
          setKendalaNotify(result.notify);
        } else {
          setKendalaNotify(null);
        }
        setSelectedTemplate(null);
        setPageState("list");
        setTimeout(() => setFlashOk(null), 4000);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setPageState("form");
        alert(result.error || "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setPageState("form");
      alert("Gagal mengirim. Periksa koneksi internet.");
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-600 border-t-transparent" />
          <p className="text-slate-600 font-medium text-sm">Memuat…</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-100 p-6 text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-slate-900">Link Tidak Valid</h1>
          <p className="text-slate-600 whitespace-pre-line">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if ((pageState === "form" || pageState === "submitting") && selectedTemplate) {
    const items = selectedTemplate.checklist_items || [];
    return (
      <div className="min-h-screen bg-slate-50 animate-in fade-in duration-150" ref={formTopRef}>
        <header className="sticky top-0 z-10 bg-emerald-700 text-white px-4 py-3 shadow-sm">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-emerald-100 mb-1 active:opacity-70 disabled:opacity-40"
            onClick={backToList}
            disabled={pageState === "submitting"}
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </button>
          <h1 className="text-xl font-bold leading-tight">{selectedTemplate.title}</h1>
          {(selectedTemplate.target_time_start || selectedTemplate.target_time_end) && (
            <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Target {selectedTemplate.target_time_start || "—"}–
              {selectedTemplate.target_time_end || "—"}
            </p>
          )}
        </header>

        <div className="p-4 space-y-4 max-w-lg mx-auto pb-32">
          <div className="bg-white rounded-xl border p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Target className="h-4 w-4 text-emerald-700" />
              Standar hasil
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {selectedTemplate.standard_result || selectedTemplate.description}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-slate-900">Checklist kerja</h2>
              <span className="text-sm tabular-nums text-slate-500">
                {checkedCount}/{totalCount}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const on = Boolean(checkedMap[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={pageState === "submitting"}
                    onClick={() => toggleCheck(item.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-transform active:scale-[0.98]",
                      on
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-white border-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        on
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {on && <CheckCircle2 className="h-4 w-4" />}
                    </span>
                    <span className="text-[15px] text-slate-800 leading-snug pt-0.5">
                      {item.item_text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedTemplate.requires_photo ? (
            <div className="space-y-2">
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Bukti foto (wajib)
              </p>
              <PhotoUploader label="" required size="large" value={photo} onChange={setPhoto} />
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-1.5 text-sm text-amber-950">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Peringatan foto
                </p>
                <p>
                  Foto wajib asli, terbaru, dan sesuai area yang dikerjakan. Dilarang foto lama,
                  blur, terlalu dekat, area berbeda, atau satu foto untuk banyak kegiatan.
                </p>
                {(positionGroup === "PA" ||
                  selectedTemplate.position_group === "PA") && (
                  <p className="font-medium">
                    Jangan asal submit. Kalau toilet kotor tapi laporan bersih, tanaman belum
                    disiram tapi laporan selesai, atau pakai foto lama — itu manipulasi laporan.
                    Konsekuensi: teguran + pekerjaan wajib diulang.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <PhotoUploader label="Foto (opsional)" size="large" value={photo} onChange={setPhoto} />
          )}

          <div className="space-y-2">
            <h2 className="font-semibold text-slate-900">Status kondisi</h2>
            <p className="text-xs text-slate-500">
              Jika bukan Aman, sistem hubungi Leader (WA otomatis / tombol chat).
            </p>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={pageState === "submitting"}
                  onClick={() => setStatusCondition(opt.value)}
                  className={cn(
                    "h-13 min-h-[52px] rounded-xl border-2 text-base font-semibold transition-transform active:scale-[0.98]",
                    statusCondition === opt.value
                      ? opt.value === "aman"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-800">
              Catatan laporan{conditionNeedsNote ? " *" : " (opsional)"}
            </label>
            {(positionGroup === "PA" || selectedTemplate.position_group === "PA") && (
              <p className="text-xs text-slate-500 leading-relaxed">
                Jangan cuma tulis &quot;sudah&quot;. Isi: kondisi awal → yang dikerjakan → kondisi
                akhir → kendala (jika ada).
              </p>
            )}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                positionGroup === "PA" || selectedTemplate.position_group === "PA"
                  ? "Contoh: Toilet customer dibersihkan. Kloset disikat, lantai dipel, wastafel dilap, sampah dikosongkan. Kondisi akhir bersih, tidak bau. Kendala tidak ada."
                  : "Contoh: sabun tinggal sedikit"
              }
              className="min-h-24 text-base"
              disabled={pageState === "submitting"}
            />
          </div>
        </div>

        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t p-3 safe-pb">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-14 text-lg font-semibold active:scale-[0.98] transition-transform"
              disabled={pageState === "submitting"}
              onClick={handleSubmit}
            >
              {pageState === "submitting" ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Mengirim…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Kirim Kegiatan
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // LIST
  const doneRequired = requiredTemplates.filter((t) => alreadySubmitted(t.id)).length;

  const renderCard = (template: ReportTemplate) => {
    const done = alreadySubmitted(template.id);
    const isKendala = template.kind === "issue_quick" || template.category === "Kendala";
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => openForm(template)}
        className={cn(
          "w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98] border-2 shadow-sm",
          isKendala
            ? "bg-amber-50 border-amber-300 hover:border-amber-500"
            : "bg-white border-emerald-200 hover:border-emerald-500"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-bold text-slate-900 text-lg">{template.title}</h2>
                {template.is_required_daily && (
                  <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    Wajib
                  </span>
                )}
                {done && (
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      done.status_condition === "aman"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {done.status_condition === "aman"
                      ? `Selesai ${done.checklist_checked ?? "?"}/${done.checklist_total ?? "?"}`
                      : "Ada kendala"}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">
                {template.standard_result || template.description}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                <span>{template.checklist_items?.length || 0} checklist</span>
                {template.requires_photo && (
                  <span className="inline-flex items-center gap-1">
                    <Camera className="h-3 w-3" /> Foto
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2",
              isKendala
                ? "bg-amber-500 text-white"
                : done
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-emerald-600 text-white"
            )}
          >
            {isKendala ? "Lapor kendala →" : done ? "Update kegiatan →" : "Isi kegiatan →"}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-emerald-700 text-white px-4 py-4">
        <p className="text-emerald-100 text-sm mb-0.5">Kegiatan Harian (SOP)</p>
        <h1 className="text-2xl font-bold">{staffName}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5" />
            {outlet}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-2.5 py-1">
            <Briefcase className="h-3.5 w-3.5" />
            {position}
            {positionGroup ? ` · ${positionGroup}` : ""}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-10">
        {flashOk && (
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {flashOk} terkirim
          </div>
        )}

        {kendalaNotify?.needed && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-950">
                <p className="font-bold">Kendala tercatat</p>
                {kendalaNotify.gas_sent ? (
                  <p>Leader sudah dikirimi WA otomatis.</p>
                ) : kendalaNotify.leaders.length > 0 ? (
                  <p>Ketuk tombol di bawah untuk hubungi Leader via WhatsApp.</p>
                ) : (
                  <p>
                    Belum ada nomor Leader di outlet ini. Minta admin isi role LEADER + WA di
                    Master Staff.
                  </p>
                )}
              </div>
            </div>
            {kendalaNotify.leaders.map((leader) => (
              <a
                key={leader.staff_id}
                href={leader.wa_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-[#25D366] text-white font-bold text-base active:scale-[0.98] transition-transform shadow-sm"
              >
                <MessageCircle className="h-5 w-5" />
                WA {leader.name}
              </a>
            ))}
            <button
              type="button"
              className="text-xs text-amber-800 underline w-full text-center"
              onClick={() => setKendalaNotify(null)}
            >
              Tutup
            </button>
          </div>
        )}

        <div className="bg-white border rounded-xl px-4 py-3 text-sm text-slate-600">
          Centang checklist → foto → pilih kondisi.{" "}
          <span className="font-semibold text-slate-900">
            Wajib: {doneRequired}/{requiredTemplates.length}
          </span>
        </div>

        <section className="space-y-2.5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4" />
            Kegiatan wajib hari ini
          </h2>
          {requiredTemplates.length === 0 ? (
            <div className="bg-white border rounded-xl p-5 text-sm text-slate-600 space-y-2">
              <p className="font-medium text-slate-800">
                Belum ada kegiatan wajib untuk jabatan &quot;{position}&quot;.
              </p>
              <p>
                Minta admin set posisi ke <strong>Waiters / Bar / Dapur / PA</strong> (atau OB /
                Klindingan), atau buat template dengan position_group = jabatan Anda di{" "}
                <span className="font-mono text-xs">Pengaturan → Template Kegiatan</span>.
              </p>
            </div>
          ) : (
            requiredTemplates.map(renderCard)
          )}
        </section>

        {otherTemplates.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="font-semibold text-slate-800 text-sm">Lainnya / Lapor kendala</h2>
            {otherTemplates.map(renderCard)}
          </section>
        )}
      </div>
    </div>
  );
}
