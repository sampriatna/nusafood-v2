/**
 * One-time / batch migration from Google Sheets (v1) → PostgreSQL (v2).
 * See docs/V2_DATABASE_SCHEMA.md and docs/V2_MIGRATION_STRATEGY.md (Fase 1).
 *
 * Usage (after env + DB ready):
 *   pnpm migrate:from-sheets
 */

async function main() {
  console.log(
    "[migrate-from-sheets] Stub — implement upsert dari export Sheets di Sprint 2.",
  );
  console.log(
    "Expected env: DATABASE_URL, and a Sheets export path or GAS read access.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
