/** Pecah deskripsi tugas jadi bagian terstruktur untuk halaman staff. */

export type InstructionSection = {
  title: string;
  /** steps = daftar yang bisa dicentang staff */
  kind: "text" | "steps" | "bullets";
  items: string[];
};

const HEADING_RE =
  /^(tujuan|temuan|pelapor|kategori|kegiatan asal|masalah|langkah(?: kerja)?|yang dikerjakan|tindak lanjut|cara kerja|metode|standar selesai|standar|alat(?: & bahan| dan bahan)?|bahan|catatan|keselamatan)\s*:\s*(.*)$/i;
const ITEM_RE = /^\s*(?:\d+[.)]|[-•*])\s+(.*)$/;
const STEP_HEADING_RE = /langkah|cara kerja|metode|yang dikerjakan|tindak lanjut/i;
const ACTION_AFTER_COMMA_RE =
  /,\s*(?=(?:cek|lakukan|uji|pastikan|laporkan|koordinasikan|lanjutkan|cocokkan|amankan|jangan|eskalasi|catat|bersihkan|ganti|perbaiki|hubungi|konfirmasi|hitung|siapkan|pisahkan|tutup|buka)\b)/i;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function sectionKind(
  title: string,
  hasItems: boolean,
  hasText: boolean,
): InstructionSection["kind"] {
  if (STEP_HEADING_RE.test(title) && (hasItems || hasText)) return "steps";
  if (!hasItems) return "text";
  return "bullets";
}

/**
 * Ubah instruksi satu paragraf menjadi langkah singkat yang bisa dicentang.
 * Hanya dipakai untuk heading aksi (Langkah/Tindak lanjut/dll), bukan catatan bebas.
 */
function splitActionText(value: string): string[] {
  return value
    .split(/;\s*|\.\s+(?=[A-Z])/)
    .flatMap((chunk) =>
      chunk
        .split(/,\s*(?:lalu|kemudian|selanjutnya)\s+/i)
        .flatMap((part) => part.split(ACTION_AFTER_COMMA_RE)),
    )
    .map((item) =>
      item
        .replace(/^(?:lalu|kemudian|selanjutnya)\s+/i, "")
        .replace(/[.;]+$/, "")
        .trim(),
    )
    .filter(Boolean);
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

  return sections
    .map((s) => {
      const kind = sectionKind(s.title, s.items.length > 0, s.text.length > 0);
      if (kind === "steps") {
        // Jika sudah ada nomor/bullet eksplisit, itu sumber kebenaran langkah kerja.
        // Teks bebas di bagian yang sama tidak dipaksa menjadi checkbox.
        const items =
          s.items.length > 0
            ? s.items
            : s.text.flatMap((text) => splitActionText(text));
        return { title: s.title, kind, items };
      }
      return {
        title: s.title,
        kind,
        items: kind === "text" ? s.text : [...s.text, ...s.items],
      };
    })
    .filter((section) => section.items.length > 0);
}
