import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { findTerm, isBigOrder, personaPromptLines, personaRules, splitList } from "../src/services/personaRules.js";
import { LIMITS, buildPersonaPrompt, parsePersonaAnswer } from "../src/services/personaGenerator.js";

describe("lists the owner types", () => {
  test("comma, semicolon and new line all separate, duplicates and blanks go, items are capped", () => {
    assert.deepEqual(splitList("politik, SARA; isu hukum\nPolitik,  ,"), ["politik", "SARA", "isu hukum"]);
    assert.deepEqual(splitList(["a", "b"]), ["a", "b"]);
    assert.deepEqual(splitList(null), []);
    assert.equal(splitList(Array.from({ length: 100 }, (_, i) => `kata${i}`).join(",")).length, 30);
    assert.equal(splitList("x".repeat(200))[0].length, 60);
  });
});

describe("finding a banned word or topic", () => {
  test("whole words and phrases only, ignoring case and punctuation", () => {
    assert.equal(findTerm("Politik itu rumit!", ["politik"]), "politik");
    assert.equal(findTerm("ini tipuan", ["tipu"]), null);
    assert.equal(findTerm("pernikahan saudara saya", ["sara"]), null);
    assert.equal(findTerm("isu   HUKUM, kak", ["isu hukum"]), "isu hukum");
    assert.equal(findTerm("", ["x"]), null);
    assert.equal(findTerm("apa saja", []), null);
  });
});

describe("what the code enforces", () => {
  test("rules are read from the saved persona, and a missing or broken one means nothing is enforced", () => {
    assert.deepEqual(personaRules({ offLimitTopics: "a, b", forbiddenWords: "c", bigOrderAmount: "250000" }), { offLimitTopics: ["a", "b"], forbiddenWords: ["c"], bigOrderAmount: 250000 });
    assert.deepEqual(personaRules(null), { offLimitTopics: [], forbiddenWords: [], bigOrderAmount: 0 });
    assert.equal(personaRules({ bigOrderAmount: "banyak" }).bigOrderAmount, 0);
    assert.equal(personaRules({ bigOrderAmount: -5 }).bigOrderAmount, 0);
  });

  test("a big order is at or above the amount; no amount means never", () => {
    assert.equal(isBigOrder(300000, { bigOrderAmount: 300000 }), true);
    assert.equal(isBigOrder("299999.00", { bigOrderAmount: 300000 }), false);
    assert.equal(isBigOrder(9e12, {}), false);
    assert.equal(isBigOrder(9e12, null), false);
  });

  test("prompt lines are written only for what is filled, and unknown choices are ignored", () => {
    assert.deepEqual(personaPromptLines({}), []);
    assert.deepEqual(personaPromptLines({ goal: "internal", toneStyles: ["marah"] }), []);
    const lines = personaPromptLines({ goal: "support", toneStyles: ["formal"], brandValues: "Cepat", preferredWords: "siap", forbiddenWords: "anjir", offLimitTopics: "politik" });
    assert.equal(lines.length, 6);
    assert.match(lines.join("\n"), /DILARANG, jangan pernah dipakai dalam balasan: anjir/);
  });
});

describe("the draft the model writes for the persona form", () => {
  const complete = { botName: "Kira", goal: "both", toneStyles: ["ramah"], tone: "Hangat.", greetingMessage: "Halo kak!" };

  test("the JSON is found inside a code fence or a sentence", () => {
    assert.equal(parsePersonaAnswer(`Ini:\n\`\`\`json\n${JSON.stringify(complete)}\n\`\`\``).botName, "Kira");
    assert.equal(parsePersonaAnswer(`Baik. ${JSON.stringify(complete)} Semoga membantu.`).goal, "both");
  });

  test("no tone or greeting, broken JSON, or no JSON means nothing usable", () => {
    assert.equal(parsePersonaAnswer(JSON.stringify({ botName: "Kira" })), null);
    assert.equal(parsePersonaAnswer("{ bukan json }"), null);
    assert.equal(parsePersonaAnswer("tidak ada apa-apa"), null);
    assert.equal(parsePersonaAnswer(null), null);
  });

  test("every field is cut to the form's limit, markup and long dashes are removed", () => {
    const parsed = parsePersonaAnswer(JSON.stringify({ ...complete, tone: "Kalimat. ".repeat(100), brandValues: ["Cepat", "Solutif"], greetingMessage: "Halo <b>kak</b> — selamat datang" }));
    assert.ok(parsed.tone.length <= LIMITS.tone);
    assert.equal(parsed.brandValues, "Cepat, Solutif");
    assert.ok(!/<b>|—/.test(parsed.greetingMessage));
  });

  test("a choice outside the form is dropped, not guessed", () => {
    const parsed = parsePersonaAnswer(JSON.stringify({ ...complete, goal: "internal", toneStyles: ["lucu", "empatis", "formal", "ramah"] }));
    assert.equal(parsed.goal, undefined);
    assert.deepEqual(parsed.toneStyles, ["empatis", "formal"], "unknown ones go and at most two are kept");
  });

  test("the prompt carries the shop, its products and the owner's words, and tells the model not to invent", () => {
    const prompt = buildPersonaPrompt({ shopName: "Batik Solo", mode: "ngo", products: [{ name: "Program Air Bersih" }], hint: "tulus", currentBotName: "Sabrina" });
    for (const part of ["Batik Solo", "NGO", "Program Air Bersih", "tulus", "Sabrina", "Jangan mengarang harga", "Jangan mengaku sebagai manusia"]) assert.ok(prompt.includes(part), part);
  });
});
