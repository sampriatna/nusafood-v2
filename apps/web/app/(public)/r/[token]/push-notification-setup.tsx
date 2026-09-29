"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Smartphone } from "lucide-react";

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

type State =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "disabled"
  | "idle"
  | "saving"
  | "active"
  | "error";

export function PushNotificationSetup({ token }: { token: string }) {
  const [state, setState] = useState<State>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }

      try {
        // Jangan mengarahkan staff memasang PWA sebelum server push benar-benar aktif.
        const configRes = await fetch("/api/push/config", { cache: "no-store" });
        const configJson = await configRes.json();
        const config = configJson?.data;
        if (!config?.enabled || !config.public_key) {
          if (!cancelled) setState("disabled");
          return;
        }
        if (cancelled) return;
        setPublicKey(config.public_key);

        const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
        if (isIOS && !isStandalone) {
          setState("needs-install");
          return;
        }

        const registration = await navigator.serviceWorker.register("/push-sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: "NF3_PUSH_CONTEXT",
          token,
          fallbackUrl: `/r/${token}`,
        });

        const existing = await registration.pushManager.getSubscription();
        if (existing && Notification.permission === "granted") {
          const sync = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, subscription: existing.toJSON() }),
          });
          if (!sync.ok) throw new Error("subscription sync failed");
          if (!cancelled) setState("active");
          return;
        }

        if (!cancelled) setState("idle");
      } catch (error) {
        console.error("[push setup]", error);
        // Setup tambahan tidak boleh mengganggu SOP utama atau membingungkan staff.
        if (!cancelled) setState("disabled");
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function enable() {
    if (!publicKey || state === "saving") return;
    setState("saving");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("idle");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToArrayBuffer(publicKey),
        });
      }

      registration.active?.postMessage({
        type: "NF3_PUSH_CONTEXT",
        token,
        fallbackUrl: `/r/${token}`,
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("subscribe failed");
      setState("active");
    } catch (error) {
      console.error("[push enable]", error);
      setState("error");
    }
  }

  if (state === "loading" || state === "disabled" || state === "unsupported") {
    return null;
  }

  if (state === "needs-install") {
    return (
      <section className="bg-muted/30 px-4 pt-4">
        <div className="mx-auto max-w-lg rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex gap-3">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-sky-700" />
            <div>
              <p className="font-bold text-sky-950">Aktifkan notifikasi tugas</p>
              <p className="mt-1 text-sm leading-relaxed text-sky-900/80">
                Di iPhone, buka menu Share Safari → <b>Tambahkan ke Layar Utama</b>.
                Setelah dibuka dari ikon NF3, tombol notifikasi akan muncul.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (state === "active") {
    return (
      <section className="bg-muted/30 px-4 pt-4">
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-950">
          <BellRing className="size-5 shrink-0" />
          <div>
            <p className="font-bold">Notifikasi tugas aktif</p>
            <p className="text-xs text-emerald-900/75">
              Tugas baru akan muncul sebagai notifikasi HP. Tap untuk langsung membuka pekerjaan.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-muted/30 px-4 pt-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-5 shrink-0 text-sky-700" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sky-950">Notifikasi tugas di HP</p>
            <p className="mt-1 text-sm leading-relaxed text-sky-900/80">
              Aktifkan sekali. Kalau ada pekerjaan baru, HP akan memberi notifikasi tanpa menunggu chat WhatsApp.
            </p>
            <button
              type="button"
              onClick={() => void enable()}
              disabled={state === "saving" || !publicKey}
              className="mt-3 rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {state === "saving" ? "Mengaktifkan…" : "Aktifkan notifikasi"}
            </button>
            {state === "error" ? (
              <p className="mt-2 text-xs font-medium text-red-700">
                Belum berhasil. Coba refresh lalu aktifkan lagi.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
