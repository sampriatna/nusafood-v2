"use client";

import { useEffect, useState } from "react";
import type { SessionCapabilities } from "@/lib/permissions";

type MeResponse =
  | {
      success: true;
      data: {
        authenticated: boolean;
        user: {
          role: string;
          app_role?: string;
          is_owner?: boolean;
          outlet?: string | null;
        };
        capabilities: SessionCapabilities;
      };
      error: null;
    }
  | { success: false; data: null; error: string };

const defaultCaps: SessionCapabilities = {
  app_role: "PUBLIC",
  is_owner: false,
  can_access_dashboard: false,
  can_approve_sp: false,
  can_generate_pdf_sp: false,
  can_cancel_letter: false,
  can_manage_users: false,
  can_manage_system_settings: false,
  can_manage_master_data: false,
  can_export_global: false,
  can_view_audit_log: false,
  global_outlet_scope: false,
  outlet: null,
};

export function useSessionCapabilities() {
  const [capabilities, setCapabilities] =
    useState<SessionCapabilities>(defaultCaps);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = (await res.json()) as MeResponse;
        if (!cancelled && json.success && json.data.capabilities) {
          setCapabilities(json.data.capabilities);
        }
      } catch {
        // ignore — UI tetap aman karena backend enforce
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { capabilities, loading };
}
