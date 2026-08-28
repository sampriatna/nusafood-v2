function runCareerCertificationSelfTestsNoUi() {
  const results = [];
  function test(name, fn) {
    try { fn(); results.push({name:name, ok:true}); }
    catch (e) { results.push({name:name, ok:false, error:String(e.message || e)}); }
  }

  test('required sheets exist', function() {
    Object.keys(NF3C.SHEETS).forEach(function(k) { sheet_(NF3C.SHEETS[k]); });
  });

  test('staff master has 30 source people including owner', function() {
    const staff = readObjects_(NF3C.SHEETS.STAFF, 1).filter(function(r){ return r.staff_id; });
    if (staff.length !== 30) throw new Error('Expected 30 staff rows, got ' + staff.length);
  });

  test('Hana S3 and Sima K10 mappings are preserved', function() {
    const hana = findStaff_('SIM-NF3-HANA');
    const sima = findStaff_('SIM-NF3-SIMA');
    if (!hana || String(hana.effective_level).toUpperCase() !== 'S3') throw new Error('Hana effective level must remain S3 until audited/approved.');
    if (!sima || String(sima.effective_level).toUpperCase() !== 'K10') throw new Error('Sima effective level must remain K10 until audited/approved.');
  });

  test('pilot certification weights total 100', function() {
    const requiredCodes = ['S1','S2','S3','K1','K2','K3','K4','K5','PT1','PT2','PT3','PT4'];
    const tests = readObjects_(NF3C.SHEETS.TESTS, 1).filter(function(r){ return bool_(r.active); });
    requiredCodes.forEach(function(code) {
      const rows = tests.filter(function(r){ return String(r.certification_code).toUpperCase() === code; });
      if (!rows.length) throw new Error(code + ' has no active tests.');
      const total = rows.reduce(function(s,r){ return s + num_(r.weight); }, 0);
      if (Math.abs(total - 100) > 0.001) throw new Error(code + ' weight total = ' + total + ', expected 100.');
    });
  });

  test('effective levels are not silently blank for active staff', function() {
    const bad = readObjects_(NF3C.SHEETS.STAFF, 1).filter(function(r){
      return r.staff_id && String(r.record_status).toUpperCase() !== 'EXCLUDED' && !String(r.effective_level || '').trim();
    });
    if (bad.length) throw new Error('Blank effective_level: ' + bad.map(function(r){return r.name;}).join(', '));
  });

  test('PT crew has PT grade candidate/effective marker', function() {
    const bad = readObjects_(NF3C.SHEETS.STAFF, 1).filter(function(r){
      return String(r.employment_type).toUpperCase() === 'PT' && !String(r.pt_effective_grade || r.pt_grade_candidate || '').trim();
    });
    if (bad.length) throw new Error('PT without grade: ' + bad.map(function(r){return r.name;}).join(', '));
  });

  const passed = results.filter(function(r){return r.ok;}).length;
  const failed = results.length - passed;
  console.log('Career Certification Self Tests: ' + passed + ' passed, ' + failed + ' failed');
  results.forEach(function(r){ console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ' — ' + r.error : '')); });
  if (failed) throw new Error('Self test failed: ' + failed);
  return {passed:passed, failed:failed, results:results};
}
