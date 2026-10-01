-- Anggota pendukung per bagian kerja (bukan accountable). Additive & idempotent.
CREATE TABLE IF NOT EXISTS "prj_workstream_members" (
  "workstream_id" UUID NOT NULL REFERENCES "prj_workstreams"("id") ON DELETE CASCADE,
  "staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("workstream_id", "staff_id")
);
CREATE INDEX IF NOT EXISTS "idx_prj_ws_members_staff" ON "prj_workstream_members"("staff_id");

ALTER TABLE "prj_workstream_members" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "prj_workstream_members" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "prj_workstream_members" FROM authenticated;
  END IF;
END $$;
