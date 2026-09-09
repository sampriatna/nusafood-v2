function runV14SelfTestsNoUi() {
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
    (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ' — ' + r.error : '')
  ).join('\n');

  Logger.log('V1.4 Self Tests: ' + passed + ' passed, ' + failed + ' failed\n' + text);
  if (failed) throw new Error('V1.4 self tests failed: ' + failed + '\n' + text);
  return {passed: passed, failed: failed, results: results};
}

function runPayrollPreviewV14NoUi() {
  const periodStart = '2026-08-01';
  const periodEnd = '2026-08-29';
  const result = generatePayrollPreviewV14(periodStart, periodEnd);

  Logger.log(
    'V1.4 selesai. ' + result.employeeCount +
    ' employee dihitung. Warning: ' + result.warningCount +
    '. Career FT: ' + result.careerEmployeeCount +
    '. PT/Fixed mode: ' + result.supplementalEmployeeCount
  );

  return result;
}
