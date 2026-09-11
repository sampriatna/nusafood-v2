export type TaskCycleDetails = {
  purpose: string;
  trigger: string;
  target: string;
  nextAction: string;
  doneWhen: string;
  escalation: string;
  structured: boolean;
};

type BuildTaskCycleInput = {
  purpose: string;
  trigger?: string;
  target?: string;
  nextAction: string;
  doneWhen: string;
  escalation?: string;
};

const HEADER = "TASK CYCLE V2";

const SECTION_MARKERS = {
  "[BUAT APA]": "purpose",
  "[KAPAN MULAI]": "trigger",
  "[TARGET]": "target",
  "[NEXT ACTION]": "nextAction",
  "[SELESAI KALAU]": "doneWhen",
  "[JIKA TERHAMBAT]": "escalation",
} as const;

type SectionKey = (typeof SECTION_MARKERS)[keyof typeof SECTION_MARKERS];

function clean(value?: string | null): string {
  return (value ?? "").trim().replace(/\r\n/g, "\n");
}

export function buildTaskCycleDescription(input: BuildTaskCycleInput): string {
  const sections: Array<[string, string]> = [
    ["[BUAT APA]", clean(input.purpose)],
    ["[KAPAN MULAI]", clean(input.trigger)],
    ["[TARGET]", clean(input.target)],
    ["[NEXT ACTION]", clean(input.nextAction)],
    ["[SELESAI KALAU]", clean(input.doneWhen)],
    ["[JIKA TERHAMBAT]", clean(input.escalation)],
  ];

  return [
    HEADER,
    ...sections.flatMap(([marker, value]) => [marker, value || "-"]),
  ].join("\n");
}

export function parseTaskCycleDescription(
  description?: string | null,
): TaskCycleDetails {
  const raw = clean(description);

  if (!raw.startsWith(HEADER)) {
    return {
      purpose: raw,
      trigger: "",
      target: "",
      nextAction: "Buka tugas dan mulai kerjakan dari langkah paling jelas.",
      doneWhen: "Tugas selesai dan bukti hasil sudah dikirim.",
      escalation: "Jika terhambat, hubungi leader dengan kendala + opsi solusi.",
      structured: false,
    };
  }

  const result: Record<SectionKey, string[]> = {
    purpose: [],
    trigger: [],
    target: [],
    nextAction: [],
    doneWhen: [],
    escalation: [],
  };
  let current: SectionKey | null = null;

  for (const originalLine of raw.split("\n").slice(1)) {
    const line = originalLine.trim();
    const marker = SECTION_MARKERS[line as keyof typeof SECTION_MARKERS];
    if (marker) {
      current = marker;
      continue;
    }
    if (!current) continue;
    result[current].push(originalLine);
  }

  const value = (key: SectionKey) => {
    const text = result[key].join("\n").trim();
    return text === "-" ? "" : text;
  };

  return {
    purpose: value("purpose"),
    trigger: value("trigger"),
    target: value("target"),
    nextAction:
      value("nextAction") || "Buka tugas dan mulai dari langkah pertama.",
    doneWhen:
      value("doneWhen") || "Tugas selesai dan bukti hasil sudah dikirim.",
    escalation:
      value("escalation") ||
      "Jika terhambat, hubungi leader dengan kendala + opsi solusi.",
    structured: true,
  };
}
