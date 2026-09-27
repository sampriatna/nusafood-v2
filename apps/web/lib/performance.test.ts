import { describe, expect, it } from "vitest";
import { aggregatePerformance, classifyTask, gradeOf, type PerfTaskInput } from "./performance";

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
