#!/usr/bin/env bash
# Rollback drill — latihan Level 1/2 sebelum cutover.
# Lihat docs/V2_ROLLBACK_PLAN.md dan docs/SPRINT7_CUTOVER.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

V2_BASE="${CUTOVER_BASE_URL:-${NEXT_PUBLIC_APP_URL:-http://localhost:3002}}"
V1_BASE="${V1_APP_URL:-}"
GAS_URL="${GAS_WEB_APP_URL:-}"

echo "=== Rollback Drill ==="
echo "v2 base: $V2_BASE"
echo "v1 base: ${V1_BASE:-"(unset)"}"
echo

pass=0
fail=0

check() {
  local label="$1"
  local code="$2"
  local expect="$3"
  if [[ "$code" == "$expect" || "$code" =~ ^($expect)$ ]]; then
    echo "✅ $label → HTTP $code"
    pass=$((pass + 1))
  else
    echo "❌ $label → HTTP $code (expected $expect)"
    fail=$((fail + 1))
  fi
}

echo "1) v2 health"
V2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$V2_BASE/api/health" 2>/dev/null || echo "000")
check "v2 /api/health" "$V2_STATUS" "200"

echo "2) v1 health (rollback target)"
if [[ -n "$V1_BASE" ]]; then
  V1_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$V1_BASE/api/health" 2>/dev/null || echo "000")
  # v1 mungkin tidak punya /api/health — terima 200/404 sebagai "reachable"
  if [[ "$V1_STATUS" == "200" || "$V1_STATUS" == "404" || "$V1_STATUS" == "307" || "$V1_STATUS" == "308" ]]; then
    echo "✅ v1 reachable → HTTP $V1_STATUS"
    pass=$((pass + 1))
  else
    echo "❌ v1 not healthy → HTTP $V1_STATUS"
    fail=$((fail + 1))
  fi

  REPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$V1_BASE/report/TEST-TASK?token=test" 2>/dev/null || echo "000")
  if [[ "$REPORT_STATUS" == "200" || "$REPORT_STATUS" == "404" || "$REPORT_STATUS" == "400" ]]; then
    echo "✅ v1 /report page responds → HTTP $REPORT_STATUS"
    pass=$((pass + 1))
  else
    echo "❌ v1 /report page → HTTP $REPORT_STATUS"
    fail=$((fail + 1))
  fi
else
  echo "⚠️  V1_APP_URL unset — skip v1 checks (wajib diisi sebelum cutover)"
  fail=$((fail + 1))
fi

echo "3) GAS health (optional)"
if [[ -n "$GAS_URL" && "$GAS_URL" != *"..."* ]]; then
  GAS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GAS_URL?action=healthCheck" 2>/dev/null || echo "000")
  if [[ "$GAS_STATUS" == "200" || "$GAS_STATUS" == "302" || "$GAS_STATUS" == "405" ]]; then
    echo "✅ GAS responds → HTTP $GAS_STATUS"
    pass=$((pass + 1))
  else
    echo "⚠️  GAS status HTTP $GAS_STATUS (boleh degraded di staging)"
  fi
else
  echo "ℹ️  GAS_WEB_APP_URL unset — skip"
fi

echo "4) Emergency fallback env presence"
if [[ "${EMERGENCY_FALLBACK_V1:-false}" == "true" ]]; then
  echo "⚠️  EMERGENCY_FALLBACK_V1=true — mode darurat sedang AKTIF"
else
  echo "✅ EMERGENCY_FALLBACK_V1 off (normal ops)"
  pass=$((pass + 1))
fi

if [[ -n "${V1_APP_URL:-}" ]]; then
  echo "✅ V1_APP_URL configured"
  pass=$((pass + 1))
else
  echo "❌ V1_APP_URL missing"
  fail=$((fail + 1))
fi

echo
echo "=== Drill summary: $pass passed, $fail failed ==="
if [[ "$fail" -gt 0 ]]; then
  echo "❌ WARNING: rollback target / config belum siap — fix sebelum cutover!"
  exit 1
fi
echo "✅ Rollback target (v1) + env cutover terlihat siap"
exit 0
