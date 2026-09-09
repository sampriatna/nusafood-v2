const NF3C = Object.freeze({
  SPREADSHEET_ID: '1HCDoE80ZKtn2PgdPrnwa24463eK2XJZU3svmW_4xiVE',
  TZ: 'Asia/Jakarta',
  SHEETS: {
    STAFF: 'STAFF_PATH',
    LEVELS: 'LEVEL_MASTER',
    TESTS: 'TEST_MASTER',
    INPUT: 'ASSESSMENT_INPUT',
    SUMMARY: 'ASSESSMENT_SUMMARY',
    CERT: 'CERTIFICATION_LOG',
    PT: 'PT_GRADE_MASTER',
    HISTORY: 'LEVEL_HISTORY',
    AUDIT: 'APP_AUDIT_LOG'
  },
  ROLE_SEQUENCES: {
    SERVICE: ['ST','S1','S2','S3','S4'],
    BAR: ['B1','B2','B3','B4'],
    CASHIER: ['C1','C2','C3','C4'],
    KITCHEN: ['KT','K1','K2','K3','K4','K5','K6','K7','K8','K9','K10','K11','KH'],
    PT: ['PT0','PT1','PT2','PT3','PT4']
  }
});

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('NF3 Career & Certification')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getBootstrapData() {
  const staff = readObjects_(NF3C.SHEETS.STAFF, 1).filter(r => r.staff_id);
  const levels = readObjects_(NF3C.SHEETS.LEVELS, 1).filter(r => r.level_code);
  const ptGrades = readObjects_(NF3C.SHEETS.PT, 1).filter(r => r.pt_grade);
  const tests = readObjects_(NF3C.SHEETS.TESTS, 1).filter(r => r.certification_code && bool_(r.active));
  const certs = readObjects_(NF3C.SHEETS.CERT, 1).filter(r => r.staff_id && r.staff_id !== '—');
  const summaries = readObjects_(NF3C.SHEETS.SUMMARY, 1).filter(r => r.assessment_id);

  const active = staff.filter(r => String(r.record_status || '').toUpperCase() !== 'EXCLUDED');
  const pending = active.filter(r => /PENDING|REVIEW|PROVISIONAL/.test(String(r.level_status || '') + ' ' + String(r.pt_grade_status || '')));
  const certified = active.filter(r => String(r.certified_level || '').trim() || String(r.pt_certified_grade || '').trim());

  return {
    actor: actor_(),
    generatedAt: isoNow_(),
    stats: {
      total: active.length,
      pendingAudit: pending.length,
      certified: certified.length,
      pt: active.filter(r => String(r.employment_type).toUpperCase() === 'PT').length,
      readyApproval: summaries.filter(r => String(r.promotion_gate) === 'REVIEW_PREREQUISITE_AND_APPROVAL').length
    },
    staff: staff.map(normalizeStaff_),
    levels: levels,
    ptGrades: ptGrades,
    availableCertificationCodes: [...new Set(tests.map(t => String(t.certification_code)))].sort()
  };
}

function getStaffDetail(staffId) {
  const staff = findStaff_(staffId);
  if (!staff) throw new Error('Staff tidak ditemukan: ' + staffId);
  const history = readObjects_(NF3C.SHEETS.HISTORY, 1)
    .filter(r => String(r.staff_id) === String(staffId))
    .sort((a,b) => String(b.changed_at).localeCompare(String(a.changed_at)));
  const certs = readObjects_(NF3C.SHEETS.CERT, 1)
    .filter(r => String(r.staff_id) === String(staffId) && r.staff_id !== '—')
    .sort((a,b) => String(b.test_date).localeCompare(String(a.test_date)));
  const summaries = readObjects_(NF3C.SHEETS.SUMMARY, 1)
    .filter(r => String(r.staff_id) === String(staffId))
    .sort((a,b) => String(b.reviewed_at || '').localeCompare(String(a.reviewed_at || '')));
  return {
    staff: normalizeStaff_(staff),
    history,
    certifications: certs,
    assessments: summaries,
    suggestedAudit: suggestedAuditCode_(staff)
  };
}

function saveStaffProfile(payload) {
  payload = payload || {};
  const staffId = required_(payload.staffId, 'staffId');
  const sh = sheet_(NF3C.SHEETS.STAFF);
  const table = readTable_(sh, 1);
  const idx = table.rows.findIndex(r => String(r.obj.staff_id) === String(staffId));
  if (idx < 0) throw new Error('Staff tidak ditemukan.');

  const allowed = ['name','outlet','track','employment_type','management_note','record_status'];
  const before = Object.assign({}, table.rows[idx].obj);
  allowed.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      writeByHeader_(sh, table.headers, table.rows[idx].rowNumber, key, payload[key]);
    }
  });
  writeByHeader_(sh, table.headers, table.rows[idx].rowNumber, 'updated_at', isoNow_());
  const after = findStaff_(staffId);
  appendAudit_('EDIT_STAFF_PROFILE', staffId, '', before, after, String(payload.reason || ''), 'WEB_APP', 'OK', 'Non-level profile edit');
  return getStaffDetail(staffId);
}

function startAssessment(payload) {
  payload = payload || {};
  const staffId = required_(payload.staffId, 'staffId');
  const code = required_(payload.certificationCode, 'certificationCode').toUpperCase();
  const staff = findStaff_(staffId);
  if (!staff) throw new Error('Staff tidak ditemukan.');
  const tests = readObjects_(NF3C.SHEETS.TESTS, 1)
    .filter(r => String(r.certification_code).toUpperCase() === code && bool_(r.active));
  if (!tests.length) throw new Error('Belum ada TEST_MASTER aktif untuk ' + code + '.');

  const id = 'ASMT-' + Utilities.formatDate(new Date(), NF3C.TZ, 'yyyyMMdd-HHmmss') + '-' + String(Math.floor(Math.random()*900)+100);
  const sh = sheet_(NF3C.SHEETS.INPUT);
  const startRow = Math.max(sh.getLastRow() + 1, 5);
  const values = tests.map(t => [
    id, '', staffId, staff.name || '', staff.outlet || '', code,
    t.item_code || '', t.category || '', num_(t.weight), '', '', payload.assessor || actor_(), '',
    'Assessment dibuat dari Web App. Isi nilai/evidence saat tes dilakukan.', '', 'PENDING'
  ]);
  sh.getRange(startRow, 1, values.length, 16).setValues(values);
  upsertSummary_({
    assessment_id: id,
    staff_id: staffId,
    name: staff.name || '',
    certification_code: code,
    total_weighted_score: 0,
    critical_failure_count: 0,
    below_standard_items: 0,
    result: 'NOT_STARTED',
    reviewer: '', reviewed_at: '', promotion_gate: 'WAIT_ASSESSMENT',
    notes: 'Created from Web App'
  });
  appendAudit_('START_ASSESSMENT', staffId, id, {}, {certificationCode: code}, '', 'WEB_APP', 'OK', '');
  return getAssessment_(id);
}

function getAssessment(assessmentId) {
  return getAssessment_(required_(assessmentId, 'assessmentId'));
}

function saveAssessment(payload) {
  payload = payload || {};
  const assessmentId = required_(payload.assessmentId, 'assessmentId');
  const rows = assessmentRows_(assessmentId);
  if (!rows.length) throw new Error('Assessment tidak ditemukan.');
  const byCode = {};
  (payload.items || []).forEach(x => byCode[String(x.itemCode)] = x);
  const sh = sheet_(NF3C.SHEETS.INPUT);
  const testDate = payload.testDate || Utilities.formatDate(new Date(), NF3C.TZ, 'yyyy-MM-dd');
  const assessor = payload.assessor || actor_();

  rows.forEach(r => {
    const item = byCode[String(r.item_code)];
    if (!item) return;
    const score = item.score === '' || item.score == null ? '' : Math.max(0, Math.min(100, Number(item.score)));
    const critical = score === '' ? '' : (String(item.criticalFailure || 'NO').toUpperCase() === 'YES' ? 'YES' : 'NO');
    const weighted = score === '' ? '' : round2_(num_(r.weight) * score / 100);
    const status = score === '' ? 'PENDING' : (critical === 'YES' ? 'CRITICAL_FAIL' : (score < 70 ? 'ITEM_BELOW_STANDARD' : 'OK'));
    sh.getRange(r.__row, 2).setValue(testDate);
    sh.getRange(r.__row, 10, 1, 7).setValues([[
      score, critical, assessor, item.evidenceLink || '', item.note || '', weighted, status
    ]]);
  });
  const evaluation = evaluateAssessment_(assessmentId);
  upsertSummary_(evaluation.summary);
  appendAudit_('SAVE_ASSESSMENT', rows[0].staff_id, assessmentId, {}, {result: evaluation.summary.result, score: evaluation.summary.total_weighted_score}, '', 'WEB_APP', 'OK', 'Draft saved');
  return getAssessment_(assessmentId);
}

function finalizeAssessment(payload) {
  payload = payload || {};
  const assessmentId = required_(payload.assessmentId, 'assessmentId');
  const evaluation = evaluateAssessment_(assessmentId, true);
  const summary = evaluation.summary;
  summary.reviewer = payload.reviewer || actor_();
  summary.reviewed_at = isoNow_();
  upsertSummary_(summary);

  const staff = findStaff_(summary.staff_id);
  if (!staff) throw new Error('Staff assessment tidak ditemukan.');

  if (String(summary.result).indexOf('PASS_') === 0) {
    appendCertificationIfMissing_(summary, payload);
    applyCertifiedMarker_(staff, summary.certification_code, assessmentId);
  }

  appendAudit_('FINALIZE_ASSESSMENT', summary.staff_id, assessmentId, {}, summary, String(payload.note || ''), 'WEB_APP', 'OK', '');
  return {
    assessment: getAssessment_(assessmentId),
    staff: getStaffDetail(summary.staff_id),
    recommendation: assessmentRecommendation_(staff, summary)
  };
}

function approveLevelAdjustment(payload) {
  payload = payload || {};
  const staffId = required_(payload.staffId, 'staffId');
  const approvedBy = required_(payload.approvedBy, 'approvedBy');
  const reason = required_(payload.reason, 'reason');
  const mode = String(payload.mode || 'CERTIFICATION').toUpperCase();
  const targetLevel = String(payload.targetLevel || '').trim().toUpperCase();
  const targetPt = String(payload.targetPtGrade || '').trim().toUpperCase();
  if (!targetLevel && !targetPt) throw new Error('Target level/PT grade wajib diisi.');

  const staff = findStaff_(staffId);
  if (!staff) throw new Error('Staff tidak ditemukan.');
  const before = normalizeStaff_(staff);

  if (targetLevel) {
    if (mode === 'CERTIFICATION' && !hasPassedCertification_(staffId, targetLevel)) {
      throw new Error('Belum ada certification PASS untuk ' + targetLevel + '. Audit level tersebut dulu.');
    }
    applyRoleLevel_(staffId, targetLevel, approvedBy, reason, payload.assessmentId || '', mode);
  }
  if (targetPt) {
    if (targetPt !== 'PTX' && mode === 'CERTIFICATION' && !hasPassedCertification_(staffId, targetPt)) {
      throw new Error('Belum ada certification PASS untuk ' + targetPt + '. Audit PT grade tersebut dulu.');
    }
    applyPtGrade_(staffId, targetPt, approvedBy, reason, payload.assessmentId || '', mode);
  }

  const after = normalizeStaff_(findStaff_(staffId));
  appendAudit_('APPROVE_LEVEL_ADJUSTMENT', staffId, payload.assessmentId || '', before, after, reason, 'WEB_APP', 'OK', mode);
  return getStaffDetail(staffId);
}

function getLevelOptions(staffId) {
  const staff = findStaff_(staffId);
  if (!staff) throw new Error('Staff tidak ditemukan.');
  const track = String(staff.track || '').toUpperCase();
  const levels = readObjects_(NF3C.SHEETS.LEVELS, 1).filter(r => String(r.track || '').toUpperCase() === track);
  return {levels, ptGrades: readObjects_(NF3C.SHEETS.PT, 1).filter(r => r.pt_grade)};
}

// ---------------- helpers ----------------

function normalizeStaff_(r) {
  const out = Object.assign({}, r);
  out.display_level = String(r.effective_level || r.current_level || 'REVIEW');
  out.display_pt_grade = String(r.pt_effective_grade || r.pt_grade_candidate || '');
  out.is_pt = String(r.employment_type || '').toUpperCase() === 'PT';
  return out;
}

function suggestedAuditCode_(staff) {
  const effective = String(staff.effective_level || staff.current_level || '').toUpperCase();
  const pt = String(staff.pt_effective_grade || staff.pt_grade_candidate || '').toUpperCase();
  const codes = new Set(readObjects_(NF3C.SHEETS.TESTS, 1).filter(r => bool_(r.active)).map(r => String(r.certification_code).toUpperCase()));
  if (effective && codes.has(effective)) return effective;
  if (pt && codes.has(pt)) return pt;
  return '';
}

function assessmentRows_(assessmentId) {
  return readObjects_(NF3C.SHEETS.INPUT, 4).filter(r => String(r.assessment_id) === String(assessmentId));
}

function getAssessment_(assessmentId) {
  const rows = assessmentRows_(assessmentId);
  if (!rows.length) throw new Error('Assessment tidak ditemukan.');
  const summary = readObjects_(NF3C.SHEETS.SUMMARY, 1).find(r => String(r.assessment_id) === String(assessmentId)) || {};
  const tests = readObjects_(NF3C.SHEETS.TESTS, 1);
  const testMap = {};
  tests.forEach(t => testMap[String(t.item_code)] = t);
  return {
    assessmentId,
    staffId: rows[0].staff_id,
    name: rows[0].name,
    certificationCode: rows[0].certification_code,
    summary,
    items: rows.map(r => Object.assign({}, r, {
      competency_tested: (testMap[String(r.item_code)] || {}).competency_tested || '',
      test_method: (testMap[String(r.item_code)] || {}).test_method || '',
      pass_standard: (testMap[String(r.item_code)] || {}).pass_standard || '',
      critical_if_fail: (testMap[String(r.item_code)] || {}).critical_if_fail || '',
      staff_explanation: (testMap[String(r.item_code)] || {}).staff_explanation || ''
    }))
  };
}

function evaluateAssessment_(assessmentId, requireComplete) {
  const rows = assessmentRows_(assessmentId);
  if (!rows.length) throw new Error('Assessment tidak ditemukan.');
  const incomplete = rows.filter(r => r.score_0_100 === '' || r.score_0_100 == null || String(r.critical_failure || '').trim() === '');
  if (requireComplete && incomplete.length) throw new Error('Masih ada ' + incomplete.length + ' item yang belum dinilai/critical flag belum diisi.');
  const scored = rows.filter(r => r.score_0_100 !== '' && r.score_0_100 != null);
  const total = round2_(scored.reduce((s,r) => s + num_(r.weighted_score || (num_(r.weight) * num_(r.score_0_100) / 100)), 0));
  const critical = rows.filter(r => String(r.critical_failure).toUpperCase() === 'YES').length;
  const below = scored.filter(r => num_(r.score_0_100) < 70).length;
  let result = 'NOT_STARTED';
  let gate = 'WAIT_ASSESSMENT';
  if (scored.length) {
    if (incomplete.length) result = 'IN_PROGRESS';
    else if (critical > 0) result = 'FAIL_CRITICAL';
    else if (total < 70) result = 'FAIL_NOT_COMPETENT';
    else if (total < 80) result = 'PASS_COMPETENT';
    else if (total < 90) result = 'PASS_QUALIFIED';
    else result = 'PASS_PROMOTION_CANDIDATE';
    gate = String(result).indexOf('PASS_') === 0 ? 'REVIEW_PREREQUISITE_AND_APPROVAL' : (String(result).indexOf('FAIL_') === 0 ? 'NOT_READY' : 'WAIT_ASSESSMENT');
  }
  return {summary: {
    assessment_id: assessmentId,
    staff_id: rows[0].staff_id,
    name: rows[0].name,
    certification_code: rows[0].certification_code,
    total_weighted_score: total,
    critical_failure_count: critical,
    below_standard_items: below,
    result,
    reviewer: '', reviewed_at: '', promotion_gate: gate,
    notes: incomplete.length ? ('Incomplete items: ' + incomplete.length) : ''
  }};
}

function assessmentRecommendation_(staff, summary) {
  const code = String(summary.certification_code || '').toUpperCase();
  if (String(summary.result).indexOf('PASS_') === 0) {
    const current = code.indexOf('PT') === 0 ? String(staff.pt_effective_grade || staff.pt_grade_candidate || '') : String(staff.effective_level || staff.current_level || '');
    return current === code
      ? {type:'CONFIRM_CURRENT', message:'Audit membuktikan level/grade efektif saat ini: ' + code}
      : {type:'RELEVEL_AVAILABLE', target:code, message:'Certification PASS. Level/grade ' + code + ' dapat diajukan sebagai effective setelah approval.'};
  }
  const lower = lowerCode_(code);
  return lower
    ? {type:'AUDIT_LOWER', target:lower, message:'Belum membuktikan ' + code + '. Audit ' + lower + ' untuk menentukan baseline yang benar.'}
    : {type:'RETRAIN', message:'Belum lulus baseline. Training ulang lalu assessment kembali.'};
}

function lowerCode_(code) {
  const seqs = Object.values(NF3C.ROLE_SEQUENCES);
  for (const seq of seqs) {
    const i = seq.indexOf(code);
    if (i > 0) return seq[i-1];
  }
  return '';
}

function hasPassedCertification_(staffId, code) {
  return readObjects_(NF3C.SHEETS.CERT, 1).some(r =>
    String(r.staff_id) === String(staffId) &&
    String(r.certification_code).toUpperCase() === String(code).toUpperCase() &&
    String(r.result).toUpperCase().indexOf('PASS') === 0 &&
    String(r.status || 'ACTIVE').toUpperCase() !== 'REVOKED'
  );
}

function appendCertificationIfMissing_(summary, payload) {
  const existing = readObjects_(NF3C.SHEETS.CERT, 1).some(r => String(r.notes || '').indexOf('assessment_id=' + summary.assessment_id) >= 0);
  if (existing) return;
  const id = 'CERT-' + Utilities.formatDate(new Date(), NF3C.TZ, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random()*900+100);
  sheet_(NF3C.SHEETS.CERT).appendRow([
    id, summary.staff_id, summary.name, summary.certification_code,
    Utilities.formatDate(new Date(), NF3C.TZ, 'yyyy-MM-dd'), summary.total_weighted_score,
    summary.critical_failure_count > 0 ? 'YES' : 'NO', summary.result,
    payload.assessor || actor_(), payload.evidenceLink || '', payload.approvedBy || '', payload.approvedBy ? Utilities.formatDate(new Date(), NF3C.TZ, 'yyyy-MM-dd') : '',
    'ACTIVE', 'assessment_id=' + summary.assessment_id
  ]);
}

function applyCertifiedMarker_(staff, code, assessmentId) {
  const sh = sheet_(NF3C.SHEETS.STAFF);
  const table = readTable_(sh, 1);
  const row = table.rows.find(r => String(r.obj.staff_id) === String(staff.staff_id));
  if (!row) return;
  if (String(code).indexOf('PT') === 0) {
    writeByHeader_(sh, table.headers, row.rowNumber, 'pt_certified_grade', code);
    writeByHeader_(sh, table.headers, row.rowNumber, 'pt_grade_status', 'CERTIFIED_PENDING_EFFECTIVE_APPROVAL');
  } else {
    writeByHeader_(sh, table.headers, row.rowNumber, 'certified_level', code);
    writeByHeader_(sh, table.headers, row.rowNumber, 'certification_status', 'CERTIFIED_' + code);
    writeByHeader_(sh, table.headers, row.rowNumber, 'level_status', 'CERTIFIED_PENDING_EFFECTIVE_APPROVAL');
  }
  writeByHeader_(sh, table.headers, row.rowNumber, 'updated_at', isoNow_());
  appendAudit_('CERTIFICATION_MARKER', staff.staff_id, assessmentId, {}, {code:code}, '', 'WEB_APP', 'OK', '');
}

function applyRoleLevel_(staffId, target, approvedBy, reason, assessmentId, mode) {
  const sh = sheet_(NF3C.SHEETS.STAFF);
  const table = readTable_(sh, 1);
  const row = table.rows.find(r => String(r.obj.staff_id) === String(staffId));
  if (!row) throw new Error('Staff tidak ditemukan.');
  const before = row.obj;
  const level = readObjects_(NF3C.SHEETS.LEVELS, 1).find(r => String(r.level_code).toUpperCase() === target);
  if (!level && target !== 'REVIEW') throw new Error('Level target tidak ada di LEVEL_MASTER: ' + target);
  writeByHeader_(sh, table.headers, row.rowNumber, 'current_level', target);
  writeByHeader_(sh, table.headers, row.rowNumber, 'effective_level', target);
  writeByHeader_(sh, table.headers, row.rowNumber, 'current_level_meaning', level ? level.meaning_for_staff : 'Perlu review mapping');
  writeByHeader_(sh, table.headers, row.rowNumber, 'level_status', mode === 'CERTIFICATION' ? 'CERTIFIED_EFFECTIVE' : 'MAPPING_CORRECTED_PENDING_AUDIT');
  writeByHeader_(sh, table.headers, row.rowNumber, 'next_challenge', level ? level.next_level : 'Baseline assessment');
  writeByHeader_(sh, table.headers, row.rowNumber, 'last_level_change', isoNow_() + ' — ' + reason);
  writeByHeader_(sh, table.headers, row.rowNumber, 'updated_at', isoNow_());
  appendLevelHistory_(staffId, before.name, mode === 'CERTIFICATION' ? 'RELEVEL_AFTER_CERTIFICATION' : 'MAPPING_CORRECTION', before.effective_level || before.current_level, target, before.pt_effective_grade || '', before.pt_effective_grade || '', assessmentId, reason, approvedBy, 'WEB_APP');
}

function applyPtGrade_(staffId, target, approvedBy, reason, assessmentId, mode) {
  const sh = sheet_(NF3C.SHEETS.STAFF);
  const table = readTable_(sh, 1);
  const row = table.rows.find(r => String(r.obj.staff_id) === String(staffId));
  if (!row) throw new Error('Staff tidak ditemukan.');
  const before = row.obj;
  const pt = readObjects_(NF3C.SHEETS.PT, 1).find(r => String(r.pt_grade).toUpperCase() === target);
  if (!pt) throw new Error('PT grade target tidak ada: ' + target);
  writeByHeader_(sh, table.headers, row.rowNumber, 'pt_grade_candidate', target);
  writeByHeader_(sh, table.headers, row.rowNumber, 'pt_effective_grade', target);
  writeByHeader_(sh, table.headers, row.rowNumber, 'pt_grade_status', mode === 'CERTIFICATION' ? 'CERTIFIED_EFFECTIVE' : 'MAPPING_CORRECTED_PENDING_AUDIT');
  writeByHeader_(sh, table.headers, row.rowNumber, 'pt_next_grade', pt.next_grade || '');
  writeByHeader_(sh, table.headers, row.rowNumber, 'updated_at', isoNow_());
  appendLevelHistory_(staffId, before.name, mode === 'CERTIFICATION' ? 'PT_REGRADE_AFTER_CERTIFICATION' : 'PT_MAPPING_CORRECTION', before.effective_level || before.current_level, before.effective_level || before.current_level, before.pt_effective_grade || before.pt_grade_candidate || '', target, assessmentId, reason, approvedBy, 'WEB_APP');
}

function upsertSummary_(obj) {
  const sh = sheet_(NF3C.SHEETS.SUMMARY);
  const table = readTable_(sh, 1);
  const found = table.rows.find(r => String(r.obj.assessment_id) === String(obj.assessment_id));
  const values = table.headers.map(h => obj[h] == null ? '' : obj[h]);
  if (found) sh.getRange(found.rowNumber, 1, 1, table.headers.length).setValues([values]);
  else sh.appendRow(values);
}

function appendLevelHistory_(staffId, name, changeType, fromLevel, toLevel, fromPt, toPt, assessmentId, reason, approvedBy, source) {
  sheet_(NF3C.SHEETS.HISTORY).appendRow([
    'CHG-' + Utilities.getUuid().slice(0,8), isoNow_(), staffId, name || '', changeType,
    fromLevel || '', toLevel || '', fromPt || '', toPt || '', assessmentId || '', reason || '', approvedBy || '',
    Utilities.formatDate(new Date(), NF3C.TZ, 'yyyy-MM-dd'), source || 'WEB_APP', 'APPLIED', ''
  ]);
}

function appendAudit_(action, staffId, assessmentId, before, after, reason, source, status, notes) {
  sheet_(NF3C.SHEETS.AUDIT).appendRow([
    'EVT-' + Utilities.getUuid().slice(0,8), isoNow_(), actor_(), action, staffId || '', assessmentId || '',
    JSON.stringify(before || {}), JSON.stringify(after || {}), reason || '', source || 'WEB_APP', status || 'OK', notes || ''
  ]);
}

function findStaff_(staffId) {
  return readObjects_(NF3C.SHEETS.STAFF, 1).find(r => String(r.staff_id) === String(staffId));
}

function readObjects_(sheetName, headerRow) {
  const sh = sheet_(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < headerRow || lastCol < 1) return [];
  const values = sh.getRange(headerRow, 1, lastRow - headerRow + 1, lastCol).getValues();
  const headers = values.shift().map(v => String(v).trim());
  return values.map((row, i) => {
    const obj = {__row: headerRow + 1 + i};
    headers.forEach((h, c) => { if (h) obj[h] = row[c]; });
    return obj;
  });
}

function readTable_(sh, headerRow) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(v => String(v).trim());
  const rows = lastRow > headerRow ? sh.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues().map((vals,i) => {
    const obj = {};
    headers.forEach((h,c) => { if (h) obj[h] = vals[c]; });
    return {rowNumber: headerRow + 1 + i, values: vals, obj};
  }) : [];
  return {headers, rows};
}

function writeByHeader_(sh, headers, rowNumber, header, value) {
  const col = headers.indexOf(header);
  if (col < 0) throw new Error('Kolom tidak ditemukan: ' + header);
  sh.getRange(rowNumber, col + 1).setValue(value == null ? '' : value);
}

function sheet_(name) {
  const sh = SpreadsheetApp.openById(NF3C.SPREADSHEET_ID).getSheetByName(name);
  if (!sh) throw new Error('Sheet tidak ditemukan: ' + name);
  return sh;
}

function actor_() {
  try { return Session.getActiveUser().getEmail() || 'WEB_APP_USER'; }
  catch (e) { return 'WEB_APP_USER'; }
}
function isoNow_() { return Utilities.formatDate(new Date(), NF3C.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function num_(v) { const n = Number(String(v == null ? '' : v).replace(',','.')); return isFinite(n) ? n : 0; }
function round2_(v) { return Math.round((Number(v) + Number.EPSILON) * 100) / 100; }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1'; }
function required_(v, name) { const s = String(v == null ? '' : v).trim(); if (!s) throw new Error(name + ' wajib diisi.'); return s; }
