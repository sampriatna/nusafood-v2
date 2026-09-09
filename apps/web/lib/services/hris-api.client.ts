import type {
  HrisAttendanceTodayRecord,
  HrisPaginatedMeta,
  HrisStaffListResponse,
  HrisStaffRecord,
} from "@nusafood/types";

export class HrisApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type HrisFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface HrisStaffQuery {
  updated_since?: string;
  page?: number;
  per_page?: number;
  status?: "active" | "inactive";
  outlet_id?: string;
  division_id?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeHrisPhone(phone?: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (!digits.startsWith("62")) return `62${digits}`;
  return digits;
}

export class HrisApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: HrisFetchFn;

  constructor(options?: {
    baseUrl?: string;
    token?: string;
    timeoutMs?: number;
    fetchFn?: HrisFetchFn;
  }) {
    this.baseUrl = (options?.baseUrl ?? process.env.HRIS_API_BASE_URL ?? "")
      .trim()
      .replace(/\/+$/, "");
    this.token = (options?.token ?? process.env.HRIS_API_TOKEN ?? "").trim();
    this.timeoutMs = options?.timeoutMs ?? 15_000;
    this.fetchFn = options?.fetchFn ?? fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  async ping(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.fetchJson<{ data: unknown[] }>("/api/integration/v1/outlets");
      return true;
    } catch {
      return false;
    }
  }

  async listStaffPage(query: HrisStaffQuery = {}): Promise<HrisStaffListResponse> {
    const params = new URLSearchParams();
    if (query.updated_since) params.set("updated_since", query.updated_since);
    if (query.page) params.set("page", String(query.page));
    if (query.per_page) params.set("per_page", String(query.per_page));
    if (query.status) params.set("status", query.status);
    if (query.outlet_id) params.set("outlet_id", query.outlet_id);
    if (query.division_id) params.set("division_id", query.division_id);

    const qs = params.toString();
    return this.fetchJson<HrisStaffListResponse>(
      `/api/integration/v1/staff${qs ? `?${qs}` : ""}`,
    );
  }

  async *iterateStaff(
    query: Omit<HrisStaffQuery, "page"> = {},
  ): AsyncGenerator<HrisStaffRecord[]> {
    let page = 1;
    let lastPage = 1;

    do {
      const response = await this.listStaffPage({ ...query, page, per_page: 100 });
      yield response.data;
      lastPage = response.meta.last_page;
      page += 1;
    } while (page <= lastPage);
  }

  async getStaff(id: string): Promise<HrisStaffRecord | null> {
    try {
      const response = await this.fetchJson<{ data: HrisStaffRecord }>(
        `/api/integration/v1/staff/${encodeURIComponent(id)}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HrisApiError && error.status === 404) return null;
      throw error;
    }
  }

  async listAttendanceToday(filters?: {
    outlet_id?: string;
    division_id?: string;
  }): Promise<HrisAttendanceTodayRecord[]> {
    const params = new URLSearchParams();
    if (filters?.outlet_id) params.set("outlet_id", filters.outlet_id);
    if (filters?.division_id) params.set("division_id", filters.division_id);
    const qs = params.toString();

    const response = await this.fetchJson<{ data: HrisAttendanceTodayRecord[] }>(
      `/api/integration/v1/attendance/today${qs ? `?${qs}` : ""}`,
    );
    return response.data;
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.isConfigured()) {
      throw new HrisApiError(
        "HRIS API belum dikonfigurasi",
        "HRIS_NOT_CONFIGURED",
        503,
      );
    }

    const url = `${this.baseUrl}${path}`;
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchFn(url, {
          ...init,
          method: init?.method ?? "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.token}`,
            ...(init?.headers ?? {}),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new HrisApiError("Token HRIS tidak valid", "HRIS_UNAUTHORIZED", 401);
          }
          if (response.status >= 500 && attempt < 2) {
            await sleep(500 * 2 ** attempt);
            continue;
          }
          throw new HrisApiError(
            `HRIS API error (${response.status})`,
            "HRIS_HTTP_ERROR",
            response.status,
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (error instanceof HrisApiError) throw error;
        if (attempt < 2) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    if (lastError instanceof Error && lastError.name === "AbortError") {
      throw new HrisApiError("HRIS API timeout", "HRIS_TIMEOUT", 504);
    }

    throw new HrisApiError(
      lastError instanceof Error ? lastError.message : "HRIS API gagal",
      "HRIS_NETWORK_ERROR",
      502,
    );
  }
}

export function emptyHrisMeta(): HrisPaginatedMeta {
  return { current_page: 1, last_page: 1, per_page: 0, total: 0 };
}
