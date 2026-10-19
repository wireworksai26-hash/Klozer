import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isEligible, pickAgent } from "../src/services/routing/assignmentPolicy.js";
import { DEFAULT_HANDOFF_KEYWORDS, detectHandoff, handoffReply, isHumanHolding, normalizeForMatch, reasonLabel } from "../src/services/handoff/handoffPolicy.js";
import { CHANNEL_LIMITS, channelLimitFor } from "../src/services/channels/channelPlans.js";

// Pure rules, no database: who gets a conversation, when the AI hands over, how many channels a plan allows.

const agent = (id, over = {}) => ({ id, isActive: true, isOnline: true, isAvailable: true, openChats: 0, lastAssignedAt: null, ...over });
const settings = (over = {}) => ({ mode: "least_busy", onlineOnly: true, maxOpenChats: 20, ...over });

describe("who may receive conversations", () => {
  test("an offline agent is skipped when the tenant routes to online agents only", () => {
    assert.equal(isEligible(agent(1, { isOnline: false }), settings()), false);
    assert.equal(isEligible(agent(1, { isOnline: false }), settings({ onlineOnly: false })), true);
  });

  test("an agent who switched to away never receives conversations", () => {
    assert.equal(isEligible(agent(1, { isAvailable: false }), settings({ onlineOnly: false })), false);
  });

  test("a deactivated agent is never eligible", () => {
    assert.equal(isEligible(agent(1, { isActive: false }), settings({ onlineOnly: false })), false);
  });
});

describe("picking an agent", () => {
  test("least_busy chooses the agent with the fewest open chats", () => {
    const picked = pickAgent([agent(1, { openChats: 5 }), agent(2, { openChats: 2 }), agent(3, { openChats: 9 })], settings());
    assert.equal(picked, 2);
  });

  test("least_busy breaks a tie in favour of whoever was assigned longest ago", () => {
    const picked = pickAgent([agent(1, { openChats: 3, lastAssignedAt: "2026-01-02T10:00:00Z" }), agent(2, { openChats: 3, lastAssignedAt: "2026-01-02T09:00:00Z" })], settings());
    assert.equal(picked, 2);
  });

  test("an agent who was never assigned goes first", () => {
    const picked = pickAgent([agent(1, { openChats: 1, lastAssignedAt: "2026-01-02T09:00:00Z" }), agent(2, { openChats: 1, lastAssignedAt: null })], settings());
    assert.equal(picked, 2);
  });

  test("round_robin ignores load and rotates by last assignment", () => {
    const agents = [agent(1, { openChats: 0, lastAssignedAt: "2026-01-02T10:00:00Z" }), agent(2, { openChats: 15, lastAssignedAt: "2026-01-02T08:00:00Z" })];
    assert.equal(pickAgent(agents, settings({ mode: "round_robin" })), 2);
  });

  test("agents at capacity are skipped, and nobody is picked when all are full", () => {
    const full = settings({ maxOpenChats: 3 });
    assert.equal(pickAgent([agent(1, { openChats: 3 }), agent(2, { openChats: 2 })], full), 2);
    assert.equal(pickAgent([agent(1, { openChats: 3 }), agent(2, { openChats: 7 })], full), null);
  });

  test("manual mode never picks anyone", () => {
    assert.equal(pickAgent([agent(1)], settings({ mode: "manual" })), null);
  });

  test("nobody online means nobody is picked", () => {
    assert.equal(pickAgent([agent(1, { isOnline: false }), agent(2, { isAvailable: false })], settings()), null);
    assert.equal(pickAgent([], settings()), null);
  });

  test("the same input always gives the same answer", () => {
    const agents = [agent(4, { openChats: 1 }), agent(2, { openChats: 1 }), agent(3, { openChats: 1 })];
    assert.equal(pickAgent(agents, settings()), 2);
    assert.equal(pickAgent([...agents].reverse(), settings()), 2);
  });
});

describe("detecting a request for a person", () => {
  test("matches whole words and phrases, ignoring case and punctuation", () => {
    assert.equal(detectHandoff("Saya KECEWA banget!!"), "kecewa");
    assert.equal(detectHandoff("mau bicara dengan manusia dong"), "bicara dengan manusia");
    assert.equal(detectHandoff("Minta refund ya"), "refund");
  });

  test("does not fire inside a longer word", () => {
    assert.equal(detectHandoff("kamu bukan tipuan kan"), null);
    assert.equal(detectHandoff("harga berapa kak"), null);
  });

  test("a tenant's own list replaces the built-in one", () => {
    assert.equal(detectHandoff("saya kecewa", ["garansi"]), null);
    assert.equal(detectHandoff("klaim garansi dong", ["garansi"]), "garansi");
  });

  test("empty and non-text input never matches", () => {
    assert.equal(detectHandoff(""), null);
    assert.equal(detectHandoff("   "), null);
    assert.equal(detectHandoff(undefined), null);
  });

  test("normalisation keeps letters and digits only", () => {
    assert.equal(normalizeForMatch("  Saya,   KECEWA!! 123 "), "saya kecewa 123");
  });

  test("the built-in list has no blank entries", () => {
    assert.ok(DEFAULT_HANDOFF_KEYWORDS.every((k) => normalizeForMatch(k).length > 1));
  });
});

describe("hand-off wording", () => {
  test("the customer is always told the team is taking over, with and without an agent online", () => {
    assert.match(handoffReply({ agentAvailable: true }), /aku sambungkan ke tim kami/);
    assert.match(handoffReply({ agentAvailable: false }), /aku sambungkan ke tim kami/);
    assert.match(handoffReply({ agentAvailable: false }), /tidak online/);
  });

  test("reasons are readable, and keyword reasons name the keyword", () => {
    assert.equal(reasonLabel("keyword:refund"), 'Kata kunci "refund" terdeteksi');
    assert.match(reasonLabel("payment_proof"), /Bukti pembayaran/);
    assert.equal(reasonLabel("something_new"), "Dialihkan ke tim");
  });
});

describe("how long a person holds a conversation", () => {
  const now = new Date("2026-03-01T10:00:00Z");
  const minutesAgo = (m) => new Date(now.getTime() - m * 60_000).toISOString();

  test("held until the hold time passes without human activity", () => {
    assert.equal(isHumanHolding({ handled_by: "human", handoff_at: minutesAgo(10) }, 30, now), true);
    assert.equal(isHumanHolding({ handled_by: "human", handoff_at: minutesAgo(31) }, 30, now), false);
  });

  test("a conversation the AI handles is never held", () => {
    assert.equal(isHumanHolding({ handled_by: "ai", handoff_at: minutesAgo(1) }, 30, now), false);
    assert.equal(isHumanHolding({ handled_by: "human", handoff_at: null }, 30, now), false);
  });
});

describe("channels per plan", () => {
  test("each tier has a limit and unknown tiers fall back to the smallest", () => {
    assert.equal(channelLimitFor("starter"), CHANNEL_LIMITS.starter);
    assert.equal(channelLimitFor("pro"), CHANNEL_LIMITS.pro);
    assert.equal(channelLimitFor("enterprise"), CHANNEL_LIMITS.enterprise);
    assert.equal(channelLimitFor("nonsense"), CHANNEL_LIMITS.starter);
    assert.ok(CHANNEL_LIMITS.starter < CHANNEL_LIMITS.pro && CHANNEL_LIMITS.pro < CHANNEL_LIMITS.enterprise);
  });
});
