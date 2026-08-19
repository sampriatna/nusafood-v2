const NFP = Object.freeze({
  VERSION: '1.1.0-sim',
  TIMEZONE: 'Asia/Jakarta',
  BENCHMARK_SHIFTS: 26,
  DEFAULT_ATTENDANCE_RATE: 25000,
  DEFAULT_WORKWEEK_MODE: '6D',
  OVERTIME_DIVISOR: 173,
  STATUS: 'SIMULATION_ONLY',
  SHEETS: Object.freeze({
    EMPLOYEES: 'EMPLOYEES',
    CAREER_MASTER: 'CAREER_MASTER',
    EMPLOYEE_SKILLS: 'EMPLOYEE_SKILLS',
    ROSTER: 'ROSTER',
    ATTENDANCE: 'ATTENDANCE',
    HOLIDAYS: 'HOLIDAYS',
    PAYROLL_RULES: 'PAYROLL_RULES',
    PAYROLL_ADJUSTMENTS: 'PAYROLL_ADJUSTMENTS',
    PAYROLL_PREVIEW: 'PAYROLL_PREVIEW',
    AUDIT_LOG: 'AUDIT_LOG'
  })
});

const HEADERS = Object.freeze({
  EMPLOYEES: [
    'staff_id','name','outlet','employment_type','primary_path','career_code',
    'reference_rate_override','base_monthly_override','attendance_rate_override',
    'overtime_base_monthly','workweek_mode','active','effective_from','approved_by','notes',
    'extra_hour_rate'
  ],
  CAREER_MASTER: [
    'path','code','stage','level_name','reference_rate','stage_cap','rate_mode',
    'prerequisite','fresh_entry_allowed','experienced_entry_ceiling','active','notes'
  ],
  EMPLOYEE_SKILLS: [
    'staff_id','skill_code','skill_name','status','assessed_at','score','assessor','evidence_url','notes'
  ],
  ROSTER: [
    'date','staff_id','outlet','scheduled_start','scheduled_end','scheduled_effective_minutes','roster_status','notes'
  ],
  ATTENDANCE: [
    'date','staff_id','check_in','check_out','effective_minutes','attendance_status',
    'regular_ot_hours','holiday_ot_hours_override','source','approved_by','notes',
    'extra_hour_hours'
  ],
  HOLIDAYS: [
    'date','holiday_name','is_public_holiday','is_shortest_workday_6d','notes'
  ],
  PAYROLL_RULES: [
    'key','value','description','updated_at','updated_by'
  ],
  PAYROLL_ADJUSTMENTS: [
    'period_start','period_end','staff_id','owner_bonus','regular_ot_pay_override',
    'holiday_ot_pay_override','reference_rate_override','base_monthly_override',
    'reason','approved_by','approved_at'
  ],
  PAYROLL_PREVIEW: [
    'period_start','period_end','staff_id','name','outlet','career_code','career_stage',
    'reference_rate','stage_cap','scheduled_shift_target','base_credit','attendance_credit',
    'base_master','base_payable','attendance_rate','attendance_pay','regular_ot_hours',
    'regular_ot_pay','holiday_ot_hours','holiday_ot_pay','owner_bonus','thp','warnings',
    'calculation_trace','generated_at','extra_hour_hours','extra_hour_rate','extra_hour_pay'
  ],
  AUDIT_LOG: [
    'timestamp','actor','action','entity_type','entity_key','before_json','after_json','notes'
  ]
});

const CAREER_SEED = Object.freeze([
  // FRONT / SERVICE
  ['SERVICE','ST',0,'Service Trainee',45000,45000,'FIXED','',true,'ST',true,'Fresh entry service'],
  ['SERVICE','S1',1,'Service Basic',50000,60000,'FIXED','ST',false,'S3',true,'Foundation service'],
  ['SERVICE','S2',1,'Qualified Service',55000,60000,'FIXED','S1',false,'S3',true,'Mampu pegang area dengan arahan minimal'],
  ['SERVICE','S3',1,'Independent Service + Product Knowledge',60000,60000,'FIXED','S2',false,'S3',true,'Gerbang Bar/Cashier'],
  ['SERVICE','S4',2,'Senior Hospitality',65000,75000,'FIXED','S3',false,'S4',true,'Service specialist awal'],

  // BAR
  ['BAR','B1',1,'Bar Training/Foundation','',60000,'INHERIT','S2/S3',false,'B3',true,'Training badge; tidak otomatis menaikkan rate'],
  ['BAR','B2',2,'Qualified Bar',70000,75000,'FIXED','S3 + B1',false,'B3',true,'Experienced barista boleh challenge'],
  ['BAR','B3',2,'Independent Bar + Closing',75000,75000,'FIXED','B2',false,'B3',true,'Qualified + closing'],
  ['BAR','B4',3,'Senior Bar / Stock & Control',80000,85000,'FIXED','B3',false,'B4',true,'Stage cap 85k; 85k memerlukan review/approval'],

  // CASHIER
  ['CASHIER','C1',1,'Cashier Training','',60000,'INHERIT','S2/S3 + Product Knowledge',false,'C1',true,'Tidak ada fresh direct-entry cashier'],
  ['CASHIER','C2',2,'Qualified Cashier',70000,75000,'FIXED','S3 + C1',false,'C2',true,'Service foundation wajib'],
  ['CASHIER','C3',2,'Closing Cashier',75000,75000,'FIXED','C2',false,'C3',true,'Closing certified'],
  ['CASHIER','C4',3,'Cash Control / Senior',80000,85000,'FIXED','C3',false,'C4',true,'Stage cap 85k'],

  // KITCHEN
  ['KITCHEN','KT',0,'Kitchen Trainee',60000,60000,'FIXED','',true,'KT',true,'Fresh entry kitchen'],
  ['KITCHEN','K1',1,'Kitchen Basic',65000,80000,'FIXED','KT',false,'K5',true,'Basic SOP/food safety'],
  ['KITCHEN','K2',1,'Prep / Helper',70000,80000,'FIXED','K1',false,'K5',true,'Prep mandiri'],
  ['KITCHEN','K3',1,'Station Basic',75000,80000,'FIXED','K2',false,'K5',true,'Satu station dasar'],
  ['KITCHEN','K4',1,'Station Cook',80000,80000,'FIXED','K3',false,'K5',true,'Station mandiri'],
  ['KITCHEN','K5',2,'Multi Station',85000,95000,'FIXED','K4',false,'K5',true,'Experienced cook entry ceiling normal'],
  ['KITCHEN','K6',2,'Advanced Multi Station',90000,95000,'FIXED','K5',false,'K6',true,'Multi station kuat'],
  ['KITCHEN','K7',2,'Senior Cook',95000,95000,'FIXED','K6',false,'K7',true,'Senior technical'],
  ['KITCHEN','K8',3,'Production Certified',100000,105000,'FIXED','K7',false,'K8',true,'Production bagian Kitchen'],
  ['KITCHEN','K9',3,'Multi-store Production',105000,105000,'FIXED','K8',false,'K9',true,'Batch/yield/multi-store'],
  ['KITCHEN','K10',4,'Kitchen PIC',110000,115000,'FIXED','K9 + leadership assessment',false,'K10',true,'People/process responsibility'],
  ['KITCHEN','K11',4,'Assistant Head',115000,115000,'FIXED','K10',false,'K11',true,'Assistant Head'],
  ['KITCHEN','KH',5,'Head Kitchen',135000,135000,'FIXED','K11 + Head assessment',false,'KH',true,'People + product + process + cost']
]);

const RULE_SEED = Object.freeze([
  ['VERSION', NFP.VERSION, 'Versi simulator', '', ''],
  ['STATUS', NFP.STATUS, 'Output bukan payroll final', '', ''],
  ['BENCHMARK_SHIFTS', NFP.BENCHMARK_SHIFTS, 'Benchmark untuk default Base Master', '', ''],
  ['ATTENDANCE_RATE', NFP.DEFAULT_ATTENDANCE_RATE, 'Default attendance pay per full work credit', '', ''],
  ['OVERTIME_DIVISOR', NFP.OVERTIME_DIVISOR, 'Hourly legal overtime base = overtime_base_monthly / divisor', '', ''],
  ['DEFAULT_WORKWEEK_MODE', NFP.DEFAULT_WORKWEEK_MODE, '6D atau 5D', '', ''],
  ['OVERSTAY_WARNING_MINUTES', 30, 'Warning jika clock-out melewati jadwal tanpa approved extra hour', '', ''],
  ['THR_ENGINE', 'DISABLED', 'THR sengaja tidak dihitung di V1', '', '']
]);

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + name + '. Jalankan Setup / Reset Headers.');
  return sheet;
}

function normalizeBool_(value) {
  if (value === true || value === false) return value;
  const s = String(value == null ? '' : value).trim().toLowerCase();
  return ['true','1','yes','y','ya'].includes(s);
}

function normalizeNumber_(value, fallback) {
  if (value === '' || value == null) return fallback == null ? 0 : fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
}

function normalizeDateKey_(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, NFP.TIMEZONE, 'yyyy-MM-dd');
}

function roundMoney_(value) {
  return Math.round((Number(value) || 0));
}

function round4_(value) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}

function getRowsAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(row => row.some(v => v !== '' && v != null)).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function writeObjects_(sheetName, headers, objects) {
  const sheet = getSheet_(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (objects.length) {
    const rows = objects.map(obj => headers.map(h => obj[h] == null ? '' : obj[h]));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function mapBy_(rows, keyFn) {
  const out = {};
  rows.forEach(row => {
    const key = keyFn(row);
    if (key) out[key] = row;
  });
  return out;
}

function appendAudit_(action, entityType, entityKey, beforeObj, afterObj, notes) {
  const sheet = getSheet_(NFP.SHEETS.AUDIT_LOG);
  const actor = Session.getActiveUser().getEmail() || 'unknown';
  sheet.appendRow([
    new Date(), actor, action, entityType, entityKey,
    beforeObj ? JSON.stringify(beforeObj) : '',
    afterObj ? JSON.stringify(afterObj) : '',
    notes || ''
  ]);
}
