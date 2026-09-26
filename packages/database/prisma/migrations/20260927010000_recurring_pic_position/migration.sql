-- PIC tugas berulang berdasarkan posisi (mis. Kasir), dipilih dari jadwal
-- "Posisi Kerja Hari Ini". Additive only.

CREATE TABLE IF NOT EXISTS "recurring_template_pic_rules" (
  "template_id" VARCHAR(50) PRIMARY KEY REFERENCES "recurring_templates"("template_id") ON DELETE CASCADE,
  "pic_position" VARCHAR(100) NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
