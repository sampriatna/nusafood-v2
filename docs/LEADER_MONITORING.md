> Ported to nusafood-v2 from v1 PR #18–#21.

# Leader Monitoring — Kontrol Lapangan

Lapisan kontrol di atas Daily Activity SOP. **Staff submit ≠ pekerjaan otomatis benar.**

## Prinsip

1. Staff isi checklist kerja → dashboard masuk
2. Leader keliling cek fisik
3. Leader validasi (Valid / Revisi / Tidak valid / Manipulasi)
4. Jika belum sesuai → staff wajib ulang
5. Baru dianggap selesai penuh setelah lolos cek leader / spot check

Tidak mengubah: Daily Report staff, Task lama, Master Staff, warna dashboard submit.

## Menu (5 checklist)

| Menu | Jam target (KBU) | Foto |
|------|------------------|------|
| Opening Control | 09:30–10:15 | Wajib |
| Jam Ramai Control | 12:00–14:00 | Wajib jika ada masalah |
| Spot Check Area | 11:00 / 15:00 / 20:00 | Wajib |
| Closing Control | 21:30–22:15 | Wajib |
| Issue Log | Saat ada masalah | Wajib jika fisik |

## Skor & status

- Per titik: **2** Aman · **1** Catatan · **0** Gagal
- Overall: Hijau (Aman) / Kuning (Ada catatan) / Merah (Tidak sesuai)
- Follow up: Open / On Progress / Selesai

## Validasi laporan staff

Dari Dashboard Daily Report (tombol **Validasi lapangan**) atau Spot Check:

- **Valid** — sesuai lapangan
- **Revisi** — staff wajib ulang (label oranye di dashboard)
- **Tidak valid** — laporan/foto tidak sesuai
- **Manipulasi** — foto palsu/lama/beda area

Staff yang submit ulang setelah ditandai → validasi di-reset (harus dicek lagi).

## Routes

| Path | Fungsi |
|------|--------|
| `/dashboard/leader-monitoring` | Hub + form checklist leader |
| `/dashboard/daily-reports` | Audit submit + validasi cepat |
| `/api/leader-monitoring/*` | templates, submit, dashboard, validate, follow-up |

## Rule operasional

1. Leader cek fisik minimal 3× sehari: opening, jam ramai, closing
2. Jangan validasi hanya karena sudah submit
3. Foto lama / blur / beda area → tidak valid / manipulasi
4. Masalah berulang &gt;2× dalam 7 hari → evaluasi staff
5. Leader yang sering “hijaukan” laporan palsu ikut dievaluasi
