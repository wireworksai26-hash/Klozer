import "./setupEnv.js";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DisconnectReason } from "@whiskeysockets/baileys";
import {
  contactIdToJid,
  extractWhatsAppWebMessage,
  jidToContactId,
  normalizeContactId,
} from "../src/services/channels/inbound/whatsappWebInbound.js";
import { createWhatsAppWebManager } from "../src/services/channels/whatsappWebManager.js";
import { whatsappWebAdapter } from "../src/services/channels/adapters/whatsappWeb.js";

const silent = { child: () => silent, warn() {}, error() {}, info() {}, debug() {} };
const channel = { id: 7, institutionId: 3, type: "whatsapp_web", externalId: "web-1", config: {} };
const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, timeoutMs = 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return true;
    await tick(5);
  }
  throw new Error("condition not met in time");
}

class FakeSocket {
  constructor() {
    this.ev = new EventEmitter();
    this.user = null;
    this.sent = [];
    this.reads = [];
    this.ended = false;
    this.loggedOut = false;
    this.updateMediaMessage = async () => {};
  }

  async sendMessage(jid, content) {
    this.sent.push({ jid, content });
    return { key: { id: `out-${this.sent.length}` } };
  }

  async readMessages(keys) {
    this.reads.push(keys);
  }

  end() {
    this.ended = true;
  }

  async logout() {
    this.loggedOut = true;
    this.ended = true;
  }
}

function fakeManager(overrides = {}) {
  const sockets = [];
  const inbound = [];
  const connected = [];
  const loggedOut = [];
  const manager = createWhatsAppWebManager({
    authRoot: overrides.authRoot,
    socketFactory: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    authStateFactory: async () => ({ state: {}, saveCreds: async () => {} }),
    versionProvider: async () => ({ version: [2, 3000, 0] }),
    qrToDataUrl: async (qr) => `data:image/png;base64,${qr}`,
    mediaDownloader: async () => Buffer.from("img"),
    onInbound: async (payload) => inbound.push(payload),
    onConnected: async (target, me) => connected.push({ target, me }),
    onLoggedOut: async (target) => loggedOut.push(target),
    reconnectBaseMs: 5,
    reconnectMaxMs: 10,
    qrWaitMs: 300,
    pollMs: 5,
    log: silent,
    ...overrides,
  });
  return { manager, sockets, inbound, connected, loggedOut };
}

describe("WhatsApp Web contact ids", () => {
  test("a phone JID keeps the international number and drops the device suffix", () => {
    assert.equal(jidToContactId("6281234567890:12@s.whatsapp.net"), "6281234567890");
    assert.equal(jidToContactId("6281234567890@s.whatsapp.net"), "6281234567890");
    assert.equal(jidToContactId("081234567890@s.whatsapp.net"), "6281234567890");
  });

  test("a LID is kept apart so a reply can use the same address", () => {
    assert.equal(jidToContactId("123456789012345@lid"), "lid:123456789012345");
    assert.equal(contactIdToJid("lid:123456789012345"), "123456789012345@lid");
    assert.equal(contactIdToJid("6281234567890"), "6281234567890@s.whatsapp.net");
  });

  test("groups, status broadcasts and malformed ids are refused", () => {
    for (const jid of ["1203630@g.us", "status@broadcast", "123@broadcast", "123@newsletter", "abc", ""]) {
      assert.equal(jidToContactId(jid), null, jid);
    }
    assert.equal(normalizeContactId("abc"), null);
    assert.equal(normalizeContactId("0812"), null);
  });
});

describe("WhatsApp Web message extraction", () => {
  const raw = (message, id = "IN1") => ({ key: { id, remoteJid: "628@s.whatsapp.net" }, message });
  const image = (extra = {}) => raw({ imageMessage: { mimetype: "image/jpeg", caption: "bukti transfer", ...extra } });

  test("plain text and extended text carry their message id", () => {
    assert.deepEqual(extractWhatsAppWebMessage(raw({ conversation: "Halo" })), {
      messageId: "bw:IN1",
      type: "text",
      text: "Halo",
      media: false,
      mimeType: null,
    });
    assert.equal(extractWhatsAppWebMessage(raw({ extendedTextMessage: { text: "Ada stok?" } })).text, "Ada stok?");
  });

  test("photos and PDFs are receipts; other files wait for a person", () => {
    const photo = extractWhatsAppWebMessage(image());
    assert.deepEqual([photo.type, photo.text, photo.media, photo.mimeType], ["image", "bukti transfer", true, "image/jpeg"]);
    const pdf = extractWhatsAppWebMessage(raw({ documentMessage: { mimetype: "application/pdf; charset=binary", fileName: "bukti.pdf" } }));
    assert.deepEqual([pdf.type, pdf.text, pdf.media], ["document_receipt", "bukti.pdf", true]);
    const zip = extractWhatsAppWebMessage(raw({ documentMessage: { mimetype: "application/zip", fileName: "a.zip" } }));
    assert.deepEqual([zip.type, zip.media], ["document", false]);
  });

  test("voice notes, stickers and locations are non-text; reactions and edits disappear", () => {
    assert.equal(extractWhatsAppWebMessage(raw({ audioMessage: {} })).type, "voice_note");
    assert.equal(extractWhatsAppWebMessage(raw({ stickerMessage: {} })).type, "sticker");
    assert.equal(extractWhatsAppWebMessage(raw({ locationMessage: {} })).type, "location");
    assert.equal(extractWhatsAppWebMessage(raw({ reactionMessage: { text: "👍" } })), null);
    assert.equal(extractWhatsAppWebMessage(raw({ protocolMessage: { type: 0 } })), null);
  });

  test("button and list answers become text", () => {
    assert.equal(extractWhatsAppWebMessage(raw({ buttonsResponseMessage: { selectedDisplayText: "Ya, pesan" } })).text, "Ya, pesan");
    assert.equal(extractWhatsAppWebMessage(raw({ listResponseMessage: { title: "Ukuran L" } })).text, "Ukuran L");
  });
});

describe("WhatsApp Web session manager", () => {
  let authRoot;
  let running;

  beforeEach(async () => {
    authRoot = await fs.mkdtemp(path.join(os.tmpdir(), "klozer-baileys-"));
  });

  afterEach(async () => {
    if (running) await running.manager.stopAll();
    running = null;
    await fs.rm(authRoot, { recursive: true, force: true });
  });

  test("start waits for the QR, then reports the connected account", async () => {
    running = fakeManager({ authRoot });
    const { manager, sockets, connected } = running;

    const starting = manager.start(channel, { waitForQr: true });
    await tick();
    assert.equal(sockets.length, 1);
    sockets[0].ev.emit("connection.update", { qr: "qr-one" });

    const snapshot = await starting;
    assert.equal(snapshot.status, "qr");
    assert.equal(snapshot.qr, "data:image/png;base64,qr-one");

    sockets[0].user = { id: "6281234567890:4@s.whatsapp.net", name: "Toko Batik" };
    sockets[0].ev.emit("connection.update", { connection: "open" });
    await waitFor(() => manager.getStatus(channel.id).status === "open");

    assert.deepEqual(manager.getStatus(channel.id).phone, "6281234567890");
    assert.equal(manager.getStatus(channel.id).name, "Toko Batik");
    assert.equal(connected.length, 1);
    assert.equal(connected[0].me.phone, "6281234567890");
  });

  test("inbound messages become the same payload the other channels use", async () => {
    running = fakeManager({ authRoot });
    const { manager, sockets, inbound } = running;
    await manager.start(channel, { waitForQr: false });

    sockets[0].ev.emit("messages.upsert", {
      type: "notify",
      messages: [
        { key: { id: "IN1", remoteJid: "628999@s.whatsapp.net", fromMe: false }, pushName: "Budi", message: { conversation: "Halo kak" } },
        { key: { id: "OUT1", remoteJid: "628999@s.whatsapp.net", fromMe: true }, message: { conversation: "balasan kami" } },
        { key: { id: "GRP1", remoteJid: "1203630@g.us" }, message: { conversation: "grup" } },
        { key: { id: "STATUS1", remoteJid: "status@broadcast" }, message: { conversation: "status" } },
      ],
    });
    await waitFor(() => inbound.length === 1);

    assert.deepEqual(inbound[0], {
      institutionId: channel.institutionId,
      channel,
      channelType: "whatsapp_web",
      contactId: "628999",
      contactName: "Budi",
      text: "Halo kak",
      messageId: "bw:IN1",
      messageType: "text",
      mediaId: null,
    });
  });

  test("media is available to the payment-proof flow and mark-read uses the stored key", async () => {
    running = fakeManager({ authRoot });
    const { manager, sockets, inbound } = running;
    await manager.start(channel, { waitForQr: false });

    sockets[0].ev.emit("messages.upsert", {
      type: "notify",
      messages: [
        {
          key: { id: "IMG1", remoteJid: "628999@s.whatsapp.net", fromMe: false },
          pushName: "Budi",
          message: { imageMessage: { mimetype: "image/jpeg", caption: "bukti" } },
        },
      ],
    });
    await waitFor(() => inbound.length === 1);
    assert.equal(inbound[0].messageType, "image");
    assert.equal(inbound[0].mediaId, "bw:IMG1");

    const file = await manager.downloadMedia(channel.id, "bw:IMG1");
    assert.equal(file.mimeType, "image/jpeg");
    assert.equal(file.buffer.toString(), "img");

    assert.deepEqual(await manager.markRead(channel.id, "bw:IMG1"), { success: true });
    assert.equal(sockets[0].reads[0][0].id, "IMG1");
  });

  test("send goes to the customer's JID once the session is open", async () => {
    running = fakeManager({ authRoot });
    const { manager, sockets } = running;
    await manager.start(channel, { waitForQr: false });
    await tick();
    sockets[0].user = { id: "628111@s.whatsapp.net", name: "Toko" };
    sockets[0].ev.emit("connection.update", { connection: "open" });
    await waitFor(() => manager.getStatus(channel.id).status === "open");

    const result = await manager.send({ channel, to: "628999", text: "Halo kak" });
    assert.deepEqual(result, { success: true, to: "628999", messageId: "bw:out-1" });
    assert.deepEqual(sockets[0].sent[0], { jid: "628999@s.whatsapp.net", content: { text: "Halo kak" } });
  });

  test("logging out from the phone clears the auth state and reports it", async () => {
    running = fakeManager({ authRoot });
    const { manager, sockets, loggedOut } = running;
    await manager.start(channel, { waitForQr: false });
    await fs.writeFile(path.join(authRoot, String(channel.id), "creds.json"), "{}");

    sockets[0].ev.emit("connection.update", {
      connection: "close",
      lastDisconnect: { error: { output: { statusCode: DisconnectReason.loggedOut } } },
    });
    await waitFor(() => loggedOut.length === 1);

    assert.equal(manager.getStatus(channel.id).status, "logged_out");
    assert.equal(await manager.hasAuth(channel.id), false);
    assert.equal(manager.getStatus(channel.id).qr, null);
  });

  test("a dropped connection is retried", async () => {
    running = fakeManager({ authRoot });
    const { manager, sockets } = running;
    await manager.start(channel, { waitForQr: false });
    sockets[0].ev.emit("connection.update", {
      connection: "close",
      lastDisconnect: { error: { message: "socket closed", output: { statusCode: 500 } } },
    });
    await waitFor(() => sockets.length === 2, 1000);
    assert.equal(manager.getStatus(channel.id).status !== "open", true);
    assert.equal(sockets.length, 2);
  });
});

describe("WhatsApp Web adapter", () => {
  test("no token is required and contact ids are normalized", () => {
    assert.equal(whatsappWebAdapter.type, "whatsapp_web");
    assert.equal(whatsappWebAdapter.requiresToken, false);
    assert.equal(whatsappWebAdapter.normalizeContactId("6281234567890"), "6281234567890");
    assert.equal(whatsappWebAdapter.normalizeContactId("081234567890"), "6281234567890");
    assert.equal(whatsappWebAdapter.normalizeContactId("nope"), null);
  });
});
