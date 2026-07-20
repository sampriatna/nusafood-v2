import type { DisciplinaryLetter } from "@nusafood/types";
import { getLetterPreview } from "@/lib/services/disciplinary-preview";
import {
  NF3_COMPANY,
  buildFounderQrPayload,
  buildQrImageUrl,
} from "@/lib/nf3-company";

/**
 * Document adapter for Teguran/SP.
 * Uses stable API document URL (Vercel-safe). Browser Print → Save as PDF.
 */
export async function generateDisciplinaryPdfArchive(
  letter: DisciplinaryLetter,
  origin = "",
): Promise<{ url: string; html: string }> {
  const html = buildFormalLetterHtml(letter, origin);
  const base = origin.replace(/\/$/, "");
  const documentUrl = `${base}/api/disciplinary/${letter.id}/document`;
  return { url: documentUrl, html };
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

function nf3MarkSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="NF3">
  <polygon points="32,4 60,54 4,54" fill="#111" stroke="#fff" stroke-width="2"/>
  <text x="32" y="42" text-anchor="middle" fill="#f5c542" font-family="Arial,sans-serif" font-size="14" font-weight="700">NF3</text>
</svg>`;
}

export function buildFormalLetterHtml(
  letter: DisciplinaryLetter,
  origin = "",
): string {
  const isSp = letter.type === "PERINGATAN";
  const title = isSp
    ? `SURAT PERINGATAN ${letter.level}`
    : `SURAT TEGURAN ${letter.level}`;
  const qrData = buildFounderQrPayload({
    letterNumber: letter.letter_number,
    letterId: letter.id,
    origin,
  });
  const qrUrl = buildQrImageUrl(qrData, 132);

  const evidenceHtml = (letter.evidence || [])
    .map((e) => {
      const note = e.text_note ? esc(e.text_note) : "";
      const looksImage =
        !!e.file_url &&
        (/^data:image\//i.test(e.file_url) ||
          /\.(png|jpe?g|webp|gif)(\?|$)/i.test(e.file_url) ||
          /\/storage\/v1\/object\//i.test(e.file_url));
      const img =
        e.file_url && looksImage
          ? `<div style="margin-top:6px"><img src="${esc(e.file_url)}" alt="Bukti" style="max-width:240px;max-height:180px;border:1px solid #ccc;border-radius:6px"/></div>`
          : e.file_url
            ? `<div><a href="${esc(e.file_url)}">${esc(e.file_url)}</a></div>`
            : "";
      return `<li><strong>${esc(e.evidence_type)}</strong>${note ? ` — ${note}` : ""}${img}</li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} — ${esc(letter.letter_number)}</title>
  <style>
    @page { margin: 16mm; }
    body { font-family: "Times New Roman", Georgia, serif; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.55; padding: 18px; font-size: 13.5px; }
    .kop { display: flex; gap: 14px; align-items: center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 18px; }
    .kop-text { flex: 1; }
    .kop-text .legal { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; }
    .kop-text .brand { font-size: 12px; color: #444; margin-top: 2px; }
    .kop-text .addr { font-size: 12px; margin-top: 4px; }
    h1 { text-align: center; font-size: 18px; margin: 18px 0 4px; letter-spacing: 0.06em; text-decoration: underline; }
    .meta { text-align: center; margin-bottom: 18px; font-size: 13px; }
    table.info td { padding: 2px 8px 2px 0; vertical-align: top; }
    .sign { display: flex; justify-content: space-between; margin-top: 40px; gap: 12px; }
    .sign > div { width: 32%; text-align: center; font-size: 12px; }
    .sign .role { margin-top: 8px; font-weight: 600; }
    .founder-box { border: 1px solid #ddd; border-radius: 8px; padding: 10px 8px; min-height: 170px; }
    .founder-box img.qr { width: 110px; height: 110px; margin: 6px auto; display: block; }
    .founder-box .name { font-weight: 700; margin-top: 4px; }
    .print-hint { margin-top: 28px; font-size: 11px; color: #666; text-align: center; }
    @media print {
      .print-hint { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="kop">
    <div>${nf3MarkSvg()}</div>
    <div class="kop-text">
      <div class="legal">${esc(NF3_COMPANY.legalName)} (${esc(NF3_COMPANY.brand)})</div>
      <div class="brand">${esc(NF3_COMPANY.brands.join(" · "))}</div>
      <div class="addr">${esc(NF3_COMPANY.address)}</div>
    </div>
  </div>

  <h1>${esc(title)}</h1>
  <div class="meta">
    Nomor: <strong>${esc(letter.letter_number)}</strong><br/>
    Tanggal: ${esc(letter.incident_date)} · Outlet: ${esc(letter.outlet_name_snapshot)}
  </div>

  <table class="info">
    <tr><td>Nama karyawan</td><td>: ${esc(letter.employee_name_snapshot)}</td></tr>
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
      : "Teguran ini diberikan untuk pembinaan agar kejadian yang sama tidak berulang. Jika terulang, dapat dinaikkan level atau diproses menjadi Surat Peringatan sesuai keputusan manajemen."
  }</p>

  <div class="sign">
    <div>
      <div style="min-height:120px"></div>
      <div class="role">Karyawan</div>
      <div>${esc(letter.employee_name_snapshot)}</div>
    </div>
    <div>
      <div style="min-height:120px"></div>
      <div class="role">Leader / Manager</div>
      <div>${esc(letter.created_by_name || "........................")}</div>
    </div>
    <div class="founder-box">
      <div>${nf3MarkSvg()}</div>
      <img class="qr" src="${esc(qrUrl)}" alt="QR Tanda Tangan Founder NF3" />
      <div class="name">${esc(NF3_COMPANY.founderName)}</div>
      <div>${esc(NF3_COMPANY.founderTitle)} · ${esc(NF3_COMPANY.brand)}</div>
      <div style="font-size:10px;color:#666;margin-top:4px">TTD digital QR otomatis</div>
    </div>
  </div>

  <p class="print-hint">Cetak / simpan PDF: gunakan menu Print browser (Save as PDF).</p>
</body>
</html>`;
}
