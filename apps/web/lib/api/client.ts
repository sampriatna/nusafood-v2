import type {
  ApiResponse,
  ChecklistReport,
  FullDashboardSummary,
  Task,
} from "@nusafood/types";

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  return res.json() as Promise<ApiResponse<T>>;
}

export async function fetchTasks(params?: {
  outlet?: string;
  status?: string;
  limit?: number;
  page?: number;
  checklist_mode?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.outlet) search.set("outlet", params.outlet);
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.page) search.set("page", String(params.page));
  if (params?.checklist_mode !== undefined) {
    search.set("checklist_mode", params.checklist_mode ? "true" : "false");
  }

  const qs = search.toString();
  const res = await fetch(`/api/tasks${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  return parseJson<Task[]>(res);
}

export async function fetchChecklistReports(params?: {
  outlet?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  if (params?.outlet) search.set("outlet", params.outlet);
  if (params?.status) search.set("status", params.status);

  const qs = search.toString();
  const res = await fetch(`/api/checklist-reports${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  return parseJson<ChecklistReport[]>(res);
}

export async function fetchDashboardSummary(params?: {
  outlet?: string;
  date_from?: string;
  date_to?: string;
}) {
  const search = new URLSearchParams();
  if (params?.outlet) search.set("outlet", params.outlet);
  if (params?.date_from) search.set("date_from", params.date_from);
  if (params?.date_to) search.set("date_to", params.date_to);

  const qs = search.toString();
  const res = await fetch(`/api/dashboard/summary${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  return parseJson<FullDashboardSummary>(res);
}

export async function fetchOutlets() {
  const res = await fetch("/api/outlets", { credentials: "include" });
  return parseJson<Array<{ id: string; code: string; name: string }>>(res);
}
