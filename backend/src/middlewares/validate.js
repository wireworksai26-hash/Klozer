import { ZodError } from "zod";
import { badRequest } from "../utils/errors.js";

/**
 * Validate and replace req.params / req.query / req.body with the parsed
 * (stripped, coerced) result. Schemas drop unknown keys, which is what
 * prevents mass assignment.
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const part of ["params", "query", "body"]) {
        if (!schemas[part]) continue;
        const parsed = schemas[part].parse(req[part] ?? {});
        if (part === "query") {
          Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
        } else {
          req[part] = parsed;
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
