import type { DisciplinaryLetter } from "@nusafood/types";
import {
  formatTanggal,
  outletLabel,
  presentChronology,
  presentViolation,
  romanLevel,
} from "@/lib/letter/letter-format";

/** Client-safe letter preview text (no Node/fs deps). */
export function getLetterPreview(letter: DisciplinaryLetter): string {
  const kind =
    letter.type === "TEGURAN"
      ? `Surat Teguran ${romanLevel(letter.level)}`
      : `Surat Peringatan ${romanLevel(letter.level)}`;
  const incident = formatTanggal(letter.incident_date);
  const chronology = presentChronology(letter.chronology);
  const violation = presentViolation(letter.violation_detail);
  const outlet = outletLabel(letter.outlet_name_snapshot);

  if (letter.type === "TEGURAN") {
    return [
      kind,
      "",
      `Pada tanggal ${incident}, ditemukan bahwa ${letter.employee_name_snapshot} belum menjalankan tugas/laporan sesuai standar yang ditentukan. ${violation}`,
      "",
      "Berdasarkan bukti yang tercatat di sistem:",
      letter.related_task_id ? `- Task: ${letter.related_task_id}` : null,
      `- Kronologi: ${chronology}`,
      `- Outlet: ${outlet}`,
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
    `SURAT PERINGATAN ${romanLevel(letter.level)}`,
    `Nomor: ${letter.letter_number}`,
    `Tanggal: ${incident}`,
    "",
    `Nama: ${letter.employee_name_snapshot}`,
    `Jabatan: ${letter.employee_position_snapshot || "-"}`,
    `Outlet: ${outlet}`,
    "",
    `Kronologi: ${chronology}`,
    `Pelanggaran: ${violation}`,
    letter.sop_reference ? `SOP/Aturan: ${letter.sop_reference}` : null,
    letter.operational_impact ? `Dampak: ${letter.operational_impact}` : null,
    `Instruksi perbaikan: ${letter.correction_instruction}`,
    letter.correction_deadline
      ? `Deadline perbaikan: ${formatTanggal(letter.correction_deadline)}`
      : null,
    letter.consequence ? `Konsekuensi: ${letter.consequence}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
