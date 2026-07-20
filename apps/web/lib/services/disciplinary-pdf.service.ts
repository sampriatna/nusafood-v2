import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DisciplinaryLetter } from "@nusafood/types";
import { getLetterPreview } from "@/lib/services/disciplinary-preview";

/**
 * PDF adapter — stores a formal HTML archive that can be printed/saved as PDF.
 * Swap implementation later (pdfkit / puppeteer) without changing callers.
 */
export async function generateDisciplinaryPdfArchive(
  letter: DisciplinaryLetter,
  origin = "",
): Promise<{ url: string; html: string }> {
  const html = buildFormalLetterHtml(letter);
  const dir = path.join(process.cwd(), "public", "uploads", "disciplinary");
  await mkdir(dir, { recursive: true });
  const filename = `${letter.letter_number.replace(/[/\\]/g, "-")}.html`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, html, "utf8");
  const url = `${origin}/uploads/disciplinary/${filename}`;
  return { url, html };
}

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLetterPreviewText(letter: DisciplinaryLetter): string {
  return getLetterPreview(letter);
}

export function buildFormalLetterHtml(letter: DisciplinaryLetter): string {
  const isSp = letter.type === "PERINGATAN";
  const title = isSp
    ? `SURAT PERINGATAN ${letter.level}`
    : `Surat Teguran ${letter.level}`;
  const evidenceHtml = (letter.evidence || [])
    .map((e) => {
      const bits = [
        e.evidence_type,
        e.text_note || "",
        e.file_url ? `<a href="${esc(e.file_url)}">${esc(e.file_url)}</a>` : "",
      ]
        .filter(Boolean)
        .join(" — ");
      return `<li>${bits}</li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} — ${esc(letter.letter_number)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111; max-width: 720px; margin: 40px auto; line-height: 1.5; padding: 0 16px; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 4px; letter-spacing: 0.04em; }
    .meta { text-align: center; margin-bottom: 24px; font-size: 14px; }
    .kop { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
    .kop strong { font-size: 18px; }
    table.info td { padding: 2px 8px 2px 0; vertical-align: top; }
    .sign { display: flex; justify-content: space-between; margin-top: 48px; gap: 16px; }
    .sign div { width: 30%; text-align: center; }
    .line { margin-top: 64px; border-top: 1px solid #333; padding-top: 6px; font-size: 13px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="kop">
    <strong>Nusa Food</strong><br/>
    Outlet ${esc(letter.outlet_name_snapshot)}
  </div>
  <h1>${esc(title)}</h1>
  <div class="meta">Nomor: ${esc(letter.letter_number)} · Tanggal: ${esc(letter.incident_date)}</div>

  <table class="info">
    <tr><td>Nama</td><td>: ${esc(letter.employee_name_snapshot)}</td></tr>
    <tr><td>Jabatan</td><td>: ${esc(letter.employee_position_snapshot || "-")}</td></tr>
    <tr><td>Outlet</td><td>: ${esc(letter.outlet_name_snapshot)}</td></tr>
    ${letter.related_task_id ? `<tr><td>Task terkait</td><td>: ${esc(letter.related_task_id)}</td></tr>` : ""}
  </table>

  <p><strong>Kronologi</strong><br/>${esc(letter.chronology)}</p>
  <p><strong>Detail pelanggaran</strong><br/>${esc(letter.violation_detail)}</p>
  ${letter.sop_reference ? `<p><strong>SOP / aturan</strong><br/>${esc(letter.sop_reference)}</p>` : ""}
  ${letter.operational_impact ? `<p><strong>Dampak operasional</strong><br/>${esc(letter.operational_impact)}</p>` : ""}
  <p><strong>Instruksi perbaikan</strong><br/>${esc(letter.correction_instruction)}</p>
  ${letter.correction_deadline ? `<p><strong>Deadline perbaikan</strong><br/>${esc(letter.correction_deadline)}</p>` : ""}
  ${letter.consequence ? `<p><strong>Konsekuensi jika mengulang</strong><br/>${esc(letter.consequence)}</p>` : ""}

  <p><strong>Bukti</strong></p>
  <ul>${evidenceHtml || "<li>Tidak ada bukti terlampir</li>"}</ul>

  <p>${
    isSp
      ? "Surat Peringatan ini merupakan dokumen formal perusahaan. Karyawan wajib memahami dan menandatangani sebagai tanda telah menerima pemberitahuan."
      : "Teguran ini diberikan untuk pembinaan agar kejadian yang sama tidak berulang. Jika terulang, dapat dinaikkan level atau diproses menjadi Surat Peringatan."
  }</p>

  <div class="sign">
    <div><div class="line">Karyawan</div></div>
    <div><div class="line">Leader / Manager</div></div>
    <div><div class="line">Owner / HR / Admin</div></div>
  </div>
</body>
</html>`;
}
