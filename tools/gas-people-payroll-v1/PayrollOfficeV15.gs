const NFP_V15_VARIABLE_SHEET = 'PAYROLL_VARIABLES';
const NFP_V15_PREVIEW_SHEET = 'PAYROLL_PREVIEW_V15';

const NFP_V15_HEADERS = Object.freeze([
  'period_start','period_end','staff_id','name','outlet','payroll_mode',
  'scheduled_shift_target','base_credit','attendance_credit','base_monthly',
  'base_payable','attendance_rate','attendance_pay','fixed_allowance',
  'prorata_allowance_pay','variable_earnings','variable_deductions',
  'extra_hour_pay','regular_ot_pay','holiday_ot_pay','owner_bonus','thp',
  'component_status','warnings','calculation_trace','generated_at'
]);

function runV15SelfTestsNoUi() {
  const results = [];

  testCase_(results, 'V1.5 fixed prorata 24/25 of 1.2m = 1.152m', () => {
    const warnings = [];
    const amounts = calculateV15BaseAmounts_(
      'FIXED_PRORATA',
      {base_monthly: 1200000, attendance_rate: 0, fixed_allowance: 0, prorata_allowance: 0},
      {scheduledTarget: 25, baseCredit: 24, attendanceCredit: 24},
      warnings
    );
    assertEqual_(1152000, amounts.basePayable);
  });

  testCase_(results, 'V1.5 attendance 25 x 30k = 750k', () => {
    const warnings = [];
    const amounts = calculateV15BaseAmounts_(
      'FIXED_PRORATA',
      {base_monthly: 1000000, attendance_rate: 30000, fixed_allowance: 0, prorata_allowance: 0},
      {scheduledTarget: 25, baseCredit: 25, attendanceCredit: 25},
      warnings
    );
    assertEqual_(750000, amounts.attendancePay);
  });

  testCase_(results, 'V1.5 variable 500k earning - 100k deduction = net 400k', () => {
    const warnings = [];
    const v = summarizeV15Variables_([
      {component_code: 'KPI', direction: 'EARNING', amount: 500000, approved_by: 'TEST'},
      {component_code: 'PUNISHMENT', direction: 'DEDUCTION', amount: 100000, approved_by: 'TEST'}
    ], warnings);
    assertEqual_(500000, v.earnings);
    assertEqual_(100000, v.deductions);
    assertEqual_(400000, v.net);
    assertEqual_(0, warnings.length);
  });

  testCase_(results, 'V1.5 project retainer missing rate is flagged', () => {
    const warnings = [];
    calculateV15BaseAmounts_(
      'PROJECT_RETAINER',
      {base_monthly: 0, attendance_rate: 0, fixed_allowance: 0, prorata_allowance: 0},
      {scheduledTarget: 0, baseCredit: 0, attendanceCredit: 0},
      warnings
    );
    assertTrue_(warnings.includes('RATE_PENDING'));
  });

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const text = results.map(r => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ' — ' + r.error : '')).join('\n');
  console.log('V1.5 Self Tests: ' + passed + ' passed, ' + failed + ' failed\n' + text);
  if (failed) throw new Error('V1.5 self tests failed: ' + failed);
  return results;
}

function runPayrollPreviewV15NoUi() {
  const result = generatePayrollPreviewV15('2026-08-01', '2026-08-29');
  console.log(
    'V1.5 selesai. ' + result.employeeCount +
    ' employee dihitung. Warning: ' + result.warningCount +
    '. Core V1.4: ' + result.coreCount +
    '. Office/Shared V1.5: ' + result.v15Count +
    '. Variable pending: ' + result.variablePendingCount +
    '. Rate pending: ' + result.ratePendingCount
  );
  return result;
}

function generatePayrollPreviewV15(periodStart, periodEnd) {
  const startKey = normalizeDateKey_(periodStart);
  const endKey = normalizeDateKey_(periodEnd);
  if (!startKey || !endKey || startKey > endKey) {
    throw new Error('Period invalid. Gunakan YYYY-MM-DD dan pastikan start <= end.');
  }

  // Keep V1.4 as the source of truth for Career FT + PT_SHIFT.
  const v14Result = generatePayrollPreviewV14(startKey, endKey);
  const coreRows = getRowsAsObjects_(NFP.SHEETS.PAYROLL_PREVIEW).filter(r =>
    normalizeDateKey_(r.period_start) === startKey &&
    normalizeDateKey_(r.period_end) === endKey
  );

  const employees = getRowsAsObjects_(NFP.SHEETS.EMPLOYEES);
  const employeeMap = mapBy_(employees, r => String(r.staff_id || '').trim());
  const configs = getRowsAsObjects_(NFP_V14_PAY_MODE_SHEET)
    .filter(r => normalizeBool_(r.v15_enabled));
  const variables = getRowsAsObjects_(NFP_V15_VARIABLE_SHEET).filter(r =>
    normalizeDateKey_(r.period_start) === startKey &&
    normalizeDateKey_(r.period_end) === endKey
  );
  const variablesByStaff = groupBy_(variables, r => String(r.staff_id || '').trim());

  const roster = getRowsAsObjects_(NFP.SHEETS.ROSTER)
    .filter(r => inPeriod_(r.date, startKey, endKey));
  const attendance = getRowsAsObjects_(NFP.SHEETS.ATTENDANCE)
    .filter(r => inPeriod_(r.date, startKey, endKey));
  const holidays = getRowsAsObjects_(NFP.SHEETS.HOLIDAYS)
    .filter(r => inPeriod_(r.date, startKey, endKey));
  const adjustments = getRowsAsObjects_(NFP.SHEETS.PAYROLL_ADJUSTMENTS).filter(r =>
    normalizeDateKey_(r.period_start) === startKey &&
    normalizeDateKey_(r.period_end) === endKey
  );

  const attendanceMap = mapBy_(attendance, r =>
    normalizeDateKey_(r.date) + '|' + String(r.staff_id || '').trim()
  );
  const holidayMap = mapBy_(
    holidays.filter(h => normalizeBool_(h.is_public_holiday)),
    h => normalizeDateKey_(h.date)
  );
  const adjustmentMap = mapBy_(adjustments, a => String(a.staff_id || '').trim());
  const rosterByStaff = groupBy_(roster, r => String(r.staff_id || '').trim());
  const rules = getPayrollRules_();

  const output = coreRows.map(row => convertV14RowToV15_(row));
  const existingStaffIds = {};
  output.forEach(r => existingStaffIds[String(r.staff_id || '').trim()] = true);

  let warningCount = v14Result.warningCount || 0;
  let v15Count = 0;
  let ratePendingCount = 0;
  let variablePendingCount = 0;

  configs.forEach(config => {
    const staffId = String(config.staff_id || '').trim();
    if (!staffId || existingStaffIds[staffId]) return;

    const employee = employeeMap[staffId];
    if (!employee) {
      warningCount += 1;
      return;
    }

    const warnings = [];
    const mode = String(config.payroll_mode || '').trim().toUpperCase();
    const staffRoster = (rosterByStaff[staffId] || []).sort((a, b) =>
      normalizeDateKey_(a.date).localeCompare(normalizeDateKey_(b.date))
    );

    const credits = resolveV15Credits_(
      employee,
      config,
      mode,
      staffRoster,
      attendanceMap,
      holidayMap,
      rules,
      warnings
    );

    const amounts = calculateV15BaseAmounts_(mode, config, credits, warnings);
    const variableRows = variablesByStaff[staffId] || [];
    const variableSummary = summarizeV15Variables_(variableRows, warnings);
    const adjustment = adjustmentMap[staffId] || {};

    const extraHourRate = roundMoney_(
      hasValue_(config.extra_hour_rate)
        ? normalizeNumber_(config.extra_hour_rate, 0)
        : normalizeNumber_(employee.extra_hour_rate, 0)
    );
    const overtimeBaseMonthly = roundMoney_(
      hasValue_(config.overtime_base_monthly)
        ? normalizeNumber_(config.overtime_base_monthly, 0)
        : normalizeNumber_(employee.overtime_base_monthly, 0)
    );

    const extraHourPay = roundMoney_(credits.extraHourHours * extraHourRate);
    if (credits.extraHourHours > 0 && extraHourRate <= 0) {
      warnings.push('EXTRA_HOUR_RATE_MISSING');
    }

    let regularOtPay = calculateRegularOtPay_(
      credits.regularOtByDay,
      overtimeBaseMonthly,
      rules,
      warnings
    );
    let holidayOtPay = calculateHolidayOtPay_(
      credits.holidayOtByDay,
      overtimeBaseMonthly,
      employee,
      rules,
      warnings
    );

    if (hasValue_(adjustment.regular_ot_pay_override)) {
      regularOtPay = roundMoney_(adjustment.regular_ot_pay_override);
      warnings.push('REGULAR_OT_PAY_OVERRIDE');
    }
    if (hasValue_(adjustment.holiday_ot_pay_override)) {
      holidayOtPay = roundMoney_(adjustment.holiday_ot_pay_override);
      warnings.push('HOLIDAY_OT_PAY_OVERRIDE');
    }

    const ownerBonus = roundMoney_(normalizeNumber_(adjustment.owner_bonus, 0));
    if (ownerBonus !== 0 && !String(adjustment.reason || '').trim()) {
      warnings.push('OWNER_BONUS_WITHOUT_REASON');
    }
    if ((ownerBonus !== 0 || hasAnyOverride_(adjustment)) &&
        !String(adjustment.approved_by || '').trim()) {
      warnings.push('ADJUSTMENT_WITHOUT_APPROVER');
    }

    const variablePolicy = String(config.variable_policy || '').trim().toUpperCase();
    let componentStatus = 'BASE_ONLY';
    if (warnings.includes('RATE_PENDING')) {
      componentStatus = 'RATE_PENDING';
      ratePendingCount += 1;
    } else if (variablePolicy && variablePolicy !== 'NONE') {
      if (variableRows.length > 0) {
        componentStatus = 'VARIABLES_LOADED';
      } else {
        componentStatus = 'BASE_ONLY_VARIABLES_PENDING';
        variablePendingCount += 1;
      }
    }

    const thp = roundMoney_(
      amounts.basePayable + amounts.attendancePay + amounts.fixedAllowance +
      amounts.prorataAllowancePay + variableSummary.earnings - variableSummary.deductions +
      extraHourPay + regularOtPay + holidayOtPay + ownerBonus
    );

    const trace = {
      simulator_status: NFP.STATUS,
      payroll_engine: 'V1.5_OFFICE_COMPONENTS',
      payroll_mode: mode,
      source: String(config.source || ''),
      notes: String(config.notes || ''),
      credits_source: credits.source,
      variable_policy: variablePolicy,
      component_status: componentStatus,
      attendance: {
        scheduled_shift_target: credits.scheduledTarget,
        base_credit: credits.baseCredit,
        attendance_credit: credits.attendanceCredit,
        extra_hour_hours: credits.extraHourHours,
        regular_ot_hours: credits.regularOtHours,
        holiday_ot_hours: credits.holidayOtHours
      },
      payable: {
        base_monthly: amounts.baseMaster,
        base_payable: amounts.basePayable,
        attendance_rate: amounts.attendanceRate,
        attendance_pay: amounts.attendancePay,
        fixed_allowance: amounts.fixedAllowance,
        prorata_allowance_pay: amounts.prorataAllowancePay,
        variable_earnings: variableSummary.earnings,
        variable_deductions: variableSummary.deductions,
        extra_hour_pay: extraHourPay,
        regular_ot_pay: regularOtPay,
        holiday_ot_pay: holidayOtPay,
        owner_bonus: ownerBonus,
        thp: thp
      }
    };

    output.push({
      period_start: startKey,
      period_end: endKey,
      staff_id: staffId,
      name: employee.name || '',
      outlet: employee.outlet || '',
      payroll_mode: mode,
      scheduled_shift_target: credits.scheduledTarget,
      base_credit: credits.baseCredit,
      attendance_credit: credits.attendanceCredit,
      base_monthly: amounts.baseMaster,
      base_payable: amounts.basePayable,
      attendance_rate: amounts.attendanceRate,
      attendance_pay: amounts.attendancePay,
      fixed_allowance: amounts.fixedAllowance,
      prorata_allowance_pay: amounts.prorataAllowancePay,
      variable_earnings: variableSummary.earnings,
      variable_deductions: variableSummary.deductions,
      extra_hour_pay: extraHourPay,
      regular_ot_pay: regularOtPay,
      holiday_ot_pay: holidayOtPay,
      owner_bonus: ownerBonus,
      thp: thp,
      component_status: componentStatus,
      warnings: warnings.join(' | '),
      calculation_trace: JSON.stringify(trace),
      generated_at: new Date()
    });

    warningCount += warnings.length;
    v15Count += 1;
  });

  writeObjects_(NFP_V15_PREVIEW_SHEET, NFP_V15_HEADERS, output);
  appendAudit_(
    'GENERATE_PAYROLL_PREVIEW_V15',
    'PAYROLL_PERIOD',
    startKey + '..' + endKey,
    null,
    {
      employee_count: output.length,
      core_count: coreRows.length,
      v15_count: v15Count,
      warning_count: warningCount,
      variable_pending_count: variablePendingCount,
      rate_pending_count: ratePendingCount
    },
    'Simulation only - unified V1.4 + Office/Shared V1.5 preview'
  );

  return {
    employeeCount: output.length,
    warningCount: warningCount,
    coreCount: coreRows.length,
    v15Count: v15Count,
    variablePendingCount: variablePendingCount,
    ratePendingCount: ratePendingCount
  };
}

function resolveV15Credits_(employee, config, mode, staffRoster, attendanceMap, holidayMap, rules, warnings) {
  if (staffRoster.length > 0) {
    const c = calculatePeriodCredits_(
      employee,
      staffRoster,
      attendanceMap,
      holidayMap,
      rules,
      warnings
    );
    c.source = 'ROSTER_ATTENDANCE';
    return c;
  }

  const simTarget = Math.max(0, normalizeNumber_(config.sim_scheduled_target, 0));
  const simBase = Math.max(0, normalizeNumber_(config.sim_base_credit, 0));
  const simAttendance = Math.max(0, normalizeNumber_(config.sim_attendance_credit, 0));

  if (simTarget > 0) {
    return {
      scheduledTarget: simTarget,
      baseCredit: Math.min(simTarget, simBase),
      attendanceCredit: Math.min(simTarget, simAttendance),
      extraHourHours: 0,
      regularOtHours: 0,
      holidayOtHours: 0,
      regularOtByDay: [],
      holidayOtByDay: [],
      source: 'SIM_CREDIT_OVERRIDE'
    };
  }

  if (mode === 'PROJECT_RETAINER') {
    return {
      scheduledTarget: 0,
      baseCredit: 0,
      attendanceCredit: 0,
      extraHourHours: 0,
      regularOtHours: 0,
      holidayOtHours: 0,
      regularOtByDay: [],
      holidayOtByDay: [],
      source: 'PROJECT_RETAINER_NO_ROSTER'
    };
  }

  warnings.push('NO_ROSTER_AND_NO_SIM_CREDIT');
  return {
    scheduledTarget: 0,
    baseCredit: 0,
    attendanceCredit: 0,
    extraHourHours: 0,
    regularOtHours: 0,
    holidayOtHours: 0,
    regularOtByDay: [],
    holidayOtByDay: [],
    source: 'NONE'
  };
}

function calculateV15BaseAmounts_(mode, config, credits, warnings) {
  const baseMaster = roundMoney_(normalizeNumber_(config.base_monthly, 0));
  const attendanceRate = roundMoney_(normalizeNumber_(config.attendance_rate, 0));
  const fixedAllowance = roundMoney_(normalizeNumber_(config.fixed_allowance, 0));
  const prorataAllowance = roundMoney_(normalizeNumber_(config.prorata_allowance, 0));
  const target = Math.max(0, normalizeNumber_(credits.scheduledTarget, 0));
  const baseCredit = Math.min(target, Math.max(0, normalizeNumber_(credits.baseCredit, 0)));
  const attendanceCredit = Math.min(target, Math.max(0, normalizeNumber_(credits.attendanceCredit, 0)));

  if (mode === 'PROJECT_RETAINER') {
    if (baseMaster <= 0) warnings.push('RATE_PENDING');
    return {
      baseMaster: baseMaster,
      basePayable: baseMaster,
      attendanceRate: 0,
      attendancePay: 0,
      fixedAllowance: fixedAllowance,
      prorataAllowancePay: prorataAllowance
    };
  }

  if (mode === 'FIXED_PRORATA') {
    if (baseMaster <= 0) warnings.push('FIXED_BASE_MISSING');
    if (target <= 0) warnings.push('SCHEDULED_TARGET_MISSING');
    const ratio = target > 0 ? Math.min(1, Math.max(0, baseCredit / target)) : 0;
    return {
      baseMaster: baseMaster,
      basePayable: roundMoney_(baseMaster * ratio),
      attendanceRate: attendanceRate,
      attendancePay: roundMoney_(attendanceCredit * attendanceRate),
      fixedAllowance: fixedAllowance,
      prorataAllowancePay: roundMoney_(prorataAllowance * ratio)
    };
  }

  if (mode === 'FIXED_MONTHLY') {
    const lost = Math.max(0, target - baseCredit);
    let dailyAbsenceRate = normalizeNumber_(config.daily_absence_rate, 0);
    if (dailyAbsenceRate <= 0 && baseMaster > 0) {
      dailyAbsenceRate = baseMaster / Math.max(1, normalizeNumber_(NFP.BENCHMARK_SHIFTS, 26));
    }
    return {
      baseMaster: baseMaster,
      basePayable: roundMoney_(Math.max(0, baseMaster - (lost * dailyAbsenceRate))),
      attendanceRate: attendanceRate,
      attendancePay: roundMoney_(attendanceCredit * attendanceRate),
      fixedAllowance: fixedAllowance,
      prorataAllowancePay: target > 0
        ? roundMoney_(prorataAllowance * Math.min(1, baseCredit / target))
        : 0
    };
  }

  warnings.push('INVALID_V15_PAYROLL_MODE:' + mode);
  return {
    baseMaster: 0,
    basePayable: 0,
    attendanceRate: 0,
    attendancePay: 0,
    fixedAllowance: 0,
    prorataAllowancePay: 0
  };
}

function summarizeV15Variables_(rows, warnings) {
  let earnings = 0;
  let deductions = 0;

  rows.forEach(row => {
    const code = String(row.component_code || '').trim().toUpperCase() || 'UNNAMED';
    const direction = String(row.direction || '').trim().toUpperCase();
    const quantity = normalizeNumber_(row.quantity, 0);
    const rate = normalizeNumber_(row.rate, 0);
    const amount = hasValue_(row.amount)
      ? normalizeNumber_(row.amount, 0)
      : quantity * rate;
    const value = roundMoney_(Math.abs(amount));

    if (value !== 0 && !String(row.approved_by || '').trim()) {
      warnings.push('VARIABLE_WITHOUT_APPROVER:' + code);
    }

    if (direction === 'EARNING') {
      earnings += value;
    } else if (direction === 'DEDUCTION') {
      deductions += value;
    } else {
      warnings.push('INVALID_VARIABLE_DIRECTION:' + code + ':' + direction);
    }
  });

  earnings = roundMoney_(earnings);
  deductions = roundMoney_(deductions);
  return {
    earnings: earnings,
    deductions: deductions,
    net: earnings - deductions,
    rowCount: rows.length
  };
}

function convertV14RowToV15_(row) {
  return {
    period_start: normalizeDateKey_(row.period_start),
    period_end: normalizeDateKey_(row.period_end),
    staff_id: row.staff_id || '',
    name: row.name || '',
    outlet: row.outlet || '',
    payroll_mode: row.career_code || '',
    scheduled_shift_target: normalizeNumber_(row.scheduled_shift_target, 0),
    base_credit: normalizeNumber_(row.base_credit, 0),
    attendance_credit: normalizeNumber_(row.attendance_credit, 0),
    base_monthly: normalizeNumber_(row.base_master, 0),
    base_payable: normalizeNumber_(row.base_payable, 0),
    attendance_rate: normalizeNumber_(row.attendance_rate, 0),
    attendance_pay: normalizeNumber_(row.attendance_pay, 0),
    fixed_allowance: 0,
    prorata_allowance_pay: 0,
    variable_earnings: 0,
    variable_deductions: 0,
    extra_hour_pay: normalizeNumber_(row.extra_hour_pay, 0),
    regular_ot_pay: normalizeNumber_(row.regular_ot_pay, 0),
    holiday_ot_pay: normalizeNumber_(row.holiday_ot_pay, 0),
    owner_bonus: normalizeNumber_(row.owner_bonus, 0),
    thp: normalizeNumber_(row.thp, 0),
    component_status: 'CORE_V14',
    warnings: row.warnings || '',
    calculation_trace: row.calculation_trace || '',
    generated_at: new Date()
  };
}
