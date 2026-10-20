import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PLAN_PRICES, PROMO, annualBreakdown, planOffer } from "../src/utils/plans.js";

describe("plan prices", () => {
  test("regular monthly prices: Starter 449.000, Pro 599.000", () => {
    assert.deepEqual(PLAN_PRICES, { Starter: { monthly: 449000 }, Pro: { monthly: 599000 } });
  });

  test("Pro monthly: 30% off the first month only", () => {
    const o = planOffer("Pro", "monthly");
    assert.deepEqual([o.months, o.regularTotal, o.percent, o.firstTotal, o.saving], [1, 599000, 30, 419300, 179700]);
  });

  test("Pro annual: paid once, 599.000 x 12 = 7.188.000, 20% off the first year", () => {
    const o = planOffer("Pro", "annual");
    assert.deepEqual([o.months, o.regularTotal, o.percent, o.firstTotal], [12, 7188000, 20, 5750400]);
    assert.equal(annualBreakdown(o), "Rp 599.000 x 12 bulan = Rp 7.188.000");
  });

  test("Starter monthly: 10% off the first month only", () => {
    const o = planOffer("Starter", "monthly");
    assert.deepEqual([o.regularTotal, o.percent, o.firstTotal], [449000, 10, 404100]);
  });

  test("Starter annual: 449.000 x 12 = 5.388.000, 15% off the first year", () => {
    const o = planOffer("Starter", "annual");
    assert.deepEqual([o.regularTotal, o.percent, o.firstTotal], [5388000, 15, 4579800]);
    assert.equal(annualBreakdown(o), "Rp 449.000 x 12 bulan = Rp 5.388.000");
  });

  test("the gap between Starter and Pro is Rp 150.000 a month", () => {
    assert.equal(PLAN_PRICES.Pro.monthly - PLAN_PRICES.Starter.monthly, 150000);
  });

  test("every amount is an exact whole rupiah (what the customer is charged, never rounded to a round number)", () => {
    for (const name of Object.keys(PLAN_PRICES)) {
      for (const period of ["monthly", "annual"]) {
        const o = planOffer(name, period);
        assert.ok(Number.isInteger(o.firstTotal), `${name} ${period}`);
        assert.equal(o.firstTotal + o.saving, o.regularTotal);
      }
    }
  });

  test("after the introductory period the regular price applies", () => {
    for (const name of Object.keys(PLAN_PRICES)) {
      assert.equal(planOffer(name, "monthly").regularTotal, PLAN_PRICES[name].monthly);
      assert.equal(planOffer(name, "annual").regularTotal, PLAN_PRICES[name].monthly * 12);
    }
  });

  test("an unknown plan or period has no offer, and the discount can be switched off or expire", () => {
    assert.equal(planOffer("Gratis", "monthly"), null);
    assert.equal(planOffer("Pro", "weekly"), null);
    const before = { ...PROMO };
    try {
      PROMO.active = false;
      assert.deepEqual([planOffer("Pro", "monthly").percent, planOffer("Pro", "monthly").firstTotal], [0, 599000]);
      PROMO.active = true;
      PROMO.endsAt = "2026-01-01T00:00:00+07:00";
      assert.equal(planOffer("Pro", "monthly", new Date("2026-06-01")).percent, 0, "after the end date");
      assert.equal(planOffer("Pro", "monthly", new Date("2025-12-01")).percent, 30, "before the end date");
    } finally {
      Object.assign(PROMO, before);
    }
  });
});
