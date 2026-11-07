import test from "node:test";
import assert from "node:assert/strict";
import { GOAL_OPTIONS, PERSONA_TEMPLATES, TONE_STYLE_OPTIONS, applyPersonaTemplate } from "../src/utils/personaTemplates.js";
import { mapsUrl, telUrl, isOpen } from "../src/components/delivery/deliveryModel.js";
import { leadFromApi, roleLabel, roleToApi, uiRoleFor } from "../src/utils/mappers.mjs";

test("every persona example fits the server's limits, so saving it never fails", () => {
  const limits = { tone: 300, greetingMessage: 500, abandonedMessage: 500, customFaqKeywords: 500, brandValues: 200, preferredWords: 300, forbiddenWords: 300, offLimitTopics: 400 };
  const goals = GOAL_OPTIONS.map((o) => o.value);
  const styles = TONE_STYLE_OPTIONS.map((o) => o.value);
  const ids = new Set();
  for (const template of PERSONA_TEMPLATES) {
    assert.ok(!ids.has(template.id), `duplicate id ${template.id}`);
    ids.add(template.id);
    for (const [field, max] of Object.entries(limits)) {
      assert.equal(typeof template[field], "string", `${template.id}.${field} exists`);
      if (!["preferredWords", "forbiddenWords", "offLimitTopics"].includes(field)) assert.ok(template[field].trim(), `${template.id}.${field} is filled`);
      assert.ok([...template[field]].length <= max, `${template.id}.${field} is ${[...template[field]].length} characters, the limit is ${max}`);
    }
    assert.ok(template.name && template.summary);
    assert.ok(goals.includes(template.goal), `${template.id} goal is one the server accepts`);
    assert.ok(template.toneStyles.length >= 1 && template.toneStyles.length <= 3 && template.toneStyles.every((s) => styles.includes(s)), `${template.id} tone styles are ones the server accepts`);
  }
  assert.ok(PERSONA_TEMPLATES.length >= 5);
});

test("an example fills the voice but never the assistant's name", () => {
  const filled = applyPersonaTemplate(PERSONA_TEMPLATES[0]);
  assert.deepEqual(Object.keys(filled).sort(), ["abandonedMessage", "brandValues", "customFaqKeywords", "forbiddenWords", "goal", "greetingMessage", "offLimitTopics", "preferredWords", "tone", "toneStyles"]);
  assert.ok(!("botName" in filled));
});

test("the choices match what the server accepts", () => {
  assert.deepEqual(GOAL_OPTIONS.map((o) => o.value), ["support", "sales", "both"]);
  assert.deepEqual(TONE_STYLE_OPTIONS.map((o) => o.value), ["formal", "ramah", "empatis"]);
});

test("filling from an example copies the list, so editing the form never changes the example", () => {
  const filled = applyPersonaTemplate(PERSONA_TEMPLATES[0]);
  filled.toneStyles.push("formal");
  assert.deepEqual(PERSONA_TEMPLATES[0].toneStyles, ["ramah", "empatis"]);
});

test("the examples cover warm, formal, relaxed, short and consultative voices", () => {
  const all = PERSONA_TEMPLATES.map((t) => t.tone.toLowerCase()).join(" ");
  for (const word of ["hangat", "profesional", "santai", "singkat", "konsultan"]) assert.ok(all.includes(word), word);
});

test("a delivery PIC gets their own screen and label, and the team form maps to the right role", () => {
  assert.equal(uiRoleFor("pic_delivery"), "pic");
  assert.equal(uiRoleFor("pic_warehouse"), "cs", "the warehouse PIC is unchanged");
  assert.equal(roleLabel("pic_delivery"), "PIC Pengantaran");
  assert.equal(roleToApi("PIC Pengantaran"), "pic_delivery");
  assert.equal(roleToApi("PIC Gudang"), "pic_warehouse");
  assert.equal(roleToApi("Kurir"), "pic_delivery");
  assert.equal(roleToApi("Customer Service Junior"), "cs");
});

test("a contact carries the manual VIP mark from the server", () => {
  assert.equal(leadFromApi({ id: 1, name: "A", phone_number: "62811", is_vip: 1 }).isVip, true);
  assert.equal(leadFromApi({ id: 2, name: "B", phone_number: "62812", is_vip: 0 }).isVip, false);
  assert.equal(leadFromApi({ id: 3, name: "C", phone_number: "62813" }).isVip, false);
});

test("the PIC can call the customer and open the address in a map", () => {
  assert.equal(telUrl("6281234567890"), "tel:+6281234567890");
  assert.equal(telUrl("+62 812-3456"), "tel:+628123456");
  assert.equal(telUrl(""), null);
  assert.equal(mapsUrl(""), null);
  assert.equal(mapsUrl("Jl. Slamet Riyadi 1, Solo"), "https://www.google.com/maps/search/?api=1&query=Jl.%20Slamet%20Riyadi%201%2C%20Solo");
});

test("only assigned and picked-up deliveries are open work", () => {
  assert.equal(isOpen({ status: "assigned" }), true);
  assert.equal(isOpen({ status: "picked_up" }), true);
  for (const status of ["delivered", "failed", "cancelled"]) assert.equal(isOpen({ status }), false);
});
