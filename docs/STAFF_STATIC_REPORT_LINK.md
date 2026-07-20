> Ported to nusafood-v2 from v1 PR #18–#21.

# Staff Static Report Link — Kegiatan Standar (SOP)

Fitur pelengkap daily report. **Bukan laporan teks bebas.** Staff mengikuti standar kerja: checklist + foto + status kondisi.

## Dua lapisan (wajib dipisah)

| Lapisan | Untuk apa | Cara kerja |
|---------|-----------|------------|
| **Task lama** | Pekerjaan yang diberikan admin/leader | Deadline, revisi, approval, foto before-after, WA |
| **Daily Activity SOP** | Kegiatan standar harian per SDM | Link pribadi `/r/[token]`, checklist, foto, submit — tanpa WA tiap hari |

Fitur baru **bukan pengganti** task lama.

## Prinsip

Staff jangan dikasih kolom kosong. Staff dikasih standar kerja → centang → audit.

## Performa (sat set)

- Public `/r/[token]` & submit **tidak menunggu GAS**
- Buka form kegiatan = instan (tanpa network)
- Setelah submit: update lokal + flash OK (tidak reload penuh)
- Feedback klik: `active:scale`, spinner hanya saat kirim
- Admin sync staff dari data yang sudah di-fetch client

## Super Admin (editable)

Hub: `/settings/daily-activity`

- Edit template kegiatan + checklist
- Generate / revoke link staff
- Dashboard audit

## Halaman

| Route | Fungsi |
|-------|--------|
| `/r/[token]` | Daftar kegiatan → form checklist SOP |
| `/dashboard/daily-reports` | Audit: % checklist, kondisi, warna status |
| `/settings/daily-activity` | Hub super admin |
| `/settings/report-templates` | CRUD kegiatan + checklist |
| `/settings/report-links` | Generate / revoke link |

## Warna dashboard

- **Hijau** — selesai lengkap (Aman)
- **Kuning** — selesai ada kendala
- **Merah** — belum submit (wajib)
- **Abu** — tidak wajib

## Position groups

| Group | Mapping jabatan (contoh) |
|-------|--------------------------|
| Waiters | waiter, server, floor, kasir |
| Bar | barista, bar, bartender |
| Dapur | cook, chef, dapur, kitchen |
| PA | pa, ob, public area, office boy, klindingan, cleaning, kebersihan |

## PA / OB — Kopi Buri Umah (KBU)

8 kegiatan area-based (bukan “bersih-bersih” generik), masing-masing 10 checklist + wajib foto:

1. Opening Public Area Customer (08:30–10:00)
2. Toilet Customer Check (09:00–10:00)
3. Area Makan Customer Check (10:00–12:00)
4. Halaman & Parkiran Check (10:00–11:30)
5. Taman, Tanaman & Rumput Kecil (15:00–16:00)
6. Sampah & Tempat Sampah Check (11:00–12:00)
7. Mushola / Area Ibadah Check (10:00–11:00)
8. Closing Public Area Customer (21:00–22:00)

Staff outlet **KBU** dengan posisi PA/OB melihat 8 kegiatan ini. Form menampilkan peringatan foto ketat + panduan catatan (kondisi awal → dikerjakan → akhir → kendala).

## Leader Monitoring (lapisan kontrol)

Staff submit ≠ otomatis benar. Leader cek fisik via `/dashboard/leader-monitoring`:

- Opening · Jam Ramai · Spot Check · Closing · Issue Log
- Validasi laporan: Valid / Revisi / Tidak valid / Manipulasi
- Docs: `docs/LEADER_MONITORING.md`

## Demo seed

| Staff | Posisi | Short link |
|-------|--------|------------|
| Rina | Waiters | `/r/rina` |
| Ani | Bar | `/r/ani` |
| Budi | Dapur | `/r/budi` |
| Dedi | PA (KBU) | `/r/dedi` |
