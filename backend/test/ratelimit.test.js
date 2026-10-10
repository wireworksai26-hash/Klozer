import "./setupRateLimit.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { api, setupDatabase, teardownDatabase } from "./helpers.js";

before(setupDatabase);
after(teardownDatabase);

test("login is rate limited per client after repeated failures", async () => {
  const attempt = () => api().post("/api/v1/auth/login").send({ email: "nobody@test.local", password: "wrong-password-1" });
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await attempt()).status);
  assert.equal(statuses.slice(0, 10).every((s) => s === 401), true);
  assert.equal(statuses[10], 429);
  assert.equal(statuses[11], 429);
});

test("self-registration is limited to a handful per hour per client", async () => {
  const statuses = [];
  for (let i = 0; i < 7; i++) statuses.push((await api().post("/api/v1/auth/register").send({ institutionName: `Bisnis Limit ${i}` })).status);
  assert.equal(statuses.filter((s) => s === 201).length, 5);
  assert.equal(statuses.filter((s) => s === 429).length, 2);
});

test("the public landing-page AI is rate limited", async () => {
  const statuses = [];
  for (let i = 0; i < 24; i++) statuses.push((await api().post("/api/v1/ai/ask").send({ question: "Apa itu Klozer?" })).status);
  assert.ok(statuses.includes(429), "public AI must throttle");
});
