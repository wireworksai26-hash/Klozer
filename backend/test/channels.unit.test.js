import "./setupEnv.js";
import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { splitText, stripChatMarkup } from "../src/services/channels/textUtils.js";
import { extractMetaMessages } from "../src/services/channels/inbound/metaMessagingInbound.js";
import { parseTelegramUpdate } from "../src/services/channels/inbound/telegramInbound.js";
import { issueVisitorToken, verifyVisitorToken } from "../src/services/channels/webchatSession.js";
import { messengerAdapter } from "../src/services/channels/adapters/messenger.js";
import { instagramAdapter } from "../src/services/channels/adapters/instagram.js";
import { telegramAdapter } from "../src/services/channels/adapters/telegram.js";
import { webchatAdapter } from "../src/services/channels/adapters/webchat.js";
import { getAdapter, supportedChannelTypes } from "../src/services/channels/adapters/index.js";
import { createChannelBody, updateChannelBody, webchatMessageBody } from "../src/validation/channelSchemas.js";

// Channel pieces that need neither a database nor a network: text shaping, payload parsing, visitor tokens,
// adapters against a faked fetch, and request validation.

afterEach(() => mock.restoreAll());

/** Fake fetch: `routes` maps a URL fragment to a response; every call is recorded. */
function fakeFetch(routes) {
  const calls = [];
  mock.method(globalThis, "fetch", async (url, init = {}) => {
    const target = String(url);
    calls.push({ url: target, init, body: init.body && !(init.body instanceof URLSearchParams) ? safeJson(init.body) : init.body });
    const hit = Object.entries(routes).find(([fragment]) => target.includes(fragment));
    if (!hit) throw new Error(`unexpected fetch to ${target}`);
    const value = typeof hit[1] === "function" ? hit[1](target, init) : hit[1];
    return {
      ok: value.ok ?? true,
      status: value.status ?? 200,
      headers: { get: (name) => value.headers?.[name.toLowerCase()] ?? null },
      json: async () => value.json ?? {},
      arrayBuffer: async () => value.bytes ?? new ArrayBuffer(0),
    };
  });
  return calls;
}
const safeJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).buffer;

describe("text shaping", () => {
  test("WhatsApp bold markers are removed for platforms that show them literally", () => {
    assert.equal(stripChatMarkup("*Ready* kak, stok *7 pcs* ya"), "Ready kak, stok 7 pcs ya");
    assert.equal(stripChatMarkup("Total: *Rp 150.000*."), "Total: Rp 150.000.");
  });

  test("a lone asterisk or a calculation is left alone", () => {
    assert.equal(stripChatMarkup("harga 2*3 = 6"), "harga 2*3 = 6");
    assert.equal(stripChatMarkup("bintang * di sini"), "bintang * di sini");
  });

  test("a short text is one part, an empty text is none", () => {
    assert.deepEqual(splitText("Halo kak", 100), ["Halo kak"]);
    assert.deepEqual(splitText("   ", 100), []);
    assert.deepEqual(splitText(undefined, 100), []);
  });

  test("a long text is split within the limit, at natural boundaries, losing nothing", () => {
    const paragraph = "Kami punya banyak pilihan warna dan ukuran untuk produk ini. Silakan pilih yang paling cocok untuk kakak.";
    const text = [paragraph, paragraph, paragraph].join("\n\n");
    const parts = splitText(text, 120);
    assert.ok(parts.length >= 3);
    assert.ok(parts.every((p) => p.length <= 120 && p.length > 0));
    assert.equal(parts.join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
    assert.ok(parts[0].endsWith("."), "cut after a sentence, not in the middle of a word");
  });

  test("text without any break is cut at the limit", () => {
    const parts = splitText("x".repeat(250), 100);
    assert.deepEqual(parts.map((p) => p.length), [100, 100, 50]);
  });
});

describe("Messenger and Instagram webhook payloads", () => {
  const payload = (object, events, id = "PAGE1") => ({ object, entry: [{ id, messaging: events }] });
  const text = (mid, from, body) => ({ sender: { id: from }, recipient: { id: "PAGE1" }, message: { mid, text: body } });

  test("a text message becomes one inbound message for the receiving account", () => {
    const [m] = extractMetaMessages(payload("page", [text("m_1", "55501", "Halo, ada stok?")]));
    assert.deepEqual(m, { channelType: "messenger", accountId: "PAGE1", contactId: "55501", id: "m_1", type: "text", text: "Halo, ada stok?", mediaId: null });
  });

  test("Instagram payloads are told apart by their object", () => {
    const [m] = extractMetaMessages(payload("instagram", [text("m_2", "77701", "Halo")], "IG9"));
    assert.equal(m.channelType, "instagram");
    assert.equal(m.accountId, "IG9");
  });

  test("echoes of our own messages, reads and deliveries are ignored", () => {
    const events = [
      { sender: { id: "PAGE1" }, recipient: { id: "55501" }, message: { mid: "m_3", text: "balasan kami", is_echo: true } },
      { sender: { id: "55501" }, recipient: { id: "PAGE1" }, read: { watermark: 1 } },
      { sender: { id: "55501" }, recipient: { id: "PAGE1" }, delivery: { mids: ["m_1"] } },
      { sender: { id: "PAGE1" }, recipient: { id: "PAGE1" }, message: { mid: "m_4", text: "dari akun sendiri" } },
    ];
    assert.deepEqual(extractMetaMessages(payload("page", events)), []);
  });

  test("an image or a file carries its address; unsupported attachments are left to a person", () => {
    const attach = (type, url) => ({ sender: { id: "55501" }, recipient: { id: "PAGE1" }, message: { mid: `m_${type}`, attachments: [{ type, payload: url ? { url } : {} }] } });
    const out = extractMetaMessages(payload("page", [attach("image", "https://scontent.xx.fbcdn.net/a.jpg"), attach("file", "https://cdn.fbsbx.com/b.pdf"), attach("audio", "https://cdn.fbsbx.com/c.mp4"), attach("image", null), attach("fallback", null)]));
    assert.deepEqual(out.map((m) => [m.type, m.mediaId]), [
      ["image", "https://scontent.xx.fbcdn.net/a.jpg"],
      ["document_receipt", "https://cdn.fbsbx.com/b.pdf"],
      ["voice_note", "https://cdn.fbsbx.com/c.mp4"],
      ["text", null],
      ["text", null],
    ]);
    assert.ok(out.every((m) => m.type !== "text" || m.text === ""));
  });

  test("other objects and malformed bodies produce nothing", () => {
    assert.deepEqual(extractMetaMessages({ object: "whatsapp_business_account", entry: [] }), []);
    assert.deepEqual(extractMetaMessages(null), []);
    assert.deepEqual(extractMetaMessages({ object: "page" }), []);
  });
});

describe("Telegram updates", () => {
  const priv = (extra) => ({ update_id: 1, message: { message_id: 7, chat: { id: 4242, type: "private" }, from: { id: 4242, first_name: "Budi", last_name: "S", is_bot: false }, ...extra } });

  test("a private text message is parsed with the sender's name and a unique id", () => {
    const m = parseTelegramUpdate(priv({ text: "Ada ukuran L?" }), "999");
    assert.deepEqual(m, { contactId: "4242", name: "Budi S", id: "tg:999:4242:7", type: "text", text: "Ada ukuran L?", mediaId: null });
  });

  test("/start is a greeting", () => {
    assert.equal(parseTelegramUpdate(priv({ text: "/start" }), "999").text, "Halo");
    assert.equal(parseTelegramUpdate(priv({ text: "/start promo" }), "999").text, "Halo");
    assert.equal(parseTelegramUpdate(priv({ text: "/starting" }), "999").text, "/starting");
  });

  test("groups, other bots and updates without a message are ignored", () => {
    assert.equal(parseTelegramUpdate({ message: { message_id: 1, chat: { id: -100, type: "group" }, from: { id: 1 }, text: "hi" } }, "999"), null);
    assert.equal(parseTelegramUpdate(priv({ from: { id: 5, is_bot: true }, text: "hi" }), "999"), null);
    assert.equal(parseTelegramUpdate({ update_id: 2, edited_message: {} }, "999"), null);
    assert.equal(parseTelegramUpdate(undefined, "999"), null);
  });

  test("photos use the largest size, PDFs count as receipts, other files and voice go to a person", () => {
    const photo = parseTelegramUpdate(priv({ photo: [{ file_id: "small" }, { file_id: "big" }], caption: "bukti" }), "999");
    assert.deepEqual([photo.type, photo.mediaId, photo.text], ["image", "big", "bukti"]);
    const pdf = parseTelegramUpdate(priv({ document: { file_id: "doc1", mime_type: "application/pdf" } }), "999");
    assert.deepEqual([pdf.type, pdf.mediaId], ["document_receipt", "doc1"]);
    const zip = parseTelegramUpdate(priv({ document: { file_id: "doc2", mime_type: "application/zip" } }), "999");
    assert.deepEqual([zip.type, zip.mediaId, zip.text], ["text", null, ""]);
    assert.equal(parseTelegramUpdate(priv({ voice: { file_id: "v" } }), "999").type, "voice_note");
    assert.deepEqual([parseTelegramUpdate(priv({ sticker: {} }), "999").type, parseTelegramUpdate(priv({ sticker: {} }), "999").text], ["text", ""]);
  });
});

describe("web chat visitor tokens", () => {
  test("a token verifies for its own widget and gives back the visitor", () => {
    const token = issueVisitorToken("wc_a");
    const visitorId = verifyVisitorToken("wc_a", token);
    assert.match(visitorId, /^[a-f0-9]{32}$/);
    assert.equal(token.split(".")[0], visitorId);
  });

  test("a token is useless on another widget, altered, or malformed", () => {
    const token = issueVisitorToken("wc_a");
    assert.equal(verifyVisitorToken("wc_b", token), null);
    assert.equal(verifyVisitorToken("wc_a", token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")), null);
    const [id] = token.split(".");
    assert.equal(verifyVisitorToken("wc_a", `${id}.`), null);
    assert.equal(verifyVisitorToken("wc_a", `${"0".repeat(32)}.${token.split(".")[1]}`), null, "the signature belongs to one visitor id");
    for (const bad of ["", undefined, null, "abc", `${token}.x`, "..", `${id}`]) assert.equal(verifyVisitorToken("wc_a", bad), null);
  });

  test("two visitors get different tokens", () => {
    assert.notEqual(issueVisitorToken("wc_a"), issueVisitorToken("wc_a"));
  });
});

describe("Messenger and Instagram adapters", () => {
  const channel = { id: 3, externalId: "PAGE1", accessToken: "EAAG-page-token", config: { pageId: "PAGE1" } };

  test("send posts to the page with the bearer token and the recipient", async () => {
    const calls = fakeFetch({ "/PAGE1/messages": { json: { message_id: "m_out_1" } } });
    const result = await messengerAdapter.send({ channel, to: "55501", text: "Halo kak" });
    assert.deepEqual(result, { success: true, to: "55501", messageId: "m_out_1" });
    assert.equal(calls[0].init.headers.Authorization, "Bearer EAAG-page-token");
    assert.deepEqual(calls[0].body, { recipient: { id: "55501" }, messaging_type: "RESPONSE", message: { text: "Halo kak" } });
  });

  test("a closed 24-hour window is explained, other errors pass the platform's message on", async () => {
    fakeFetch({ "/messages": { ok: false, status: 400, json: { error: { code: 10, message: "(#10) ..." } } } });
    const closed = await instagramAdapter.send({ channel, to: "77701", text: "hai" });
    assert.equal(closed.success, false);
    assert.match(closed.error, /24 jam/);
    mock.restoreAll();
    fakeFetch({ "/messages": { ok: false, status: 400, json: { error: { code: 190, message: "Invalid OAuth access token" } } } });
    assert.equal((await messengerAdapter.send({ channel, to: "55501", text: "hai" })).error, "Invalid OAuth access token");
  });

  test("contact ids are digits only", () => {
    assert.equal(messengerAdapter.normalizeContactId(" 123456789 "), "123456789");
    assert.equal(messengerAdapter.normalizeContactId("abc"), null);
    assert.equal(instagramAdapter.normalizeContactId("12"), null);
    assert.equal(instagramAdapter.maxTextLength, 1000);
  });

  test("a file is fetched only from the platform's own hosts, without credentials", async () => {
    const calls = fakeFetch({ "cdn.fbcdn.net": { headers: { "content-type": "image/png" }, bytes: PNG } });
    const file = await messengerAdapter.downloadMedia({ mediaId: "https://cdn.fbcdn.net/x.png" });
    assert.equal(file.mimeType, "image/png");
    assert.equal(file.buffer.length, 8);
    assert.equal(calls[0].init.headers.Authorization, undefined);

    assert.equal(await messengerAdapter.downloadMedia({ mediaId: "https://evil.example.com/x.png" }), null);
    assert.equal(await messengerAdapter.downloadMedia({ mediaId: "http://cdn.fbcdn.net/x.png" }), null);
    assert.equal(await messengerAdapter.downloadMedia({ mediaId: "not a url" }), null);
    assert.equal(calls.length, 1, "nothing else was fetched");
  });

  test("a file of an unsupported type or over the size limit is refused", async () => {
    fakeFetch({ "cdn.fbcdn.net/a": { headers: { "content-type": "text/html" }, bytes: PNG }, "cdn.fbcdn.net/b": { headers: { "content-type": "image/png", "content-length": String(6 * 1024 * 1024) }, bytes: PNG } });
    assert.equal(await messengerAdapter.downloadMedia({ mediaId: "https://cdn.fbcdn.net/a" }), null);
    assert.equal(await messengerAdapter.downloadMedia({ mediaId: "https://cdn.fbcdn.net/b" }), null);
  });

  test("connecting Messenger reads the page; a bad token is a clear error", async () => {
    fakeFetch({ "/PAGE1?fields=id%2Cname": { json: { id: "PAGE1", name: "Toko Batik" } } });
    const resolved = await messengerAdapter.resolveConnection({ pageId: "PAGE1", accessToken: "tok" });
    assert.deepEqual(resolved, { externalId: "PAGE1", displayHandle: "Toko Batik", accessToken: "tok", config: { pageId: "PAGE1" } });
    mock.restoreAll();
    fakeFetch({ "/PAGE1": { ok: false, status: 400, json: { error: { message: "Invalid OAuth access token" } } } });
    await assert.rejects(messengerAdapter.resolveConnection({ pageId: "PAGE1", accessToken: "bad" }), /Invalid OAuth/);
  });

  test("connecting Instagram uses the linked Instagram account as the channel's id", async () => {
    fakeFetch({ "/PAGE1": { json: { id: "PAGE1", name: "Toko Batik", instagram_business_account: { id: "IG77", username: "tokobatik" } } } });
    const resolved = await instagramAdapter.resolveConnection({ pageId: "PAGE1", accessToken: "tok" });
    assert.deepEqual(resolved, { externalId: "IG77", displayHandle: "@tokobatik", accessToken: "tok", config: { pageId: "PAGE1" } });
    mock.restoreAll();
    fakeFetch({ "/PAGE1": { json: { id: "PAGE1", name: "Toko Batik" } } });
    await assert.rejects(instagramAdapter.resolveConnection({ pageId: "PAGE1", accessToken: "tok" }), /belum terhubung ke akun Instagram/);
  });

  test("activation subscribes the page (the page id, not the Instagram id) to messages", async () => {
    const calls = fakeFetch({ "/PAGE1/subscribed_apps": { json: { success: true } } });
    const out = await instagramAdapter.activate({ ...channel, externalId: "IG77" });
    assert.deepEqual(out, { ok: true });
    assert.equal(calls[0].body, "subscribed_fields=messages");
    mock.restoreAll();
    fakeFetch({ "/subscribed_apps": { ok: false, status: 400, json: { error: { message: "(#200) permissions" } } } });
    const failed = await messengerAdapter.activate(channel);
    assert.equal(failed.ok, false);
    assert.match(failed.error, /permissions/);
  });

  test("the customer's name comes from the profile when the platform allows it", async () => {
    fakeFetch({ "/55501": { json: { name: "Siti Aminah" } } });
    assert.equal(await messengerAdapter.fetchProfile({ channel, contactId: "55501" }), "Siti Aminah");
    mock.restoreAll();
    fakeFetch({ "/55501": { ok: false, status: 403, json: {} } });
    assert.equal(await messengerAdapter.fetchProfile({ channel, contactId: "55501" }), null);
  });
});

describe("Telegram adapter", () => {
  const TOKEN = "123456789:AAH-abcdefghijklmnopqrstuvwxyz012345";
  const channel = { id: 4, externalId: "123456789", accessToken: TOKEN, config: { webhookSecret: "s3cret" } };

  test("a bad token format is rejected before any network call", async () => {
    const calls = fakeFetch({});
    await assert.rejects(telegramAdapter.resolveConnection({ accessToken: "not-a-token" }), /Format token/);
    assert.equal(calls.length, 0);
  });

  test("connecting reads the bot and prepares a secret; activation registers the webhook with it", async () => {
    fakeFetch({ "/getMe": { json: { ok: true, result: { id: 123456789, username: "tokobatik_bot", first_name: "Toko" } } } });
    const resolved = await telegramAdapter.resolveConnection({ accessToken: ` ${TOKEN} ` });
    assert.equal(resolved.externalId, "123456789");
    assert.equal(resolved.displayHandle, "@tokobatik_bot");
    assert.match(resolved.config.webhookSecret, /^[a-f0-9]{48}$/);
    mock.restoreAll();

    const calls = fakeFetch({ "/setWebhook": { json: { ok: true, result: true } } });
    assert.deepEqual(await telegramAdapter.activate({ ...channel, config: resolved.config }), { ok: true });
    assert.match(calls[0].body.url, /\/api\/v1\/webhooks\/telegram\/123456789$/);
    assert.equal(calls[0].body.secret_token, resolved.config.webhookSecret);
    assert.deepEqual(calls[0].body.allowed_updates, ["message"]);
  });

  test("Telegram refusing the token or the webhook is reported", async () => {
    fakeFetch({ "/getMe": { ok: false, status: 401, json: { ok: false, description: "Unauthorized" } } });
    await assert.rejects(telegramAdapter.resolveConnection({ accessToken: TOKEN }), /Unauthorized/);
    mock.restoreAll();
    fakeFetch({ "/setWebhook": { json: { ok: false, description: "Bad Request: HTTPS url must be provided for webhook" } } });
    const out = await telegramAdapter.activate(channel);
    assert.equal(out.ok, false);
    assert.match(out.error, /HTTPS/);
  });

  test("send returns an id that names the bot, the chat and the message", async () => {
    const calls = fakeFetch({ "/sendMessage": { json: { ok: true, result: { message_id: 55 } } } });
    const result = await telegramAdapter.send({ channel, to: "4242", text: "Halo kak" });
    assert.deepEqual(result, { success: true, to: "4242", messageId: "tg:123456789:4242:55" });
    assert.deepEqual(calls[0].body, { chat_id: "4242", text: "Halo kak", disable_web_page_preview: true });
    mock.restoreAll();
    fakeFetch({ "/sendMessage": { ok: false, status: 403, json: { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" } } });
    assert.match((await telegramAdapter.send({ channel, to: "4242", text: "x" })).error, /blocked/);
  });

  test("a customer's file is found by file id and its type comes from the file name", async () => {
    const calls = fakeFetch({
      "/getFile": { json: { ok: true, result: { file_path: "photos/file_1.jpg" } } },
      "api.telegram.org/file/": { bytes: PNG },
    });
    const file = await telegramAdapter.downloadMedia({ channel, mediaId: "FILEID" });
    assert.deepEqual([file.mimeType, file.buffer.length], ["image/jpeg", 8]);
    assert.ok(calls[1].url.endsWith("/photos/file_1.jpg"));
    mock.restoreAll();
    fakeFetch({ "/getFile": { json: { ok: true, result: { file_path: "documents/file_2.exe" } } } });
    assert.equal(await telegramAdapter.downloadMedia({ channel, mediaId: "FILEID" }), null);
    assert.equal(await telegramAdapter.downloadMedia({ channel, mediaId: "" }), null);
  });

  test("chat ids are integers and long replies are capped below Telegram's limit", () => {
    assert.equal(telegramAdapter.normalizeContactId("4242"), "4242");
    assert.equal(telegramAdapter.normalizeContactId("-100123"), "-100123");
    assert.equal(telegramAdapter.normalizeContactId("@someone"), null);
    assert.ok(telegramAdapter.maxTextLength <= 4096);
  });
});

describe("web chat adapter", () => {
  test("a new widget gets a public key and the default look", async () => {
    const a = await webchatAdapter.resolveConnection({});
    const b = await webchatAdapter.resolveConnection({ config: { title: "Halo Toko", allowedOrigins: ["https://toko.id"] } });
    assert.match(a.externalId, /^wc_[a-f0-9]{24}$/);
    assert.notEqual(a.externalId, b.externalId);
    assert.equal(a.accessToken, null);
    assert.equal(a.config.color, "#046B54");
    assert.deepEqual([b.config.title, b.config.allowedOrigins], ["Halo Toko", ["https://toko.id"]]);
  });

  test("sending is storing: nothing is called", async () => {
    const calls = fakeFetch({});
    assert.deepEqual(await webchatAdapter.send({ to: "a".repeat(32), text: "Halo" }), { success: true, to: "a".repeat(32), messageId: null });
    assert.equal(calls.length, 0);
    assert.equal(webchatAdapter.normalizeContactId("a".repeat(32)), "a".repeat(32));
    assert.equal(webchatAdapter.normalizeContactId("short"), null);
  });
});

describe("adapter registry", () => {
  test("every channel type has an adapter with the required functions", () => {
    assert.deepEqual(supportedChannelTypes().sort(), ["instagram", "messenger", "telegram", "webchat", "whatsapp"]);
    for (const type of supportedChannelTypes()) {
      const adapter = getAdapter(type);
      assert.equal(adapter.type, type);
      for (const fn of ["normalizeContactId", "send", "verify", "downloadMedia"]) assert.equal(typeof adapter[fn], "function", `${type}.${fn}`);
      assert.ok(adapter.maxTextLength >= 500, `${type} has a text limit`);
    }
  });

  test("an unknown type is a clear 501", () => {
    assert.throws(() => getAdapter("fax"), (err) => err.statusCode === 501 && err.code === "CHANNEL_NOT_SUPPORTED");
  });
});

describe("request validation", () => {
  const ok = (body) => createChannelBody.safeParse(body).success;

  test("each platform asks only for what it needs", () => {
    assert.ok(ok({ type: "whatsapp", name: "Toko", externalId: "10987654321", accessToken: "EAAG-token-123" }));
    assert.ok(!ok({ type: "whatsapp", name: "Toko", accessToken: "EAAG-token-123" }), "WhatsApp needs the number id");
    assert.ok(ok({ type: "messenger", name: "Toko", pageId: "1234567890", accessToken: "EAAG-token-123" }));
    assert.ok(!ok({ type: "messenger", name: "Toko", accessToken: "EAAG-token-123" }), "Messenger needs the page id");
    assert.ok(ok({ type: "instagram", name: "Toko", pageId: "1234567890", accessToken: "EAAG-token-123" }));
    assert.ok(ok({ type: "telegram", name: "Toko", accessToken: "123456789:AAH-abcdefghijklmnopqrstuvwxyz012345" }));
    assert.ok(!ok({ type: "telegram", name: "Toko" }));
    assert.ok(ok({ type: "webchat", name: "Website" }), "web chat needs nothing else");
  });

  test("names fit the database column and unknown types are refused", () => {
    assert.ok(!ok({ type: "webchat", name: "x".repeat(81) }));
    assert.ok(!ok({ type: "fax", name: "Toko" }));
    assert.ok(!ok({ type: "messenger", name: "Toko", pageId: "abc", accessToken: "EAAG-token-123" }));
  });

  test("widget settings are validated and only belong to web chat", () => {
    assert.ok(ok({ type: "webchat", name: "Web", config: { title: "Halo", color: "#112233", allowedOrigins: ["https://toko.id", "http://localhost:3000"] } }));
    assert.ok(!ok({ type: "webchat", name: "Web", config: { color: "merah" } }));
    assert.ok(!ok({ type: "webchat", name: "Web", config: { allowedOrigins: ["toko.id"] } }));
    assert.ok(!ok({ type: "webchat", name: "Web", config: { allowedOrigins: ["https://toko.id/path"] } }));
    assert.ok(!ok({ type: "telegram", name: "Bot", accessToken: "123456789:AAH-abcdefghijklmnopqrstuvwxyz012345", config: { title: "x" } }));
    assert.ok(updateChannelBody.safeParse({ config: { title: "Baru" } }).success);
    assert.ok(!updateChannelBody.safeParse({}).success);
  });

  test("a visitor message needs text and an id the widget generated", () => {
    assert.ok(webchatMessageBody.safeParse({ text: "Halo", clientMessageId: "abcdef123456" }).success);
    assert.ok(!webchatMessageBody.safeParse({ text: "   ", clientMessageId: "abcdef123456" }).success);
    assert.ok(!webchatMessageBody.safeParse({ text: "Halo", clientMessageId: "x" }).success);
    assert.ok(!webchatMessageBody.safeParse({ text: "x".repeat(1001), clientMessageId: "abcdef123456" }).success);
    assert.ok(!webchatMessageBody.safeParse({ text: "Halo", clientMessageId: "bad id!" }).success);
  });
});
