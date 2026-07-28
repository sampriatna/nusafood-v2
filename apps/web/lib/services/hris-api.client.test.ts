import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  HrisApiClient,
  HrisApiError,
  normalizeHrisPhone,
} from "@/lib/services/hris-api.client";

describe("normalizeHrisPhone", () => {
  it("normalizes leading zero to 62", () => {
    expect(normalizeHrisPhone("081234567890")).toBe("6281234567890");
  });

  it("keeps 62 prefix", () => {
    expect(normalizeHrisPhone("6281234567890")).toBe("6281234567890");
  });

  it("returns null for empty", () => {
    expect(normalizeHrisPhone("")).toBeNull();
  });
});

describe("HrisApiClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects when not configured", async () => {
    vi.stubEnv("HRIS_API_BASE_URL", "");
    vi.stubEnv("HRIS_API_TOKEN", "");
    const client = new HrisApiClient({ fetchFn: fetchMock });

    await expect(client.listStaffPage()).rejects.toMatchObject({
      code: "HRIS_NOT_CONFIGURED",
    });
  });

  it("sends bearer token on staff request", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = new HrisApiClient({
      baseUrl: "https://hris.example.com",
      token: "secret-token",
      fetchFn: fetchMock,
    });

    await client.listStaffPage({ page: 2, per_page: 10 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/integration/v1/staff");
    expect(String(fetchMock.mock.calls[0][0])).toContain("page=2");
  });

  it("maps 401 to HRIS_UNAUTHORIZED", async () => {
    fetchMock.mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    const client = new HrisApiClient({
      baseUrl: "https://hris.example.com",
      token: "bad",
      fetchFn: fetchMock,
    });

    await expect(client.listStaffPage()).rejects.toBeInstanceOf(HrisApiError);
    await expect(client.listStaffPage()).rejects.toMatchObject({
      code: "HRIS_UNAUTHORIZED",
      status: 401,
    });
  });

  it("paginates through iterateStaff", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: "1", employee_code: "1", name: "A" }],
            meta: { current_page: 1, last_page: 2, total: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: "2", employee_code: "2", name: "B" }],
            meta: { current_page: 2, last_page: 2, total: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const client = new HrisApiClient({
      baseUrl: "https://hris.example.com",
      token: "secret",
      fetchFn: fetchMock,
    });

    const batches: string[] = [];
    for await (const batch of client.iterateStaff()) {
      batches.push(...batch.map((s) => s.id));
    }

    expect(batches).toEqual(["1", "2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("err", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            meta: { current_page: 1, last_page: 1, total: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const client = new HrisApiClient({
      baseUrl: "https://hris.example.com",
      token: "secret",
      fetchFn: fetchMock,
    });

    await expect(client.listStaffPage()).resolves.toMatchObject({
      data: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
