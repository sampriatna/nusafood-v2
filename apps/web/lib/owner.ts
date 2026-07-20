/** OWNER tanpa migrasi enum StaffRole. */

function parseCsvEnv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Owner ditentukan dari (OR):
 * - login break-glass `env-admin` (username kosong + ADMIN_PASSWORD)
 * - UserAccount.is_owner = true (DB)
 * - OWNER_USER_IDS (comma-separated user_id)
 * - OWNER_USERNAMES (comma-separated username)
 */
export function resolveIsOwner(input: {
  userId: string;
  username?: string | null;
  isOwnerDb?: boolean | null;
}): boolean {
  if (input.userId === "env-admin") return true;
  if (input.isOwnerDb === true) return true;

  const ownerIds = parseCsvEnv(process.env.OWNER_USER_IDS);
  if (ownerIds.includes(input.userId.toLowerCase())) return true;

  const ownerNames = parseCsvEnv(process.env.OWNER_USERNAMES);
  const username = input.username?.trim().toLowerCase();
  if (username && ownerNames.includes(username)) return true;

  return false;
}
