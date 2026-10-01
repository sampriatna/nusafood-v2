import { describe, expect, it } from "vitest";
import {
  calcProjectProgress,
  calcWorkstreamProgress,
  canSubmitFromStatus,
  canSubmitWorkstream,
  canWorkOnWorkstream,
  checkMilestoneSubmit,
  computeFocus,
  deadlineState,
  deriveHealth,
  getProjectReadiness,
  isStructureLocked,
  picScope,
  setupStatusOf,
  weightWarning,
} from "./project-logic";

const ms = (status: string, weight = 1) => ({ status, weight });

describe("progress (approved only)", () => {
  it("4 milestone: 2 DONE + 1 WAITING + 1 NOT_STARTED = 50%, bukan 75%", () => {
    expect(
      calcWorkstreamProgress([ms("DONE"), ms("DONE"), ms("WAITING_VALIDATION"), ms("NOT_STARTED")]),
    ).toBe(50);
  });
  it("REVISION dan IN_PROGRESS tidak dihitung", () => {
    expect(calcWorkstreamProgress([ms("REVISION"), ms("IN_PROGRESS")])).toBe(0);
  });
  it("memakai bobot khusus", () => {
    expect(calcWorkstreamProgress([ms("DONE", 40), ms("NOT_STARTED", 20), ms("NOT_STARTED", 20), ms("NOT_STARTED", 20)])).toBe(40);
  });
  it("tanpa milestone = 0 dan tidak error", () => {
    expect(calcWorkstreamProgress([])).toBe(0);
    expect(calcProjectProgress([])).toBe(0);
  });
  it("project = rata-rata berbobot workstream", () => {
    expect(calcProjectProgress([{ weight: 1, progress: 100 }, { weight: 1, progress: 0 }])).toBe(50);
    expect(calcProjectProgress([{ weight: 3, progress: 100 }, { weight: 1, progress: 0 }])).toBe(75);
  });
  it("peringatan bobot hanya untuk bobot khusus yang total bukan 100", () => {
    expect(weightWarning([{ weight: 1 }, { weight: 1 }]).warn).toBe(false);
    expect(weightWarning([{ weight: 40 }, { weight: 20 }]).warn).toBe(true);
    expect(weightWarning([{ weight: 40 }, { weight: 60 }]).warn).toBe(false);
  });
});

describe("readiness / publish gate", () => {
  const base = { leadStaffId: "S1" };
  it("belum siap tanpa workstream", () => {
    const r = getProjectReadiness({ ...base, workstreams: [] });
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(["WORKSTREAM_REQUIRED"]);
  });
  it("belum siap tanpa milestone", () => {
    const r = getProjectReadiness({ ...base, workstreams: [{ name: "A", milestones: [] }] });
    expect(r.missing).toEqual(["MILESTONE_REQUIRED"]);
  });
  it("belum siap tanpa checklist", () => {
    const r = getProjectReadiness({
      ...base,
      workstreams: [{ name: "A", milestones: [{ title: "M", stepCount: 0 }] }],
    });
    expect(r.missing).toEqual(["CHECKLIST_REQUIRED"]);
    expect(r.details[0]).toContain("A › M");
  });
  it("tanpa PIC utama tidak siap", () => {
    const r = getProjectReadiness({
      leadStaffId: null,
      workstreams: [{ name: "A", milestones: [{ title: "M", stepCount: 2 }] }],
    });
    expect(r.missing).toEqual(["PIC_REQUIRED"]);
  });
  it("siap bila lengkap; status setup DRAFT → READY → PUBLISHED", () => {
    const ready = getProjectReadiness({
      ...base,
      workstreams: [{ name: "A", milestones: [{ title: "M", stepCount: 1 }] }],
    });
    expect(ready.ready).toBe(true);
    expect(setupStatusOf(null, ready)).toBe("READY");
    expect(setupStatusOf(new Date(), ready)).toBe("PUBLISHED");
    expect(setupStatusOf(null, getProjectReadiness({ ...base, workstreams: [] }))).toBe("DRAFT");
  });
});

describe("submit validation", () => {
  const step = (o: Partial<{ is_required: boolean; requires_evidence: boolean; is_checked: boolean; evidence_url: string | null }>) => ({
    is_required: true,
    requires_evidence: false,
    is_checked: false,
    evidence_url: null,
    ...o,
  });
  it("tidak ada langkah → tidak bisa", () => {
    expect(checkMilestoneSubmit([]).canSubmit).toBe(false);
  });
  it("langkah wajib belum dicentang", () => {
    const r = checkMilestoneSubmit([step({}), step({ is_checked: true })]);
    expect(r.canSubmit).toBe(false);
    expect(r.missingRequired).toBe(1);
  });
  it("bukti wajib belum ada", () => {
    const r = checkMilestoneSubmit([step({ is_checked: true, requires_evidence: true })]);
    expect(r.canSubmit).toBe(false);
    expect(r.missingEvidence).toBe(1);
    expect(r.reasons.join(" ")).toMatch(/1 bukti wajib/);
  });
  it("lolos bila semua wajib selesai dan bukti ada; langkah opsional boleh kosong", () => {
    const r = checkMilestoneSubmit([
      step({ is_checked: true, requires_evidence: true, evidence_url: "https://x/y.jpg" }),
      step({ is_required: false }),
    ]);
    expect(r.canSubmit).toBe(true);
  });
  it("hanya status tertentu yang boleh diajukan", () => {
    expect(canSubmitFromStatus("IN_PROGRESS")).toBe(true);
    expect(canSubmitFromStatus("REVISION")).toBe(true);
    expect(canSubmitFromStatus("WAITING_VALIDATION")).toBe(false);
    expect(canSubmitFromStatus("DONE")).toBe(false);
  });
  it("struktur terkunci saat menunggu validasi & selesai", () => {
    expect(isStructureLocked("WAITING_VALIDATION")).toBe(true);
    expect(isStructureLocked("DONE")).toBe(true);
    expect(isStructureLocked("REVISION")).toBe(false);
  });
});

describe("permission PIC", () => {
  const ws = [
    { id: "w1", ownerStaffId: "dul" },
    { id: "w2", ownerStaffId: "dian" },
  ];
  it("PIC utama melihat semua", () => {
    const s = picScope("dul", ws, "dul");
    expect(s.kind).toBe("ALL");
    expect(canWorkOnWorkstream(s, "w2")).toBe(true);
  });
  it("PIC workstream hanya miliknya", () => {
    const s = picScope("dul", ws, "dian");
    expect(s).toEqual({ kind: "OWN", workstreamIds: ["w2"], helperIds: [] });
    expect(canWorkOnWorkstream(s, "w1")).toBe(false);
  });
  it("anggota pendukung: boleh mengerjakan tapi tidak boleh submit", () => {
    const withMember = [
      { id: "w1", ownerStaffId: "dul", memberStaffIds: ["mahmud"] },
      { id: "w2", ownerStaffId: "dian", memberStaffIds: [] },
    ];
    const s = picScope("dul", withMember, "mahmud");
    expect(s).toEqual({ kind: "OWN", workstreamIds: [], helperIds: ["w1"] });
    expect(canWorkOnWorkstream(s, "w1")).toBe(true);
    expect(canSubmitWorkstream(s, "w1")).toBe(false);
    expect(canWorkOnWorkstream(s, "w2")).toBe(false);
  });
  it("PIC bagian & PIC utama boleh submit; bukan PIC tidak", () => {
    expect(canSubmitWorkstream(picScope("dul", ws, "dian"), "w2")).toBe(true);
    expect(canSubmitWorkstream(picScope("dul", ws, "dian"), "w1")).toBe(false);
    expect(canSubmitWorkstream(picScope("dul", ws, "dul"), "w2")).toBe(true);
    expect(canSubmitWorkstream(picScope("dul", ws, "x"), "w1")).toBe(false);
  });
  it("bukan PIC lagi → NONE", () => {
    const s = picScope("dul", ws, "orang-lain");
    expect(s.kind).toBe("NONE");
    expect(canWorkOnWorkstream(s, "w1")).toBe(false);
  });
});

describe("health & deadline", () => {
  const input = {
    status: "ACTIVE" as const,
    progress: 10,
    deadline: "2026-12-31",
    todayKey: "2026-10-02",
    activeBlockers: 0,
    milestones: [{ status: "IN_PROGRESS", deadline: null }],
    idleDays: 1,
  };
  it("on track", () => expect(deriveHealth(input)).toBe("ON_TRACK"));
  it("blocker aktif → BLOCKED", () => expect(deriveHealth({ ...input, activeBlockers: 1 })).toBe("BLOCKED"));
  it("deadline milestone dekat → NEED_ATTENTION", () =>
    expect(deriveHealth({ ...input, milestones: [{ status: "IN_PROGRESS", deadline: "2026-10-04" }] })).toBe("NEED_ATTENTION"));
  it("overdue → NEED_ATTENTION", () =>
    expect(deriveHealth({ ...input, deadline: "2026-10-01" })).toBe("NEED_ATTENTION"));
  it("lama tidak ada aktivitas → NEED_ATTENTION", () =>
    expect(deriveHealth({ ...input, idleDays: 9 })).toBe("NEED_ATTENTION"));
  it("semua DONE → COMPLETED", () =>
    expect(deriveHealth({ ...input, milestones: [{ status: "DONE", deadline: null }] })).toBe("COMPLETED"));
  it("override owner menang", () => expect(deriveHealth({ ...input, override: "BLOCKED" })).toBe("BLOCKED"));
  it("deadlineState", () => {
    expect(deadlineState("2026-10-01", "2026-10-02")).toBe("overdue");
    expect(deadlineState("2026-10-05", "2026-10-02")).toBe("soon");
    expect(deadlineState("2026-11-05", "2026-10-02")).toBe("ok");
    expect(deadlineState(null, "2026-10-02")).toBe("none");
  });
});

describe("fokus sekarang", () => {
  it("milestone aktif → langkah wajib pertama yang belum selesai", () => {
    const f = computeFocus([
      { id: "m1", title: "A", status: "DONE", steps: [] },
      {
        id: "m2",
        title: "Mapping",
        status: "IN_PROGRESS",
        steps: [
          { id: "s1", item_text: "x", is_required: true, is_checked: true },
          { id: "s2", item_text: "Catat ukuran", is_required: true, is_checked: false },
        ],
      },
    ]);
    expect(f).toMatchObject({ milestone_id: "m2", step_id: "s2", step_text: "Catat ukuran" });
  });
  it("revisi diprioritaskan; menunggu validasi dilewati; semua selesai → null", () => {
    expect(computeFocus([
      { id: "m1", title: "W", status: "WAITING_VALIDATION", steps: [] },
      { id: "m2", title: "R", status: "REVISION", steps: [] },
    ])?.milestone_id).toBe("m2");
    expect(computeFocus([{ id: "m1", title: "W", status: "WAITING_VALIDATION", steps: [] }])).toBeNull();
  });
});
