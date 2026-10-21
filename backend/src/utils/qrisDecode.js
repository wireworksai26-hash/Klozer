import jsQR from "jsqr";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/**
 * Read the QR code out of a picture of a merchant's QRIS (the printed card or a screenshot), so the team does not have to
 * type the code. PNG and JPEG are read; WebP is not (the code can then be pasted as text).
 * @returns {string|null} the text in the QR code, or null when no code could be read
 */
export function decodeQrFromImage(buffer, mimeType) {
  let image;
  try {
    if (mimeType === "image/png") {
      const png = PNG.sync.read(buffer);
      image = { width: png.width, height: png.height, data: png.data };
    } else if (mimeType === "image/jpeg") {
      image = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 256 });
    } else {
      return null;
    }
  } catch {
    return null;
  }
  const found = jsQR(new Uint8ClampedArray(image.data), image.width, image.height, { inversionAttempts: "attemptBoth" });
  return found?.data ?? null;
}
