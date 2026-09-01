const NFP_V16_READINESS_DETAIL_SHEET = 'PAYROLL_READINESS_DETAIL';
const NFP_V16_SLIP_PREVIEW_SHEET = 'SLIP_GAJI_PREVIEW';
const NFP_V16_SLIP_PRINT_SHEET = 'SLIP_PRINT';

const NFP_V16_READINESS_HEADERS = Object.freeze([
  'staff_id','name','payroll_mode','thp','engine_status','variable_status',
  'attendance_source','real_data_status','warnings','final_gate','blocker',
  'period_start','period_end','notes'
]);

const NFP_V16_SLIP_HEADERS = Object.freeze([
  'period_start','period_end','staff_id','name','outlet','payroll_mode',
  'base_payable','attendance_pay','fixed_allowance','prorata_allowance_pay',
  'variable_earnings','variable_deductions','extra_hour_pay','regular_ot_pay',
  'holiday_ot_pay','owner_bonus','thp','component_status'
]);

function runV16SelfTestsNoUi() {
  const results = [];
  testCase_(results, 'V1.6 blank amount + blank approver is pending', () => {
    assertTrue_(!isV16VariableRowReviewed_({amount:'', quantity:'', rate:'', approved_by:''}));
  });
  testCase_(results, 'V1.6 explicit zero + approver is reviewed', () => {
    assertTrue_(isV16VariableRowReviewed_({amount:0, approved_by:'TEST'}));
  });
  testCase_(results, 'V1.6 positive amount without approver is pending', () => {
    assertTrue_(!isV16VariableRowReviewed_({amount:100000, approved_by:''}));
  });
  testCase_(results, 'V1.6 positive amount + approver is reviewed', () => {
    assertTrue_(isV16VariableRowReviewed_({amount:100000, approved_by:'TEST'}));
  });

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log('V1.6 Self Tests: ' + passed + ' passed, ' + failed + ' failed');
  results.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ' — ' + r.error : '')));
  if (failed) throw new Error('V1.6 self tests failed: ' + failed);
  return results;
}

function runPayrollReadinessV16NoUi() {
  const startKey = '2026-08-01';
  const endKey = '2026-08-29';

  // Always refresh V1.5 first so readiness reads the newest payroll preview.
  generatePayrollPreviewV15(startKey, endKey);
  const result = buildPayrollReadinessV16_(startKey, endKey);

  console.log(
    'V1.6 readiness selesai. Employee: ' + result.employeeCount +
    '. Engine pass: ' + result.enginePassCount +
    '. Variable pending staff: ' + result.variablePendingStaffCount +
    '. Real-data pending staff: ' + result.realDataPendingStaffCount +
    '. Hard warning: ' + result.warningStaffCount
  );
  return result;
}

function buildPayrollReadinessV16_(periodStart, periodEnd) {
  const startKey = normalizeDateKey_(periodStart);
  const endKey = normalizeDateKey_(periodEnd);

  const preview = getRowsAsObjects_(NFP_V15_PREVIEW_SHEET).filter(r =>
    normalizeDateKey_(r.period_start) === startKey &&
    normalizeDateKey_(r.period_end) === endKey
  );

  const variables = getRowsAsObjects_(NFP_V15_VARIABLE_SHEET).filter(r =>
    normalizeDateKey_(r.period_start) === startKey &&
    normalizeDateKey_(r.period_end) === endKey &&
    String(r.staff_id || '').trim()
  );
  const variablesByStaff = groupBy_(variables, r => String(r.staff_id || '').trim());

  const configs = getRowsAsObjects_(NFP_V14_PAY_MODE_SHEET);
  const configMap = mapBy_(configs, r => String(r.staff_id || '').trim());

  const attendance = getRowsAsObjects_(NFP.SHEETS.ATTENDANCE).filter(r =>
    inPeriod_(r.date, startKey, endKey)
  );
  const attendanceByStaff = groupBy_(attendance, r => String(r.staff_id || '').trim());

  let enginePassCount = 0;
  let variablePendingStaffCount = 0;
  let realDataPendingStaffCount = 0;
  let warningStaffCount = 0;

  const detail = preview.map(row => {
    const staffId = String(row.staff_id || '').trim();
    const mode = String(row.payroll_mode || '').trim();
    const warnings = String(row.warnings || '').trim();
    const componentStatus = String(row.component_status || '').trim();
    const config = configMap[staffId] || {};
    const variablePolicy = String(config.variable_policy || '').trim().toUpperCase();
    const variableRows = variablesByStaff[staffId] || [];

    const engineStatus = warnings ? 'WARNING' : 'PASS';
    if (engineStatus === 'PASS') enginePassCount += 1;
    else warningStaffCount += 1;

    let variableStatus = 'NOT_REQUIRED';
    if (variablePolicy && variablePolicy !== 'NONE' && variablePolicy !== 'RATE_PENDING') {
      if (!variableRows.length) {
        variableStatus = 'PENDING_NO_TEMPLATE';
      } else if (variableRows.every(isV16VariableRowReviewed_)) {
        variableStatus = 'REVIEWED';
      } else {
        variableStatus = 'PENDING_REVIEW';
      }
      if (variableStatus !== 'REVIEWED') variablePendingStaffCount += 1;
    }

    const attendanceRows = attendanceByStaff[staffId] || [];
    let attendanceSource = 'NONE';
    let realDataStatus = 'PENDING_REAL_DATA';

    if (mode === 'PROJECT_RETAINER') {
      attendanceSource = 'NOT_REQUIRED';
      realDataStatus = 'NOT_REQUIRED_PROJECT_RETAINER';
    } else if (attendanceRows.length) {
      const sources = attendanceRows.map(r => String(r.source || '').trim()).filter(Boolean);
      const hasSim = sources.some(s => /SIM/i.test(s));
      attendanceSource = hasSim ? 'SIMULATION_ATTENDANCE' : 'ATTENDANCE_ROWS';
      realDataStatus = hasSim ? 'PENDING_REAL_DATA' : 'REAL_ATTENDANCE_LOADED';
    } else {
      try {
        const trace = row.calculation_trace ? JSON.parse(row.calculation_trace) : {};
        const creditSource = String(trace.credits_source || '').trim();
        attendanceSource = creditSource || 'NO_ATTENDANCE_ROWS';
        realDataStatus = /SIM/i.test(creditSource) ? 'PENDING_REAL_DATA' : 'PENDING_REAL_DATA';
      } catch (e) {
        attendanceSource = 'TRACE_UNREADABLE';
        realDataStatus = 'PENDING_REAL_DATA';
      }
    }

    if (realDataStatus === 'PENDING_REAL_DATA') realDataPendingStaffCount += 1;

    const blockers = [];
    if (engineStatus !== 'PASS') blockers.push('ENGINE_WARNING');
    if (variableStatus.indexOf('PENDING') === 0) blockers.push('VARIABLE_INPUT');
    if (realDataStatus === 'PENDING_REAL_DATA') blockers.push('REAL_ATTENDANCE');

    let finalGate = 'SIMULATION_READY';
    if (blockers.length) finalGate = 'BLOCKED_INPUT';
    if (!blockers.length && realDataStatus === 'NOT_REQUIRED_PROJECT_RETAINER') finalGate = 'INPUT_READY';

    return {
      staff_id: staffId,
      name: row.name || '',
      payroll_mode: mode,
      thp: normalizeNumber_(row.thp, 0),
      engine_status: engineStatus,
      variable_status: variableStatus,
      attendance_source: attendanceSource,
      real_data_status: realDataStatus,
      warnings: warnings,
      final_gate: finalGate,
      blocker: blockers.join(' | '),
      period_start: startKey,
      period_end: endKey,
      notes: componentStatus
    };
  });

  writeObjects_(NFP_V16_READINESS_DETAIL_SHEET, NFP_V16_READINESS_HEADERS, detail);
  writeObjects_(NFP_V16_SLIP_PREVIEW_SHEET, NFP_V16_SLIP_HEADERS, preview.map(convertV15ToSlipV16_));

  appendAudit_(
    'RUN_PAYROLL_READINESS_V16',
    'PAYROLL_PERIOD',
    startKey + '..' + endKey,
    null,
    {
      employee_count: detail.length,
      engine_pass_count: enginePassCount,
      variable_pending_staff_count: variablePendingStaffCount,
      real_data_pending_staff_count: realDataPendingStaffCount,
      warning_staff_count: warningStaffCount
    },
    'Simulation gate only - not production/legal finalization'
  );

  return {
    employeeCount: detail.length,
    enginePassCount: enginePassCount,
    variablePendingStaffCount: variablePendingStaffCount,
    realDataPendingStaffCount: realDataPendingStaffCount,
    warningStaffCount: warningStaffCount
  };
}

function isV16VariableRowReviewed_(row) {
  const approver = String(row.approved_by || '').trim();
  if (!approver) return false;

  if (hasValue_(row.amount)) return true; // explicit 0 is valid and means reviewed nil.
  if (hasValue_(row.quantity) && hasValue_(row.rate)) return true;
  return false;
}

function convertV15ToSlipV16_(row) {
  return {
    period_start: normalizeDateKey_(row.period_start),
    period_end: normalizeDateKey_(row.period_end),
    staff_id: row.staff_id || '',
    name: row.name || '',
    outlet: row.outlet || '',
    payroll_mode: row.payroll_mode || '',
    base_payable: normalizeNumber_(row.base_payable, 0),
    attendance_pay: normalizeNumber_(row.attendance_pay, 0),
    fixed_allowance: normalizeNumber_(row.fixed_allowance, 0),
    prorata_allowance_pay: normalizeNumber_(row.prorata_allowance_pay, 0),
    variable_earnings: normalizeNumber_(row.variable_earnings, 0),
    variable_deductions: normalizeNumber_(row.variable_deductions, 0),
    extra_hour_pay: normalizeNumber_(row.extra_hour_pay, 0),
    regular_ot_pay: normalizeNumber_(row.regular_ot_pay, 0),
    holiday_ot_pay: normalizeNumber_(row.holiday_ot_pay, 0),
    owner_bonus: normalizeNumber_(row.owner_bonus, 0),
    thp: normalizeNumber_(row.thp, 0),
    component_status: row.component_status || ''
  };
}

function runBuildSlipPrintV16NoUi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(NFP_V16_SLIP_PRINT_SHEET);
  if (!sheet) throw new Error('Sheet SLIP_PRINT tidak ditemukan.');
  const staffId = String(sheet.getRange('B2').getValue() || '').trim();
  if (!staffId) throw new Error('Isi staff_id di SLIP_PRINT!B2 terlebih dahulu.');
  return buildSlipPrintV16_(staffId, '2026-08-01', '2026-08-29');
}

function buildSlipPrintV16_(staffId, periodStart, periodEnd) {
  const startKey = normalizeDateKey_(periodStart);
  const endKey = normalizeDateKey_(periodEnd);
  const rows = getRowsAsObjects_(NFP_V16_SLIP_PREVIEW_SHEET).filter(r =>
    String(r.staff_id || '').trim() === String(staffId || '').trim() &&
    normalizeDateKey_(r.period_start) === startKey &&
    normalizeDateKey_(r.period_end) === endKey
  );
  if (!rows.length) throw new Error('Slip row tidak ditemukan untuk ' + staffId);
  const r = rows[0];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(NFP_V16_SLIP_PRINT_SHEET);
  sh.clearContents();
  const data = [
    ['SLIP GAJI — SIMULATION ONLY'],
    ['staff_id', r.staff_id],
    ['Nama', r.name],
    ['Outlet', r.outlet],
    ['Periode', startKey + ' s.d. ' + endKey],
    ['Mode', r.payroll_mode],
    [],
    ['PENERIMAAN'],
    ['Base Payable', normalizeNumber_(r.base_payable, 0)],
    ['Attendance Pay', normalizeNumber_(r.attendance_pay, 0)],
    ['Fixed Allowance', normalizeNumber_(r.fixed_allowance, 0)],
    ['Prorata Allowance', normalizeNumber_(r.prorata_allowance_pay, 0)],
    ['Variable Earnings', normalizeNumber_(r.variable_earnings, 0)],
    ['Extra Hour', normalizeNumber_(r.extra_hour_pay, 0)],
    ['Regular OT', normalizeNumber_(r.regular_ot_pay, 0)],
    ['Holiday OT', normalizeNumber_(r.holiday_ot_pay, 0)],
    ['Owner Bonus', normalizeNumber_(r.owner_bonus, 0)],
    [],
    ['POTONGAN'],
    ['Variable Deductions', normalizeNumber_(r.variable_deductions, 0)],
    [],
    ['THP', normalizeNumber_(r.thp, 0)],
    ['Status', r.component_status || '']
  ];
  sh.getRange(1, 1, data.length, 2).setValues(data.map(x => [x[0] || '', x[1] === undefined ? '' : x[1]]));
  sh.getRange('B2').setValue(r.staff_id);
  console.log('SLIP_PRINT siap untuk ' + r.name + ' — SIMULATION ONLY');
  return {staff_id:r.staff_id, name:r.name, thp:normalizeNumber_(r.thp,0)};
}
