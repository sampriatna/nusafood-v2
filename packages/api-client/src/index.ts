import type {
  ApiResponse,
  FullDashboardSummary,
  HealthStatus,
  Staff,
  Task,
  TaskFilters,
} from "@nusafood/types";

export type {
  ApiResponse,
  FullDashboardSummary,
  HealthStatus,
  Staff,
  Task,
  TaskFilters,
};

export interface ApiClientOptions {
  baseUrl?: string;
  getToken?: () => string | null | Promise<string | null>;
}

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  const body = (await res.json()) as ApiResponse<T>;
  return body;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");

  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }

    const token = options.getToken ? await options.getToken() : null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    return parseJson<T>(res);
  }

  return {
    health: () => request<HealthStatus>("/api/health"),
    dashboard: {
      summary: (filters?: {
        outlet?: string;
        date_from?: string;
        date_to?: string;
      }) => {
        const params = new URLSearchParams();
        if (filters?.outlet) params.set("outlet", filters.outlet);
        if (filters?.date_from) params.set("date_from", filters.date_from);
        if (filters?.date_to) params.set("date_to", filters.date_to);
        const qs = params.toString();
        return request<FullDashboardSummary>(
          `/api/dashboard/summary${qs ? `?${qs}` : ""}`,
        );
      },
    },
    tasks: {
      list: (filters: TaskFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.outlet) params.set("outlet", filters.outlet);
        if (filters.status) params.set("status", String(filters.status));
        if (filters.pic) params.set("pic", filters.pic);
        if (filters.date_from) params.set("date_from", filters.date_from);
        if (filters.date_to) params.set("date_to", filters.date_to);
        if (filters.checklist_mode !== undefined) {
          params.set("checklist_mode", String(filters.checklist_mode));
        }
        if (filters.page) params.set("page", String(filters.page));
        if (filters.limit) params.set("limit", String(filters.limit));
        const qs = params.toString();
        return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
      },
      get: (taskId: string) => request<Task>(`/api/tasks/${taskId}`),
      getPublic: (taskId: string, token: string) =>
        request<Task>(
          `/api/tasks/${taskId}/public?token=${encodeURIComponent(token)}`,
        ),
    },
    staff: {
      list: (filters?: { outlet?: string; status?: string }) => {
        const params = new URLSearchParams();
        if (filters?.outlet) params.set("outlet", filters.outlet);
        if (filters?.status) params.set("status", filters.status);
        const qs = params.toString();
        return request<Staff[]>(`/api/staff${qs ? `?${qs}` : ""}`);
      },
    },
    areas: {
      list: (outlet?: string) => {
        const qs = outlet ? `?outlet=${encodeURIComponent(outlet)}` : "";
        return request(`/api/areas${qs}`);
      },
    },
    categories: {
      list: () => request("/api/categories"),
    },
    outlets: {
      list: () => request("/api/outlets"),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
