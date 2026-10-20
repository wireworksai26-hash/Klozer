/** Field messages from a validation error of the API ({ details: [{ field, message }] }), as { field: message }. */
export function fieldErrors(error) {
  const out = {};
  if (Array.isArray(error?.details)) {
    for (const d of error.details) if (d?.field && !out[d.field]) out[d.field] = d.message;
  }
  return out;
}
