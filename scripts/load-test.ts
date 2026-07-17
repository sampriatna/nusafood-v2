/**
 * Load smoke — concurrent hits ke endpoint kritis.
 * Usage: CUTOVER_BASE_URL=http://localhost:3002 pnpm load:test
 *
 * Bukan pengganti k6/Gatling produksi; cukup untuk baseline staging.
 */
const BASE =
  process.env.CUTOVER_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3002";

const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 20);
const REQUESTS = Number(process.env.LOAD_REQUESTS || 100);

type Sample = { ok: boolean; ms: number; status: number };

async function hit(path: string): Promise<Sample> {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { accept: "application/json" },
    });
    return { ok: res.ok, ms: Date.now() - started, status: res.status };
  } catch {
    return { ok: false, ms: Date.now() - started, status: 0 };
  }
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

async function runPool(path: string, total: number, concurrency: number) {
  const samples: Sample[] = [];
  let next = 0;

  async function worker() {
    while (next < total) {
      const i = next;
      next += 1;
      samples[i] = await hit(path);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );
  return samples;
}

async function main() {
  console.log(
    `Load test ${BASE} — ${REQUESTS} req, concurrency ${CONCURRENCY}`,
  );

  // Warmup
  await hit("/api/health");

  const paths = ["/api/health", "/login"];
  let failedSuites = 0;

  for (const path of paths) {
    const samples = await runPool(path, REQUESTS, CONCURRENCY);
    const times = samples.map((s) => s.ms);
    const okCount = samples.filter((s) => s.ok).length;
    const errRate = ((REQUESTS - okCount) / REQUESTS) * 100;
    const p50 = percentile(times, 50);
    const p95 = percentile(times, 95);
    const p99 = percentile(times, 99);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n${path}`);
    console.log(`  ok=${okCount}/${REQUESTS} error_rate=${errRate.toFixed(2)}%`);
    console.log(
      `  avg=${avg.toFixed(1)}ms p50=${p50}ms p95=${p95}ms p99=${p99}ms`,
    );

    // Target soft: health error < 1%, p95 < 1500ms di staging lokal/shared
    const pass = errRate < 1 && p95 < 1500;
    console.log(pass ? "  ✅ pass" : "  ❌ fail thresholds");
    if (!pass) failedSuites += 1;
  }

  // Auth-gated endpoint harus tetap 401 cepat (tanpa cookie)
  {
    const samples = await runPool("/api/tasks", Math.min(40, REQUESTS), 10);
    const unauthorized = samples.filter((s) => s.status === 401).length;
    const p95 = percentile(
      samples.map((s) => s.ms),
      95,
    );
    console.log(`\n/api/tasks (expect 401)`);
    console.log(`  401=${unauthorized}/${samples.length} p95=${p95}ms`);
    const pass = unauthorized === samples.length && p95 < 1500;
    console.log(pass ? "  ✅ pass" : "  ❌ fail");
    if (!pass) failedSuites += 1;
  }

  console.log("");
  if (failedSuites > 0) {
    console.error(`Load test failed (${failedSuites} suites)`);
    process.exit(1);
  }
  console.log("Load test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
