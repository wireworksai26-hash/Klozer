import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURE_LIST, FIRST_PERIOD_DISCOUNT, PLAN_FEATURES, PLAN_PRICES, PROMO, planOffer as uiOffer } from "../src/utils/plans.js";
import * as server from "../../backend/src/utils/plans.js";

// The server charges and activates what the server's catalog says; the pages show what plans.js says. These must be one story.

const KEY = { Starter: "starter", Pro: "pro" };

test("the server and the pages agree on every price and introductory discount", () => {
  for (const [name, key] of Object.entries(KEY)) {
    assert.equal(server.PLANS[key].monthly, PLAN_PRICES[name].monthly, `${name} monthly price`);
    assert.deepEqual(server.PLANS[key].intro, FIRST_PERIOD_DISCOUNT[name], `${name} discount`);
  }
  assert.deepEqual(server.PROMO, PROMO);
});

test("the server and the pages work out the same price for every plan and period", () => {
  for (const [name, key] of Object.entries(KEY)) {
    for (const period of ["monthly", "annual"]) {
      const ui = uiOffer(name, period);
      const srv = server.planOffer(key, period);
      assert.deepEqual([srv.months, srv.listPriceIdr, srv.priceIdr, srv.percent], [ui.months, ui.regularTotal, ui.firstTotal, ui.percent], `${name} ${period}`);
      const regular = server.planOffer(key, period, { firstPurchase: false });
      assert.deepEqual([regular.priceIdr, regular.percent], [ui.regularTotal, 0], `${name} ${period} regular`);
    }
  }
});

test("the server turns on exactly the features each package lists", () => {
  assert.deepEqual([...server.PLAN_FEATURE_KEYS], FEATURE_LIST.map((f) => f.key));
  for (const [name, key] of Object.entries(KEY)) {
    const wanted = Object.entries(PLAN_FEATURES[name]).filter(([, on]) => on).map(([k]) => k).sort();
    assert.deepEqual([...server.PLAN_FEATURES[key]].sort(), wanted, `${name} features`);
    assert.deepEqual(server.featureMapFor(key), PLAN_FEATURES[name], `${name} switches`);
  }
});
