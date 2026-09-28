import { describe, expect, it } from "vitest";
import { coordinationRulesFor, defaultInstruction, resolveCoordination } from "./sop-coordination";

describe("coordinationRulesFor", () => {
  it("kitchen: stock issues go to leader + purchasing, sold-out to front", () => {
    const rules = coordinationRulesFor("Dapur");
    expect(rules.find((r) => r.when.startsWith("Bahan habis"))?.to).toEqual(["LeaderOutlet", "Purchasing"]);
    expect(rules.find((r) => r.when.includes("sold-out"))?.to).toEqual(["Kasir", "Waiters"]);
  });

  it("falls back to leader for office roles", () => {
    expect(coordinationRulesFor("Design")[0].to).toEqual(["LeaderOutlet"]);
    expect(coordinationRulesFor(null)[0].to).toEqual(["LeaderOutlet"]);
  });
});

describe("resolveCoordination", () => {
  it("attaches today's contacts and excludes the staff themself", () => {
    const [rule] = resolveCoordination(
      [{ when: "Bahan habis", to: ["LeaderOutlet", "Purchasing"] }],
      {
        LeaderOutlet: [
          { staff_id: "L1", name: "Budi", wa_link: "https://wa.me/62811" },
          { staff_id: "ME", name: "Saya", wa_link: "https://wa.me/62822" },
        ],
      },
      "ME",
    );
    expect(rule.targets[0].contacts.map((c) => c.name)).toEqual(["Budi"]);
    expect(rule.targets[1]).toEqual({ position: "Purchasing", contacts: [] });
  });
});

describe("defaultInstruction", () => {
  it("returns category copy with a general fallback", () => {
    expect(defaultInstruction("Closing").why).toMatch(/opening besok/);
    expect(defaultInstruction("Unknown").how).toMatch(/Centang/);
  });
});
