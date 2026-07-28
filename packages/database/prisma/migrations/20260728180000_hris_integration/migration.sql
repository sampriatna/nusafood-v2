-- HRIS integration: staff link fields, outlet mapping, sync audit log
-- Backward-compatible: all new columns nullable; no data deleted.

CREATE TYPE "HrisLinkStatus" AS ENUM ('LINKED', 'UNLINKED', 'AMBIGUOUS', 'MANUAL_REVIEW');
CREATE TYPE "HrisSyncRunStatus" AS ENUM ('success', 'partial', 'failed');

ALTER TABLE "outlets" ADD COLUMN "hris_outlet_code" VARCHAR(50);
CREATE UNIQUE INDEX "outlets_hris_outlet_code_key" ON "outlets"("hris_outlet_code");

ALTER TABLE "staff" ADD COLUMN "hris_staff_id" VARCHAR(50);
ALTER TABLE "staff" ADD COLUMN "hris_employee_code" VARCHAR(50);
ALTER TABLE "staff" ADD COLUMN "hris_outlet_code" VARCHAR(50);
ALTER TABLE "staff" ADD COLUMN "hris_division_code" VARCHAR(50);
ALTER TABLE "staff" ADD COLUMN "hris_division_name" VARCHAR(100);
ALTER TABLE "staff" ADD COLUMN "hris_position_code" VARCHAR(50);
ALTER TABLE "staff" ADD COLUMN "hris_position_name" VARCHAR(100);
ALTER TABLE "staff" ADD COLUMN "hris_link_status" "HrisLinkStatus" NOT NULL DEFAULT 'UNLINKED';
ALTER TABLE "staff" ADD COLUMN "hris_synced_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "staff_hris_staff_id_key" ON "staff"("hris_staff_id");
CREATE INDEX "idx_staff_hris_employee_code" ON "staff"("hris_employee_code");
CREATE INDEX "idx_staff_hris_link_status" ON "staff"("hris_link_status");

CREATE TABLE "hris_sync_logs" (
    "id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "triggered_by" VARCHAR(100),
    "triggered_by_name" VARCHAR(200),
    "status" "HrisSyncRunStatus" NOT NULL,
    "checked_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "deactivated_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hris_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_hris_sync_logs_started" ON "hris_sync_logs"("started_at" DESC);
