import { ZodError } from "zod";
import { badRequest } from "../utils/errors.js";
import { DEFAULT_SKIP_KEYS, deepSanitize } from "../utils/sanitize.js";

/**
 * Validate and replace req.params / req.query / req.body with the parsed
 * (stripped, coerced, sanitized) result. Schemas drop unknown keys, which is what
 * prevents mass assignment, while deepSanitize eliminates Stored XSS vectors.
 *
 * `rawFields` lists body fields that carry data, not markup (an uploaded file as base64, a document's text): they are
 * validated but not run through the HTML sanitizer, which would otherwise rewrite "<...>" and "data:" in them.
 */
export function validate(schemas, { rawFields = [] } = {}) {
  const skipKeys = rawFields.length ? new Set([...DEFAULT_SKIP_KEYS, ...rawFields]) : DEFAULT_SKIP_KEYS;
  return (req, res, next) => {
    try {
      for (const part of ["params", "query", "body"]) {
        if (!schemas[part]) continue;
        const parsed = schemas[part].parse(req[part] ?? {});
        const sanitized = deepSanitize(parsed, skipKeys);
        if (part === "query") {
          Object.defineProperty(req, "query", { value: sanitized, writable: true, configurable: true });
        } else {
          req[part] = sanitized;
        }
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
        const first = details[0];
        const text = first ? `${first.field ? first.field + ": " : ""}${first.message}` : "Data tidak valid.";
        return next(badRequest(text, { code: "VALIDATION_ERROR", details }));
      }
      next(err);
    }
  };
}
