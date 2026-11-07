// Helpers for sending the shop's QRIS picture to the server as base64 (the same way the other pictures are sent).

/** Matches MAX_QRIS_IMAGE_BYTES on the server. */
export const MAX_QRIS_BYTES = 1.5 * 1024 * 1024;
export const QRIS_ACCEPT = "image/png,image/jpeg,image/webp";

/** The file's bytes as base64, without the "data:...;base64," prefix. */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

/** A problem with the picked file that can be told before it is sent, or null. */
export function qrisFileProblem(file) {
  if (!file) return "Pilih gambar QRIS dulu.";
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return "Gambar harus PNG, JPG, atau WebP.";
  if (file.size > MAX_QRIS_BYTES) return "Gambar lebih dari 1,5 MB. Perkecil dulu.";
  return null;
}

/** The path of the public picture, so the dashboard loads it from its own address (the server's full URL may differ in dev). */
export const qrisPath = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};
