/**
 * Level-2 rollback helper — redirect staff surfaces ke v1 jika v2 bermasalah.
 * Lihat docs/V2_ROLLBACK_PLAN.md
 */

export function emergencyFallbackEnabled(): boolean {
  return process.env.EMERGENCY_FALLBACK_V1 === "true"
}

export function getV1AppUrl(): string | null {
  const raw = process.env.V1_APP_URL?.trim()
  if (!raw || raw.includes("...")) return null
  return raw.replace(/\/$/, "")
}

/** Path staff yang wajib bisa diarahkan ke v1 saat darurat. */
export function isStaffSurfacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/report/") ||
    pathname.startsWith("/checklist/") ||
    pathname.startsWith("/r/") ||
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/(public|open|submit)/)) ||
    Boolean(
      pathname.match(/^\/api\/checklist-reports\/[^/]+\/(public|submit)/)
    ) ||
    Boolean(pathname.match(/^\/api\/staff-reports\/by-token\//)) ||
    pathname === "/api/staff-reports/submit"
  )
}

/**
 * Bangun URL redirect ke v1, mempertahankan path + query (token).
 * Return null jika env belum siap.
 */
export function buildV1FallbackUrl(
  pathname: string,
  search: string,
  v1Base = getV1AppUrl()
): string | null {
  if (!v1Base) return null
  if (!isStaffSurfacePath(pathname)) return null
  return `${v1Base}${pathname}${search}`
}
