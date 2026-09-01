# Nusa Food People & Payroll System — V1 Specification

Status: **SIMULATION / REVIEW FIRST**  
Target implementation V1: **Google Apps Script + Google Sheets**  
Source of truth jangka panjang: **Laravel HRIS/Attendance**. GAS tidak boleh menjadi database karyawan kedua.

## 1. Tujuan

V1 dipakai untuk:

- menguji career ladder dan payroll sebelum ditanam permanen ke Laravel;
- membuat perhitungan transparan sampai level rumus;
- membandingkan payroll lama vs usulan baru;
- menemukan anomali roster, attendance, OT, rate, dan skill;
- menjalankan 1–2 periode paralel sebelum cutover.

V1 **tidak** melakukan pembayaran otomatis dan **tidak** menghitung THR. Semua hasil adalah payroll preview sampai disetujui owner/finance.

---

## 2. Prinsip yang dikunci

1. Career menentukan nilai kompetensi; attendance menentukan work credit; payroll menggabungkan keduanya.
2. Fresh graduate hanya punya dua gerbang utama: Service Trainee atau Kitchen Trainee.
3. Cashier bukan entry position. Cashier harus memiliki Service Foundation/Product Knowledge Nusa Food.
4. Bar internal berasal dari Service. Experienced barista boleh challenge test dan masuk maksimum B2/B3 sesuai hasil.
5. Kitchen adalah direct technical track. Experienced cook boleh challenge assessment.
6. Production adalah kompetensi lanjutan di dalam Kitchen, bukan career department terpisah.
7. Badge/sertifikasi tidak otomatis berarti +Rp5.000. Rate mengikuti primary role, career stage, assessment, dan stage cap.
8. Career Stage menjadi pagar agar rate tidak naik liar hanya karena mengumpulkan badge.
9. Head punya gap rate karena bertanggung jawab atas people + product + process + cost.
10. Full-time dibentuk untuk baseline demand; peak demand ditutup dengan part-time.
11. Payroll FT memakai Base Pay + Attendance Pay + OT + Owner Bonus.
12. Attendance Pay V1 default Rp25.000 per full work credit.
13. Kurang jam karena kepentingan pribadi diprorata. Jika perusahaan yang memulangkan lebih cepat, work credit tetap penuh.
14. Scheduled shift target mengikuti roster aktual periode, bukan angka 25/26 yang di-hardcode.
15. Hari libur resmi yang memang ada di roster tetap satu scheduled shift normal; tidak menjadi 26/25 dan tidak otomatis menghasilkan replacement off.
16. Jam kerja aktual pada hari libur resmi dicatat sebagai Holiday OT Hours dan dihitung terpisah.
17. THR sengaja tidak diimplementasikan di V1.

---

## 3. Career Stage

Career Stage tidak harus ditampilkan sebagai istilah utama kepada staf, tetapi backend menggunakannya sebagai cap.

| Stage | Arti | Front cap | Kitchen cap |
|---|---|---:|---:|
| 0 | Trainee | 45k | 60k |
| 1 | Foundation | 60k | 80k |
| 2 | Qualified | 75k | 95k |
| 3 | Specialist | 85k | 105k |
| 4 | PIC / Assistant Head | 100k draft | 115k |
| 5 | Head | case-by-case | 135k |

Rate adalah **reference value**, bukan otomatis nominal cash harian.

---

## 4. Front Career Master

### Service

| Code | Stage | Level | Reference | Catatan |
|---|---:|---|---:|---|
| ST | 0 | Service Trainee | 45k | fresh entry |
| S1 | 1 | Service Basic | 50k | basic SOP/grooming/table flow |
| S2 | 1 | Qualified Service | 55k | mampu pegang area dengan arahan minimal |
| S3 | 1 | Independent Service + Product Knowledge | 60k | gerbang menuju Bar/Cashier |
| S4 | 2 | Senior Hospitality | 65k | service specialist awal |

### Bar

B1 adalah training badge dan **tidak otomatis mengubah rate**.

| Code | Stage | Level | Reference |
|---|---:|---|---:|
| B1 | 1 | Bar Training/Foundation | inherit |
| B2 | 2 | Qualified Bar | 70k |
| B3 | 2 | Independent Bar + Closing | 75k |
| B4 | 3 | Senior Bar / Stock & Control | 80k; stage cap 85k |

### Cashier

Cashier tidak boleh direct fresh entry.

| Code | Stage | Level | Reference |
|---|---:|---|---:|
| C1 | 1 | Cashier Training | inherit |
| C2 | 2 | Qualified Cashier | 70k |
| C3 | 2 | Closing Cashier | 75k |
| C4 | 3 | Cash Control / Senior | 80k; stage cap 85k |

---

## 5. Kitchen Career Master

| Code | Stage | Level | Reference |
|---|---:|---|---:|
| KT | 0 | Kitchen Trainee | 60k |
| K1 | 1 | Kitchen Basic | 65k |
| K2 | 1 | Prep / Helper | 70k |
| K3 | 1 | Station Basic | 75k |
| K4 | 1 | Station Cook | 80k |
| K5 | 2 | Multi Station | 85k |
| K6 | 2 | Advanced Multi Station | 90k |
| K7 | 2 | Senior Cook | 95k |
| K8 | 3 | Production Certified | 100k |
| K9 | 3 | Multi-store Production | 105k |
| K10 | 4 | Kitchen PIC | 110k |
| K11 | 4 | Assistant Head | 115k |
| KH | 5 | Head Kitchen | 135k |

Head Kitchen mencakup tanggung jawab seperti production besar/catering, HPP, recipe standard, yield, waste, stock planning, manpower, training, QC, dan problem solving. Karena itu KH bukan sekadar level teknis setelah K11.

---

## 6. Experienced Hire / Entry Ceiling

| Rekrut | Entry maksimum normal |
|---|---|
| Fresh Service | ST |
| Fresh Kitchen | KT |
| Experienced Service | S3 setelah challenge assessment |
| Experienced Bar | B2/B3 setelah culture + product + service foundation + practical |
| Experienced Kitchen | K4/K5 setelah practical |
| External Cashier | tetap wajib Service Foundation + Product Knowledge sebelum C2 |
| Senior specialist khusus | case-by-case, wajib owner approval |

Experience membuka challenge assessment; experience tidak otomatis menjamin level.

---

## 7. Payroll Model V1

### Reference rate

Reference rate adalah nilai level untuk career comparison.

Default attendance rate:

`Rp25.000 / full work credit`

Benchmark career untuk menghitung default base master:

`26 shifts`

Default base master:

`Base Master = (Reference Rate - Attendance Rate) × 26`

Contoh S1 50k:

- Base Master = (50k - 25k) × 26 = 650k
- Jika roster aktual 25 shift dan semua terpenuhi: 650k + (25 × 25k) = 1.275m
- Jika roster aktual 26 shift dan semua terpenuhi: 650k + (26 × 25k) = 1.300m

Base Master boleh di-override secara eksplisit per employee setelah approval. Override tidak boleh diam-diam.

### THP preview

`THP = Base Payable + Attendance Pay + Regular OT Pay + Holiday OT Pay + Owner Bonus`

V1 tidak menghitung THR.

---

## 8. Roster dan Work Credit

Scheduled shift target berasal dari ROSTER untuk periode terkait.

| Attendance status | Base credit | Attendance credit |
|---|---:|---:|
| PRESENT full shift | 1.00 | 1.00 |
| PRESENT short personal | actual_minutes / scheduled_minutes | sama |
| COMPANY_RELEASE | 1.00 | 1.00 |
| TRAINING | 1.00 | 1.00 |
| PAID_LEAVE | 1.00 | 0.00 |
| SICK_PAID | 1.00 | 0.00 |
| UNPAID_PERMISSION | 0.00 | 0.00 |
| ABSENT | 0.00 | 0.00 |
| WEEKLY_OFF | tidak masuk denominator | 0.00 |

Base payable:

`Base Payable = Base Master × Base Credit / Scheduled Shift Target`

Attendance pay:

`Attendance Pay = Attendance Credit × Attendance Rate`

Jika scheduled shift 10 jam dan employee bekerja 8 jam karena urusan pribadi, work credit = 0.8. Jika outlet yang memulangkan setelah 8 jam, status COMPANY_RELEASE sehingga credit tetap 1.0.

---

## 9. Public Holiday

Jika satu dari 25 scheduled shift jatuh pada hari libur resmi dan employee memang roster masuk:

- attendance tetap 25/25 jika semua shift terpenuhi;
- base credit = 1;
- attendance credit = 1;
- actual effective hours hari itu dicatat sebagai Holiday OT Hours;
- tidak ada tambahan +1 normal daily salary;
- tidak otomatis ada replacement off.

V1 menyediakan engine multiplier holiday OT. Nilai `overtime_base_monthly` per employee harus diisi/ditinjau finance. Bila kosong, engine memberi warning dan tidak menebak dasar lembur.

Default mode:

- hari kerja biasa: jam pertama 1.5× hourly overtime base, berikutnya 2×;
- 6-day workweek holiday normal: 7 jam pertama 2×, jam ke-8 3×, berikutnya 4×;
- 6-day shortest-workday holiday: 5 jam pertama 2×, jam ke-6 3×, berikutnya 4×;
- 5-day workweek holiday: 8 jam pertama 2×, jam ke-9 3×, berikutnya 4×;
- hourly overtime base = overtime_base_monthly / 173.

Aturan ini harus tetap diperlakukan sebagai payroll rule yang bisa diperbarui bila regulasi berubah.

---

## 10. Part-time

Part-time tidak menggunakan Base + Attendance FT.

PT dihitung sebagai:

- hourly rate; atau
- fixed shift rate 4h/6h/8h.

Tujuan: membeli peak capacity tanpa memperbesar fixed payroll.

---

## 11. Owner Bonus

Owner Bonus:

- default Rp0;
- manual;
- tidak menaikkan base;
- wajib alasan;
- wajib audit log/approval.

---

## 12. Assessment & Skill Governance

Empat komponen assessment V1:

- Technical Skill 40%
- SOP & Quality 25%
- Productivity 20%
- Behaviour 15%

Interpretasi:

- <70: not yet competent
- 70–79: competent
- 80–89: qualified for review
- 90+: promotion candidate

Tidak ada auto raise. Assessment hanya membuka review.

Behaviour minimum mencakup Communication, Initiative, Teamwork, Accountability, Adaptability. Critical failure seperti cash manipulation, serious dishonesty, severe food-safety violation, bullying, atau sengaja menutup kesalahan dapat membekukan promotion/certification.

Trainer harus certified; seniority saja tidak cukup.

---

## 13. Sheets V1

Workbook menggunakan:

1. `EMPLOYEES`
2. `CAREER_MASTER`
3. `EMPLOYEE_SKILLS`
4. `ROSTER`
5. `ATTENDANCE`
6. `HOLIDAYS`
7. `PAYROLL_RULES`
8. `PAYROLL_ADJUSTMENTS`
9. `PAYROLL_PREVIEW`
10. `AUDIT_LOG`

Semua join memakai `staff_id` / employee business key. Jangan membuat identity baru per outlet.

---

## 14. Control / Warning wajib

Payroll preview harus memberi warning untuk minimal:

- employee tanpa career code;
- career rate melebihi stage cap;
- employee roster tetapi attendance hilang;
- attendance tidak memiliki roster;
- scheduled minutes nol/tidak valid;
- public holiday terdeteksi;
- OT hours ada tetapi overtime base kosong;
- owner bonus tanpa reason/approver;
- rate override tanpa approval;
- duplicate staff/date rows.

---

## 15. Rollout

### Phase A — Simulator

- Setup workbook.
- Import satu periode roster + attendance nyata.
- Mapping employee ke career code.
- Isi overtime base dan adjustment yang diperlukan.
- Generate preview.
- Bandingkan current payroll vs proposed payroll.

### Phase B — Parallel Run

Jalankan 1–2 payroll cycle. Finance menghitung manual dan GAS menghitung paralel. Selisih harus dijelaskan sebelum payroll final.

### Phase C — Laravel

Setelah rule stabil, pindahkan engine ke Laravel HRIS/Attendance. Laravel menjadi source of truth; GAS menjadi reporting/sandbox, bukan second editable HRIS.

---

## 16. Keputusan yang belum dikunci

- nominal final Finance/Office career ladder;
- perlakuan cuti/sakit detail sesuai policy final;
- struktur THR;
- mapping level seluruh employee existing;
- overtime base tiap employee;
- apakah attendance rate Rp25.000 tetap universal setelah 1–2 cycle simulasi.

Semua item ini harus configurable dan tidak boleh di-hardcode sebagai asumsi tersembunyi.