import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GUARDRAIL_REPLIES,
  buildCsSystemPrompt,
  buildCsUserMessage,
  effectiveTone,
  formatChatReply,
  friendlyFirstName,
} from "../src/services/aiPrompt.js";

const base = {
  instName: "Batik Mahakarya Solo",
  instSector: "Fashion & Retail",
  isInitialTurn: true,
  customerFirstName: "Budi",
  catalogList: "1. Kemeja Batik Tulis — Harga: Rp 650.000 | Stok: 7 unit",
  promoList: "Tidak ada promo aktif saat ini. JANGAN menawarkan atau menjanjikan diskon apa pun.",
  bankList: "- Bank BCA: 1234567890 a.n. Batik Mahakarya Solo",
  bankTransferSummary: "Bank BCA: 1234567890 a.n. Batik Mahakarya Solo",
  instAddress: "Jl. Slamet Riyadi 1, Solo",
  instHours: "09.00-17.00",
};

describe("system prompt: voice", () => {
  const prompt = buildCsSystemPrompt(base);

  test("speaks as the shop's admin and does not introduce itself as an AI assistant", () => {
    assert.match(prompt, /Kamu adalah Admin Batik Mahakarya Solo/);
    assert.doesNotMatch(prompt, /Kamu adalah Asisten AI/);
    assert.match(prompt, /Jangan memperkenalkan diri sebagai "Asisten AI"/);
  });

  test("still tells the truth when a customer sincerely asks if it is a bot", () => {
    assert.match(prompt, /jangan pernah berbohong/i);
    assert.match(prompt, /admin virtual berbasis AI/);
  });

  test("asks for short, casual WhatsApp replies", () => {
    assert.match(prompt, /1-3 kalimat pendek/);
    assert.match(prompt, /santai/);
    assert.match(prompt, /Emoji paling banyak satu/);
    assert.match(prompt, /bukan "saya" atau "Anda"/);
  });
});

describe("system prompt: features are kept", () => {
  const prompt = buildCsSystemPrompt(base);

  test("grounds every fact in the data blocks and forbids inventing", () => {
    assert.match(prompt, /Kemeja Batik Tulis/);
    assert.match(prompt, /HANYA boleh diambil dari data di bawah/);
    assert.match(prompt, /Jangan mengarang/);
    assert.match(prompt, /JANGAN menawarkan atau menjanjikan diskon/);
  });

  test("keeps the order, payment and promo flow", () => {
    assert.match(prompt, /Dynamic QRIS/);
    assert.match(prompt, /Transfer Bank/);
    assert.match(prompt, /1234567890/);
    assert.match(prompt, /\[PROMO & DISKON AKTIF\]/);
    assert.match(prompt, /rincikan tiap item, subtotal/);
    assert.match(prompt, /alamat pengiriman/);
  });

  test("keeps the outlet block", () => {
    assert.match(prompt, /Jl\. Slamet Riyadi 1, Solo/);
    assert.match(prompt, /09\.00-17\.00/);
  });
});

describe("system prompt: greeting turn", () => {
  test("first message greets once, by first name", () => {
    const p = buildCsSystemPrompt({ ...base, isInitialTurn: true });
    assert.match(p, /sapa sekali di awal, misalnya "Halo Kak Budi!"/);
  });

  test("follow-up messages must not greet again", () => {
    const p = buildCsSystemPrompt({ ...base, isInitialTurn: false });
    assert.match(p, /jangan menyapa ulang/);
    assert.doesNotMatch(p, /Halo Kak Budi/);
  });

  test("a placeholder profile name is not turned into 'Kak Pelanggan'", () => {
    const p = buildCsSystemPrompt({ ...base, customerFirstName: friendlyFirstName("Pelanggan") });
    assert.match(p, /misalnya "Halo kak!"/);
    assert.doesNotMatch(p, /Kak Pelanggan/);
  });
});

describe("persona set by the shop owner", () => {
  test("bot name, tone, greeting (first turn only) and topics reach the prompt", () => {
    const persona = { botName: "Siti", tone: "Santai banget, pakai logat Solo", greetingMessage: "Sugeng rawuh kak!", customFaqKeywords: "ukuran, bahan" };
    const first = buildCsSystemPrompt({ ...base, persona });
    assert.match(first, /Kamu adalah Siti,/);
    assert.match(first, /Santai banget, pakai logat Solo/);
    assert.match(first, /Sugeng rawuh kak!/);
    assert.match(first, /ukuran, bahan/);

    const later = buildCsSystemPrompt({ ...base, persona, isInitialTurn: false });
    assert.doesNotMatch(later, /Sugeng rawuh kak!/);
  });

  test("the old formal default tone is not treated as the owner's choice", () => {
    assert.equal(effectiveTone({ tone: "Ramah, santun, dan solutif" }), null);
    assert.equal(effectiveTone({ tone: "  ramah, santun, dan solutif " }), null);
    assert.equal(effectiveTone({ tone: "Formal dan profesional" }), "Formal dan profesional");
    assert.doesNotMatch(buildCsSystemPrompt({ ...base, persona: { tone: "Ramah, santun, dan solutif" } }), /Gaya bicara dari pemilik toko/);
  });

  test("no persona block when nothing is set", () => {
    assert.doesNotMatch(buildCsSystemPrompt(base), /\[PERSONA DARI PEMILIK TOKO\]/);
  });
});

describe("customer message and history", () => {
  test("history is replayed as Admin/Pelanggan, never 'Asisten AI'", () => {
    const msg = buildCsUserMessage({ formattedHistory: "Pelanggan: ada kemeja?\nAdmin: ada kak", isInitialTurn: false, customerFirstName: "Budi", messageText: "berapa?" });
    assert.match(msg, /Admin: ada kak/);
    assert.doesNotMatch(msg, /Asisten AI/);
    assert.match(msg, /Pesan baru dari pelanggan \(Budi\):\nberapa\?/);
  });
});

describe("friendlyFirstName", () => {
  test("real names are capitalised, placeholders and emoji are dropped", () => {
    assert.equal(friendlyFirstName("budi santoso"), "Budi");
    assert.equal(friendlyFirstName("DEWI"), "Dewi");
    assert.equal(friendlyFirstName("~ratna~ w"), "Ratna");
    for (const bad of ["Pelanggan", "Kakak", "Customer", "😊", "", "A", null, undefined]) {
      assert.equal(friendlyFirstName(bad), "", `"${bad}" must not be greeted`);
    }
  });
});

describe("formatChatReply", () => {
  test("plain chat text is untouched", () => {
    const text = "Ready kak, masih ada 7 pcs ya 😊";
    assert.equal(formatChatReply(text), text);
    assert.equal(formatChatReply(formatChatReply(text)), text);
  });

  test("markdown becomes WhatsApp formatting", () => {
    assert.equal(formatChatReply("Totalnya **Rp 320.000** ya"), "Totalnya *Rp 320.000* ya");
    assert.equal(formatChatReply("### Rincian\n* Kemeja\n• Celana"), "Rincian\n- Kemeja\n- Celana");
  });

  test("an echoed speaker label and wrapping quotes are removed", () => {
    assert.equal(formatChatReply("Admin: Siap kak"), "Siap kak");
    assert.equal(formatChatReply("Asisten AI: Siap kak"), "Siap kak");
    assert.equal(formatChatReply('"Siap kak, aku catat ya"'), "Siap kak, aku catat ya");
    assert.equal(formatChatReply('"Siap" kata kakak, "oke"'), '"Siap" kata kakak, "oke"');
  });

  test("blank-line runs collapse and an empty reply stays empty", () => {
    assert.equal(formatChatReply("Satu\n\n\n\nDua"), "Satu\n\nDua");
    assert.equal(formatChatReply(""), "");
    assert.equal(formatChatReply(undefined), "");
  });
});

describe("guardrail replies", () => {
  test("sound like a person and never call themselves an AI assistant", () => {
    for (const [name, reply] of Object.entries(GUARDRAIL_REPLIES)) {
      assert.doesNotMatch(reply, /Asisten AI/, name);
      assert.doesNotMatch(reply, /\bAnda\b|\bMohon\b/, name);
      assert.ok(reply.length < 140, `${name} is a short chat message`);
    }
  });
});
