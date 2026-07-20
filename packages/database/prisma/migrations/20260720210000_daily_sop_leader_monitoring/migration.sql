-- CreateEnum
CREATE TYPE "ReportConditionStatus" AS ENUM (
  'aman',
  'kendala_ringan',
  'follow_up_leader',
  'perlu_belanja'
);

-- CreateEnum
CREATE TYPE "StaffReportValidationStatus" AS ENUM (
  'valid',
  'revisi',
  'tidak_valid',
  'manipulasi'
);

-- CreateEnum
CREATE TYPE "ReportTemplateKind" AS ENUM (
  'daily_required',
  'special_task',
  'issue_quick'
);

-- CreateEnum
CREATE TYPE "LeaderMonitorKind" AS ENUM (
  'opening_control',
  'jam_ramai_control',
  'spot_check_area',
  'closing_control',
  'issue_log'
);

-- CreateEnum
CREATE TYPE "LeaderMonitorStatus" AS ENUM (
  'aman',
  'ada_catatan',
  'tidak_sesuai'
);

-- CreateEnum
CREATE TYPE "LeaderFollowUpStatus" AS ENUM (
  'open',
  'on_progress',
  'selesai'
);

-- CreateEnum
CREATE TYPE "LeaderPhotoMode" AS ENUM (
  'required',
  'optional',
  'required_if_issue'
);

-- CreateTable
CREATE TABLE "daily_report_templates" (
  "id" VARCHAR(50) NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "outlet_code" VARCHAR(50),
  "position_group" VARCHAR(50),
  "standard_result" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "requires_photo" BOOLEAN NOT NULL DEFAULT false,
  "is_required_daily" BOOLEAN NOT NULL DEFAULT true,
  "kind" "ReportTemplateKind" NOT NULL DEFAULT 'daily_required',
  "target_time_start" VARCHAR(10),
  "target_time_end" VARCHAR(10),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "daily_report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_template_items" (
  "id" VARCHAR(50) NOT NULL,
  "template_id" VARCHAR(50) NOT NULL,
  "item_text" TEXT NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_report_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_report_links" (
  "id" VARCHAR(50) NOT NULL,
  "staff_id" VARCHAR(50) NOT NULL,
  "token" VARCHAR(64) NOT NULL,
  "short_code" VARCHAR(50) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  CONSTRAINT "staff_report_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_submissions" (
  "id" VARCHAR(50) NOT NULL,
  "staff_id" VARCHAR(50) NOT NULL,
  "outlet_code" VARCHAR(50) NOT NULL,
  "template_id" VARCHAR(50) NOT NULL,
  "report_date" DATE NOT NULL,
  "status_condition" "ReportConditionStatus" NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "photo_url" TEXT,
  "submitted_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "checklist_answers" JSONB NOT NULL DEFAULT '[]',
  "leader_validation" "StaffReportValidationStatus",
  "leader_validation_note" TEXT,
  "leader_validated_at" TIMESTAMPTZ(6),
  "leader_validated_by" VARCHAR(50),
  "leader_validated_by_name" VARCHAR(200),
  "leader_validation_photo_url" TEXT,
  CONSTRAINT "daily_report_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leader_monitor_templates" (
  "id" VARCHAR(50) NOT NULL,
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
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "leader_monitor_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leader_monitor_submissions" (
  "id" VARCHAR(50) NOT NULL,
  "template_id" VARCHAR(50) NOT NULL,
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
  "staff_submission_id" VARCHAR(50),
  "staff_validation" "StaffReportValidationStatus",
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "leader_monitor_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_daily_report_template_items_template" ON "daily_report_template_items"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_report_links_token_key" ON "staff_report_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "staff_report_links_short_code_key" ON "staff_report_links"("short_code");

-- CreateIndex
CREATE INDEX "idx_staff_report_links_staff" ON "staff_report_links"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_report_submissions_staff_template_date_key" ON "daily_report_submissions"("staff_id", "template_id", "report_date");

-- CreateIndex
CREATE INDEX "idx_daily_report_submissions_date_outlet" ON "daily_report_submissions"("report_date", "outlet_code");

-- CreateIndex
CREATE INDEX "idx_leader_monitor_submissions_date_outlet" ON "leader_monitor_submissions"("report_date", "outlet_code");

-- AddForeignKey
ALTER TABLE "daily_report_template_items" ADD CONSTRAINT "daily_report_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "daily_report_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_submissions" ADD CONSTRAINT "daily_report_submissions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "daily_report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
