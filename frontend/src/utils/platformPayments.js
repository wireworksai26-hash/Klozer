// Where Klozer itself is paid, read by server-rendered pages (the payment page). The list is managed by the superadmin in
// the dashboard; when the backend cannot be reached the caller falls back to the static facts in utils/legal/config.js.

const BACKEND = process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";

/** @returns {Promise<object[]|null>} the active methods, or null when the list could not be read */
export async function fetchPaymentMethods() {
  try {
    const response = await fetch(`${BACKEND}/api/v1/public/payment-methods`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body?.data) ? body.data : null;
  } catch {
    return null;
  }
}
