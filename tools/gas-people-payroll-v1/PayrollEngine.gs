function generatePayrollPreview(periodStart, periodEnd) {
  const startKey = normalizeDateKey_(periodStart);
  const endKey = normalizeDateKey_(periodEnd);
  if (!startKey || !endKey || startKey > endKey) throw new Error('Period invalid. Gunakan YYYY-MM-DD dan pastikan start <= end.');

  const rules = getPayrollRules_();
  const employees = getRowsAsObjects_(NFP.SHEETS.EMPLOYEES).filter(isEmployeeActive_);
  const careers = getRowsAsObjects_(NFP.SHEETS.CAREER_MASTER).filter(r => r.active === '' || r.active == null || normalizeBool_(r.active));
  const roster = getRowsAsObjects_(NFP.SHEETS.ROSTER).filter(r => inPeriod_(r.date, startKey, endKey));
  const attendance = getRowsAsObjects_(NFP.SHEETS.ATTENDANCE).filter(r => inPeriod_(r.date, startKey, endKey));
  const holidays = getRowsAsObjects_(NFP.SHEETS.HOLIDAYS).filter(r => inPeriod_(r.date, startKey, endKey));
  const adjustments = getRowsAsObjects_(NFP.SHEETS.PAYROLL_ADJUSTMENTS).filter(r => {
    return normalizeDateKey_(r.period_start) === startKey && normalizeDateKey_(r.period_end) === endKey;
  });

  const careerMap = mapBy_(careers, r => String(r.code || '').trim());
  const attendanceMap = mapBy_(attendance, r => normalizeDateKey_(r.date) + '|' + String(r.staff_id || '').trim());
  const holidayMap = mapBy_(holidays.filter(h => normalizeBool_(h.is_public_holiday)), h => normalizeDateKey_(h.date));
  const adjustmentMap = mapBy_(adjustments, a => String(a.staff_id || '').trim());
  const rosterByStaff = groupBy_(roster, r => String(r.staff_id || '').trim());

  const output = [];
  let warningCount = 0;

  employees.forEach(employee => {
    const staffId = String(employee.staff_id || '').trim();
    const warnings = [];
    const careerCode = String(employee.career_code || '').trim();
    const career = careerMap[careerCode];
    const adjustment = adjustmentMap[staffId] || {};
    const staffRoster = (rosterByStaff[staffId] || []).sort((a, b) => normalizeDateKey_(a.date).localeCompare(normalizeDateKey_(b.date)));

    if (!career) warnings.push('CAREER_NOT_FOUND');

    const payrollProfile = resolvePayrollProfile_(employee, career, adjustment, rules, warnings);
    const credits = calculatePeriodCredits_(employee, staffRoster, attendanceMap, holidayMap, rules, warnings);

    const scheduledTarget = credits.scheduledTarget;
    const basePayable = scheduledTarget > 0
      ? roundMoney_(payrollProfile.baseMaster * credits.baseCredit / scheduledTarget)
      : 0;

    if (scheduledTarget === 0) warnings.push('NO_SCHEDULED_SHIFT_IN_PERIOD');

    const attendancePay = roundMoney_(credits.attendanceCredit * payrollProfile.attendanceRate);

    let regularOtPay = calculateRegularOtPay_(credits.regularOtByDay, payrollProfile.overtimeBaseMonthly, rules, warnings);
    let holidayOtPay = calculateHolidayOtPay_(credits.holidayOtByDay, payrollProfile.overtimeBaseMonthly, employee, rules, warnings);

    if (hasValue_(adjustment.regular_ot_pay_override)) {
      regularOtPay = roundMoney_(adjustment.regular_ot_pay_override);
      warnings.push('REGULAR_OT_PAY_OVERRIDE');
    }
    if (hasValue_(adjustment.holiday_ot_pay_override)) {
      holidayOtPay = roundMoney_(adjustment.holiday_ot_pay_override);
      warnings.push('HOLIDAY_OT_PAY_OVERRIDE');
    }

    const ownerBonus = roundMoney_(normalizeNumber_(adjustment.owner_bonus, 0));
    if (ownerBonus !== 0 && !String(adjustment.reason || '').trim()) warnings.push('OWNER_BONUS_WITHOUT_REASON');
    if ((ownerBonus !== 0 || hasAnyOverride_(adjustment)) && !String(adjustment.approved_by || '').trim()) warnings.push('ADJUSTMENT_WITHOUT_APPROVER');

    const thp = roundMoney_(basePayable + attendancePay + regularOtPay + holidayOtPay + ownerBonus);
    warningCount += warnings.length;

    const trace = {
      simulator_status: NFP.STATUS,
      career: {
        code: careerCode,
        stage: career ? normalizeNumber_(career.stage, 0) : '',
        reference_rate: payrollProfile.referenceRate,
        stage_cap: payrollProfile.stageCap
      },
      payroll_profile: {
        benchmark_shifts: normalizeNumber_(rules.BENCHMARK_SHIFTS, NFP.BENCHMARK_SHIFTS),
        base_master: payrollProfile.baseMaster,
        attendance_rate: payrollProfile.attendanceRate,
        overtime_base_monthly: payrollProfile.overtimeBaseMonthly,
        workweek_mode: String(employee.workweek_mode || rules.DEFAULT_WORKWEEK_MODE || NFP.DEFAULT_WORKWEEK_MODE)
      },
      attendance: {
        scheduled_shift_target: scheduledTarget,
        base_credit: credits.baseCredit,
        attendance_credit: credits.attendanceCredit,
        regular_ot_hours: credits.regularOtHours,
        holiday_ot_hours: credits.holidayOtHours
      },
      payable: {
        base_payable: basePayable,
        attendance_pay: attendancePay,
        regular_ot_pay: regularOtPay,
        holiday_ot_pay: holidayOtPay,
        owner_bonus: ownerBonus,
        thp: thp
      },
      adjustment_reason: String(adjustment.reason || ''),
      approved_by: String(adjustment.approved_by || '')
    };

    output.push({
      period_start: startKey,
      period_end: endKey,
      staff_id: staffId,
      name: employee.name || '',
      outlet: employee.outlet || '',
      career_code: careerCode,
      career_stage: career ? normalizeNumber_(career.stage, 0) : '',
      reference_rate: payrollProfile.referenceRate,
      stage_cap: payrollProfile.stageCap,
      scheduled_shift_target: scheduledTarget,
      base_credit: credits.baseCredit,
      attendance_credit: credits.attendanceCredit,
      base_master: payrollProfile.baseMaster,
      base_payable: basePayable,
      attendance_rate: payrollProfile.attendanceRate,
      attendance_pay: attendancePay,
      regular_ot_hours: credits.regularOtHours,
      regular_ot_pay: regularOtPay,
      holiday_ot_hours: credits.holidayOtHours,
      holiday_ot_pay: holidayOtPay,
      owner_bonus: ownerBonus,
      thp: thp,
      warnings: warnings.join(' | '),
      calculation_trace: JSON.stringify(trace),
      generated_at: new Date()
    });
  });

  writeObjects_(NFP.SHEETS.PAYROLL_PREVIEW, HEADERS.PAYROLL_PREVIEW, output);
  appendAudit_('GENERATE_PAYROLL_PREVIEW', 'PAYROLL_PERIOD', startKey + '..' + endKey, null, {
    employee_count: output.length,
    warning_count: warningCount,
    version: NFP.VERSION
  }, 'Simulation only');

  return {employeeCount: output.length, warningCount: warningCount};
}

function resolvePayrollProfile_(employee, career, adjustment, rules, warnings) {
  const attendanceRate = hasValue_(employee.attendance_rate_override)
    ? normalizeNumber_(employee.attendance_rate_override, rules.ATTENDANCE_RATE)
    : normalizeNumber_(rules.ATTENDANCE_RATE, NFP.DEFAULT_ATTENDANCE_RATE);

  let referenceRate = 0;
  let stageCap = 0;
  if (career) {
    stageCap = normalizeNumber_(career.stage_cap, 0);
    const mode = String(career.rate_mode || 'FIXED').trim().toUpperCase();
    if (mode === 'INHERIT') {
      if (hasValue_(employee.reference_rate_override)) {
        referenceRate = normalizeNumber_(employee.reference_rate_override, 0);
      } else {
        warnings.push('INHERIT_RATE_REQUIRES_EMPLOYEE_OVERRIDE');
      }
    } else {
      referenceRate = normalizeNumber_(career.reference_rate, 0);
    }
  }

  if (hasValue_(employee.reference_rate_override) && (!career || String(career.rate_mode || '').toUpperCase() !== 'INHERIT')) {
    referenceRate = normalizeNumber_(employee.reference_rate_override, referenceRate);
    warnings.push('EMPLOYEE_REFERENCE_RATE_OVERRIDE');
  }
  if (hasValue_(adjustment.reference_rate_override)) {
    referenceRate = normalizeNumber_(adjustment.reference_rate_override, referenceRate);
    warnings.push('PERIOD_REFERENCE_RATE_OVERRIDE');
  }

  if (stageCap > 0 && referenceRate > stageCap) warnings.push('REFERENCE_RATE_ABOVE_STAGE_CAP');
  if (referenceRate <= attendanceRate) warnings.push('REFERENCE_RATE_NOT_ABOVE_ATTENDANCE_RATE');

  const benchmarkShifts = normalizeNumber_(rules.BENCHMARK_SHIFTS, NFP.BENCHMARK_SHIFTS);
  let baseMaster = Math.max(0, referenceRate - attendanceRate) * benchmarkShifts;

  if (hasValue_(employee.base_monthly_override)) {
    baseMaster = normalizeNumber_(employee.base_monthly_override, baseMaster);
    warnings.push('EMPLOYEE_BASE_MONTHLY_OVERRIDE');
  }
  if (hasValue_(adjustment.base_monthly_override)) {
    baseMaster = normalizeNumber_(adjustment.base_monthly_override, baseMaster);
    warnings.push('PERIOD_BASE_MONTHLY_OVERRIDE');
  }

  const overtimeBaseMonthly = normalizeNumber_(employee.overtime_base_monthly, 0);

  return {
    referenceRate: roundMoney_(referenceRate),
    stageCap: roundMoney_(stageCap),
    attendanceRate: roundMoney_(attendanceRate),
    baseMaster: roundMoney_(baseMaster),
    overtimeBaseMonthly: roundMoney_(overtimeBaseMonthly)
  };
}

function calculatePeriodCredits_(employee, staffRoster, attendanceMap, holidayMap, rules, warnings) {
  let scheduledTarget = 0;
  let baseCredit = 0;
  let attendanceCredit = 0;
  let regularOtHours = 0;
  let holidayOtHours = 0;
  const regularOtByDay = [];
  const holidayOtByDay = [];

  staffRoster.forEach(roster => {
    const rosterStatus = String(roster.roster_status || 'WORK').trim().toUpperCase();
    if (rosterStatus === 'WEEKLY_OFF') return;

    scheduledTarget += 1;
    const dateKey = normalizeDateKey_(roster.date);
    const attendanceKey = dateKey + '|' + String(employee.staff_id || '').trim();
    const att = attendanceMap[attendanceKey];
    const scheduledMinutes = normalizeNumber_(roster.scheduled_effective_minutes, 0);

    if (rosterStatus === 'TRAINING') {
      baseCredit += 1;
      attendanceCredit += 1;
      return;
    }

    if (!att) {
      warnings.push('MISSING_ATTENDANCE:' + dateKey);
      return;
    }

    const status = String(att.attendance_status || '').trim().toUpperCase();
    const effectiveMinutes = Math.max(0, normalizeNumber_(att.effective_minutes, 0));
    const credit = scheduledMinutes > 0 ? Math.min(1, effectiveMinutes / scheduledMinutes) : 0;

    switch (status) {
      case 'PRESENT':
        baseCredit += credit;
        attendanceCredit += credit;
        break;
      case 'COMPANY_RELEASE':
        baseCredit += 1;
        attendanceCredit += 1;
        break;
      case 'TRAINING':
        baseCredit += 1;
        attendanceCredit += 1;
        break;
      case 'PAID_LEAVE':
      case 'SICK_PAID':
        baseCredit += 1;
        break;
      case 'UNPAID_PERMISSION':
      case 'ABSENT':
        break;
      default:
        warnings.push('INVALID_ATTENDANCE_STATUS:' + dateKey + ':' + status);
    }

    const regularHours = Math.max(0, normalizeNumber_(att.regular_ot_hours, 0));
    if (regularHours > 0) {
      regularOtHours += regularHours;
      regularOtByDay.push({date: dateKey, hours: regularHours});
    }

    const holiday = holidayMap[dateKey];
    if (holiday && ['PRESENT','COMPANY_RELEASE'].includes(status) && effectiveMinutes > 0) {
      const holidayHours = hasValue_(att.holiday_ot_hours_override)
        ? Math.max(0, normalizeNumber_(att.holiday_ot_hours_override, 0))
        : effectiveMinutes / 60;
      holidayOtHours += holidayHours;
      holidayOtByDay.push({
        date: dateKey,
        hours: holidayHours,
        shortest6d: normalizeBool_(holiday.is_shortest_workday_6d),
        name: holiday.holiday_name || ''
      });
      warnings.push('PUBLIC_HOLIDAY_WORK:' + dateKey + ':' + holidayHours + 'h');
    }
  });

  return {
    scheduledTarget: scheduledTarget,
    baseCredit: round4_(baseCredit),
    attendanceCredit: round4_(attendanceCredit),
    regularOtHours: round4_(regularOtHours),
    holidayOtHours: round4_(holidayOtHours),
    regularOtByDay: regularOtByDay,
    holidayOtByDay: holidayOtByDay
  };
}

function calculateRegularOtPay_(days, overtimeBaseMonthly, rules, warnings) {
  if (!days.length) return 0;
  if (!overtimeBaseMonthly) {
    warnings.push('REGULAR_OT_BASE_MISSING');
    return 0;
  }
  const hourly = overtimeBaseMonthly / normalizeNumber_(rules.OVERTIME_DIVISOR, NFP.OVERTIME_DIVISOR);
  let total = 0;
  days.forEach(day => total += regularOvertimePayForDay_(day.hours, hourly));
  return roundMoney_(total);
}

function calculateHolidayOtPay_(days, overtimeBaseMonthly, employee, rules, warnings) {
  if (!days.length) return 0;
  if (!overtimeBaseMonthly) {
    warnings.push('HOLIDAY_OT_BASE_MISSING');
    return 0;
  }
  const hourly = overtimeBaseMonthly / normalizeNumber_(rules.OVERTIME_DIVISOR, NFP.OVERTIME_DIVISOR);
  const mode = String(employee.workweek_mode || rules.DEFAULT_WORKWEEK_MODE || NFP.DEFAULT_WORKWEEK_MODE).trim().toUpperCase();
  let total = 0;
  days.forEach(day => {
    total += holidayOvertimePayForDay_(day.hours, hourly, mode, day.shortest6d);
  });
  return roundMoney_(total);
}

function regularOvertimePayForDay_(hours, hourlyRate) {
  const h = Math.max(0, Number(hours) || 0);
  if (h === 0) return 0;
  const first = Math.min(h, 1);
  const rest = Math.max(0, h - 1);
  return hourlyRate * (first * 1.5 + rest * 2);
}

function holidayOvertimePayForDay_(hours, hourlyRate, workweekMode, shortest6d) {
  const h = Math.max(0, Number(hours) || 0);
  if (h === 0) return 0;
  const mode = String(workweekMode || '6D').toUpperCase();

  if (mode === '5D') {
    const tier1 = Math.min(h, 8);
    const tier2 = Math.min(Math.max(h - 8, 0), 1);
    const tier3 = Math.max(h - 9, 0);
    return hourlyRate * (tier1 * 2 + tier2 * 3 + tier3 * 4);
  }

  if (shortest6d) {
    const tier1 = Math.min(h, 5);
    const tier2 = Math.min(Math.max(h - 5, 0), 1);
    const tier3 = Math.max(h - 6, 0);
    return hourlyRate * (tier1 * 2 + tier2 * 3 + tier3 * 4);
  }

  const tier1 = Math.min(h, 7);
  const tier2 = Math.min(Math.max(h - 7, 0), 1);
  const tier3 = Math.max(h - 8, 0);
  return hourlyRate * (tier1 * 2 + tier2 * 3 + tier3 * 4);
}

function groupBy_(rows, keyFn) {
  const out = {};
  rows.forEach(row => {
    const key = keyFn(row);
    if (!key) return;
    if (!out[key]) out[key] = [];
    out[key].push(row);
  });
  return out;
}

function inPeriod_(dateValue, startKey, endKey) {
  const key = normalizeDateKey_(dateValue);
  return key && key >= startKey && key <= endKey;
}

function isEmployeeActive_(employee) {
  if (employee.active === '' || employee.active == null) return true;
  return normalizeBool_(employee.active);
}

function hasValue_(value) {
  return value !== '' && value != null;
}

function hasAnyOverride_(adjustment) {
  return ['regular_ot_pay_override','holiday_ot_pay_override','reference_rate_override','base_monthly_override']
    .some(k => hasValue_(adjustment[k]));
}
