import { logSyncOperation } from "@/lib/services/dual-write.service";
import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";
import { buildWaMeLink } from "@/lib/wa-message";

/** v2 tidak memakai Fonnte — hanya wa.me (default) atau GAS opsional (migrasi). */
export type WaProviderMode = "wame" | "gas" | "auto";

export type WhatsAppDeliveryResult = {
  /** Pesan terkirim otomatis via GAS (bukan wa.me manual). */
  auto_sent: boolean;
  provider: WaProviderMode | "none";
  wa_link: string;
  error?: string;
};

type DeliverInput = {
  to: string;
  message: string;
  gas?: {
    action: string;
    payload: Record<string, unknown>;
  };
  log: {
    operation: string;
    entityType: string;
    entityId: string;
    taskId?: string;
    outletId?: string;
    picWa?: string;
  };
};

export function resolveWaProvider(): WaProviderMode {
  const raw = (process.env.WA_PROVIDER || "auto").trim().toLowerCase();
  if (raw === "wame" || raw === "gas" || raw === "auto") return raw;
  return "auto";
}

export function shouldTryGasDelivery(): boolean {
  const mode = resolveWaProvider();
  return mode === "gas" || mode === "auto";
}

export async function deliverWhatsApp(
  input: DeliverInput,
): Promise<WhatsAppDeliveryResult> {
  const mode = resolveWaProvider();
  const wa_link = buildWaMeLink(input.to, input.message);

  if (!wa_link) {
    await logSyncOperation({
      ...input.log,
      picWa: input.log.picWa ?? input.to,
      v2Status: "failed",
      errorMessage: "INVALID_WA_NUMBER",
    });
    return {
      auto_sent: false,
      provider: "none",
      wa_link: "",
      error: "INVALID_WA_NUMBER",
    };
  }

  const skipGas = mode === "wame" || !input.gas;

  if (skipGas) {
    await logSyncOperation({
      ...input.log,
      picWa: input.log.picWa ?? input.to,
      v2Status: "partial",
      v2Response: {
        method: "wame",
        provider: mode,
        wa_link,
      },
    });
    return {
      auto_sent: false,
      provider: "wame",
      wa_link,
      error: mode === "wame" ? undefined : "GAS_PAYLOAD_MISSING",
    };
  }

  if (!isGasEnabled()) {
    await logSyncOperation({
      ...input.log,
      picWa: input.log.picWa ?? input.to,
      v2Status: "partial",
      v2Response: { method: "wame", reason: "GAS_NOT_CONFIGURED", wa_link },
      errorMessage: "GAS_NOT_CONFIGURED",
    });
    return {
      auto_sent: false,
      provider: "wame",
      wa_link,
      error: "GAS_NOT_CONFIGURED",
    };
  }

  const gas = await callGasAction(input.gas!.action, input.gas!.payload);

  await logSyncOperation({
    ...input.log,
    picWa: input.log.picWa ?? input.to,
    v1Status: gas.success ? "success" : "failed",
    v2Status: gas.success ? "success" : "partial",
    v1Response: gas.raw ?? { error: gas.error },
    v2Response: gas.success
      ? { method: "gas", provider: mode }
      : { method: "wame", provider: mode, wa_link, gas_error: gas.error },
    errorMessage: gas.success ? null : (gas.error ?? "GAGAL_KIRIM_WA"),
  });

  if (gas.success) {
    return {
      auto_sent: true,
      provider: "gas",
      wa_link,
    };
  }

  if (mode === "gas") {
    return {
      auto_sent: false,
      provider: "gas",
      wa_link,
      error: gas.error ?? "GAGAL_KIRIM_WA",
    };
  }

  return {
    auto_sent: false,
    provider: "wame",
    wa_link,
    error: gas.error ?? "GAGAL_KIRIM_WA",
  };
}

/** @deprecated Gunakan auto_sent — alias untuk kompatibilitas sementara. */
export function mapLegacyWaSent(result: WhatsAppDeliveryResult): {
  sent: boolean;
  error?: string;
  wa_link?: string;
} {
  return {
    sent: result.auto_sent,
    error: result.error,
    wa_link: result.auto_sent ? undefined : result.wa_link || undefined,
  };
}
