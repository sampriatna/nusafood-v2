-- RBAC: Owner flag + Admin SP approve permission (tanpa enum OWNER)
ALTER TABLE "user_accounts" ADD COLUMN IF NOT EXISTS "is_owner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_accounts" ADD COLUMN IF NOT EXISTS "can_approve_sp" BOOLEAN NOT NULL DEFAULT false;
