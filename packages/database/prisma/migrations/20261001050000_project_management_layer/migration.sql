-- Project Management layer (additive; does not alter existing task workflow)

CREATE TABLE IF NOT EXISTS "prj_projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_key" VARCHAR(80) NOT NULL UNIQUE,
  "name" VARCHAR(200) NOT NULL,
  "goal" TEXT,
  "lead_staff_id" VARCHAR(50) REFERENCES "staff"("staff_id") ON DELETE SET NULL,
  "lead_name" VARCHAR(200),
  "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK ("status" IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  "health" VARCHAR(30) NOT NULL DEFAULT 'ON_TRACK'
    CHECK ("health" IN ('ON_TRACK','NEED_ATTENTION','BLOCKED','COMPLETED')),
  "start_date" DATE,
  "deadline" DATE,
  "next_action" TEXT,
  "blocker" TEXT,
  "created_by" VARCHAR(200),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "prj_workstreams" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "prj_projects"("id") ON DELETE CASCADE,
  "name" VARCHAR(200) NOT NULL,
  "owner_staff_id" VARCHAR(50) REFERENCES "staff"("staff_id") ON DELETE SET NULL,
  "owner_name" VARCHAR(200),
  "weight" INTEGER NOT NULL DEFAULT 1 CHECK ("weight" > 0 AND "weight" <= 100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK ("status" IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  "health" VARCHAR(30) NOT NULL DEFAULT 'ON_TRACK'
    CHECK ("health" IN ('ON_TRACK','NEED_ATTENTION','BLOCKED','COMPLETED')),
  "next_action" TEXT,
  "blocker" TEXT,
  "deadline" DATE,
  "sort_order" INTEGER NOT NULL DEFAULT 10,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("project_id","name")
);

CREATE TABLE IF NOT EXISTS "prj_milestones" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workstream_id" UUID NOT NULL REFERENCES "prj_workstreams"("id") ON DELETE CASCADE,
  "title" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "weight" INTEGER NOT NULL DEFAULT 1 CHECK ("weight" > 0 AND "weight" <= 100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED'
    CHECK ("status" IN ('NOT_STARTED','IN_PROGRESS','DONE','BLOCKED')),
  "deadline" DATE,
  "evidence_url" TEXT,
  "completed_at" TIMESTAMPTZ,
  "sort_order" INTEGER NOT NULL DEFAULT 10,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "prj_project_members" (
  "project_id" UUID NOT NULL REFERENCES "prj_projects"("id") ON DELETE CASCADE,
  "staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE CASCADE,
  "role" VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("project_id","staff_id")
);

CREATE TABLE IF NOT EXISTS "prj_task_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "prj_projects"("id") ON DELETE CASCADE,
  "workstream_id" UUID REFERENCES "prj_workstreams"("id") ON DELETE CASCADE,
  "milestone_id" UUID REFERENCES "prj_milestones"("id") ON DELETE CASCADE,
  "task_id" VARCHAR(50) NOT NULL REFERENCES "tasks"("task_id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("project_id","task_id")
);

CREATE INDEX IF NOT EXISTS "idx_prj_projects_status" ON "prj_projects"("status");
CREATE INDEX IF NOT EXISTS "idx_prj_projects_lead" ON "prj_projects"("lead_staff_id");
CREATE INDEX IF NOT EXISTS "idx_prj_workstreams_project" ON "prj_workstreams"("project_id","sort_order");
CREATE INDEX IF NOT EXISTS "idx_prj_workstreams_owner" ON "prj_workstreams"("owner_staff_id");
CREATE INDEX IF NOT EXISTS "idx_prj_milestones_workstream" ON "prj_milestones"("workstream_id","sort_order");
CREATE INDEX IF NOT EXISTS "idx_prj_task_links_project" ON "prj_task_links"("project_id");
CREATE INDEX IF NOT EXISTS "idx_prj_task_links_task" ON "prj_task_links"("task_id");

ALTER TABLE "prj_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_workstreams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_milestones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_project_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_task_links" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "prj_projects" FROM anon, authenticated;
REVOKE ALL ON TABLE "prj_workstreams" FROM anon, authenticated;
REVOKE ALL ON TABLE "prj_milestones" FROM anon, authenticated;
REVOKE ALL ON TABLE "prj_project_members" FROM anon, authenticated;
REVOKE ALL ON TABLE "prj_task_links" FROM anon, authenticated;

GRANT ALL ON TABLE "prj_projects" TO service_role;
GRANT ALL ON TABLE "prj_workstreams" TO service_role;
GRANT ALL ON TABLE "prj_milestones" TO service_role;
GRANT ALL ON TABLE "prj_project_members" TO service_role;
GRANT ALL ON TABLE "prj_task_links" TO service_role;
