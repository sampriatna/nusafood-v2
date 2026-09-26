import { describe, expect, it } from "vitest";
import type { DisciplinaryLetter } from "@nusafood/types";
import { buildLetterDocumentHtml } from "./letter-html";

const base: DisciplinaryLetter = {
  id: "11111111-1111-1111-1111-111111111111",
  letter_number: "ST/KBU/2026/08/002",
  type: "TEGURAN",
  level: 1,
  status: "SENT",
  employee_id: "S1",
  employee_name_snapshot: "Dodi",
  employee_position_snapshot: "Leader Outlet",
  outlet_name_snapshot: "KBU",
  related_task_id: "TASK-20260802-070",
  source_type: "TASK_INCOMPLETE",
  incident_date: "2026-08-28",
  created_by: "admin",
  created_by_name: "Administrator",
  title: "x",
  chronology:
    'Task TASK-20260802-070 berjudul "dfg" memiliki deadline 2026-08-27T14:05:00.000Z. Status saat ini: OPENED.',
  violation_detail: 'Task "dfg" belum selesai sesuai standar.',
  operational_impact: "kotor pembeli jijik karena wc",
  correction_instruction: "Selesaikan tugas sesuai standar.",
  correction_deadline: "2026-09-04",
  created_at: "2026-08-28T00:00:00Z",
  updated_at: "2026-08-28T00:00:00Z",
  evidence: [
    { id: "1", disciplinary_letter_id: "", evidence_type: "PHOTO", file_url: "https://x.supabase.co/storage/v1/object/public/a.jpg", text_note: "Foto before dari task", created_by: "", created_at: "" },
    { id: "2", disciplinary_letter_id: "", evidence_type: "LINK", file_url: "https://tugas.nf3.company/report/TASK-20260802-070?token=8fe383bb6168aad426d8b93d3a2ca816", text_note: "Link laporan task", created_by: "", created_at: "" },
    { id: "3", disciplinary_letter_id: "", evidence_type: "NOTE", text_note: "kerjain", created_by: "", created_at: "" },
  ],
};

describe("buildLetterDocumentHtml", () => {
  const html = buildLetterDocumentHtml(base, { origin: "https://tugas.nf3.company" });

  it("renders title, number, human dates and sections", () => {
    expect(html).toContain("SURAT TEGURAN I");
    expect(html).toContain("ST/KBU/2026/08/002");
    expect(html).toContain("28 Agustus 2026");
    expect(html).toContain("Kopi Buri Umah (KBU)");
    for (const s of ["Kronologi", "Bentuk Pelanggaran", "Dampak Operasional", "Instruksi Perbaikan", "Batas Waktu Perbaikan", "Bukti Pendukung"]) {
      expect(html).toContain(s);
    }
  });

  it("never prints raw ISO dates or long URLs as text", () => {
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(text).not.toContain("token=");
    expect(html).not.toContain("Cetak / simpan PDF");
  });

  it("renders the QR inline (no external QR service)", () => {
    expect(html).toContain('aria-label="QR verifikasi dokumen"');
    expect(html).not.toContain("api.qrserver.com");
  });

  it("marks drafts", () => {
    expect(buildLetterDocumentHtml({ ...base, status: "DRAFT" })).toContain(">DRAFT<");
    expect(html).not.toContain(">DRAFT<");
  });

  it("escapes user text", () => {
    const out = buildLetterDocumentHtml({ ...base, employee_name_snapshot: "<script>x</script>" });
    expect(out).not.toContain("<script>x</script>");
  });
});
