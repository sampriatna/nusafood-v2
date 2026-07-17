/**
 * Hourly sync script: Google Sheets / GAS → PostgreSQL (read-only fase 1–2).
 * See docs/V2_MIGRATION_STRATEGY.md.
 *
 * Usage:
 *   pnpm sync:from-gas
 */

async function main() {
  console.log(
    "[sync-from-gas] Stub — implement cron sync di Sprint 2 (read-only).",
  );
  if (process.env.GAS_WEB_APP_URL) {
    console.log("GAS_WEB_APP_URL is set.");
  } else {
    console.log("GAS_WEB_APP_URL is not set.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
