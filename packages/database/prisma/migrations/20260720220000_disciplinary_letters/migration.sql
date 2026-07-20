-- Teguran Center / Disciplinary Letters

CREATE TYPE "DisciplinaryLetterType" AS ENUM ('TEGURAN', 'PERINGATAN');
CREATE TYPE "DisciplinaryLetterStatus" AS ENUM (
  'DRAFT',
  'WAITING_APPROVAL',
  'APPROVED',
  'SENT',
  'ACKNOWLEDGED',
  'RESOLVED',
  'CANCELLED'
);
CREATE TYPE "DisciplinarySourceType" AS ENUM (
  'TASK_LATE',
  'TASK_INCOMPLETE',
  'FAKE_REPORT',
  'SOP_VIOLATION',
  'ATTENDANCE',
  'ATTITUDE',
  'OTHER'
);
CREATE TYPE "DisciplinaryEvidenceType" AS ENUM (
  'PHOTO',
  'SCREENSHOT',
  'TASK_REPORT',
  'NOTE',
  'FILE',
  'LINK'
);

CREATE TABLE "disciplinary_letters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "letter_number" VARCHAR(50) NOT NULL,
  "type" "DisciplinaryLetterType" NOT NULL,
  "level" SMALLINT NOT NULL,
  "status" "DisciplinaryLetterStatus" NOT NULL DEFAULT 'DRAFT',
  "employee_id" VARCHAR(50) NOT NULL,
  "employee_name_snapshot" VARCHAR(200) NOT NULL,
  "employee_position_snapshot" VARCHAR(100),
  "outlet_id" UUID,
  "outlet_name_snapshot" VARCHAR(100) NOT NULL,
  "related_task_id" VARCHAR(50),
  "source_type" "DisciplinarySourceType" NOT NULL,
  "incident_date" DATE NOT NULL,
  "created_by" VARCHAR(100) NOT NULL,
  "created_by_name" VARCHAR(200),
  "approved_by" VARCHAR(100),
  "approved_by_name" VARCHAR(200),
  "approved_at" TIMESTAMPTZ(6),
  "sent_at" TIMESTAMPTZ(6),
  "acknowledged_at" TIMESTAMPTZ(6),
  "resolved_at" TIMESTAMPTZ(6),
  "title" VARCHAR(300) NOT NULL,
  "chronology" TEXT NOT NULL,
  "violation_detail" TEXT NOT NULL,
  "operational_impact" TEXT,
  "correction_instruction" TEXT NOT NULL,
  "correction_deadline" DATE,
  "sop_reference" TEXT,
  "consequence" TEXT,
  "internal_note" TEXT,
  "pdf_url" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disciplinary_letters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "disciplinary_letters_letter_number_key" ON "disciplinary_letters"("letter_number");
CREATE INDEX "idx_disciplinary_letters_status" ON "disciplinary_letters"("status");
CREATE INDEX "idx_disciplinary_letters_employee" ON "disciplinary_letters"("employee_id");
CREATE INDEX "idx_disciplinary_letters_type_level" ON "disciplinary_letters"("type", "level");
CREATE INDEX "idx_disciplinary_letters_created" ON "disciplinary_letters"("created_at" DESC);

CREATE TABLE "disciplinary_evidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "disciplinary_letter_id" UUID NOT NULL,
  "evidence_type" "DisciplinaryEvidenceType" NOT NULL,
  "file_url" TEXT,
  "text_note" TEXT,
  "related_task_photo_id" VARCHAR(100),
  "created_by" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disciplinary_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_disciplinary_evidence_letter" ON "disciplinary_evidence"("disciplinary_letter_id");

ALTER TABLE "disciplinary_evidence"
  ADD CONSTRAINT "disciplinary_evidence_disciplinary_letter_id_fkey"
  FOREIGN KEY ("disciplinary_letter_id") REFERENCES "disciplinary_letters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "disciplinary_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "disciplinary_letter_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "actor_id" VARCHAR(100) NOT NULL,
  "actor_name_snapshot" VARCHAR(200) NOT NULL,
  "previous_status" "DisciplinaryLetterStatus",
  "new_status" "DisciplinaryLetterStatus",
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disciplinary_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_disciplinary_events_letter"
  ON "disciplinary_events"("disciplinary_letter_id", "created_at" DESC);

ALTER TABLE "disciplinary_events"
  ADD CONSTRAINT "disciplinary_events_disciplinary_letter_id_fkey"
  FOREIGN KEY ("disciplinary_letter_id") REFERENCES "disciplinary_letters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
