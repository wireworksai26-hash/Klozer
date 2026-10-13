// Pure rules for keeping the browser's cached profile (localStorage "klozer_user") in step with the
// server session (httpOnly cookie). Kept free of React/DOM so they can be unit-tested.

export const USER_STORAGE_KEY = "klozer_user";

/** Do not ask /auth/me again within this window (focus + visibility fire together on tab switch). */
export const REVALIDATE_MIN_GAP_MS = 30_000;
/** A tab left open and visible re-checks at this cadence even without user activity. */
export const REVALIDATE_INTERVAL_MS = 5 * 60_000;

export function shouldRevalidate({ lastCheckedAt = 0, now = Date.now(), minGapMs = REVALIDATE_MIN_GAP_MS } = {}) {
  return now - lastCheckedAt >= minGapMs;
}

/**
 * The server answered /auth/me with a failure. Only 401 means the session is gone (expired, revoked,
 * deactivated user/institution, or password changed). A 5xx, a CSRF 403 or no network says nothing
 * about the session, so the cached profile must be kept.
 */
export function classifyMeFailure(status) {
  return status === 401 ? "expired" : "unknown";
}

/**
 * Another tab changed localStorage. Returns what this tab should do:
 *  - "end":    the other tab signed out (or storage was cleared) -> sign out here too
 *  - "reload": another account signed in in the other tab -> reload so this tab never mixes identities
 *  - "ignore": unrelated key, or the same account refreshed its profile
 */
export function decideStorageAction({ key, newValue, currentUserId, userKey = USER_STORAGE_KEY }) {
  if (key === null) return "end";
  if (key !== userKey) return "ignore";
  if (newValue === null || newValue === undefined) return "end";
  let nextId;
  try {
    nextId = JSON.parse(newValue)?.id;
  } catch {
    return "ignore";
  }
  if (currentUserId != null && nextId != null && String(nextId) !== String(currentUserId)) return "reload";
  return "ignore";
}

/** True when the server's view of the profile differs in a way that changes what the UI may show. */
export function profileScopeChanged(previous, next) {
  if (!previous || !next) return false;
  return previous.role !== next.role || String(previous.institutionId) !== String(next.institutionId);
}
