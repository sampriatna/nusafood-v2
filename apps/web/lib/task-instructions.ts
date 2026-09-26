/** Pecah deskripsi tugas jadi bagian (Tujuan / Langkah / Standar selesai …) untuk halaman staff. */

export type InstructionSection = {
  title: string;
  /** steps = daftar yang bisa dicentang staff */
  kind: "text" | "steps" | "bullets";
  items: string[];
};

const HEADING_RE =
  /^(tujuan|langkah(?: kerja)?|cara kerja|metode|standar selesai|standar|alat(?: & bahan| dan bahan)?|bahan|catatan|keselamatan)\s*:\s*(.*)$/i;
const ITEM_RE = /^\s*(?:\d+[.)]|[-•*])\s+(.*)$/;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function sectionKind(title: string, hasItems: boolean): InstructionSection["kind"] {
  if (!hasItems) return "text";
  return /langkah|cara kerja|metode/i.test(title) ? "steps" : "bullets";
}

export function parseTaskInstructions(description: string): InstructionSection[] {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const hasHeadings = lines.some((l) => HEADING_RE.test(l));

  if (!hasHeadings) {
    // Instruksi bebas: tiap baris jadi langkah yang bisa dicentang.
    const items = lines.map((l) => l.match(ITEM_RE)?.[1] ?? l);
    return [
      {
        title: "Langkah",
        kind: items.length > 1 ? "steps" : "text",
        items,
      },
    ];
  }

  const sections: { title: string; items: string[]; text: string[] }[] = [];
  let current: (typeof sections)[number] | null = null;

  for (const line of lines) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      current = { title: titleCase(heading[1]), items: [], text: [] };
      sections.push(current);
      if (heading[2]) current.text.push(heading[2]);
      continue;
    }
    if (!current) {
      current = { title: "Instruksi", items: [], text: [] };
      sections.push(current);
    }
    const item = line.match(ITEM_RE);
    if (item) current.items.push(item[1]);
    else current.text.push(line);
  }

  return sections.map((s) => {
    const kind = sectionKind(s.title, s.items.length > 0);
    return {
      title: s.title,
      kind,
      items: kind === "text" ? s.text : [...s.text, ...s.items],
    };
  });
}
