import { describe, expect, it } from "vitest";
import {
  aggregatePerformance,
  classifyTask,
  computeSopCompliance,
  gradeOf,
  worstScore,
  type PerfTaskInput,
} from "./performance";

const now = new Date("2026-09-27T12:00:00Z");

function task(p: Partial<PerfTaskInput>): PerfTaskInput {
  return {
    task_id: p.task_id ?? "T1",
    task_title: "Tugas",
    status: "CREATED",
    deadline: "2026-09-26T10:00:00Z",
    pic_name: "Budi",
    staff_id: "EMP-1",
    outlet: "KBU",
    position_group: "kasir",
    ...p,
  };
}

describe("classifyTask", () => {
  it("on time when submitted before deadline", () => {
    expect(classifyTask(task({ status: "WAITING_VERIFICATION", submitted_at: "2026-09-26T09:00:00Z" }), now)).toBe("on_time");
  });
  it("late when submitted after deadline or flagged", () => {
    expect(classifyTask(task({ status: "VERIFIED", submitted_at: "2026-09-26T11:00:00Z" }), now)).toBe("late_done");
    expect(classifyTask(task({ status: "VERIFIED", is_late: true }), now)).toBe("late_done");
  });
  it("overdue when not reported past deadline", () => {
    expect(classifyTask(task({ status: "OPENED" }), now)).toBe("overdue");
  });
  it("in progress before deadline", () => {
    expect(classifyTask(task({ deadline: "2026-09-28T10:00:00Z" }), now)).toBe("in_progress");
  });
});

describe("aggregatePerformance", () => {
  const tasks = [
    task({ task_id: "A", status: "VERIFIED", submitted_at: "2026-09-26T09:00:00Z" }),
    task({ task_id: "B", status: "OPENED" }),
    task({ task_id: "C", deadline: "2026-09-30T10:00:00Z" }),
    task({ task_id: "D", staff_id: "EMP-2", pic_name: "Siti", position_group: "dapur", status: "VERIFIED", submitted_at: "2026-09-26T09:00:00Z" }),
    task({ task_id: "E", status: "CANCELLED" }),
  ];

  it("groups per person with score and late list, worst first", () => {
    const { buckets, overall } = aggregatePerformance(tasks, "person", { now });
    expect(buckets.map((b) => b.label)).toEqual(["Budi", "Siti"]);
    const budi = buckets[0];
    expect(budi.total).toBe(3);
    expect(budi.on_time).toBe(1);
    expect(budi.overdue).toBe(1);
    expect(budi.in_progress).toBe(1);
    expect(budi.score).toBe(50);
    expect(budi.late_tasks.map((t) => t.task_id)).toEqual(["B"]);
    expect(overall.total).toBe(4);
    expect(overall.score).toBe(67);
  });

  it("groups per division", () => {
    const { buckets } = aggregatePerformance(tasks, "division", { now, divisionLabel: (g) => g.toUpperCase() });
    expect(buckets.map((b) => b.label).sort()).toEqual(["DAPUR", "KASIR"]);
  });
});

describe("gradeOf", () => {
  it("maps scores to grades", () => {
    expect(gradeOf(95)).toBe("good");
    expect(gradeOf(80)).toBe("warning");
    expect(gradeOf(50)).toBe("critical");
    expect(gradeOf(null)).toBe("none");
  });
});

describe("computeSopCompliance", () => {
  const match = (g: string | null, p: string) => !g || g === p;
  const staff = [
    { staff_id: "S1", name: "Budi", outlet: "KBU", outlet_id: "o1", primary: "kasir", secondary: ["bar"] },
  ];
  const templates = [
    { id: "T-kasir", outlet_id: null, position_group: "kasir" },
    { id: "T-bar", outlet_id: null, position_group: "bar" },
    { id: "T-other-outlet", outlet_id: "o2", position_group: "kasir" },
  ];

  it("counts required by primary position and matching outlet", () => {
    const r = computeSopCompliance({
      staff,
      templates,
      dates: ["2026-09-25", "2026-09-26"],
      duties: new Map(),
      submissions: new Set(["S1|T-kasir|2026-09-25"]),
      matchesPosition: match,
    }).get("S1")!;
    expect(r.required).toBe(2);
    expect(r.done).toBe(1);
    expect(r.missed).toEqual([{ date: "2026-09-26", template_id: "T-kasir" }]);
  });

  it("follows the position schedule when set", () => {
    const r = computeSopCompliance({
      staff,
      templates,
      dates: ["2026-09-26"],
      duties: new Map([["S1|2026-09-26", ["bar"]]]),
      submissions: new Set(["S1|T-bar|2026-09-26"]),
      matchesPosition: match,
    }).get("S1")!;
    expect(r).toMatchObject({ required: 1, done: 1 });
  });

  it("counts only templates for the assigned work shift", () => {
    const waiter = [
      { staff_id: "W1", name: "Anka", outlet: "KBU", outlet_id: "o1", primary: "Waiters", secondary: [] },
    ];
    const waiterTemplates = [
      { id: "OPEN", outlet_id: null, position_group: "Waiters", shift_codes: ["1K"] },
      { id: "TAKEOVER", outlet_id: null, position_group: "Waiters", shift_codes: ["2K", "3K"] },
      { id: "RUSH", outlet_id: null, position_group: "Waiters", shift_codes: ["1K", "2K", "3K"] },
    ];
    const r = computeSopCompliance({
      staff: waiter,
      templates: waiterTemplates,
      dates: ["2026-09-26"],
      duties: new Map(),
      shifts: new Map([["W1|2026-09-26", "1K"]]),
      submissions: new Set(["W1|OPEN|2026-09-26"]),
      matchesPosition: match,
    }).get("W1")!;
    expect(r.required).toBe(2);
    expect(r.done).toBe(1);
    expect(r.missed).toEqual([{ date: "2026-09-26", template_id: "RUSH" }]);
  });

  it("does not penalize shift-specific SOP when historical shift is unknown", () => {
    const waiter = [
      { staff_id: "W1", name: "Anka", outlet: "KBU", outlet_id: "o1", primary: "Waiters", secondary: [] },
    ];
    const r = computeSopCompliance({
      staff: waiter,
      templates: [
        { id: "OPEN", outlet_id: null, position_group: "Waiters", shift_codes: ["1K"] },
      ],
      dates: ["2026-09-26"],
      duties: new Map(),
      shifts: new Map(),
      submissions: new Set(),
      matchesPosition: match,
    }).get("W1")!;
    expect(r.required).toBe(0);
    expect(r.done).toBe(0);
  });

  it("does not count a newly-created SOP before its creation date", () => {
    const r = computeSopCompliance({
      staff,
      templates: [
        { id: "NEW", outlet_id: null, position_group: "kasir", created_date: "2026-09-26" },
      ],
      dates: ["2026-09-25", "2026-09-26"],
      duties: new Map(),
      submissions: new Set(),
      matchesPosition: match,
    }).get("S1")!;
    expect(r.required).toBe(1);
    expect(r.missed).toEqual([{ date: "2026-09-26", template_id: "NEW" }]);
  });
});

describe("worstScore", () => {
  it("returns the lowest available score", () => {
    expect(worstScore(80, 60)).toBe(60);
    expect(worstScore(null, 70)).toBe(70);
    expect(worstScore(null, undefined)).toBeNull();
  });
});

describe("computeSopCompliance with outlet shifts", () => {
  const match = (g: string | null, p: string) => !g || g === p;
  const staff = [
    { staff_id: "W1", name: "Rani", outlet: "KISAMEN", outlet_id: "o2", primary: "Waiters", secondary: [] },
  ];
  const templates = [
    { id: "OPEN", outlet_id: null, position_group: "Waiters", shift_codes: ["1K"], category: "Opening" },
    { id: "HANDOVER", outlet_id: null, position_group: "Waiters", shift_codes: ["1K"], category: "Closing" },
    { id: "FINAL", outlet_id: null, position_group: "Waiters", shift_codes: ["3K"], category: "Closing" },
  ];

  it("counts 2R like 3K (final closing only)", () => {
    const r = computeSopCompliance({
      staff,
      templates,
      dates: ["2026-09-26"],
      duties: new Map(),
      shifts: new Map([["W1|2026-09-26", "2R"]]),
      submissions: new Set(["W1|FINAL|2026-09-26"]),
      matchesPosition: match,
    }).get("W1")!;
    expect(r).toMatchObject({ required: 1, done: 1 });
  });

  it("counts 1S as opening + final closing without handover", () => {
    const r = computeSopCompliance({
      staff,
      templates,
      dates: ["2026-09-26"],
      duties: new Map(),
      shifts: new Map([["W1|2026-09-26", "1S"]]),
      submissions: new Set(),
      matchesPosition: match,
    }).get("W1")!;
    expect(r.required).toBe(2);
    expect(r.missed.map((m) => m.template_id).sort()).toEqual(["FINAL", "OPEN"]);
  });
});
