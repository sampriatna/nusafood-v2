-- Leader Monitoring + staff report validation (extends daily_activity_sop migration)

CREATE TYPE "StaffReportValidationStatus" AS ENUM (
  'valid',
  'revisi',
  'tidak_valid',
  'manipulasi'
);

CREATE TYPE "LeaderMonitorKind" AS ENUM (
  'opening_control',
  'jam_ramai_control',
  'spot_check_area',
  'closing_control',
  'issue_log'
);

CREATE TYPE "LeaderMonitorStatus" AS ENUM (
  'aman',
  'ada_catatan',
  'tidak_sesuai'
);

CREATE TYPE "LeaderFollowUpStatus" AS ENUM (
  'open',
  'on_progress',
  'selesai'
);

CREATE TYPE "LeaderPhotoMode" AS ENUM (
  'required',
  'optional',
  'required_if_issue'
);

ALTER TABLE "daily_report_submissions"
  ADD COLUMN "leader_validation" "StaffReportValidationStatus",
  ADD COLUMN "leader_validation_note" TEXT,
  ADD COLUMN "leader_validated_at" TIMESTAMPTZ(6),
  ADD COLUMN "leader_validated_by" VARCHAR(50),
  ADD COLUMN "leader_validated_by_name" VARCHAR(200),
  ADD COLUMN "leader_validation_photo_url" TEXT;

CREATE TABLE "leader_monitor_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "LeaderMonitorKind" NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "menu_label" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "standard_result" TEXT NOT NULL,
  "outlet_code" VARCHAR(50),
  "target_time_start" VARCHAR(10),
  "target_time_end" VARCHAR(10),
  "photo_mode" "LeaderPhotoMode" NOT NULL DEFAULT 'required',
  "checklist" JSONB NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leader_monitor_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_leader_monitor_templates_active"
  ON "leader_monitor_templates"("active", "sort_order");

CREATE TABLE "leader_monitor_submissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL,
  "kind" "LeaderMonitorKind" NOT NULL,
  "report_date" DATE NOT NULL,
  "outlet_code" VARCHAR(50) NOT NULL,
  "shift" VARCHAR(50) NOT NULL,
  "leader_id" VARCHAR(50) NOT NULL,
  "leader_name" VARCHAR(200) NOT NULL,
  "area" VARCHAR(100) NOT NULL,
  "status" "LeaderMonitorStatus" NOT NULL,
  "score_total" INTEGER NOT NULL,
  "score_max" INTEGER NOT NULL,
  "checklist_scores" JSONB NOT NULL DEFAULT '[]',
  "related_staff_ids" JSONB NOT NULL DEFAULT '[]',
  "related_staff_names" TEXT NOT NULL DEFAULT '',
  "problem_note" TEXT NOT NULL DEFAULT '',
  "fix_instruction" TEXT NOT NULL DEFAULT '',
  "fix_deadline" VARCHAR(20),
  "photo_url" TEXT,
  "follow_up_status" "LeaderFollowUpStatus" NOT NULL DEFAULT 'open',
  "staff_submission_id" UUID,
  "staff_validation" "StaffReportValidationStatus",
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leader_monitor_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_leader_monitor_submissions_date_outlet"
  ON "leader_monitor_submissions"("report_date", "outlet_code");

ALTER TABLE "leader_monitor_submissions"
  ADD CONSTRAINT "leader_monitor_submissions_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "leader_monitor_templates"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
