"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { parseTaskInstructions } from "@/lib/task-instructions";

/** Instruksi kerja terstruktur; langkah bisa dicentang staff (hanya di HP, tidak disimpan). */
export function TaskInstructions({ description }: { description?: string }) {
  const sections = useMemo(
    () => parseTaskInstructions(description ?? ""),
    [description],
  );
  const [done, setDone] = useState<Record<string, boolean>>({});

  if (!sections.length) {
    return <p className="text-base text-muted-foreground">Tidak ada instruksi tambahan.</p>;
  }

  const stepKeys = sections.flatMap((s, si) =>
    s.kind === "steps" ? s.items.map((_, ii) => `${si}-${ii}`) : [],
  );
  const doneCount = stepKeys.filter((k) => done[k]).length;

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={`${section.title}-${si}`} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            {section.kind === "steps" && stepKeys.length > 1 ? (
              <span className="text-xs font-medium text-primary">
                {doneCount}/{stepKeys.length} selesai
              </span>
            ) : null}
          </div>

          {section.kind === "text" ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {section.items.join("\n")}
            </p>
          ) : section.kind === "bullets" ? (
            <ul className="list-disc space-y-1 pl-5 text-base leading-relaxed">
              {section.items.map((item, ii) => (
                <li key={ii}>{item}</li>
              ))}
            </ul>
          ) : (
            <ol className="space-y-2">
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const checked = Boolean(done[key]);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setDone((prev) => ({ ...prev, [key]: !checked }))}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        checked
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-border bg-background"
                      }`}
                    >
                      {checked ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={`text-base leading-snug ${
                          checked ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        <span className="font-semibold">{ii + 1}.</span> {item}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
