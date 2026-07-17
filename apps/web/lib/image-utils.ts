// Client-side image compression to keep upload payloads small.
// Phone camera photos are often 3-8MB; as base64 they balloon ~33% larger and
// quickly exceed serverless body limits (~4.5MB on Vercel), which makes the
// server return a plain-text "Request Entity Too Large" response that breaks
// JSON parsing. Compressing/resizing on the client avoids that entirely.

export interface CompressOptions {
  /** Max width or height in pixels. Image is scaled down to fit. */
  maxDimension?: number;
  /** JPEG quality between 0 and 1. */
  quality?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1280,
  quality: 0.7,
};

/**
 * Compress an image File into a JPEG base64 data URL.
 * Falls back to the original data URL if canvas processing fails.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const { maxDimension, quality } = { ...DEFAULTS, ...options };

  const originalDataUrl = await readFileAsDataUrl(file);

  // Non-image files cannot be compressed; return as-is.
  if (!file.type.startsWith("image/")) {
    return originalDataUrl;
  }

  try {
    const img = await loadImage(originalDataUrl);

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return originalDataUrl;

    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL("image/jpeg", quality);

    // If somehow compression made it larger (e.g. tiny PNG), keep the smaller one.
    return compressed.length < originalDataUrl.length ? compressed : originalDataUrl;
  } catch {
    // If anything fails, fall back to the original so the user can still submit.
    return originalDataUrl;
  }
}

/** Rough byte size of a base64 data URL. */
export function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  // Each base64 char encodes 6 bits => 4 chars = 3 bytes.
  return Math.floor((base64.length * 3) / 4);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = src;
  });
}
