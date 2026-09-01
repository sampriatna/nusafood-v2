-- Multi-job staff profile + dated duty assignment.
-- Additive only: no existing staff/task/report data is changed.

CREATE TABLE IF NOT EXISTS "staff_job_profiles" (
  "staff_id" VARCHAR(50) PRIMARY KEY REFERENCES "staff"("staff_id") ON DELETE CASCADE,
  "secondary_positions" TEXT NOT NULL DEFAULT '[]',
  "updated_by" VARCHAR(200),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "staff_daily_duties" (
  "id" BIGSERIAL PRIMARY KEY,
  "staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE CASCADE,
  "duty_date" DATE NOT NULL,
  "active_positions" TEXT NOT NULL DEFAULT '[]',
  "updated_by" VARCHAR(200),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "staff_daily_duties_staff_date_key" UNIQUE ("staff_id", "duty_date")
);

CREATE INDEX IF NOT EXISTS "idx_staff_daily_duties_date"
  ON "staff_daily_duties"("duty_date");
