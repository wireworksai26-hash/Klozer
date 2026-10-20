// Limits the backend enforces (backend/src/validation/learningSchemas.js and services/knowledge/textExtractor.js).
export const TITLE_MAX = 200;
export const CONTENT_MIN = 10;
export const CONTENT_MAX = 400_000;
export const FILE_MAX_BYTES = 5 * 1024 * 1024;
export const FILE_EXTENSIONS = ["pdf", "txt", "md", "markdown", "text", "csv"];
export const FILE_ACCEPT = FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export const extensionOf = (fileName) => {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName || "");
  return match ? match[1].toLowerCase() : "";
};

/** 1536 -> "1,5 KB". Sizes are small numbers with a unit, so they read the same in both languages. */
export function formatBytes(bytes, locale = "id-ID") {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "-";
  if (n < 1024) return `${n.toLocaleString(locale)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} KB`;
  return `${(n / (1024 * 1024)).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}
