const CONTEXT_CACHE = "nf3-push-context-v1";
const CONTEXT_KEY = "/__nf3_push_context__";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function saveContext(context) {
  const cache = await caches.open(CONTEXT_CACHE);
  await cache.put(
    CONTEXT_KEY,
    new Response(JSON.stringify(context), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function loadContext() {
  const cache = await caches.open(CONTEXT_CACHE);
  const response = await cache.match(CONTEXT_KEY);
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "NF3_PUSH_CONTEXT") return;
  event.waitUntil(
    saveContext({
      token: event.data.token,
      fallbackUrl: event.data.fallbackUrl || "/",
    }),
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const context = await loadContext();
      let title = "NF3 · Ada tugas baru";
      let body = "Ada pekerjaan baru yang perlu ditindaklanjuti.";
      let url = context?.fallbackUrl || "/";
      let tag = "nf3-task";

      if (context?.token) {
        try {
          const response = await fetch(
            `/api/push/latest?token=${encodeURIComponent(context.token)}`,
            { cache: "no-store" },
          );
          const json = await response.json();
          const task = json?.data?.task;
          if (response.ok && task) {
            title = task.title || title;
            const where = [task.outlet, task.area].filter(Boolean).join(" · ");
            body = where
              ? `${where} — buka untuk lihat & kerjakan.`
              : "Buka untuk lihat & kerjakan.";
            url = task.report_link || url;
            tag = task.task_id || tag;
          }
        } catch {
          // Tetap tampilkan notifikasi generik bila jaringan fetch detail gagal.
        }
      }

      await self.registration.showNotification(title, {
        body,
        tag,
        renotify: true,
        requireInteraction: false,
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = event.notification.data?.url || "/";
      const absolute = new URL(target, self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("navigate" in client) {
          await client.navigate(absolute);
          return client.focus();
        }
      }
      return self.clients.openWindow(absolute);
    })(),
  );
});
