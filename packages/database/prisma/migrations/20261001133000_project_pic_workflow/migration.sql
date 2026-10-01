-- Project PIC workflow: personal links, step-by-step checklist, submit/review cycle.

ALTER TABLE "prj_milestones"
  DROP CONSTRAINT IF EXISTS "prj_milestones_status_check";

ALTER TABLE "prj_milestones"
  ADD CONSTRAINT "prj_milestones_status_check"
  CHECK ("status" IN (
    'NOT_STARTED',
    'IN_PROGRESS',
    'WAITING_VALIDATION',
    'REVISION',
    'DONE',
    'BLOCKED'
  ));

CREATE TABLE IF NOT EXISTS "prj_pic_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "prj_projects"("id") ON DELETE CASCADE,
  "staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE CASCADE,
  "token" VARCHAR(128) NOT NULL UNIQUE,
  "short_code" VARCHAR(64) NOT NULL UNIQUE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revoked_at" TIMESTAMPTZ,
  UNIQUE ("project_id", "staff_id")
);

CREATE TABLE IF NOT EXISTS "prj_milestone_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "milestone_id" UUID NOT NULL REFERENCES "prj_milestones"("id") ON DELETE CASCADE,
  "item_text" VARCHAR(500) NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT TRUE,
  "requires_evidence" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_checked" BOOLEAN NOT NULL DEFAULT FALSE,
  "note" TEXT,
  "evidence_url" TEXT,
  "completed_by_staff_id" VARCHAR(50) REFERENCES "staff"("staff_id") ON DELETE SET NULL,
  "completed_at" TIMESTAMPTZ,
  "sort_order" INTEGER NOT NULL DEFAULT 10,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "prj_milestone_reviews" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "milestone_id" UUID NOT NULL REFERENCES "prj_milestones"("id") ON DELETE CASCADE,
  "submitted_by_staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE RESTRICT,
  "submitted_by_name" VARCHAR(200) NOT NULL,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK ("status" IN ('PENDING','APPROVED','REVISION')),
  "reviewed_by" VARCHAR(100),
  "reviewed_by_name" VARCHAR(200),
  "reviewed_at" TIMESTAMPTZ,
  "review_note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_prj_pic_links_project"
  ON "prj_pic_links"("project_id");
CREATE INDEX IF NOT EXISTS "idx_prj_pic_links_staff"
  ON "prj_pic_links"("staff_id");
CREATE INDEX IF NOT EXISTS "idx_prj_milestone_steps_milestone"
  ON "prj_milestone_steps"("milestone_id","sort_order");
CREATE INDEX IF NOT EXISTS "idx_prj_milestone_reviews_milestone"
  ON "prj_milestone_reviews"("milestone_id","submitted_at" DESC);

ALTER TABLE "prj_pic_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_milestone_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_milestone_reviews" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "prj_pic_links" FROM anon, authenticated;
REVOKE ALL ON TABLE "prj_milestone_steps" FROM anon, authenticated;
REVOKE ALL ON TABLE "prj_milestone_reviews" FROM anon, authenticated;

GRANT ALL ON TABLE "prj_pic_links" TO service_role;
GRANT ALL ON TABLE "prj_milestone_steps" TO service_role;
GRANT ALL ON TABLE "prj_milestone_reviews" TO service_role;
