/**
 * GAS adapter — fallback ke v1 selama fase migrasi (1–3).
 * Implementasi penuh di Sprint 2–3.
 */

export type GasHealth = "ok" | "degraded" | "down" | "disabled";

export async function checkGasFallback(): Promise<GasHealth> {
  if (process.env.GAS_FALLBACK_ENABLED !== "true") {
    return "disabled";
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  if (!gasUrl || gasUrl.includes("...")) {
    return "degraded";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(gasUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return res.ok || res.status === 302 || res.status === 405 ? "ok" : "degraded";
  } catch {
    return "down";
  }
}
