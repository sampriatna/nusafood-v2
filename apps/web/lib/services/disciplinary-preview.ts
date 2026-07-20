import type { DisciplinaryLetter } from "@nusafood/types";

/** Client-safe letter preview text (no Node/fs deps). */
export function getLetterPreview(letter: DisciplinaryLetter): string {
  const kind =
    letter.type === "TEGURAN"
      ? `Surat Teguran ${letter.level}`
      : `Surat Peringatan ${letter.level}`;

  if (letter.type === "TEGURAN") {
    return [
      kind,
      "",
      `Pada tanggal ${letter.incident_date}, ditemukan bahwa ${letter.employee_name_snapshot} belum menjalankan tugas/laporan sesuai standar yang ditentukan, yaitu ${letter.violation_detail}.`,
      "",
      "Berdasarkan bukti yang tercatat di sistem:",
      letter.related_task_id ? `- Task: ${letter.related_task_id}` : null,
      `- Kronologi: ${letter.chronology}`,
      `- Outlet: ${letter.outlet_name_snapshot}`,
      "",
      "Teguran ini diberikan agar kejadian yang sama tidak berulang. Mulai hari ini, karyawan wajib:",
      "1. Menyelesaikan tugas sesuai deadline.",
      "2. Mengirim laporan dengan foto asli dan jelas.",
      "3. Tidak mengirim laporan asal atau bukti yang tidak sesuai kondisi lapangan.",
      "4. Melapor ke leader jika ada kendala sebelum deadline, bukan setelah ditegur.",
      "",
      letter.correction_instruction
        ? `Instruksi perbaikan: ${letter.correction_instruction}`
        : null,
      "",
      "Catatan: Jika pelanggaran ini terulang, teguran dapat naik ke level berikutnya atau diproses menjadi Surat Peringatan sesuai keputusan manajemen.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `SURAT PERINGATAN ${letter.level}`,
    `Nomor: ${letter.letter_number}`,
    `Tanggal: ${letter.incident_date}`,
    "",
    `Nama: ${letter.employee_name_snapshot}`,
    `Jabatan: ${letter.employee_position_snapshot || "-"}`,
    `Outlet: ${letter.outlet_name_snapshot}`,
    "",
    `Kronologi: ${letter.chronology}`,
    `Pelanggaran: ${letter.violation_detail}`,
    letter.sop_reference ? `SOP/Aturan: ${letter.sop_reference}` : null,
    letter.operational_impact ? `Dampak: ${letter.operational_impact}` : null,
    `Instruksi perbaikan: ${letter.correction_instruction}`,
    letter.correction_deadline
      ? `Deadline perbaikan: ${letter.correction_deadline}`
      : null,
    letter.consequence ? `Konsekuensi: ${letter.consequence}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
