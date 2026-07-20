import type {
  ApiResponse,
  CreateReportTemplatePayload,
  DailyReportDashboardData,
  DailyReportFilters,
  DailyReportSubmission,
  KendalaNotifyInfo,
  LeaderFollowUpStatus,
  LeaderMonitorDashboardData,
  LeaderMonitorFilters,
  LeaderMonitorSubmission,
  LeaderMonitorTemplate,
  ReportTemplate,
  Staff,
  StaffReportLink,
  StaffReportLinkContext,
  SubmitDailyReportPayload,
  SubmitLeaderMonitorPayload,
  UpdateReportTemplatePayload,
  ValidateStaffReportPayload,
} from "@nusafood/types";

async function callStaffReportApi<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT"; body?: Record<string, unknown> },
): Promise<ApiResponse<T>> {
  try {
    const method = options?.method || "GET";
    const response = await fetch(`/api/staff-reports${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      if (
        typeof window !== "undefined" &&
        !path.includes("/by-token/") &&
        !path.includes("/submit")
      ) {
        window.location.href = "/login";
      }
      return { success: false, data: null, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (response.status === 413) {
      return {
        success: false,
        data: null,
        error: "Foto terlalu besar untuk dikirim. Coba ambil ulang foto, lalu kirim lagi.",
      };
    }

    const text = await response.text();
    let result: ApiResponse<T>;
    try {
      result = JSON.parse(text);
    } catch {
      return { success: false, data: null, error: "Server mengembalikan respons yang tidak valid." };
    }

    if (!result.success && result.error) {
      return { success: false, data: null, error: result.error };
    }
    return {
      success: true as const,
      data: result.data as T,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Gagal menghubungi server",
    };
  }
}

async function callStaffReportApiWithNotify<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT"; body?: Record<string, unknown> },
): Promise<ApiResponse<T> & { notify?: KendalaNotifyInfo | null }> {
  try {
    const method = options?.method || "GET";
    const response = await fetch(`/api/staff-reports${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 413) {
      return {
        success: false,
        data: null,
        error: "Foto terlalu besar untuk dikirim. Coba ambil ulang foto, lalu kirim lagi.",
      };
    }

    const text = await response.text();
    let result: ApiResponse<T> & { notify?: KendalaNotifyInfo | null };
    try {
      result = JSON.parse(text);
    } catch {
      return { success: false, data: null, error: "Server mengembalikan respons yang tidak valid." };
    }

    if (!result.success && result.error) {
      return { success: false, data: null, error: result.error };
    }
    return {
      success: true as const,
      data: result.data as T,
      error: null,
      notify: result.notify ?? null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Gagal menghubungi server",
    };
  }
}

async function callLeaderMonitorApi<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT"; body?: Record<string, unknown> },
): Promise<ApiResponse<T>> {
  try {
    const method = options?.method || "GET";
    const response = await fetch(`/api/leader-monitoring${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return { success: false, data: null, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const text = await response.text();
    let result: ApiResponse<T>;
    try {
      result = JSON.parse(text);
    } catch {
      return { success: false, data: null, error: "Server mengembalikan respons yang tidak valid." };
    }
    if (!result.success && result.error) {
      return { success: false, data: null, error: result.error };
    }
    return {
      success: true as const,
      data: result.data as T,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Gagal menghubungi server",
    };
  }
}

/** Public: load staff identity + templates by permanent token */
export async function getStaffReportByToken(
  token: string,
): Promise<ApiResponse<Omit<StaffReportLinkContext, "link"> & { link_active: boolean }>> {
  return callStaffReportApi(`/by-token/${encodeURIComponent(token)}`);
}

/** Public: submit daily report — staff_id from token; returns notify if kendala */
export async function submitDailyReport(
  payload: SubmitDailyReportPayload,
): Promise<ApiResponse<DailyReportSubmission> & { notify?: KendalaNotifyInfo | null }> {
  return callStaffReportApiWithNotify<DailyReportSubmission>("/submit", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function listStaffReportLinks(): Promise<ApiResponse<StaffReportLink[]>> {
  return callStaffReportApi("/links");
}

export async function generateStaffReportLink(
  staffId: string,
  staffList?: Staff[],
): Promise<ApiResponse<StaffReportLink>> {
  return callStaffReportApi("/links", {
    method: "POST",
    body: {
      staff_id: staffId,
      ...(staffList && staffList.length > 0 ? { staff: staffList } : {}),
    },
  });
}

export async function revokeStaffReportLink(
  linkId: string,
): Promise<ApiResponse<StaffReportLink>> {
  return callStaffReportApi(`/links/${encodeURIComponent(linkId)}/revoke`, {
    method: "POST",
    body: {},
  });
}

export async function listReportTemplates(): Promise<ApiResponse<ReportTemplate[]>> {
  return callStaffReportApi("/templates");
}

export async function createReportTemplate(
  payload: CreateReportTemplatePayload,
): Promise<ApiResponse<ReportTemplate>> {
  return callStaffReportApi("/templates", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function updateReportTemplate(
  payload: UpdateReportTemplatePayload,
): Promise<ApiResponse<ReportTemplate>> {
  return callStaffReportApi(`/templates/${encodeURIComponent(payload.id)}`, {
    method: "PUT",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function getDailyReportDashboard(
  filters?: DailyReportFilters,
): Promise<ApiResponse<DailyReportDashboardData>> {
  const params = new URLSearchParams();
  if (filters?.date) params.set("date", filters.date);
  if (filters?.outlet) params.set("outlet", filters.outlet);
  if (filters?.staff_id) params.set("staff_id", filters.staff_id);
  if (filters?.report_template_id) params.set("report_template_id", filters.report_template_id);
  if (filters?.submit_status) params.set("submit_status", filters.submit_status);
  const qs = params.toString();
  return callStaffReportApi(`/dashboard${qs ? `?${qs}` : ""}`);
}

/** Sync staff master ke store daily-report (cepat, dari data client). */
export async function syncStaffReportStaff(
  staff: Staff[],
): Promise<ApiResponse<{ count: number }>> {
  return callStaffReportApi("/sync-staff", {
    method: "POST",
    body: { staff },
  });
}

/** Fetch active staff from v2 API (for dashboard/settings pages). */
export async function fetchStaffList(params?: {
  status?: string;
  outlet?: string;
}): Promise<ApiResponse<Staff[]>> {
  try {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.outlet) search.set("outlet", params.outlet);
    const qs = search.toString();
    const response = await fetch(`/api/staff${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    if (response.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return { success: false, data: null, error: "Sesi telah berakhir. Silakan login kembali." };
    }
    return (await response.json()) as ApiResponse<Staff[]>;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Gagal mengambil data staff",
    };
  }
}

export async function getLeaderMonitorDashboard(
  filters?: LeaderMonitorFilters,
): Promise<ApiResponse<LeaderMonitorDashboardData>> {
  const params = new URLSearchParams();
  if (filters?.date) params.set("date", filters.date);
  if (filters?.outlet) params.set("outlet", filters.outlet);
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.follow_up) params.set("follow_up", filters.follow_up);
  const qs = params.toString();
  return callLeaderMonitorApi(`/dashboard${qs ? `?${qs}` : ""}`);
}

export async function listLeaderMonitorTemplates(
  outlet?: string,
): Promise<ApiResponse<LeaderMonitorTemplate[]>> {
  const qs = outlet ? `?outlet=${encodeURIComponent(outlet)}` : "";
  return callLeaderMonitorApi(`/templates${qs}`);
}

export async function submitLeaderMonitor(
  payload: SubmitLeaderMonitorPayload,
): Promise<ApiResponse<LeaderMonitorSubmission>> {
  return callLeaderMonitorApi("/submit", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function validateStaffReport(
  payload: ValidateStaffReportPayload,
): Promise<ApiResponse<DailyReportSubmission>> {
  return callLeaderMonitorApi("/validate", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function updateLeaderMonitorFollowUp(
  id: string,
  follow_up_status: LeaderFollowUpStatus,
  extra?: { problem_note?: string; fix_instruction?: string },
): Promise<ApiResponse<LeaderMonitorSubmission>> {
  return callLeaderMonitorApi("/follow-up", {
    method: "POST",
    body: { id, follow_up_status, ...extra },
  });
}

export async function getLeaderStaffOptions(
  outlet?: string,
  staff?: Staff[],
): Promise<
  ApiResponse<{ staff_id: string; name: string; position: string; outlet: string }[]>
> {
  if (staff?.length) {
    return callLeaderMonitorApi("/staff-options", {
      method: "POST",
      body: { staff, outlet },
    });
  }
  const qs = outlet ? `?outlet=${encodeURIComponent(outlet)}` : "";
  return callLeaderMonitorApi(`/staff-options${qs}`);
}

export function buildStaffStaticReportLink(token: string, origin?: string): string {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/r/${token}`;
}
