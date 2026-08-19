function runSelfTests() {
  const results = [];

  testCase_(results, 'S1 profile default base = 650k', () => {
    const warnings = [];
    const profile = resolvePayrollProfile_(
      {extra_hour_rate: 0},
      {reference_rate: 50000, stage_cap: 60000, rate_mode: 'FIXED'},
      {},
      {ATTENDANCE_RATE: 25000, BENCHMARK_SHIFTS: 26},
      warnings
    );
    assertEqual_(650000, profile.baseMaster);
  });

  testCase_(results, 'Clock 10-20 against roster 10-20 = full 600 minutes', () => {
    const m = calculateClockMetrics_(
      {scheduled_start: '10:00', scheduled_end: '20:00'},
      {check_in: '10:00', check_out: '20:00'},
      600
    );
    assertEqual_(600, m.normalScheduledMinutes);
    assertEqual_(0, m.afterScheduleMinutes);
  });

  testCase_(results, 'Late 1h + linger 2h gives only 0.9 normal credit', () => {
    const warnings = [];
    const credits = calculatePeriodCredits_(
      {staff_id: 'TEST'},
      [{date: '2026-07-29', scheduled_start: '10:00', scheduled_end: '20:00', scheduled_effective_minutes: 600, roster_status: 'WORK'}],
      {'2026-07-29|TEST': {check_in: '11:00', check_out: '22:00', effective_minutes: 660, attendance_status: 'PRESENT', regular_ot_hours: 0, extra_hour_hours: 0}},
      {},
      {OVERSTAY_WARNING_MINUTES: 30},
      warnings
    );
    assertAlmost_(0.9, credits.baseCredit, 0.00001);
    assertAlmost_(0.9, credits.attendanceCredit, 0.00001);
    assertEqual_(0, credits.extraHourHours);
    assertTrue_(warnings.some(w => w.indexOf('CLOCK_OUT_OVERSTAY_NO_APPROVED_EXTRA') === 0));
  });

  testCase_(results, 'Clock-out 2h late never auto-creates extra hour', () => {
    const m = calculateClockMetrics_(
      {scheduled_start: '10:00', scheduled_end: '20:00'},
      {check_in: '10:00', check_out: '22:00'},
      600
    );
    assertEqual_(600, m.normalScheduledMinutes);
    assertEqual_(120, m.afterScheduleMinutes);
  });

  testCase_(results, 'Approved extra hour 2h is counted explicitly', () => {
    const warnings = [];
    const credits = calculatePeriodCredits_(
      {staff_id: 'TEST'},
      [{date: '2026-07-29', scheduled_start: '10:00', scheduled_end: '20:00', scheduled_effective_minutes: 600, roster_status: 'WORK'}],
      {'2026-07-29|TEST': {check_in: '10:00', check_out: '22:00', attendance_status: 'PRESENT', extra_hour_hours: 2, approved_by: 'OWNER'}},
      {},
      {OVERSTAY_WARNING_MINUTES: 30},
      warnings
    );
    assertEqual_(2, credits.extraHourHours);
  });

  testCase_(results, 'Unapproved extra hour is rejected', () => {
    const warnings = [];
    const credits = calculatePeriodCredits_(
      {staff_id: 'TEST'},
      [{date: '2026-07-29', scheduled_start: '10:00', scheduled_end: '20:00', scheduled_effective_minutes: 600, roster_status: 'WORK'}],
      {'2026-07-29|TEST': {check_in: '10:00', check_out: '22:00', attendance_status: 'PRESENT', extra_hour_hours: 2, approved_by: ''}},
      {},
      {OVERSTAY_WARNING_MINUTES: 30},
      warnings
    );
    assertEqual_(0, credits.extraHourHours);
    assertTrue_(warnings.some(w => w.indexOf('EXTRA_HOUR_NOT_APPROVED') === 0));
  });

  testCase_(results, 'Extra Hour 2h x 7k = 14k', () => {
    const warnings = [];
    const profile = resolvePayrollProfile_(
      {extra_hour_rate: 7000},
      {reference_rate: 135000, stage_cap: 135000, rate_mode: 'FIXED'},
      {},
      {ATTENDANCE_RATE: 25000, BENCHMARK_SHIFTS: 26},
      warnings
    );
    assertEqual_(14000, roundMoney_(2 * profile.extraHourRate));
  });

  testCase_(results, 'Regular legal OT 3h multiplier = 5.5x hourly', () => {
    assertEqual_(55000, regularOvertimePayForDay_(3, 10000));
  });

  testCase_(results, 'Holiday legal OT 6D 10h multiplier = 25x hourly', () => {
    assertEqual_(250000, holidayOvertimePayForDay_(10, 10000, '6D', false));
  });

  testCase_(results, 'Holiday legal OT 6D shortest 8h multiplier = 21x hourly', () => {
    assertEqual_(210000, holidayOvertimePayForDay_(8, 10000, '6D', true));
  });

  testCase_(results, 'Holiday legal OT 5D 10h multiplier = 23x hourly', () => {
    assertEqual_(230000, holidayOvertimePayForDay_(10, 10000, '5D', false));
  });

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const text = results.map(r => (r.ok ? '✅ ' : '❌ ') + r.name + (r.error ? ' — ' + r.error : '')).join('\n');
  SpreadsheetApp.getUi().alert('Self Tests: ' + passed + ' passed, ' + failed + ' failed\n\n' + text);

  if (failed) throw new Error('Self tests failed: ' + failed);
  return results;
}

function testCase_(results, name, fn) {
  try {
    fn();
    results.push({name: name, ok: true});
  } catch (err) {
    results.push({name: name, ok: false, error: err.message});
  }
}

function assertEqual_(expected, actual) {
  if (expected !== actual) throw new Error('expected ' + expected + ', got ' + actual);
}

function assertAlmost_(expected, actual, tolerance) {
  if (Math.abs(expected - actual) > tolerance) {
    throw new Error('expected ~' + expected + ', got ' + actual);
  }
}

function assertTrue_(value) {
  if (!value) throw new Error('expected true, got ' + value);
}
