import type { DisciplinaryEvidence, DisciplinaryLetter } from "@nusafood/types";
import { NF3_COMPANY, buildVerifyUrl } from "@/lib/nf3-company";
import { qrSvg } from "@/lib/letter/qr-svg";
import {
  formatTanggal,
  outletLabel,
  presentChronology,
  presentViolation,
  romanLevel,
  tidySentence,
} from "@/lib/letter/letter-format";

/**
 * Dokumen formal Surat Teguran / Surat Peringatan (A4 portrait).
 * Pure & client-safe: dipakai route dokumen (server) dan preview generator (browser).
 */

export type LetterDocumentOptions = {
  origin?: string;
  /** Nama lengkap outlet dari master data, mis. "Kopi Buri Umah". */
  outletFullName?: string | null;
  /** Preview sebelum disimpan (nomor belum ada). */
  preview?: boolean;
  /** Sembunyikan toolbar web (dipakai iframe preview). */
  embed?: boolean;
};

type EvidenceLike = Pick<DisciplinaryEvidence, "evidence_type" | "file_url" | "text_note">;

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");
}

function isImageUrl(url: string): boolean {
  return (
    /^data:image\//i.test(url) ||
    /\.(png|jpe?g|webp|gif|heic)(\?|$)/i.test(url) ||
    /\/storage\/v1\/object\//i.test(url) ||
    /\/uploads\//i.test(url)
  );
}

function linkLabel(url: string, relatedTaskId?: string | null): { title: string; label: string } {
  const task = url.match(/\/(?:report|checklist)\/(TASK-[\w-]+)/i)?.[1] ?? null;
  if (task || (relatedTaskId && url.includes(relatedTaskId))) {
    return { title: "Laporan tugas", label: task || relatedTaskId || "Laporan" };
  }
  try {
    return { title: "Tautan pendukung", label: new URL(url).hostname };
  } catch {
    return { title: "Tautan pendukung", label: "Tautan" };
  }
}

function nf3Mark(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-label="NF3" role="img">
  <polygon points="32,5 60,55 4,55" fill="#111"/>
  <text x="32" y="46" text-anchor="middle" fill="#f5c542" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700">NF3</text>
</svg>`;
}

function buildEvidence(evidence: EvidenceLike[], letter: DisciplinaryLetter, origin: string): string {
  if (!evidence.length) {
    return `<p class="muted">Tidak ada bukti terlampir.</p>`;
  }

  const photos = evidence.filter((e) => e.file_url && isImageUrl(e.file_url));
  const links = evidence.filter((e) => e.file_url && !isImageUrl(e.file_url));
  const notes = evidence.filter((e) => !e.file_url && e.text_note?.trim());

  const blocks: string[] = [];
  let n = 0;

  if (photos.length) {
    n += 1;
    const tiles = photos
      .map(
        (p) => `<figure class="ev-photo">
          <img src="${esc(p.file_url)}" alt="Foto bukti" />
          ${p.text_note ? `<figcaption>${esc(tidySentence(p.text_note).replace(/\.$/, ""))}</figcaption>` : ""}
        </figure>`,
      )
      .join("");
    blocks.push(`<div class="ev-item">
      <div class="ev-num">${n}.</div>
      <div class="ev-body">
        <div class="ev-title">Foto kondisi <span class="muted">(${photos.length} foto)</span></div>
        <div class="ev-photos">${tiles}</div>
      </div>
    </div>`);
  }

  for (const l of links) {
    n += 1;
    const url = l.file_url!;
    const { title, label } = linkLabel(url, letter.related_task_id);
    const href = /^TASK-/i.test(label) && origin ? `${origin}/tasks/${encodeURIComponent(label)}` : url;
    blocks.push(`<div class="ev-item">
      <div class="ev-num">${n}.</div>
      <div class="ev-body">
        <span class="ev-title">${esc(title)}</span> — ${esc(label)} ·
        <a href="${esc(href)}">Buka ${title === "Laporan tugas" ? "laporan" : "tautan"} →</a>
      </div>
    </div>`);
  }

  if (notes.length) {
    n += 1;
    const items = notes
      .map((note) => `<span class="ev-note">“${esc(note.text_note!.trim())}”</span>`)
      .join("; ");
    blocks.push(`<div class="ev-item">
      <div class="ev-num">${n}.</div>
      <div class="ev-body">
        <span class="ev-title">Catatan</span> — ${items}
      </div>
    </div>`);
  }

  return blocks.join("");
}

const STYLES = `
  :root { --ink:#111418; --muted:#5b6470; --line:#d7dbe0; --soft:#f3f4f6; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body {
    background:#e9ebee; color:var(--ink);
    font-family: Inter, "Helvetica Neue", Arial, Helvetica, sans-serif;
    font-size:10pt; line-height:1.4;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
    -webkit-text-size-adjust:100%;
  }
  a { color:inherit; }
  p { margin:0; }
  .muted { color:var(--muted); }

  .toolbar { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:8px;
    padding:10px 16px; background:#fff; border-bottom:1px solid var(--line);
    font-size:13px; }
  .toolbar .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--muted); }
  .toolbar button, .toolbar a.btn { font:inherit; font-weight:600; border:1px solid var(--line);
    background:#fff; color:var(--ink); border-radius:8px; padding:7px 12px; cursor:pointer; text-decoration:none; }
  .toolbar .primary { background:#111418; color:#fff; border-color:#111418; }

  .stage { padding:20px 0 40px; }
  .scaler { transform-origin:top left; margin:0 auto; }
  .sheet { width:210mm; min-height:297mm; margin:0 auto; background:#fff; position:relative;
    padding:14mm 16mm 12mm; box-shadow:0 2px 14px rgba(0,0,0,.14); display:flex; flex-direction:column; }
  .content { flex:1; }

  .kop { display:flex; align-items:center; gap:12px; padding-bottom:7px; border-bottom:1px solid var(--ink); }
  .kop svg { width:46px; height:46px; flex:none; }
  .kop .co { font-size:12pt; font-weight:700; letter-spacing:.02em; line-height:1.25; }
  .kop .sub { font-size:8.5pt; color:var(--muted); line-height:1.4; }

  .title { text-align:center; margin:10px 0 8px; }
  .title h1 { font-size:15pt; font-weight:700; letter-spacing:.08em; margin:0; }
  .title .no { font-size:10.5pt; margin-top:3px; }
  .title .meta { font-size:9.5pt; color:var(--muted); margin-top:2px; }

  .card { border:1px solid var(--line); border-radius:6px; padding:7px 12px 8px; break-inside:avoid; page-break-inside:avoid; }
  .card h2, .sec h2 { font-size:10.5pt; font-weight:700; margin:0 0 5px; letter-spacing:.02em; }
  .card h2 { font-size:8.5pt; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; margin-bottom:4px; }
  .grid { display:grid; grid-template-columns:22mm 1fr 24mm 1fr; column-gap:8px; row-gap:1px; margin:0; }
  .grid dt { color:var(--muted); }
  .grid dd { margin:0; font-weight:600; }
  .grid a { text-decoration:none; }

  .card + .sec { margin-top:8px; border-top:0; }
  .sec { display:grid; grid-template-columns:47mm 1fr; column-gap:4mm; padding:3px 0; border-top:1px solid var(--soft); }
  .sec h2 { margin:0; font-size:10pt; }
  .sec h2 .l { display:inline-block; min-width:1.4em; }
  .sec .body p + p { margin-top:3px; }
  .deadline { font-weight:600; }

  .ev { break-inside:avoid; page-break-inside:avoid; }
  .ev-item { display:flex; gap:6px; padding:3px 0; }
  .ev-item:first-child { padding-top:0; }
  .ev-num { width:1.2em; flex:none; color:var(--muted); }
  .ev-body { flex:1; min-width:0; }
  .ev-title { font-weight:600; }
  .ev-photos { display:grid; grid-template-columns:repeat(3, 24mm); gap:5px; margin-top:3px; }
  .ev-photo { margin:0; }
  .ev-photo img { width:24mm; height:24mm; object-fit:cover; border:1px solid var(--line); border-radius:4px; display:block; background:var(--soft); }
  .ev-photo figcaption { font-size:8pt; color:var(--muted); margin-top:2px; line-height:1.3; }
  .ev-note { font-style:italic; }

  .closing { margin-top:8px; padding-top:8px; border-top:1px solid var(--soft); }
  .closing p + p { margin-top:5px; }

  .sign { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:12px; text-align:center;
    break-inside:avoid; page-break-inside:avoid; font-size:9.5pt; }
  .sign .cap { color:var(--muted); min-height:1.5em; }
  .sign .space { height:19mm; }
  .sign .name { font-weight:700; border-top:1px solid var(--ink); padding-top:3px; margin:0 6mm; }
  .sign .role { color:var(--muted); font-size:8.5pt; }
  .sign .qr { height:19mm; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .sign .qr svg { width:18.5mm; height:18.5mm; display:block; }
  .sign .qr span { font-size:7pt; color:var(--muted); margin-top:1px; }
  .verified { text-align:center; font-size:7.5pt; color:var(--muted); margin-top:6px; }

  .foot { margin-top:10px; padding-top:5px; border-top:1px solid var(--line); display:flex;
    justify-content:space-between; gap:8px; font-size:7.5pt; color:var(--muted); }

  .watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    pointer-events:none; overflow:hidden; }
  .watermark span { transform:rotate(-30deg); font-size:84pt; font-weight:800; letter-spacing:.1em;
    color:rgba(0,0,0,.06); white-space:nowrap; }

  @page { size:A4 portrait; margin:14mm 16mm 14mm 16mm;
    @bottom-right { content:"Halaman " counter(page) " dari " counter(pages); font-family:Inter, Arial, sans-serif; font-size:7.5pt; color:#5b6470; } }
  @media print {
    body { background:#fff; }
    .no-print { display:none !important; }
    .stage { padding:0; }
    .scaler { transform:none !important; width:auto !important; height:auto !important; }
    .sheet { width:auto; min-height:0; padding:0; box-shadow:none; }
    .watermark { position:fixed; }
  }
`;

const SCALE_SCRIPT = `
(function(){
  var scaler=document.querySelector('.scaler'), sheet=document.querySelector('.sheet');
  if(!scaler||!sheet) return;
  function fit(){
    scaler.style.transform=''; scaler.style.width=''; scaler.style.height='';
    var w=sheet.offsetWidth, avail=document.documentElement.clientWidth-16;
    var s=Math.min(1, avail/w);
    if(s<1){
      scaler.style.width=w+'px';
      scaler.style.transform='scale('+s+')';
      scaler.style.height=(sheet.offsetHeight*s)+'px';
      scaler.style.marginLeft=((document.documentElement.clientWidth-w*s)/2)+'px';
    } else { scaler.style.marginLeft=''; }
  }
  window.addEventListener('resize',fit); window.addEventListener('load',fit); fit();
  window.addEventListener('beforeprint',function(){scaler.style.transform='';scaler.style.height='';scaler.style.marginLeft='';});
  window.addEventListener('afterprint',fit);
})();`;

export function buildLetterDocumentHtml(
  letter: DisciplinaryLetter,
  options: LetterDocumentOptions = {},
): string {
  const origin = (options.origin ?? "").replace(/\/$/, "");
  const isSp = letter.type === "PERINGATAN";
  const docType = isSp ? "Surat Peringatan" : "Surat Teguran";
  const title = `${docType.toUpperCase()} ${romanLevel(letter.level)}`;
  const number = letter.letter_number?.trim() || "(nomor dibuat saat disimpan)";
  const outlet = outletLabel(letter.outlet_name_snapshot, options.outletFullName);
  const issuedDate = formatTanggal(letter.incident_date);
  const verifyUrl = buildVerifyUrl(letter.id, origin);

  const watermark =
    letter.status === "CANCELLED"
      ? "DIBATALKAN"
      : options.preview || letter.status === "DRAFT" || letter.status === "WAITING_APPROVAL"
        ? "DRAFT"
        : "";

  const sections: { title: string; body: string; cls?: string }[] = [
    { title: "Kronologi", body: paragraphs(presentChronology(letter.chronology)) },
    {
      title: "Bentuk Pelanggaran",
      body:
        paragraphs(presentViolation(letter.violation_detail)) +
        (letter.sop_reference?.trim()
          ? `<p class="muted">Ketentuan yang dilanggar: ${esc(tidySentence(letter.sop_reference))}</p>`
          : ""),
    },
  ];
  if (letter.operational_impact?.trim()) {
    sections.push({ title: "Dampak Operasional", body: paragraphs(tidySentence(letter.operational_impact)) });
  }
  sections.push({ title: "Instruksi Perbaikan", body: paragraphs(tidySentence(letter.correction_instruction)) });
  if (letter.correction_deadline) {
    sections.push({
      title: "Batas Waktu Perbaikan",
      body: `<p class="deadline">Selambat-lambatnya ${esc(formatTanggal(letter.correction_deadline))}.</p>`,
    });
  }
  if (isSp && letter.consequence?.trim()) {
    sections.push({ title: "Konsekuensi", body: paragraphs(tidySentence(letter.consequence)) });
  }
  sections.push({
    title: "Bukti Pendukung",
    body: buildEvidence(letter.evidence ?? [], letter, origin),
    cls: "ev",
  });

  const sectionsHtml = sections
    .map(
      (s, i) => `<section class="sec${s.cls ? ` ${s.cls}` : ""}">
        <h2><span class="l">${String.fromCharCode(65 + i)}.</span>${esc(s.title)}</h2>
        <div class="body">${s.body}</div>
      </section>`,
    )
    .join("");

  const taskRow = letter.related_task_id
    ? `<dt>Tugas terkait</dt><dd>${
        origin
          ? `<a href="${esc(`${origin}/tasks/${encodeURIComponent(letter.related_task_id)}`)}">${esc(letter.related_task_id)}</a>`
          : esc(letter.related_task_id)
      }</dd>`
    : "";

  const closing = isSp
    ? `<p>Surat peringatan ini merupakan tindakan pembinaan formal atas pelanggaran yang telah diuraikan di atas. Karyawan wajib melaksanakan instruksi perbaikan sesuai batas waktu yang ditetapkan.</p>
       <p>Apabila pelanggaran serupa kembali terjadi selama masa berlaku surat ini, perusahaan dapat mengambil tindakan lanjutan sesuai dengan ketentuan perusahaan.</p>`
    : `<p>Surat teguran ini diberikan sebagai bentuk pembinaan dan evaluasi atas pelaksanaan tanggung jawab kerja. Karyawan diharapkan segera melakukan perbaikan dan memastikan kejadian serupa tidak terulang kembali.</p>
       <p>Apabila pelanggaran yang sama kembali terjadi, perusahaan dapat melakukan evaluasi lebih lanjut dan meningkatkan tindakan pembinaan sesuai dengan ketentuan perusahaan.</p>`;

  const toolbar = options.embed
    ? ""
    : `<div class="toolbar no-print">
        <button type="button" onclick="history.length>1?history.back():window.close()">← Kembali</button>
        <span class="grow">${esc(title)} · ${esc(number)}</span>
        <button type="button" class="primary" onclick="window.print()">Print / Save PDF</button>
      </div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} — ${esc(number)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>${STYLES}</style>
</head>
<body>
${toolbar}
<div class="stage"><div class="scaler"><article class="sheet">
  ${watermark ? `<div class="watermark"><span>${watermark}</span></div>` : ""}
  <div class="content">
    <header class="kop">
      ${nf3Mark(50)}
      <div>
        <div class="co">${esc(NF3_COMPANY.legalName.toUpperCase())} (${esc(NF3_COMPANY.brand)})</div>
        <div class="sub">${esc(NF3_COMPANY.letterheadBrands.join(" • "))}</div>
        <div class="sub">${esc(NF3_COMPANY.address)}</div>
      </div>
    </header>

    <div class="title">
      <h1>${esc(title)}</h1>
      <div class="no">Nomor: ${esc(number)}</div>
      <div class="meta">Tanggal: ${esc(issuedDate)} · Outlet: ${esc(outlet)}</div>
    </div>

    <section class="card">
      <h2>Data Karyawan</h2>
      <dl class="grid">
        <dt>Nama</dt><dd>${esc(letter.employee_name_snapshot)}</dd>
        <dt>Outlet</dt><dd>${esc(outlet)}</dd>
        <dt>Jabatan</dt><dd>${esc(letter.employee_position_snapshot || "—")}</dd>
        ${taskRow || "<dt></dt><dd></dd>"}
      </dl>
    </section>

    ${sectionsHtml}

    <div class="closing">${closing}</div>

    <div class="sign">
      <div>
        <div class="cap">Karyawan</div>
        <div class="space"></div>
        <div class="name">${esc(letter.employee_name_snapshot)}</div>
        <div class="role">${esc(letter.employee_position_snapshot || "Karyawan")}</div>
      </div>
      <div>
        <div class="cap">Leader / Manager</div>
        <div class="space"></div>
        <div class="name">${esc(letter.approved_by_name || letter.created_by_name || "…………………………")}</div>
        <div class="role">Leader / Manager</div>
      </div>
      <div>
        <div class="cap">Mengetahui, Management</div>
        <div class="qr">${qrSvg(verifyUrl)}<span>Verifikasi dokumen</span></div>
        <div class="name">${esc(NF3_COMPANY.founderName)}</div>
        <div class="role">${esc(NF3_COMPANY.founderTitle)} • ${esc(NF3_COMPANY.brand)}</div>
      </div>
    </div>
    <p class="verified">Dokumen diverifikasi secara digital melalui sistem NF3. Pindai QR untuk memeriksa keaslian.</p>
  </div>

  <footer class="foot">
    <span>NF3 Internal Document • ${esc(number)}</span>
    <span>Generated by NF3 Management System</span>
  </footer>
</article></div></div>
<script>${SCALE_SCRIPT}</script>
</body>
</html>`;
}
