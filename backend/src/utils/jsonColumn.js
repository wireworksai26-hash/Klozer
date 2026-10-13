/**
 * MySQL 8 hands JSON columns back as parsed objects; MariaDB (the XAMPP default) returns the same
 * column as text. Accept both so settings stored in JSON columns behave the same on either server.
 * Anything that is not a JSON object/array yields `fallback`.
 */
export function parseJsonColumn(value, fallback = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}
