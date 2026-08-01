-- MANUAL ROLLBACK for migration 20260728180000_hris_integration
-- Prisma migrate does NOT auto-run this file. Review and execute manually on staging first.
--
-- CONSEQUENCES:
-- 1. All hris_* columns on staff/outlets will be dropped — HRIS link data is lost.
-- 2. hris_sync_logs audit history will be deleted.
-- 3. wa_needs_completion flag removed — staff with placeholder WA numbers remain unchanged in wa_number.
-- 4. PostgreSQL ENUM types HrisLinkStatus and HrisSyncRunStatus are dropped — cannot drop if other objects reference them.
-- 5. Tasks and historical assignments are NOT deleted; they may reference staff_id without hris_staff_id.
-- 6. Run during maintenance window; take a backup before executing.

BEGIN;

DROP TABLE IF EXISTS "hris_sync_locks";
DROP TABLE IF EXISTS "hris_sync_logs";

DROP INDEX IF EXISTS "idx_staff_hris_link_status";
DROP INDEX IF EXISTS "idx_staff_hris_employee_code";
DROP INDEX IF EXISTS "staff_hris_staff_id_key";

ALTER TABLE "staff" DROP COLUMN IF EXISTS "wa_needs_completion";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_synced_at";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_link_status";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_position_name";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_position_code";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_division_name";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_division_code";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_outlet_code";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_employee_code";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "hris_staff_id";

DROP INDEX IF EXISTS "outlets_hris_outlet_code_key";
ALTER TABLE "outlets" DROP COLUMN IF EXISTS "hris_outlet_code";

DROP TYPE IF EXISTS "HrisSyncRunStatus";
DROP TYPE IF EXISTS "HrisLinkStatus";

COMMIT;
