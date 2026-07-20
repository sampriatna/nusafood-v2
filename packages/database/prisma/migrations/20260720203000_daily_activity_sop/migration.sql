-- Daily Activity SOP (staff static report link)

CREATE TYPE "ReportTemplateKind" AS ENUM ('daily_required', 'special_task', 'issue_quick');
CREATE TYPE "ReportConditionStatus" AS ENUM ('aman', 'kendala_ringan', 'follow_up_leader', 'perlu_belanja');

CREATE TABLE "staff_report_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" VARCHAR(50) NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "short_code" VARCHAR(48) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "staff_report_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_report_links_token_key" ON "staff_report_links"("token");
CREATE UNIQUE INDEX "staff_report_links_short_code_key" ON "staff_report_links"("short_code");
CREATE INDEX "idx_staff_report_links_staff" ON "staff_report_links"("staff_id");
CREATE INDEX "idx_staff_report_links_active" ON "staff_report_links"("is_active");

ALTER TABLE "staff_report_links"
  ADD CONSTRAINT "staff_report_links_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "report_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'General',
    "outlet_id" UUID,
    "position_group" VARCHAR(100),
    "standard_result" TEXT NOT NULL,
    "description" TEXT,
    "requires_photo" BOOLEAN NOT NULL DEFAULT false,
    "is_required_daily" BOOLEAN NOT NULL DEFAULT false,
    "kind" "ReportTemplateKind" NOT NULL DEFAULT 'daily_required',
    "target_time_start" TIME(6),
    "target_time_end" TIME(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_templates_code_key" ON "report_templates"("code");
CREATE INDEX "idx_report_templates_active" ON "report_templates"("active", "sort_order");

ALTER TABLE "report_templates"
  ADD CONSTRAINT "report_templates_outlet_id_fkey"
  FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "report_template_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_template_id" UUID NOT NULL,
    "item_text" VARCHAR(500) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_template_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_rtci_template" ON "report_template_checklist_items"("report_template_id", "sort_order");

ALTER TABLE "report_template_checklist_items"
  ADD CONSTRAINT "report_template_checklist_items_report_template_id_fkey"
  FOREIGN KEY ("report_template_id") REFERENCES "report_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "daily_report_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" VARCHAR(50) NOT NULL,
    "outlet_id" UUID NOT NULL,
    "report_template_id" UUID NOT NULL,
    "report_date" DATE NOT NULL,
    "status_condition" "ReportConditionStatus" NOT NULL,
    "note" TEXT,
    "photo_url" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_report_submissions_staff_id_report_template_id_report_date_key"
  ON "daily_report_submissions"("staff_id", "report_template_id", "report_date");
CREATE INDEX "idx_daily_report_submissions_date" ON "daily_report_submissions"("report_date");

ALTER TABLE "daily_report_submissions"
  ADD CONSTRAINT "daily_report_submissions_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_report_submissions"
  ADD CONSTRAINT "daily_report_submissions_outlet_id_fkey"
  FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_report_submissions"
  ADD CONSTRAINT "daily_report_submissions_report_template_id_fkey"
  FOREIGN KEY ("report_template_id") REFERENCES "report_templates"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "daily_report_checklist_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "checklist_item_id" UUID NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_checklist_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_report_checklist_answers_submission_id_checklist_item_id_key"
  ON "daily_report_checklist_answers"("submission_id", "checklist_item_id");

ALTER TABLE "daily_report_checklist_answers"
  ADD CONSTRAINT "daily_report_checklist_answers_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "daily_report_submissions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_report_checklist_answers"
  ADD CONSTRAINT "daily_report_checklist_answers_checklist_item_id_fkey"
  FOREIGN KEY ("checklist_item_id") REFERENCES "report_template_checklist_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
