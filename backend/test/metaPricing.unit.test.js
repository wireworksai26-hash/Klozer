import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { META_SERVICE_FREE_PER_MONTH, estimateMetaCost, serviceUsage, wibMonthStart } from "../src/utils/metaPricing.js";
import { classifySendError } from "../src/services/broadcast/sendErrors.js";

describe("Meta message cost", () => {
  test("a campaign is priced per delivered message by its category", () => {
    const promo = estimateMetaCost("marketing", 1000);
    assert.equal(promo.total, 586330);
    assert.equal(promo.totalWithVat, 650826);
    assert.equal(estimateMetaCost("utility", 1000).total, 356650);
    assert.equal(estimateMetaCost("marketing", 0).total, 0);
  });

  test("an unknown category is priced as marketing, never cheaper than it is", () => {
    assert.equal(estimateMetaCost("whatever", 10).category, "marketing");
    assert.equal(estimateMetaCost("whatever", 10).total, estimateMetaCost("marketing", 10).total);
    assert.equal(estimateMetaCost("toString", 10).category, "marketing");
  });

  test("replies are free until the monthly allowance of each number is used up", () => {
    assert.deepEqual({ ...serviceUsage(400), asOf: undefined }, { used: 400, freeTier: 1000, remainingFree: 600, billable: 0, estimatedCost: 0, asOf: undefined });
    const over = serviceUsage(META_SERVICE_FREE_PER_MONTH + 2000);
    assert.equal(over.remainingFree, 0);
    assert.equal(over.billable, 2000);
    assert.equal(over.estimatedCost, 713300);
  });

  test("the month Meta counts in starts at midnight Jakarta time", () => {
    assert.equal(wibMonthStart(new Date("2026-10-25T05:00:00Z")).toISOString(), "2026-09-30T17:00:00.000Z");
    // 17:30 UTC on the 31st is already November 1st in Jakarta
    assert.equal(wibMonthStart(new Date("2026-10-31T17:30:00Z")).toISOString(), "2026-10-31T17:00:00.000Z");
  });
});

describe("Meta payment errors", () => {
  test("a missing payment method stops the whole campaign, it is not a bad number", () => {
    assert.deepEqual(classifySendError(131042), { action: "pause", reason: "payment_problem" });
  });
});
