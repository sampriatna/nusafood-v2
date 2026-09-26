import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { qrSvg } from "./qr-svg";

describe("qrSvg", () => {
  it("encodes the verification URL", () => {
    const url = "https://tugas.nf3.company/verifikasi/surat/abc";
    const svg = qrSvg(url);
    expect(svg.startsWith("<svg")).toBe(true);
    const n = QRCode.create(url, { errorCorrectionLevel: "M" }).modules.size;
    expect(svg).toContain(`viewBox="0 0 ${n + 4} ${n + 4}"`);
  });
});
