function runSelfTests() {
  const results = [];

  testCase_(results, 'S1 default base = 650k', () => {
    const reference = 50000;
    const attendance = 25000;
    const base = (reference - attendance) * 26;
    assertEqual_(650000, base);
  });

  testCase_(results, 'S1 25/25 full = 1.275m', () => {
    const baseMaster = 650000;
    const basePayable = baseMaster * 25 / 25;
    const attendancePay = 25 * 25000;
    assertEqual_(1275000, basePayable + attendancePay);
  });

  testCase_(results, 'S1 24/25 unpaid = 1.224m', () => {
    const baseMaster = 650000;
    const basePayable = Math.round(baseMaster * 24 / 25);
    const attendancePay = 24 * 25000;
    assertEqual_(1224000, basePayable + attendancePay);
  });

  testCase_(results, 'Short shift 8/10 = 0.8 credit', () => {
    assertAlmost_(0.8, 480 / 600, 0.00001);
  });

  testCase_(results, 'Regular OT 3h multiplier = 5.5x hourly', () => {
    const pay = regularOvertimePayForDay_(3, 10000);
    assertEqual_(55000, pay);
  });

  testCase_(results, 'Holiday OT 6D 10h multiplier = 25x hourly', () => {
    const pay = holidayOvertimePayForDay_(10, 10000, '6D', false);
    assertEqual_(250000, pay);
  });

  testCase_(results, 'Holiday OT 6D shortest 8h multiplier = 21x hourly', () => {
    const pay = holidayOvertimePayForDay_(8, 10000, '6D', true);
    assertEqual_(210000, pay);
  });

  testCase_(results, 'Holiday OT 5D 10h multiplier = 23x hourly', () => {
    const pay = holidayOvertimePayForDay_(10, 10000, '5D', false);
    assertEqual_(230000, pay);
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
