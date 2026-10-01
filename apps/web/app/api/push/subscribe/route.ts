import { fail, ok } from "@/lib/api/response";
import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";
import {
  isTrustedPushEndpoint,
  saveStaffPushSubscription,
} from "@/lib/services/web-push.service";

type Body = {
  token?: string;
  subscription?: {
    endpoint?: string;
    expirationTime?: number | null;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const token = body.token?.trim() ?? "";
    const endpoint = body.subscription?.endpoint?.trim() ?? "";
    if (!token || !endpoint) {
      return fail("Token staff dan push endpoint wajib diisi", {
        code: "PUSH_INVALID_PAYLOAD",
        status: 400,
      });
    }

    if (!isTrustedPushEndpoint(endpoint)) {
      return fail("Alamat notifikasi browser tidak dikenali", {
        code: "PUSH_INVALID_ENDPOINT",
        status: 422,
      });
    }

    const data = await getStaffReportByToken(token);
    if (!data.link.is_active) {
      return fail("Link staff sudah tidak aktif", {
        code: "STAFF_LINK_INACTIVE",
        status: 403,
      });
    }

    await saveStaffPushSubscription({
      staffId: data.staff.staff_id,
      reportToken: token,
      endpoint,
      userAgent: request.headers.get("user-agent"),
    });

    return ok({ subscribed: true });
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/push/subscribe]", error);
    return fail("Gagal mengaktifkan notifikasi", {
      code: "PUSH_SUBSCRIBE_FAILED",
      status: 500,
    });
  }
}
