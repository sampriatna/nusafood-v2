-- Project: publish gate, audit trail, blocker PIC, snapshot submission.
-- Additive & idempotent. Tidak menyentuh tabel lain.

ALTER TABLE "prj_projects" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ;
ALTER TABLE "prj_projects" ADD COLUMN IF NOT EXISTS "health_override" VARCHAR(30);
ALTER TABLE "prj_milestone_reviews" ADD COLUMN IF NOT EXISTS "snapshot" JSONB;

-- Project yang sudah punya link PIC aktif dianggap sudah dipublish (tidak memutus link yang sedang dipakai).
UPDATE "prj_projects" p SET "published_at" = NOW()
WHERE "published_at" IS NULL
  AND EXISTS (SELECT 1 FROM "prj_pic_links" l WHERE l."project_id" = p."id" AND l."is_active");

CREATE TABLE IF NOT EXISTS "prj_activity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "prj_projects"("id") ON DELETE CASCADE,
  "workstream_id" UUID,
  "milestone_id" UUID,
  "action" VARCHAR(60) NOT NULL,
  "actor_type" VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
  "actor_id" VARCHAR(100),
  "actor_name" VARCHAR(200),
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_prj_activity_project" ON "prj_activity"("project_id","created_at" DESC);

CREATE TABLE IF NOT EXISTS "prj_blockers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "prj_projects"("id") ON DELETE CASCADE,
  "workstream_id" UUID,
  "milestone_id" UUID,
  "reported_by_staff_id" VARCHAR(50),
  "reported_by_name" VARCHAR(200) NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolved_at" TIMESTAMPTZ,
  "resolved_by_name" VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS "idx_prj_blockers_project" ON "prj_blockers"("project_id","resolved_at");

ALTER TABLE "prj_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prj_blockers" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "prj_activity" FROM anon;
    REVOKE ALL ON TABLE "prj_blockers" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "prj_activity" FROM authenticated;
    REVOKE ALL ON TABLE "prj_blockers" FROM authenticated;
  END IF;
END $$;
