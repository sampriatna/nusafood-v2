/**
 * GAS adapter — panggil Web App v1 selama fase migrasi.
 * Digunakan untuk dual-write (Sprint 3) dan fallback baca (Sprint 4).
 */

export type GasHealth = "ok" | "degraded" | "down" | "disabled";

export interface GasResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: unknown;
}

function gasConfigured(): boolean {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  return Boolean(gasUrl && !gasUrl.includes("..."));
}

export function isGasEnabled(): boolean {
  return process.env.GAS_FALLBACK_ENABLED === "true" && gasConfigured();
}

export async function checkGasFallback(): Promise<GasHealth> {
  if (process.env.GAS_FALLBACK_ENABLED !== "true") {
    return "disabled";
  }

  if (!gasConfigured()) {
    return "degraded";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(process.env.GAS_WEB_APP_URL!, {
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

export async function callGasAction<T = unknown>(
  action: string,
  payload?: Record<string, unknown>,
  method: "GET" | "POST" = "POST",
): Promise<GasResult<T>> {
  if (!gasConfigured()) {
    return { success: false, error: "GAS_NOT_CONFIGURED" };
  }

  const base = process.env.GAS_WEB_APP_URL!;
  const adminKey = process.env.ADMIN_API_KEY;

  try {
    let response: Response;

    if (method === "GET") {
      const params = new URLSearchParams({ action });
      if (payload) {
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null) {
            params.set(key, String(value));
          }
        }
      }
      if (adminKey && !adminKey.includes("your-gas")) {
        // v1 GAS validates `admin_secret` on GET (not `api_key`)
        params.set("admin_secret", adminKey);
      }
      response = await fetch(`${base}?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
      });
    } else {
      response = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
        body: JSON.stringify({
          action,
          ...(adminKey && !adminKey.includes("your-gas")
            ? { api_key: adminKey }
            : {}),
          ...payload,
        }),
      });
    }

    const text = await response.text();
    let parsed: {
      success?: boolean;
      data?: T;
      error?: string;
      message?: string;
    };

    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return {
        success: false,
        error: `GAS mengembalikan non-JSON (HTTP ${response.status})`,
        raw: text.slice(0, 300),
      };
    }

    if (parsed.success === false || parsed.error) {
      return {
        success: false,
        error: parsed.error || parsed.message || "GAS request gagal",
        raw: parsed,
      };
    }

    return {
      success: true,
      data: (parsed.data ?? parsed) as T,
      raw: parsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi GAS",
    };
  }
}
