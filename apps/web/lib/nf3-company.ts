/** Company letterhead for formal disciplinary letters (NF3). */
export const NF3_COMPANY = {
  legalName: "CV Nusantara Research Development",
  brand: "NF3",
  address: "Jl. Sultan Agung No. 3, Sumber, Cirebon 45612",
  founderName: "Sampriatna",
  founderTitle: "Founder",
  brands: ["Kisamen", "Samtaro Space", "Buri Umah Coffee & Eatery"],
  /** Baris brand di kop surat. */
  letterheadBrands: ["Kisamen", "Samtaro", "Kopi Buri Umah"],
} as const;

/** Halaman publik verifikasi keaslian surat (dibuka dari QR). */
export function buildVerifyUrl(letterId: string, origin = ""): string {
  return `${origin.replace(/\/$/, "")}/verifikasi/surat/${encodeURIComponent(letterId)}`;
}

export function buildFounderQrPayload(input: {
  letterNumber: string;
  letterId: string;
  origin?: string;
}): string {
  const verify = input.origin
    ? `${input.origin.replace(/\/$/, "")}/teguran/${input.letterId}`
    : `teguran/${input.letterId}`;
  return [
    "NF3 DIGITAL SIGNATURE",
    NF3_COMPANY.legalName,
    `Founder: ${NF3_COMPANY.founderName}`,
    `Surat: ${input.letterNumber}`,
    `Verify: ${verify}`,
  ].join(" | ");
}

export function buildQrImageUrl(data: string, size = 140): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}
