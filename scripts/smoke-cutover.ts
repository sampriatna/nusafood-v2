/**
 * Smoke test jalur kritis cutover.
 * Usage: CUTOVER_BASE_URL=http://localhost:3002 pnpm smoke:cutover
 */
import { prisma } from "@nusafood/database";
import { generateTaskId, generateToken } from "../apps/web/lib/id";

const BASE =
  process.env.CUTOVER_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3002";

type Result = { name: string; ok: boolean; detail: string };

async function jsonFetch(
  path: string,
  init?: RequestInit & { cookie?: string },
) {
  const headers = new Headers(init?.headers);
  if (init?.cookie) headers.set("cookie", init.cookie);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  const setCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")!]
        : [];
  return { res, body, setCookie };
}

function pickSessionCookie(setCookie: string[]): string {
  for (const line of setCookie) {
    const match = line.match(/(?:^|, )nusa_session=([^;]+)/);
    if (match) return `nusa_session=${match[1]}`;
  }
  return "";
}

async function ensureSmokeTask() {
  const outlet = await prisma.outlet.findFirst({ where: { code: "KBU" } });
  if (!outlet) throw new Error("Outlet KBU missing — run pnpm db:seed");

  const taskId = generateTaskId(900);
  const token = generateToken(32);
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.task.upsert({
    where: { taskId },
    create: {
      taskId,
      token,
      outletId: outlet.id,
      outletName: outlet.name,
      taskTitle: "SMOKE CUTOVER REPORT",
      priority: "Medium",
      picName: "Smoke Staff",
      picWa: "6281111111111",
      deadline,
      status: "OPEN",
      reportLink: `/report/${taskId}?token=${token}`,
      sourceVersion: "v2",
    },
    update: {
      token,
      status: "OPEN",
      reportLink: `/report/${taskId}?token=${token}`,
    },
  });

  return { taskId, token };
}

async function main() {
  const results: Result[] = [];
  console.log(`Smoke cutover against ${BASE}`);

  // 1) health
  {
    const { res, body } = await jsonFetch("/api/health");
    const data = body as { success?: boolean };
    results.push({
      name: "health",
      ok: res.status === 200 && data.success === true,
      detail: `HTTP ${res.status}`,
    });
  }

  // 2) login
  let cookie = "";
  {
    const { res, body, setCookie } = await jsonFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "leader.kbu",
        password: "leader123",
      }),
    });
    cookie = pickSessionCookie(setCookie);
    const data = body as { success?: boolean };
    results.push({
      name: "login_leader",
      ok: res.status === 200 && data.success === true && Boolean(cookie),
      detail: `HTTP ${res.status}, cookie=${Boolean(cookie)}`,
    });
  }

  // 3) create task (admin write path)
  let createdTaskId = "";
  {
    const deadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const { res, body } = await jsonFetch("/api/tasks", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        outlet: "KBU",
        area: "Bar",
        category: "Cleaning",
        task_title: "SMOKE CREATE TASK",
        task_description: "cutover smoke",
        priority: "Medium",
        pic_name: "Smoke PIC",
        pic_wa: "6281222222222",
        deadline,
      }),
    });
    const data = body as { success?: boolean; data?: { task_id?: string } };
    createdTaskId = data.data?.task_id || "";
    results.push({
      name: "create_task",
      ok: (res.status === 200 || res.status === 201) && Boolean(createdTaskId),
      detail: `HTTP ${res.status} task=${createdTaskId || "-"}`,
    });
  }

  // 4) staff report page + public API (link WA lama / baru)
  {
    const { taskId, token } = await ensureSmokeTask();
    const page = await fetch(`${BASE}/report/${taskId}?token=${token}`);
    const pub = await jsonFetch(
      `/api/tasks/${taskId}/public?token=${encodeURIComponent(token)}`,
    );
    results.push({
      name: "staff_report_page",
      ok: page.status === 200,
      detail: `HTTP ${page.status}`,
    });
    results.push({
      name: "staff_public_api",
      ok: pub.res.status === 200,
      detail: `HTTP ${pub.res.status}`,
    });
  }

  // 5) auth gate
  {
    const { res } = await jsonFetch("/api/tasks");
    results.push({
      name: "auth_gate_tasks",
      ok: res.status === 401,
      detail: `HTTP ${res.status}`,
    });
  }

  // 6) dashboard redirect without cookie
  {
    const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    const loc = res.headers.get("location") || "";
    results.push({
      name: "dashboard_redirect",
      ok: res.status === 307 || res.status === 302,
      detail: `HTTP ${res.status} loc=${loc}`,
    });
  }

  console.log("");
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}: ${r.detail}`);
    if (!r.ok) failed += 1;
  }
  console.log("");
  console.log(
    failed === 0
      ? `All ${results.length} smoke checks passed`
      : `${failed}/${results.length} smoke checks failed`,
  );
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
