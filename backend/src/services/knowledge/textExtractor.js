import { extractText, getDocumentProxy } from "unpdf";
import { badRequest } from "../../utils/errors.js";
import { validateUploadedBuffer } from "../../utils/fileValidator.js";
import { normalizeText } from "./chunker.js";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_CHARS = 400_000;
export const MAX_PDF_PAGES = 300;

// fileValidator reports any non-binary file as "text/csv"; PDFs have their own signature.
const ALLOWED = new Set(["application/pdf", "text/csv"]);
const TEXT_NAME = /\.(txt|md|markdown|text|csv)$/i;

function decodeUtf8(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw badRequest("Berkas teks harus berenkode UTF-8. Simpan ulang sebagai UTF-8 atau tempel isinya langsung.", { code: "BAD_ENCODING" });
  }
}

async function readPdf(buffer) {
  let doc;
  try {
    doc = await getDocumentProxy(new Uint8Array(buffer));
  } catch {
    throw badRequest("PDF tidak dapat dibuka. Berkasnya rusak atau dilindungi kata sandi.", { code: "BAD_PDF" });
  }
  if (doc.numPages > MAX_PDF_PAGES) {
    throw badRequest(`PDF terlalu panjang (${doc.numPages} halaman, maksimal ${MAX_PDF_PAGES}). Pecah menjadi beberapa berkas.`, { code: "PDF_TOO_LONG" });
  }
  const { text } = await extractText(doc, { mergePages: true });
  return { text: Array.isArray(text) ? text.join("\n\n") : text, pages: doc.numPages };
}

/**
 * Read the text out of an uploaded file. Accepts PDF (with a text layer) and plain text / Markdown / CSV.
 * The file's real type comes from its first bytes, never from the name or the declared type.
 * @returns {Promise<{ text: string, mimeType: string, pages: number | null }>}
 */
export async function extractDocumentText({ buffer, fileName = "" }) {
  const { mimeType } = validateUploadedBuffer({ buffer, declaredFileName: fileName, allowedMimes: ALLOWED, maxSizeBytes: MAX_FILE_BYTES });

  let raw;
  let pages = null;
  if (mimeType === "application/pdf") {
    ({ text: raw, pages } = await readPdf(buffer));
  } else {
    if (fileName && !TEXT_NAME.test(fileName)) {
      throw badRequest("Format berkas belum didukung. Gunakan PDF, TXT, atau MD, atau tempel teksnya langsung.", { code: "UNSUPPORTED_FORMAT" });
    }
    raw = decodeUtf8(buffer);
  }

  const text = normalizeText(raw);
  if (!text) {
    throw badRequest(
      mimeType === "application/pdf"
        ? "PDF ini tidak memiliki teks yang bisa dibaca (kemungkinan hasil scan atau gambar). Unggah PDF berbasis teks, atau tempel teksnya langsung."
        : "Berkas kosong.",
      { code: "NO_TEXT" }
    );
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw badRequest(`Isi berkas terlalu panjang (${text.length.toLocaleString("id-ID")} karakter, maksimal ${MAX_TEXT_CHARS.toLocaleString("id-ID")}). Pecah menjadi beberapa dokumen.`, { code: "TEXT_TOO_LONG" });
  }
  return { text, mimeType, pages };
}
