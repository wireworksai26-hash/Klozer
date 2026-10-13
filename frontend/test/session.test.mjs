import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REVALIDATE_MIN_GAP_MS,
  classifyMeFailure,
  decideStorageAction,
  profileScopeChanged,
  shouldRevalidate,
} from "../src/utils/sessionSync.mjs";

test("only a 401 from /auth/me means the session is gone", () => {
  assert.equal(classifyMeFailure(401), "expired");
  for (const status of [0, 403, 404, 500, 502, 503]) {
    assert.equal(classifyMeFailure(status), "unknown", `status ${status} must keep the cached profile`);
  }
});

test("revalidation is throttled so focus + visibility do not double-fire", () => {
  const now = 1_000_000;
  assert.equal(shouldRevalidate({ lastCheckedAt: now - 1_000, now }), false);
  assert.equal(shouldRevalidate({ lastCheckedAt: now - REVALIDATE_MIN_GAP_MS, now }), true);
  assert.equal(shouldRevalidate({ lastCheckedAt: 0, now }), true);
});

test("another tab signing out ends this session; clearing storage does too", () => {
  assert.equal(decideStorageAction({ key: "klozer_user", newValue: null, currentUserId: 7 }), "end");
  assert.equal(decideStorageAction({ key: null, newValue: null, currentUserId: 7 }), "end");
});

test("another tab switching account reloads this one; the same account does not", () => {
  const other = JSON.stringify({ id: 9, name: "Siti" });
  const same = JSON.stringify({ id: 7, name: "Hendra" });
  assert.equal(decideStorageAction({ key: "klozer_user", newValue: other, currentUserId: 7 }), "reload");
  assert.equal(decideStorageAction({ key: "klozer_user", newValue: same, currentUserId: 7 }), "ignore");
  assert.equal(decideStorageAction({ key: "klozer_user", newValue: same, currentUserId: "7" }), "ignore");
});

test("unrelated storage keys and unreadable values are ignored", () => {
  assert.equal(decideStorageAction({ key: "klozer_language", newValue: "en", currentUserId: 7 }), "ignore");
  assert.equal(decideStorageAction({ key: "klozer_user", newValue: "{not json", currentUserId: 7 }), "ignore");
});

test("a role or tenant change is flagged so data is reloaded; a name change is not", () => {
  const before = { id: 1, role: "cs", institutionId: 2, name: "A" };
  assert.equal(profileScopeChanged(before, { ...before, role: "supervisor" }), true);
  assert.equal(profileScopeChanged(before, { ...before, institutionId: 3 }), true);
  assert.equal(profileScopeChanged(before, { ...before, name: "B" }), false);
  assert.equal(profileScopeChanged(null, before), false);
});
