import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildComponents, buildSendComponents, describeComponents, mapMetaCategory, mapMetaStatus, placeholderNumbers, renderBody, validateTemplateInput } from "../src/services/broadcast/templateModel.js";
import { cleanParameter, resolveVariables, validateVariableSpec } from "../src/services/broadcast/variableMapper.js";
import { classifySendError } from "../src/services/broadcast/sendErrors.js";
import { buildPurchaseEvent } from "../src/services/metaCapiService.js";
import { insightToSpend } from "../src/services/ads/metaAdsSync.js";
import { mergeByAd, sumBuckets, withMetrics } from "../src/services/ads/roasReport.js";
import { createTemplateBody, createCampaignBody, importConsentBody, upsertSpendBody, adsSettingsBody, launchCampaignBody } from "../src/validation/broadcastSchemas.js";
import { extractStatuses, extractTemplateEvents } from "../src/controllers/webhookController.js";
import { isOptOut } from "../src/services/commerce/purchaseIntent.js";

// The rules of broadcasts and ad reporting that need neither a database nor a network.

const validTemplate = {
  name: "promo_akhir_bulan",
  category: "marketing",
  body: "Halo {{1}}, kami punya promo {{2}} khusus untuk Anda sampai akhir bulan ini. Balas pesan ini untuk memesan.",
  bodyExamples: ["Budi", "diskon 20%"],
};

describe("templates", () => {
  test("placeholders are found in order, once each", () => {
    assert.deepEqual(placeholderNumbers("Halo {{1}}, kode {{2}}, sekali lagi {{1}}"), [1, 2]);
    assert.deepEqual(placeholderNumbers("tanpa variabel"), []);
    assert.deepEqual(placeholderNumbers("{{ 3 }} spasi"), [3]);
  });

  test("a good template has no problems", () => {
    assert.deepEqual(validateTemplateInput(validTemplate), []);
  });

  test("the rules Meta enforces are caught before submitting", () => {
    const problems = (over) => validateTemplateInput({ ...validTemplate, ...over });
    assert.match(problems({ name: "Promo Baru" })[0], /huruf kecil/);
    assert.ok(problems({ category: "authentication" }).some((p) => /OTP/.test(p)));
    assert.ok(problems({ body: "" }).some((p) => /wajib/.test(p)));
    assert.ok(problems({ body: "x".repeat(1025), bodyExamples: [] }).some((p) => /1024/.test(p)));
    assert.ok(problems({ body: "Halo {{1}} dan {{3}} isi pesan yang cukup panjang ya", bodyExamples: ["a", "b"] }).some((p) => /berurutan/.test(p)));
    assert.ok(problems({ body: "{{1}} adalah nama kamu di sini dan seterusnya ya", bodyExamples: ["a"] }).some((p) => /diawali atau diakhiri/.test(p)));
    assert.ok(problems({ body: "Halo kak {{1}}{{2}} promo seru untuk kamu semua ya", bodyExamples: ["a", "b"] }).some((p) => /berdempetan/.test(p)));
    assert.ok(problems({ bodyExamples: ["Budi"] }).some((p) => /contoh untuk 2 variabel/.test(p)));
    assert.ok(problems({ body: "Halo {{1}}.", bodyExamples: ["Budi"] }).some((p) => /terlalu pendek/.test(p)));
    assert.ok(problems({ buttons: Array(4).fill({ type: "quick_reply", text: "Ya" }) }).some((p) => /Maksimal 3 tombol/.test(p)));
    assert.ok(problems({ buttons: [{ type: "url", text: "Buka", url: "http://tidak-aman.id" }] }).some((p) => /https/.test(p)));
    assert.ok(problems({ headerText: "x".repeat(61) }).some((p) => /Judul/.test(p)));
    assert.ok(problems({ footer: "x".repeat(61) }).some((p) => /Catatan kaki/.test(p)));
  });

  test("the request to Meta carries examples, header, footer and buttons in Meta's shape", () => {
    const components = buildComponents({ ...validTemplate, headerText: "Promo", footer: "Balas STOP untuk berhenti", buttons: [{ type: "quick_reply", text: "Pesan" }, { type: "url", text: "Lihat", url: "https://toko.id" }] });
    assert.deepEqual(components.map((c) => c.type), ["HEADER", "BODY", "FOOTER", "BUTTONS"]);
    assert.deepEqual(components[1].example, { body_text: [["Budi", "diskon 20%"]] });
    assert.deepEqual(components[3].buttons, [{ type: "QUICK_REPLY", text: "Pesan" }, { type: "URL", text: "Lihat", url: "https://toko.id" }]);
    assert.equal(components[0].example, undefined, "a header without a variable needs no example");
  });

  test("components from Meta are described the same way whoever created them", () => {
    const meta = describeComponents([
      { type: "HEADER", format: "IMAGE" },
      { type: "BODY", text: "Halo {{1}}, pesananmu {{2}} sudah siap diambil ya." },
      { type: "FOOTER", text: "Terima kasih" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "OK" }] },
    ]);
    assert.deepEqual([meta.variableCount, meta.headerFormat, meta.footer, meta.buttons], [2, "image", "Terima kasih", [{ type: "quick_reply", text: "OK" }]]);
    assert.deepEqual(describeComponents([]), { bodyText: "", variableCount: 0, headerFormat: "none", headerVariables: 0, footer: null, buttons: [] });
  });

  test("the preview fills variables; unfilled ones stay visible", () => {
    assert.equal(renderBody("Halo {{1}}, kode {{2}}", ["Budi"]), "Halo Budi, kode {{2}}");
  });

  test("send components: body parameters in order, header media only for media templates", () => {
    const text = buildSendComponents({ variableCount: 2, headerFormat: "none" }, ["Budi", "A1"]);
    assert.deepEqual(text, [{ type: "body", parameters: [{ type: "text", text: "Budi" }, { type: "text", text: "A1" }] }]);
    const withImage = buildSendComponents({ variableCount: 1, headerFormat: "image" }, ["Budi"], "https://cdn.toko.id/promo.jpg");
    assert.deepEqual(withImage[0], { type: "header", parameters: [{ type: "image", image: { link: "https://cdn.toko.id/promo.jpg" } }] });
    assert.deepEqual(buildSendComponents({ variableCount: 0, headerFormat: "none" }, []), []);
    assert.equal(buildSendComponents({ variableCount: 1, headerFormat: "text" }, ["a"], "https://x.id/a.jpg").length, 1, "a text header takes no media");
  });

  test("Meta's status words map to ours, and anything unknown is not usable", () => {
    assert.equal(mapMetaStatus("APPROVED"), "approved");
    assert.equal(mapMetaStatus("REJECTED"), "rejected");
    assert.equal(mapMetaStatus("PAUSED"), "paused");
    assert.equal(mapMetaStatus("IN_APPEAL"), "pending");
    assert.equal(mapMetaStatus("SOMETHING_NEW"), "pending");
    assert.equal(mapMetaCategory("MARKETING"), "marketing");
    assert.equal(mapMetaCategory("weird"), "utility");
  });
});

describe("variables", () => {
  test("fields and fixed text fill the variables, with fallbacks for missing data", () => {
    const spec = [{ type: "field", field: "first_name", fallback: "Kak" }, { type: "text", value: "diskon 20%" }, { type: "field", field: "city", fallback: "kotamu" }];
    assert.deepEqual(resolveVariables(spec, { name: "budi santoso", city: "Solo" }), ["Budi", "diskon 20%", "Solo"]);
    assert.deepEqual(resolveVariables(spec, { name: "Pelanggan", city: null }), ["Kak", "diskon 20%", "kotamu"], "a placeholder profile name is not greeted");
    assert.deepEqual(resolveVariables([{ type: "field", field: "city" }], { name: "Budi" }), ["-"], "never empty: WhatsApp rejects an empty parameter");
  });

  test("a parameter is one clean line", () => {
    assert.equal(cleanParameter("baris satu\nbaris dua\t\ttab   spasi"), "baris satu baris dua tab spasi");
    assert.equal(cleanParameter("x".repeat(500)).length, 200);
    assert.equal(cleanParameter(null), "");
  });

  test("the setup is checked against the template", () => {
    assert.deepEqual(validateVariableSpec([{ type: "text", value: "a" }], 1), []);
    assert.match(validateVariableSpec([], 2)[0], /2 variabel, tetapi 0 diisi/);
    assert.ok(validateVariableSpec([{ type: "field", field: "password" }], 1).some((p) => /tidak dikenal/.test(p)));
    assert.ok(validateVariableSpec([{ type: "text", value: "  " }], 1).some((p) => /tidak boleh kosong/.test(p)));
  });
});

describe("what a failed send means", () => {
  test("rate limits mean wait and try again", () => {
    for (const code of [130429, 131056, 80007]) assert.deepEqual(classifySendError(code), { action: "retry_later", backoffMinutes: 5 }, String(code));
    assert.equal(classifySendError(131048).backoffMinutes, 30, "a spam-rate limit needs a long pause");
    assert.deepEqual(classifySendError(null, { network: true }), { action: "retry_later", backoffMinutes: 1 });
    assert.deepEqual(classifySendError(undefined), { action: "retry_later", backoffMinutes: 1 });
  });

  test("a template or token problem pauses the whole campaign", () => {
    assert.deepEqual(classifySendError(190), { action: "pause", reason: "channel_auth" });
    for (const code of [132000, 132001, 132012, 132015, 132016]) assert.deepEqual(classifySendError(code), { action: "pause", reason: "template_problem" }, String(code));
  });

  test("a recipient problem fails only that recipient, with a readable reason when known", () => {
    assert.equal(classifySendError(131026).action, "fail");
    assert.match(classifySendError(131026).message, /tidak terdaftar di WhatsApp/);
    assert.match(classifySendError(131049).message, /pembatasan frekuensi/);
    assert.deepEqual(classifySendError(999999), { action: "fail", message: null });
  });
});

describe("conversion events", () => {
  const order = { order_number: "ORD-77", total_amount: "315000.00" };
  const now = new Date("2026-03-02T05:00:00Z");

  test("a Click-to-WhatsApp customer is reported with the click id and the business account", () => {
    const e = buildPurchaseEvent({ order, lead: { phone_number: "6281234", meta_ad_id: "AD1", ctwa_clid: "CLID123" }, wabaId: "999111", now });
    assert.deepEqual(e, {
      event_name: "Purchase",
      event_time: 1772427600,
      event_id: "ORD-77",
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: { whatsapp_business_account_id: "999111", ctwa_clid: "CLID123" },
      custom_data: { currency: "IDR", value: 315000, order_id: "ORD-77", ad_id: "AD1" },
    });
  });

  test("anyone else is matched by a hash of their number, which is never sent in the clear", () => {
    const e = buildPurchaseEvent({ order, lead: { phone_number: "+62 812-3456", meta_ad_id: null, ctwa_clid: null }, wabaId: "999111", now });
    assert.equal(e.action_source, "chat");
    assert.match(e.user_data.ph[0], /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(e).includes("628123456"));
    assert.equal(e.custom_data.ad_id, undefined);
  });

  test("a click id without a known business account falls back to the phone match", () => {
    const e = buildPurchaseEvent({ order, lead: { phone_number: "6281", ctwa_clid: "CLID" }, wabaId: null, now });
    assert.equal(e.action_source, "chat");
  });

  test("the event id is the order number, so a repeat is ignored by Meta", () => {
    const a = buildPurchaseEvent({ order, lead: { phone_number: "6281" }, now });
    const b = buildPurchaseEvent({ order, lead: { phone_number: "6281" }, now: new Date(now.getTime() + 60_000) });
    assert.equal(a.event_id, b.event_id);
  });
});

describe("ad spend rows and ROAS", () => {
  test("an insights row from Meta becomes a spend row", () => {
    assert.deepEqual(insightToSpend({ date_start: "2026-03-01", ad_id: 123, ad_name: "Promo A", campaign_id: "9", campaign_name: "Maret", spend: "150000.456", impressions: "12000", clicks: "340" }), {
      date: "2026-03-01", adId: "123", adName: "Promo A", campaignId: "9", campaignName: "Maret", spend: 150000.46, impressions: 12000, clicks: 340,
    });
    assert.equal(insightToSpend({ date_start: "2026-03-01" }).spend, 0);
  });

  const spendRows = [
    { adId: "A1", campaignId: "C1", adName: "Ad 1", campaignName: "Camp 1", spend: 100000, impressions: 5000, clicks: 100 },
    { adId: "A2", campaignId: "C1", adName: "Ad 2", campaignName: "Camp 1", spend: 50000, impressions: 3000, clicks: 40 },
    { adId: "A3", campaignId: "C2", adName: "Ad 3", campaignName: "Camp 2", spend: 80000, impressions: 1000, clicks: 10 },
    { adId: "", campaignId: "", adName: null, campaignName: null, spend: 20000, impressions: 0, clicks: 0 },
  ];
  const leadRows = [{ adId: "A1", leads: 10 }, { adId: "A2", leads: 5 }, { adId: "A9", leads: 2 }];
  const orderRows = [{ adId: "A1", orders: 3, revenue: 900000, grossProfit: 300000 }, { adId: "A9", orders: 1, revenue: 150000, grossProfit: 50000 }];

  test("figures are merged by ad, with the numbers that need data left null when there is none", () => {
    const rows = mergeByAd({ spendRows, leadRows, orderRows, groupBy: "ad" });
    const a1 = rows.find((r) => r.id === "A1");
    assert.deepEqual([a1.spend, a1.leads, a1.orders, a1.revenue, a1.roas, a1.costPerLead, a1.costPerOrder, a1.conversionPercent, a1.profitRoas], [100000, 10, 3, 900000, 9, 10000, 33333, 30, 3]);
    const a2 = rows.find((r) => r.id === "A2");
    assert.equal(a2.roas, 0, "spent, sold nothing: 0, not null");
    assert.equal(a2.costPerOrder, null, "cost per order needs an order");
    const a9 = rows.find((r) => r.id === "A9");
    assert.deepEqual([a9.spend, a9.roas, a9.leads, a9.orders], [0, null, 2, 1], "an ad with no recorded spend has no ROAS, but its leads and sales still count");
  });

  test("campaigns roll their ads up; ads without a known campaign stay together", () => {
    const rows = mergeByAd({ spendRows, leadRows, orderRows, groupBy: "campaign" });
    const c1 = rows.find((r) => r.id === "C1");
    assert.deepEqual([c1.name, c1.spend, c1.leads, c1.revenue, c1.roas], ["Camp 1", 150000, 15, 900000, 6]);
    const unknown = rows.find((r) => r.id === "");
    assert.equal(unknown.spend, 20000, "account-level spend");
    assert.equal(unknown.leads, 2, "the ad with no campaign");
    assert.equal(rows.find((r) => r.id === "C2").roas, 0);
  });

  test("totals add up the rows and compute their own ratios", () => {
    const rows = mergeByAd({ spendRows, leadRows, orderRows, groupBy: "ad" });
    const t = sumBuckets(rows);
    assert.deepEqual([t.spend, t.leads, t.orders, t.revenue], [250000, 17, 4, 1050000]);
    assert.equal(t.roas, 4.2);
    assert.equal(withMetrics({ spend: 0, impressions: 0, clicks: 0, leads: 0, orders: 0, revenue: 100, grossProfit: 0 }).roas, null, "no spend, no ROAS");
  });
});

describe("webhook payloads", () => {
  test("delivery statuses and template reviews are read from a WhatsApp webhook", () => {
    const body = {
      entry: [
        { id: "WABA1", changes: [{ field: "messages", value: { statuses: [{ id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "failed", errors: [{ code: 131026 }] }] } }] },
        { id: "WABA1", changes: [{ field: "message_template_status_update", value: { event: "APPROVED", message_template_id: 55, message_template_name: "promo", message_template_language: "id" } }] },
      ],
    };
    assert.deepEqual(extractStatuses(body).map((s) => s.id), ["wamid.1", "wamid.2"]);
    assert.deepEqual(extractTemplateEvents(body), [{ wabaId: "WABA1", metaTemplateId: 55, name: "promo", language: "id", event: "APPROVED", reason: undefined }]);
    assert.deepEqual(extractStatuses({}), []);
    assert.deepEqual(extractTemplateEvents(null), []);
  });

  test("a customer saying stop is recognised in the ways people write it", () => {
    for (const s of ["stop", "STOP", "berhenti dong", "jangan kirim promo lagi", "unsubscribe"]) assert.equal(isOptOut(s), true, s);
    assert.equal(isOptOut("stok ready?"), false);
  });
});

describe("request validation", () => {
  const ok = (schema, body) => schema.safeParse(body).success;

  test("templates", () => {
    assert.ok(ok(createTemplateBody, { channelId: 1, name: "promo_baru", language: "id", category: "marketing", body: "Halo {{1}}, ada promo menarik untuk kamu hari ini ya.", bodyExamples: ["Budi"] }));
    assert.ok(!ok(createTemplateBody, { channelId: 1, name: "Promo Baru", language: "id", category: "marketing", body: "x" }), "name rules");
    assert.ok(!ok(createTemplateBody, { channelId: 1, name: "promo", language: "xx", category: "marketing", body: "x" }), "language must be known");
    assert.ok(!ok(createTemplateBody, { channelId: 1, name: "otp", language: "id", category: "authentication", body: "x" }), "no one-time-code templates");
  });

  test("campaigns", () => {
    const base = { name: "Promo Maret", channelId: 1, templateId: 2, variables: [{ type: "field", field: "first_name" }, { type: "text", value: "20%" }] };
    assert.ok(ok(createCampaignBody, base));
    assert.ok(ok(createCampaignBody, { ...base, audience: { statuses: ["new"], orders: "never", quietForDays: 30 } }));
    assert.ok(!ok(createCampaignBody, { ...base, audience: { statuses: ["bogus"] } }));
    assert.ok(!ok(createCampaignBody, { ...base, variables: [{ type: "field", field: "password" }] }));
    assert.ok(!ok(createCampaignBody, { ...base, headerMediaUrl: "http://tidak-aman.id/a.jpg" }));
    assert.ok(ok(launchCampaignBody, {}));
    assert.ok(ok(launchCampaignBody, { scheduledAt: "2026-03-05T02:00:00Z" }));
    assert.ok(!ok(launchCampaignBody, { scheduledAt: "besok pagi" }));
  });

  test("consent and ads", () => {
    assert.ok(ok(importConsentBody, { phones: ["0812345678"], source: "formulir Oktober", attested: true }));
    assert.ok(!ok(importConsentBody, { phones: [], source: "x" }));
    assert.ok(!ok(importConsentBody, { phones: ["0812345678"] }), "the source is required");
    assert.ok(ok(upsertSpendBody, { rows: [{ date: "2026-03-01", spend: 150000 }] }));
    assert.ok(!ok(upsertSpendBody, { rows: [{ date: "1 Maret", spend: 150000 }] }));
    assert.ok(!ok(upsertSpendBody, { rows: [{ date: "2026-03-01", spend: -5 }] }));
    assert.ok(ok(adsSettingsBody, { adAccountId: "act_1234567890", accessToken: "EAAG-token-value-123" }));
    assert.ok(!ok(adsSettingsBody, { adAccountId: "abc", accessToken: "EAAG-token-value-123" }));
  });
});
