/**
 * Universal image-upload helper for Biz-Salama.
 *
 * Why this exists
 * ───────────────
 * Sellers on Android phones (Samsung, Tecno, Itel) take photos that are
 * 4–10 MB at native resolution. Posting them as base64 over 3G fails with
 * 413/timeout, and FastAPI's default body limit silently drops them. iOS
 * sellers additionally face HEIC files which the server's PIL build can't
 * decode without `pillow-heif`.
 *
 * This module normalises every file pre-upload:
 *
 *   • Decoded via Canvas (works for JPEG, PNG, WebP, *and* HEIC on Safari
 *     since iOS 14 — the browser handles the decode itself).
 *   • Resized so the longest edge is ≤ 1600 px (plenty for product cards,
 *     KYC OCR, and zoom-in on detail pages).
 *   • Re-encoded as JPEG at quality 0.75. Falls back to 0.6 if the result
 *     still exceeds the per-file budget.
 *   • Returns clean base64 with NO `data:` prefix (matches what the
 *     backend `image_b64` field expects).
 *
 * One byte budget covers all current use-cases:
 *   - Product images   → 1.5 MB
 *   - KYC documents    → 1.5 MB
 *   - Profile avatars  → 0.5 MB
 *
 * Usage:
 *   const { base64, sizeKB, mime } = await processImageForUpload(file);
 *   await api.post('/products', { ..., image_b64: base64 });
 */

export interface ProcessedImage {
  base64: string;       // Clean base64, no `data:image/...;base64,` prefix
  dataUrl: string;      // Full data URL — handy for `<img src=>` previews
  sizeKB: number;       // Final byte size in KB
  mime: 'image/jpeg';   // Always JPEG after processing
  width: number;
  height: number;
}

export interface ImageProcessOptions {
  /** Longest edge after resize. Default 1600 px. */
  maxEdge?: number;
  /** Initial JPEG quality. Default 0.75. */
  initialQuality?: number;
  /** Max final base64 size in KB. Default 1500 KB. */
  maxKB?: number;
  /** Progress callback (0–100). */
  onProgress?: (pct: number) => void;
}

const DEFAULTS: Required<Omit<ImageProcessOptions, 'onProgress'>> = {
  maxEdge: 1600,
  initialQuality: 0.75,
  maxKB: 1500,
};

function readFileAsDataURL(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    if (onProgress) {
      reader.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 30));
      };
    }
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be decoded. Try a JPEG or PNG.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encode failed'))),
      'image/jpeg',
      quality,
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to encode result'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Process a File from an `<input type="file">` or camera capture into a
 * compact JPEG base64 string the backend can store as-is.
 *
 * Throws (with a user-friendly message) if the file isn't an image, can't be
 * decoded, or is still too large after maximum compression.
 */
export async function processImageForUpload(
  file: File,
  opts: ImageProcessOptions = {},
): Promise<ProcessedImage> {
  const o = { ...DEFAULTS, ...opts };
  const onProgress = opts.onProgress;

  if (!file) throw new Error('No file selected');
  if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif)$/i)) {
    throw new Error('Please pick an image file (JPEG, PNG, or HEIC).');
  }

  onProgress?.(5);
  // 1. Read the file as a data URL so canvas can ingest it. This is the only
  //    step where HEIC support depends on the browser — iOS Safari handles it
  //    automatically; on stock Android Chrome 90+ it also works.
  const dataUrl = await readFileAsDataURL(file, onProgress);

  onProgress?.(35);
  const img = await loadImage(dataUrl);

  // 2. Compute resize dimensions preserving aspect ratio.
  const longest = Math.max(img.width, img.height);
  const scale = longest > o.maxEdge ? o.maxEdge / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  // 3. Draw to canvas, re-encode as JPEG.
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser does not support canvas image processing.');
  ctx.fillStyle = '#ffffff'; // flatten transparency for JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  onProgress?.(70);

  // 4. Try quality levels from initial → 0.45 until under the size budget.
  let blob = await canvasToBlob(canvas, o.initialQuality);
  let quality = o.initialQuality;
  while (blob.size / 1024 > o.maxKB && quality > 0.45) {
    quality = Math.max(0.45, quality - 0.1);
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size / 1024 > o.maxKB) {
    // Last resort: shrink dimensions further.
    canvas.width = Math.round(w * 0.75);
    canvas.height = Math.round(h * 0.75);
    const ctx2 = canvas.getContext('2d');
    if (ctx2) {
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    blob = await canvasToBlob(canvas, 0.6);
  }

  onProgress?.(90);
  const fullDataUrl = await blobToBase64(blob);
  const base64 = fullDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

  onProgress?.(100);
  return {
    base64,
    dataUrl: fullDataUrl,
    sizeKB: Math.round(blob.size / 1024),
    mime: 'image/jpeg',
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Format a friendly size label for the UI ("420 KB", "1.4 MB").
 */
export function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
