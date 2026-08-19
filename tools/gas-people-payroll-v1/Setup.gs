function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NF People Payroll')
    .addItem('Setup / Reset Headers', 'setupWorkbook')
    .addSeparator()
    .addItem('Validate Data', 'validateData')
    .addItem('Generate Payroll Preview', 'promptGeneratePayrollPreview')
    .addItem('Run Self Tests', 'runSelfTests')
    .addToUi();
}

function setupWorkbook() {
  const ss = getSpreadsheet_();
  Object.keys(NFP.SHEETS).forEach(key => {
    const name = NFP.SHEETS[key];
    const headers = HEADERS[key];
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    const existing = sheet.getDataRange().getValues();
    const hasData = existing.length > 1 && existing.slice(1).some(r => r.some(v => v !== '' && v != null));

    if (!hasData) {
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    } else {
      const currentHeaders = existing[0].map(String);
      headers.forEach((h, index) => {
        if (currentHeaders[index] !== h) {
          throw new Error('Sheet ' + name + ' sudah berisi data tetapi header tidak sesuai pada kolom ' + (index + 1) + '. Backup dahulu sebelum reset.');
        }
      });
    }
  });

  seedCareerMaster_();
  seedPayrollRules_();
  formatWorkbook_();
  appendAudit_('SETUP', 'WORKBOOK', ss.getId(), null, {version: NFP.VERSION}, 'Setup workbook');
  SpreadsheetApp.getUi().alert('Setup selesai. Career Master dan Payroll Rules sudah disiapkan.');
}

function seedCareerMaster_() {
  const sheet = getSheet_(NFP.SHEETS.CAREER_MASTER);
  const current = getRowsAsObjects_(NFP.SHEETS.CAREER_MASTER);
  if (current.length) return;
  sheet.getRange(2, 1, CAREER_SEED.length, HEADERS.CAREER_MASTER.length).setValues(CAREER_SEED);
}

function seedPayrollRules_() {
  const sheet = getSheet_(NFP.SHEETS.PAYROLL_RULES);
  const current = getRowsAsObjects_(NFP.SHEETS.PAYROLL_RULES);
  if (current.length) return;
  sheet.getRange(2, 1, RULE_SEED.length, HEADERS.PAYROLL_RULES.length).setValues(RULE_SEED);
}

function formatWorkbook_() {
  const ss = getSpreadsheet_();
  Object.values(NFP.SHEETS).forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    sheet.setFrozenRows(1);
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    sheet.autoResizeColumns(1, lastCol);
    if (sheet.getMaxRows() > 1) {
      sheet.getRange(2, 1, sheet.getMaxRows() - 1, lastCol).setVerticalAlignment('middle');
    }
  });
}

function promptGeneratePayrollPreview() {
  const ui = SpreadsheetApp.getUi();
  const startResp = ui.prompt('Generate Payroll Preview', 'Period start (YYYY-MM-DD)', ui.ButtonSet.OK_CANCEL);
  if (startResp.getSelectedButton() !== ui.Button.OK) return;
  const endResp = ui.prompt('Generate Payroll Preview', 'Period end (YYYY-MM-DD)', ui.ButtonSet.OK_CANCEL);
  if (endResp.getSelectedButton() !== ui.Button.OK) return;

  const start = startResp.getResponseText().trim();
  const end = endResp.getResponseText().trim();
  const result = generatePayrollPreview(start, end);
  ui.alert('Selesai. ' + result.employeeCount + ' employee dihitung. Warning: ' + result.warningCount + '.');
}

function getPayrollRules_() {
  const rows = getRowsAsObjects_(NFP.SHEETS.PAYROLL_RULES);
  const out = {
    BENCHMARK_SHIFTS: NFP.BENCHMARK_SHIFTS,
    ATTENDANCE_RATE: NFP.DEFAULT_ATTENDANCE_RATE,
    OVERTIME_DIVISOR: NFP.OVERTIME_DIVISOR,
    DEFAULT_WORKWEEK_MODE: NFP.DEFAULT_WORKWEEK_MODE,
    THR_ENGINE: 'DISABLED'
  };
  rows.forEach(r => {
    if (!r.key) return;
    const key = String(r.key).trim();
    const raw = r.value;
    if (['BENCHMARK_SHIFTS','ATTENDANCE_RATE','OVERTIME_DIVISOR'].includes(key)) {
      out[key] = normalizeNumber_(raw, out[key]);
    } else {
      out[key] = raw;
    }
  });
  return out;
}

function validateData() {
  const issues = collectValidationIssues_();
  const ui = SpreadsheetApp.getUi();
  if (!issues.length) {
    ui.alert('Validation OK. Tidak ada isu struktural yang terdeteksi.');
    return [];
  }
  ui.alert('Ditemukan ' + issues.length + ' isu.\n\n' + issues.slice(0, 20).join('\n') + (issues.length > 20 ? '\n…lihat data untuk sisanya.' : ''));
  return issues;
}

function collectValidationIssues_() {
  const issues = [];
  const employees = getRowsAsObjects_(NFP.SHEETS.EMPLOYEES);
  const careers = getRowsAsObjects_(NFP.SHEETS.CAREER_MASTER);
  const roster = getRowsAsObjects_(NFP.SHEETS.ROSTER);
  const attendance = getRowsAsObjects_(NFP.SHEETS.ATTENDANCE);
  const careerMap = mapBy_(careers, r => String(r.code || '').trim());
  const activeStaff = {};

  employees.forEach((e, i) => {
    const id = String(e.staff_id || '').trim();
    if (!id) issues.push('EMPLOYEES row ' + (i + 2) + ': staff_id kosong');
    if (id && activeStaff[id]) issues.push('EMPLOYEES: duplicate staff_id ' + id);
    if (id) activeStaff[id] = true;
    const code = String(e.career_code || '').trim();
    if (!code) issues.push('EMPLOYEES ' + id + ': career_code kosong');
    if (code && !careerMap[code]) issues.push('EMPLOYEES ' + id + ': career_code tidak ada di CAREER_MASTER: ' + code);
    const mode = String(e.workweek_mode || NFP.DEFAULT_WORKWEEK_MODE).trim();
    if (!['5D','6D'].includes(mode)) issues.push('EMPLOYEES ' + id + ': workweek_mode harus 5D/6D');
  });

  const rosterKeys = {};
  roster.forEach((r, i) => {
    const id = String(r.staff_id || '').trim();
    const date = normalizeDateKey_(r.date);
    const key = date + '|' + id;
    if (!date || !id) issues.push('ROSTER row ' + (i + 2) + ': date/staff_id invalid');
    if (rosterKeys[key]) issues.push('ROSTER duplicate: ' + key);
    rosterKeys[key] = true;
    const status = String(r.roster_status || 'WORK').trim().toUpperCase();
    if (!['WORK','WEEKLY_OFF','TRAINING'].includes(status)) issues.push('ROSTER ' + key + ': roster_status invalid ' + status);
    if (status !== 'WEEKLY_OFF' && normalizeNumber_(r.scheduled_effective_minutes, 0) <= 0) {
      issues.push('ROSTER ' + key + ': scheduled_effective_minutes harus > 0');
    }
  });

  const attendanceKeys = {};
  attendance.forEach((a, i) => {
    const id = String(a.staff_id || '').trim();
    const date = normalizeDateKey_(a.date);
    const key = date + '|' + id;
    if (!date || !id) issues.push('ATTENDANCE row ' + (i + 2) + ': date/staff_id invalid');
    if (attendanceKeys[key]) issues.push('ATTENDANCE duplicate: ' + key);
    attendanceKeys[key] = true;
    const status = String(a.attendance_status || '').trim().toUpperCase();
    if (!['PRESENT','COMPANY_RELEASE','TRAINING','PAID_LEAVE','SICK_PAID','UNPAID_PERMISSION','ABSENT'].includes(status)) {
      issues.push('ATTENDANCE ' + key + ': attendance_status invalid ' + status);
    }
  });

  return issues;
}
