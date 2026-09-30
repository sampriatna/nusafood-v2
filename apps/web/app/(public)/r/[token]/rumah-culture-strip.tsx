"use client";

import { CheckCircle2, Eye, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const MOUNT_ID = "rumah-culture-mount";

export function RumahCultureStrip() {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.getElementById("daily-activity-root");
    if (!root) return;

    const attach = () => {
      const header = Array.from(root.querySelectorAll("header")).find((node) =>
        node.textContent?.includes("SOP Kerja Hari Ini"),
      );

      if (!header) {
        setMount(null);
        return;
      }

      let target = document.getElementById(MOUNT_ID);
      if (!target) {
        target = document.createElement("div");
        target.id = MOUNT_ID;
        header.insertAdjacentElement("afterend", target);
      } else if (target.previousElementSibling !== header) {
        header.insertAdjacentElement("afterend", target);
      }
      setMount(target);
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.getElementById(MOUNT_ID)?.remove();
    };
  }, []);

  if (!mount) return null;

  return createPortal(
    <section className="bg-muted/30 px-4 pt-4">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-amber-50/70 px-4 py-2.5">
          <ShieldCheck className="size-4 text-amber-700" />
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
            Prinsip Kerja RUMAH
          </p>
        </div>

        <div className="grid gap-0 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex gap-3 p-3.5">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Eye className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-snug">
                Yang kamu lihat, kamu pedulikan.
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Bantu kalau bisa. Kalau perlu bagian lain, laporkan apa adanya. Melaporkan bukan mencari salah.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3.5">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-snug">
                Yang kamu terima, kamu tuntaskan.
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Selesaikan, atau teruskan ke orang yang tepat dengan status yang jelas. Jangan hilang di tengah jalan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>,
    mount,
  );
}
