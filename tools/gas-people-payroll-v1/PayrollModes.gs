const NFP_V14_PAY_MODE_SHEET = 'PAY_MODE_CONFIG';

function runPayrollPreviewV14() {
  const ui = SpreadsheetApp.getUi();
  const startPrompt = ui.prompt(
    'NF People Payroll V1.4',
    'Periode mulai (YYYY-MM-DD)',
    ui.ButtonSet.OK_CANCEL
  );
  if (startPrompt.getSelectedButton() !== ui.Button.OK) return;

  const endPrompt = ui.prompt(
    'NF People Payroll V1.4',
    'Periode selesai (YYYY-MM-DD)',
    ui.ButtonSet.OK_CANCEL
  );
  if (endPrompt.getSelectedButton() !== ui.Button.OK) return;

  const result = generatePayrollPreviewV14(
    startPrompt.getResponseText(),
    endPrompt.getResponseText()
  );

  ui.alert(
    'Selesai. ' + result.employeeCount +
    ' employee dihitung. Warning: ' + result.warningCount +
    '\n\nCareer FT: ' + result.careerEmployeeCount +
    '\nPT/Fixed mode: ' + result.supplementalEmployeeCount
  );
}

function generatePayrollPreviewV14(periodStart, periodEnd) {
  const startKey = normalizeDateKey_(periodStart);
  const endKey = normalizeDateKey_(periodEnd);
  if (!startKey || !endKey || startKey > endKey) {
    throw new Error('Period invalid. Gunakan YYYY-MM-DD dan pastikan start <= end.');
  }

  // Existing V1.2 engine remains source of truth for active Career FT employees.
  const careerResult = generatePayrollPreview(startKey, endKey);

  const modeSheet = getSpreadsheet_().getSheetByName(NFP_V14_PAY_MODE_SHEET);
  if (!modeSheet) {
    throw new Error('Sheet PAY_MODE_CONFIG belum ada.');
  }

  const rules = getPayrollRules_();
  const configs = getRowsAsObjects_(NFP_V14_PAY_MODE_SHEET)
    .filter(r => normalizeBool_(r.enabled));
  const employees = getRowsAsObjects_(NFP.SHEETS.EMPLOYEES);
  const employeeMap = mapBy_(employees, r => String(r.staff_id || '').trim());
  const roster = getRowsAsObjects_(NFP.SHEETS.ROSTER)
    .filter(r => inPeriod_(r.date, startKey, endKey));
  const attendance = getRowsAsObjects_(NFP.SHEETS.ATTENDANCE)
    .filter(r => inPeriod_(r.date, startKey, endKey));
  const holidays = getRowsAsObjects_(NFP.SHEETS.HOLIDAYS)
    .filter(r => inPeriod_(r.date, startKey, endKey));
  const adjustments = getRowsAsObjects_(NFP.SHEETS.PAYROLL_ADJUSTMENTS).filter(r => {
    return normalizeDateKey_(r.period_start) === startKey &&
      normalizeDateKey_(r.period_end) === endKey;
  });

  const attendanceMap = mapBy_(attendance, r =>
    normalizeDateKey_(r.date) + '|' + String(r.staff_id || '').trim()
  );
  const holidayMap = mapBy_(
    holidays.filter(h => normalizeBool_(h.is_public_holiday)),
    h => normalizeDateKey_(h.date)
  );
  const adjustmentMap = mapBy_(adjustments, a => String(a.staff_id || '').trim());
  const rosterByStaff = groupBy_(roster, r => String(r.staff_id || '').trim());

  const previewSheet = getSheet_(NFP.SHEETS.PAYROLL_PREVIEW);
  const existingPreview = getRowsAsObjects_(NFP.SHEETS.PAYROLL_PREVIEW);
  const existingStaffIds = {};
  existingPreview.forEach(r => {
    const id = String(r.staff_id || '').trim();
    if (id) existingStaffIds[id] = true;
  });

  const supplementalOutput = [];
  let supplementalWarningCount = 0;

  configs.forEach(config => {
    const staffId = String(config.staff_id || '').trim();
    if (!staffId || existingStaffIds[staffId]) return;

    const employee = employeeMap[staffId];
    const warnings = [];
    if (!employee) {
      warnings.push('EMPLOYEE_NOT_FOUND');
      supplementalWarningCount += warnings.length;
      return;
    }

    const mode = String(config.payroll_mode || '').trim().toUpperCase();
    if (!['PT_SHIFT', 'FIXED_MONTHLY'].includes(mode)) {
      warnings.push('INVALID_PAYROLL_MODE:' + mode);
    }

    const staffRoster = (rosterByStaff[staffId] || []).sort((a, b) =>
      normalizeDateKey_(a.date).localeCompare(normalizeDateKey_(b.date))
    );
    const credits = calculatePeriodCredits_(
      employee,
      staffRoster,
      attendanceMap,
      holidayMap,
      rules,
      warnings
    );

    if (credits.scheduledTarget === 0) warnings.push('NO_SCHEDULED_SHIFT_IN_PERIOD');

    const amounts = calculateV14ModeAmounts_(mode, config, credits, rules, warnings);
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

    const thp = roundMoney_(
      amounts.basePayable + amounts.attendancePay + extraHourPay +
      regularOtPay + holidayOtPay + ownerBonus
    );

    supplementalWarningCount += warnings.length;

    const trace = {
      simulator_status: NFP.STATUS,
      payroll_mode: mode,
      mode_source: String(config.source || ''),
      mode_notes: String(config.notes || ''),
      anti_gaming: {
        normal_credit_source: 'OVERLAP_BETWEEN_ROSTER_AND_CLOCK',
        clock_out_after_schedule_never_creates_extra_hour_automatically: true,
        extra_hour_requires_explicit_hours_and_approval: true
      },
      absence_policy: {
        mode: mode === 'PT_SHIFT'
          ? 'NO_WORK_NO_SHIFT_PAY'
          : 'FIXED_DAILY_BASE_DEDUCTION',
        base_daily_equivalent: amounts.dailyAbsenceRate,
        attendance_daily_equivalent: amounts.attendanceRate,
        lost_base_credit: amounts.lostBaseCredit
      },
      payroll_profile: {
        benchmark_shifts: normalizeNumber_(rules.BENCHMARK_SHIFTS, NFP.BENCHMARK_SHIFTS),
        rate_per_shift: amounts.ratePerShift,
        base_master: amounts.baseMaster,
        attendance_rate: amounts.attendanceRate,
        extra_hour_rate: extraHourRate,
        overtime_base_monthly: overtimeBaseMonthly,
        workweek_mode: String(employee.workweek_mode || rules.DEFAULT_WORKWEEK_MODE || NFP.DEFAULT_WORKWEEK_MODE)
      },
      attendance: {
        scheduled_shift_target: credits.scheduledTarget,
        base_credit: credits.baseCredit,
        attendance_credit: credits.attendanceCredit,
        extra_hour_hours: credits.extraHourHours,
        regular_ot_hours: credits.regularOtHours,
        holiday_ot_hours: credits.holidayOtHours
      },
      payable: {
        base_payable: amounts.basePayable,
        attendance_pay: amounts.attendancePay,
        extra_hour_pay: extraHourPay,
        regular_ot_pay: regularOtPay,
        holiday_ot_pay: holidayOtPay,
        owner_bonus: ownerBonus,
        thp: thp
      },
      adjustment_reason: String(adjustment.reason || ''),
      approved_by: String(adjustment.approved_by || '')
    };

    supplementalOutput.push({
      period_start: startKey,
      period_end: endKey,
      staff_id: staffId,
      name: employee.name || '',
      outlet: employee.outlet || '',
      career_code: mode,
      career_stage: '',
      reference_rate: amounts.referenceEquivalent,
      stage_cap: '',
      scheduled_shift_target: credits.scheduledTarget,
      base_credit: credits.baseCredit,
      attendance_credit: credits.attendanceCredit,
      base_master: amounts.baseMaster,
      base_payable: amounts.basePayable,
      attendance_rate: amounts.attendanceRate,
      attendance_pay: amounts.attendancePay,
      regular_ot_hours: credits.regularOtHours,
      regular_ot_pay: regularOtPay,
      holiday_ot_hours: credits.holidayOtHours,
      holiday_ot_pay: holidayOtPay,
      owner_bonus: ownerBonus,
      thp: thp,
      warnings: warnings.join(' | '),
      calculation_trace: JSON.stringify(trace),
      generated_at: new Date(),
      extra_hour_hours: credits.extraHourHours,
      extra_hour_rate: extraHourRate,
      extra_hour_pay: extraHourPay
    });
  });

  if (supplementalOutput.length) {
    const rows = supplementalOutput.map(obj =>
      HEADERS.PAYROLL_PREVIEW.map(h => obj[h] == null ? '' : obj[h])
    );
    previewSheet.getRange(
      previewSheet.getLastRow() + 1,
      1,
      rows.length,
      HEADERS.PAYROLL_PREVIEW.length
    ).setValues(rows);
  }

  const employeeCount = careerResult.employeeCount + supplementalOutput.length;
  const warningCount = careerResult.warningCount + supplementalWarningCount;

  appendAudit_(
    'GENERATE_PAYROLL_PREVIEW_V14',
    'PAYROLL_PERIOD',
    startKey + '..' + endKey,
    null,
    {
      employee_count: employeeCount,
      career_employee_count: careerResult.employeeCount,
      supplemental_employee_count: supplementalOutput.length,
      warning_count: warningCount,
      mode_sheet: NFP_V14_PAY_MODE_SHEET
    },
    'Simulation only - Career FT + PT/FIXED modes'
  );

  return {
    employeeCount: employeeCount,
    warningCount: warningCount,
    careerEmployeeCount: careerResult.employeeCount,
    supplementalEmployeeCount: supplementalOutput.length
  };
}

function calculateV14ModeAmounts_(mode, config, credits, rules, warnings) {
  const target = Math.max(0, normalizeNumber_(credits.scheduledTarget, 0));
  const baseCredit = Math.min(target, Math.max(0, normalizeNumber_(credits.baseCredit, 0)));
  const attendanceCredit = Math.min(target, Math.max(0, normalizeNumber_(credits.attendanceCredit, 0)));
  const lostBaseCredit = round4_(Math.max(0, target - baseCredit));

  if (mode === 'PT_SHIFT') {
    const ratePerShift = roundMoney_(normalizeNumber_(config.rate_per_shift, 0));
    if (ratePerShift <= 0) warnings.push('PT_SHIFT_RATE_MISSING');

    return {
      ratePerShift: ratePerShift,
      baseMaster: 0,
      basePayable: 0,
      attendanceRate: ratePerShift,
      attendancePay: roundMoney_(attendanceCredit * ratePerShift),
      dailyAbsenceRate: 0,
      lostBaseCredit: lostBaseCredit,
      referenceEquivalent: ratePerShift
    };
  }

  if (mode === 'FIXED_MONTHLY') {
    const benchmarkShifts = Math.max(
      1,
      normalizeNumber_(rules.BENCHMARK_SHIFTS, NFP.BENCHMARK_SHIFTS)
    );
    const baseMaster = roundMoney_(normalizeNumber_(config.base_monthly, 0));
    const attendanceRate = roundMoney_(normalizeNumber_(config.attendance_rate, 0));
    let dailyAbsenceRate = normalizeNumber_(config.daily_absence_rate, 0);

    if (baseMaster <= 0) warnings.push('FIXED_MONTHLY_BASE_MISSING');
    if (dailyAbsenceRate <= 0 && baseMaster > 0) {
      dailyAbsenceRate = baseMaster / benchmarkShifts;
    }
    dailyAbsenceRate = roundMoney_(dailyAbsenceRate);

    const basePayable = roundMoney_(Math.max(
      0,
      baseMaster - (lostBaseCredit * dailyAbsenceRate)
    ));

    return {
      ratePerShift: 0,
      baseMaster: baseMaster,
      basePayable: basePayable,
      attendanceRate: attendanceRate,
      attendancePay: roundMoney_(attendanceCredit * attendanceRate),
      dailyAbsenceRate: dailyAbsenceRate,
      lostBaseCredit: lostBaseCredit,
      referenceEquivalent: roundMoney_(dailyAbsenceRate + attendanceRate)
    };
  }

  return {
    ratePerShift: 0,
    baseMaster: 0,
    basePayable: 0,
    attendanceRate: 0,
    attendancePay: 0,
    dailyAbsenceRate: 0,
    lostBaseCredit: lostBaseCredit,
    referenceEquivalent: 0
  };
}

function runV14SelfTests() {
  const results = [];

  testCase_(results, 'V1.4 PT 12 shifts x 75k = 900k', () => {
    const warnings = [];
    const amounts = calculateV14ModeAmounts_(
      'PT_SHIFT',
      {rate_per_shift: 75000},
      {scheduledTarget: 12, baseCredit: 12, attendanceCredit: 12},
      {BENCHMARK_SHIFTS: 26},
      warnings
    );
    assertEqual_(900000, amounts.attendancePay);
    assertEqual_(0, warnings.length);
  });

  testCase_(results, 'V1.4 PT absent 1 of 12 only pays 11 shifts', () => {
    const warnings = [];
    const amounts = calculateV14ModeAmounts_(
      'PT_SHIFT',
      {rate_per_shift: 65000},
      {scheduledTarget: 12, baseCredit: 11, attendanceCredit: 11},
      {BENCHMARK_SHIFTS: 26},
      warnings
    );
    assertEqual_(715000, amounts.attendancePay);
  });

  testCase_(results, 'V1.4 fixed monthly full roster keeps full base', () => {
    const warnings = [];
    const amounts = calculateV14ModeAmounts_(
      'FIXED_MONTHLY',
      {base_monthly: 2600000, attendance_rate: 0, daily_absence_rate: 100000},
      {scheduledTarget: 25, baseCredit: 25, attendanceCredit: 25},
      {BENCHMARK_SHIFTS: 26},
      warnings
    );
    assertEqual_(2600000, amounts.basePayable);
  });

  testCase_(results, 'V1.4 fixed monthly absent 1 uses fixed daily deduction', () => {
    const warnings = [];
    const amounts = calculateV14ModeAmounts_(
      'FIXED_MONTHLY',
      {base_monthly: 2600000, attendance_rate: 0, daily_absence_rate: 100000},
      {scheduledTarget: 25, baseCredit: 24, attendanceCredit: 24},
      {BENCHMARK_SHIFTS: 26},
      warnings
    );
    assertEqual_(2500000, amounts.basePayable);
  });

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const text = results.map(r =>
    (r.ok ? '✅ ' : '❌ ') + r.name + (r.error ? ' — ' + r.error : '')
  ).join('\n');

  SpreadsheetApp.getUi().alert(
    'V1.4 Self Tests: ' + passed + ' passed, ' + failed + ' failed\n\n' + text
  );

  if (failed) throw new Error('V1.4 self tests failed: ' + failed);
  return results;
}
