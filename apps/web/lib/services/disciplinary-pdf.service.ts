import type { DisciplinaryLetter } from "@nusafood/types";
import { getLetterPreview } from "@/lib/services/disciplinary-preview";
import {
  buildLetterDocumentHtml,
  type LetterDocumentOptions,
} from "@/lib/letter/letter-html";

/**
 * Document adapter for Teguran/SP.
 * Uses stable API document URL (Vercel-safe). Browser Print → Save as PDF.
 */
export async function generateDisciplinaryPdfArchive(
  letter: DisciplinaryLetter,
  origin = "",
): Promise<{ url: string; html: string }> {
  const html = buildFormalLetterHtml(letter, origin);
  const base = origin.replace(/\/$/, "");
  const documentUrl = `${base}/api/disciplinary/${letter.id}/document`;
  return { url: documentUrl, html };
}

export function buildLetterPreviewText(letter: DisciplinaryLetter): string {
  return getLetterPreview(letter);
}

/** Surat formal A4 (lihat lib/letter/letter-html.ts). */
export function buildFormalLetterHtml(
  letter: DisciplinaryLetter,
  origin = "",
  options: Omit<LetterDocumentOptions, "origin"> = {},
): string {
  return buildLetterDocumentHtml(letter, { ...options, origin });
}
