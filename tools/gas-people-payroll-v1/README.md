# NF People & Payroll GAS V1

Standalone Google Apps Script simulator untuk menguji Career + Attendance + Payroll Nusa Food sebelum engine dipindahkan ke Laravel HRIS.

## Status

**Simulation only.** Jangan jadikan output sebagai payroll final tanpa review Finance/Owner.

## Setup cepat

1. Buat Google Spreadsheet baru, mis. `NF3 People Payroll V1 - Sandbox`.
2. Extensions → Apps Script.
3. Salin semua file `.gs` dan `appsscript.json` dari folder ini.
4. Reload spreadsheet.
5. Menu `NF People Payroll` → `Setup / Reset Headers`.
6. Isi `EMPLOYEES`, `ROSTER`, `ATTENDANCE`, dan `HOLIDAYS`.
7. Isi `overtime_base_monthly` di EMPLOYEES jika ingin engine menghitung OT rupiah otomatis.
8. Menu → `Validate Data`.
9. Menu → `Generate Payroll Preview`.
10. Buka `PAYROLL_PREVIEW` dan baca `warnings` + `calculation_trace`.

## Prinsip penting

- Join memakai `staff_id`.
- `CAREER_MASTER` disediakan sebagai seed dan dapat dikurasi sebelum live.
- Attendance rate default Rp25.000/full work credit.
- Base default diturunkan dari reference rate dengan benchmark 26 shift.
- Scheduled target berasal dari ROSTER periode, bukan hardcoded 25/26.
- Public holiday yang memang roster masuk tetap satu shift normal dan jam aktualnya dihitung sebagai Holiday OT.
- THR tidak dihitung di V1.
- OT base tidak ditebak. Jika kosong, hasil OT pay = 0 dan warning muncul kecuali ada override manual.

## Sheet

- `EMPLOYEES`
- `CAREER_MASTER`
- `EMPLOYEE_SKILLS`
- `ROSTER`
- `ATTENDANCE`
- `HOLIDAYS`
- `PAYROLL_RULES`
- `PAYROLL_ADJUSTMENTS`
- `PAYROLL_PREVIEW`
- `AUDIT_LOG`

## Format tanggal

Gunakan tanggal asli Google Sheets, bukan text bila memungkinkan.

## ROSTER

Kolom utama:

- `date`
- `staff_id`
- `outlet`
- `scheduled_start`
- `scheduled_end`
- `scheduled_effective_minutes`
- `roster_status`

`roster_status` yang didukung:

- `WORK`
- `WEEKLY_OFF`
- `TRAINING`

Hari izin/sakit/mangkir tetap boleh mempunyai roster `WORK`; status aktual diletakkan di ATTENDANCE.

## ATTENDANCE

`attendance_status` yang didukung:

- `PRESENT`
- `COMPANY_RELEASE`
- `TRAINING`
- `PAID_LEAVE`
- `SICK_PAID`
- `UNPAID_PERMISSION`
- `ABSENT`

`effective_minutes` adalah jam kerja efektif setelah break.

Jika employee bekerja 8/10 jam karena alasan pribadi, isi `PRESENT` + `effective_minutes=480`. Work credit menjadi 0.8.

Jika perusahaan memulangkan employee setelah 8/10 jam, isi `COMPANY_RELEASE`; work credit tetap 1.0.

## HOLIDAYS

Isi kalender libur resmi yang ingin dihitung.

- `date`
- `holiday_name`
- `is_public_holiday` TRUE/FALSE
- `is_shortest_workday_6d` TRUE/FALSE

## PAYROLL_ADJUSTMENTS

Untuk satu periode payroll:

- `period_start`
- `period_end`
- `staff_id`
- `owner_bonus`
- `regular_ot_pay_override`
- `holiday_ot_pay_override`
- `reference_rate_override`
- `base_monthly_override`
- `reason`
- `approved_by`
- `approved_at`

Override harus terlihat di calculation trace dan warning bila approval tidak lengkap.

## Payroll formula

Default:

`Base Master = (Reference Rate - Attendance Rate) × Benchmark Shifts`

`Base Payable = Base Master × Base Credit / Scheduled Shift Target`

`Attendance Pay = Attendance Credit × Attendance Rate`

`THP = Base Payable + Attendance Pay + Regular OT Pay + Holiday OT Pay + Owner Bonus`

## OT

Engine menyediakan multiplier regular + holiday berbasis `/173`, tetapi hanya jika `overtime_base_monthly` terisi.

Regular OT per hari:

- jam pertama 1.5×
- jam selanjutnya 2×

Holiday work:

- 6 hari kerja: 7 jam pertama 2×, jam ke-8 3×, berikutnya 4×;
- shortest workday pada pola 6 hari: 5 jam pertama 2×, jam ke-6 3×, berikutnya 4×;
- 5 hari kerja: 8 jam pertama 2×, jam ke-9 3×, berikutnya 4×.

Jika policy/regulasi berubah, ubah engine/config sebelum payroll final.

## Self test

Menu → `Run Self Tests`.

Test mencakup:

- default Base S1 50k;
- payroll 25/25;
- 1 hari unpaid;
- short shift 8/10;
- regular OT multiplier;
- holiday OT multiplier 6-day dan 5-day.

## Integrasi Laravel nanti

Jangan push attendance manual dua arah. Laravel HRIS tetap menjadi source of truth. GAS V1 idealnya menerima export/API read-only berdasarkan `staff_id`, lalu menghasilkan preview dan audit trace.