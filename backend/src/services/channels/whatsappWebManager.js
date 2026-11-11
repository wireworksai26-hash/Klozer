import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { MAX_MEDIA_BYTES, MEDIA_MIME_TYPES } from "./mediaFetch.js";
import {
  contactIdToJid,
  extractWhatsAppWebMessage,
  isIgnoredJid,
  jidToContactId,
  messageIdFor,
  normalizeContactId,
} from "./inbound/whatsappWebInbound.js";

const MESSAGE_CACHE_TTL_MS = 30 * 60 * 1000;
const MESSAGE_CACHE_MAX = 1000;
const OFFLINE_HISTORY_WINDOW_SECONDS = 5 * 60;

function authDirFor(root, channelId) {
  return path.join(root, String(channelId));
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function timestampSeconds(value) {
  if (value && typeof value === "object") return Number(value.low ?? value) || 0;
  return Number(value) || 0;
}

/**
 * Baileys session manager. One socket per connected channel, kept alive across reconnects, with the auth state
 * on disk so a restart does not require scanning again.
 */
export function createWhatsAppWebManager({
  authRoot = config.baileys.authDir,
  socketFactory = makeWASocket,
  authStateFactory = useMultiFileAuthState,
  versionProvider = fetchLatestBaileysVersion,
  qrToDataUrl = (qr) => QRCode.toDataURL(qr, { errorCorrectionLevel: "M", margin: 1, width: 320 }),
  mediaDownloader = downloadMediaMessage,
  onInbound = null,
  onConnected = null,
  onLoggedOut = null,
  log = logger,
  reconnectBaseMs = 5000,
  reconnectMaxMs = 60000,
  qrWaitMs = 12000,
  pollMs = 200,
  now = Date.now,
} = {}) {
  const sessions = new Map();
  let versionCache;
  let versionLoaded = false;
  const childLogger = typeof log.child === "function" ? log.child({ module: "baileys" }, { level: "warn" }) : log;

  async function resolvedVersion() {
    if (versionLoaded) return versionCache;
    versionLoaded = true;
    try {
      const info = await versionProvider();
      versionCache = Array.isArray(info?.version) ? info.version : undefined;
    } catch (err) {
      log.warn({ err: err.message }, "Could not fetch the latest WhatsApp Web version");
      versionCache = undefined;
    }
    return versionCache;
  }

  function pruneMessages(session) {
    const cutoff = now() - MESSAGE_CACHE_TTL_MS;
    for (const [id, entry] of session.messages) {
      if (entry.at < cutoff) session.messages.delete(id);
    }
    while (session.messages.size > MESSAGE_CACHE_MAX) {
      session.messages.delete(session.messages.keys().next().value);
    }
  }

  function snapshot(session) {
    if (!session) return { status: "disconnected", qr: null, phone: null, name: null, lastError: null, updatedAt: null };
    return {
      status: session.status,
      qr: session.qrDataUrl,
      phone: session.me?.phone ?? null,
      name: session.me?.name ?? null,
      lastError: session.lastError ?? null,
      updatedAt: session.updatedAt ?? null,
    };
  }

  function waitForState(session, predicate, timeoutMs) {
    if (predicate(session)) return Promise.resolve(true);
    return new Promise((resolve) => {
      const startedAt = now();
      const timer = setInterval(() => {
        const done = predicate(session);
        if (done || session.stopped || now() - startedAt >= timeoutMs) {
          clearInterval(timer);
          resolve(done);
        }
      }, pollMs);
      timer.unref?.();
    });
  }

  async function endSocket(session) {
    try {
      session.socket?.end?.(undefined);
    } catch (err) {
      log.warn({ err: err.message, channelId: session.channel.id }, "Could not close a WhatsApp socket");
    }
    session.socket = null;
  }

  async function failSession(session, message) {
    session.status = "error";
    session.lastError = message;
    session.updatedAt = now();
    await endSocket(session);
  }

  async function removeAuth(channelId) {
    await fs.rm(authDirFor(authRoot, channelId), { recursive: true, force: true }).catch((err) => {
      log.warn({ err: err.message, channelId }, "Could not remove the WhatsApp auth state");
    });
  }

  function scheduleReconnect(session) {
    if (session.stopped || session.reconnectTimer) return;
    const attempt = session.reconnectAttempts++;
    const delay = Math.min(reconnectMaxMs, reconnectBaseMs * 2 ** Math.min(attempt, 6));
    session.reconnectTimer = setTimeout(async () => {
      session.reconnectTimer = null;
      if (session.stopped) return;
      sessions.delete(session.channel.id);
      try {
        await start(session.channel, { waitForQr: false });
      } catch (err) {
        log.error({ err: err.message, channelId: session.channel.id }, "WhatsApp reconnect failed");
      }
    }, delay);
    session.reconnectTimer.unref?.();
  }

  async function handleConnectionUpdate(session, update) {
    if (!update || session.stopped) return;
    if (update.qr) {
      session.status = "qr";
      session.qrDataUrl = await qrToDataUrl(update.qr).catch((err) => {
        log.warn({ err: err.message, channelId: session.channel.id }, "Could not render the WhatsApp QR");
        return null;
      });
      session.lastError = null;
      session.updatedAt = now();
      return;
    }
    if (update.connection === "connecting") {
      if (session.status !== "qr") session.status = "connecting";
      session.updatedAt = now();
      return;
    }
    if (update.connection === "open") {
      session.status = "open";
      session.qrDataUrl = null;
      session.lastError = null;
      session.reconnectAttempts = 0;
      const user = session.socket?.user;
      const phone = jidToContactId(user?.id);
      session.me = user ? { id: user.id ?? null, phone, name: user.name || user.verifiedName || null } : null;
      session.updatedAt = now();
      if (onConnected) {
        try {
          await onConnected(session.channel, session.me ?? {});
        } catch (err) {
          log.error({ err: err.message, channelId: session.channel.id }, "Could not record the connected WhatsApp account");
          await failSession(session, err.message);
        }
      }
      return;
    }
    if (update.connection === "close") {
      session.updatedAt = now();
      if (session.stopped) return;
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      session.socket = null;
      if (statusCode === DisconnectReason.loggedOut) {
        session.stopped = true;
        session.status = "logged_out";
        session.qrDataUrl = null;
        session.lastError = "Sesi WhatsApp berakhir. Pindai QR lagi untuk menghubungkan.";
        await removeAuth(session.channel.id);
        if (onLoggedOut) {
          await Promise.resolve(onLoggedOut(session.channel, session.lastError)).catch((err) => {
            log.error({ err: err.message, channelId: session.channel.id }, "Could not mark the WhatsApp channel as disconnected");
          });
        }
        return;
      }
      session.status = "closed";
      session.lastError = update.lastDisconnect?.error?.message || "Koneksi WhatsApp terputus. Menghubungkan ulang...";
      scheduleReconnect(session);
    }
  }

  async function handleMessages(session, event) {
    if (!event || session.stopped) return;
    if (event.type !== "notify" && event.type !== "append") return;
    const messages = Array.isArray(event.messages) ? event.messages : [];
    for (const raw of messages) {
      if (!raw?.key || raw.key.fromMe) continue;
      if (isIgnoredJid(raw.key.remoteJid)) continue;
      const contactId = jidToContactId(raw.key.remoteJid);
      const parsed = extractWhatsAppWebMessage(raw);
      if (!contactId || !parsed) continue;

      if (event.type === "append") {
        const age = now() / 1000 - timestampSeconds(raw.messageTimestamp);
        if (age > OFFLINE_HISTORY_WINDOW_SECONDS) continue;
      }

      const mediaUsable = parsed.media && MEDIA_MIME_TYPES.has(parsed.mimeType);
      session.messages.set(parsed.messageId, {
        key: raw.key,
        raw: mediaUsable ? raw : null,
        mimeType: mediaUsable ? parsed.mimeType : null,
        at: now(),
      });
      pruneMessages(session);

      if (!onInbound) continue;
      log.info({ channelId: session.channel.id, messageId: parsed.messageId, contactId, messageType: parsed.type }, "WhatsApp inbound received");
      try {
        const result = await onInbound({
          institutionId: session.channel.institutionId,
          channel: session.channel,
          channelType: "whatsapp_web",
          contactId,
          contactName: raw.pushName || "Pelanggan",
          text: parsed.text,
          messageId: parsed.messageId,
          messageType: parsed.type,
          mediaId: mediaUsable ? parsed.messageId : null,
        });
        log.info(
          {
            channelId: session.channel.id,
            messageId: parsed.messageId,
            leadId: result?.leadId ?? null,
            replied: result?.replied ?? null,
            delivered: result?.delivered ?? null,
            reason: result?.reason ?? null,
            intent: result?.intent ?? null,
            path: result?.path ?? null,
          },
          "WhatsApp inbound handled"
        );
      } catch (err) {
        log.error({ err: err.message, channelId: session.channel.id, messageId: parsed.messageId }, "WhatsApp inbound message failed");
      }
    }
  }

  async function start(channel, { waitForQr = true } = {}) {
    const existing = sessions.get(channel.id);
    if (existing && !existing.stopped) {
      if (existing.status !== "closed" && existing.status !== "logged_out" && existing.status !== "error") {
        if (waitForQr) await waitForState(existing, (session) => session.status === "qr" || session.status === "open", qrWaitMs);
        return snapshot(existing);
      }
      await stop(channel.id, { removeAuth: existing.status === "logged_out" });
    }

    const directory = authDirFor(authRoot, channel.id);
    await fs.mkdir(directory, { recursive: true });
    const auth = await authStateFactory(directory);
    const version = await resolvedVersion();

    const socket = socketFactory({
      version,
      auth: auth.state,
      logger: childLogger,
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    const session = {
      channel,
      socket,
      status: "starting",
      qrDataUrl: null,
      me: null,
      lastError: null,
      stopped: false,
      reconnectAttempts: 0,
      reconnectTimer: null,
      messages: new Map(),
      updatedAt: now(),
    };
    sessions.set(channel.id, session);

    socket.ev.on("creds.update", auth.saveCreds);
    socket.ev.on("connection.update", (update) => {
      handleConnectionUpdate(session, update).catch((err) => log.error({ err: err.message, channelId: channel.id }, "WhatsApp connection update failed"));
    });
    socket.ev.on("messages.upsert", (event) => {
      handleMessages(session, event).catch((err) => log.error({ err: err.message, channelId: channel.id }, "WhatsApp inbound event failed"));
    });

    if (waitForQr) await waitForState(session, (s) => s.status === "qr" || s.status === "open", qrWaitMs);
    return snapshot(session);
  }

  async function stop(channelId, { removeAuth: purge = false } = {}) {
    const session = sessions.get(channelId);
    if (!session) {
      if (purge) await removeAuthStore(channelId);
      return;
    }
    session.stopped = true;
    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
    }
    await endSocket(session);
    sessions.delete(channelId);
    if (purge) await removeAuthStore(channelId);
  }

  async function removeAuthStore(channelId) {
    await removeAuth(channelId);
  }

  async function logout(channelId) {
    const session = sessions.get(channelId);
    if (session?.socket) {
      try {
        await Promise.race([session.socket.logout(), new Promise((resolve) => setTimeout(resolve, 3000))]);
      } catch (err) {
        log.warn({ err: err.message, channelId }, "WhatsApp logout failed");
      }
    }
    await stop(channelId, { removeAuth: true });
  }

  async function stopAll() {
    await Promise.all([...sessions.keys()].map((channelId) => stop(channelId)));
  }

  async function hasAuth(channelId) {
    return pathExists(path.join(authDirFor(authRoot, channelId), "creds.json"));
  }

  function getStatus(channelId) {
    return snapshot(sessions.get(channelId));
  }

  async function ensureOpen(channel, timeoutMs = 10000) {
    let session = sessions.get(channel.id);
    if (!session || session.stopped) {
      if (!(await hasAuth(channel.id))) return null;
      await start(channel, { waitForQr: false });
      session = sessions.get(channel.id);
    }
    if (!session) return null;
    await waitForState(session, (s) => s.status === "open" || s.status === "error" || s.status === "logged_out", timeoutMs);
    return session.status === "open" ? session : null;
  }

  async function send({ channel, to, text }) {
    const contactId = normalizeContactId(to);
    const jid = contactIdToJid(contactId);
    if (!jid || !text) return { success: false, error: "Nomor tujuan dan teks wajib diisi." };
    const session = await ensureOpen(channel);
    if (!session) return { success: false, error: "WhatsApp belum terhubung. Buka halaman Saluran dan pindai kode QR." };
    try {
      const result = await session.socket.sendMessage(jid, { text });
      return { success: true, to: contactId, messageId: messageIdFor(result?.key) };
    } catch (err) {
      log.error({ err: err.message, channelId: channel.id }, "WhatsApp Web send failed");
      return { success: false, error: "Gagal mengirim pesan WhatsApp." };
    }
  }

  async function sendImage({ channel, to, buffer, mimeType, caption = "" }) {
    const contactId = normalizeContactId(to);
    const jid = contactIdToJid(contactId);
    if (!jid || !buffer) return { success: false, error: "Gambar atau nomor tujuan tidak valid." };
    const session = await ensureOpen(channel);
    if (!session) return { success: false, error: "WhatsApp belum terhubung. Buka halaman Saluran dan pindai kode QR." };
    try {
      const result = await session.socket.sendMessage(jid, { image: buffer, mimetype: mimeType || "image/png", caption });
      return { success: true, to: contactId, messageId: messageIdFor(result?.key) };
    } catch (err) {
      log.error({ err: err.message, channelId: channel.id }, "WhatsApp Web image send failed");
      return { success: false, error: "Gagal mengirim gambar WhatsApp." };
    }
  }

  async function markRead(channelId, messageId) {
    const session = sessions.get(channelId);
    const entry = session?.messages.get(messageId);
    if (!session?.socket || !entry?.key) return { success: false };
    try {
      await session.socket.readMessages([entry.key]);
      return { success: true };
    } catch (err) {
      log.warn({ err: err.message, channelId }, "WhatsApp mark-read failed");
      return { success: false };
    }
  }

  async function downloadMedia(channelId, mediaId) {
    const session = sessions.get(channelId);
    const entry = session?.messages.get(mediaId);
    if (!session?.socket || !entry?.raw) return null;
    try {
      const buffer = await mediaDownloader(entry.raw, "buffer", {}, { logger: childLogger, reuploadRequest: session.socket.updateMediaMessage });
      const bytes = Buffer.from(buffer);
      if (!bytes.length || bytes.length > MAX_MEDIA_BYTES || !MEDIA_MIME_TYPES.has(entry.mimeType)) return null;
      return { buffer: bytes, mimeType: entry.mimeType };
    } catch (err) {
      log.warn({ err: err.message, channelId }, "WhatsApp media download failed");
      return null;
    }
  }

  async function verify(channel) {
    let session = sessions.get(channel.id);
    if (!session?.socket && (await hasAuth(channel.id))) {
      await start(channel, { waitForQr: false }).catch(() => {});
      session = sessions.get(channel.id);
    }
    if (!session) return { ok: false, error: "WhatsApp belum terhubung. Pindai kode QR dari halaman Saluran." };
    if (session.status !== "open") {
      return { ok: false, error: session.lastError || "WhatsApp belum terhubung. Pindai kode QR dari halaman Saluran." };
    }
    return { ok: true, displayPhone: session.me?.phone ?? null, verifiedName: session.me?.name ?? null };
  }

  return { start, stop, stopAll, logout, getStatus, hasAuth, send, sendImage, markRead, downloadMedia, verify };
}

async function deliverInbound(payload) {
  const [{ handleInbound }, { loadTransportChannelAny }] = await Promise.all([
    import("../conversationService.js"),
    import("./channelRepository.js"),
  ]);
  const fresh = await loadTransportChannelAny(payload.institutionId, payload.channel.id).catch(() => null);
  return handleInbound({ ...payload, channel: fresh ?? payload.channel });
}

async function bindConnected(channel, me) {
  const { setChannelIdentity } = await import("./channelRepository.js");
  const externalId = me.phone || jidToContactId(me.id);
  if (!externalId) return;
  await setChannelIdentity({
    institutionId: channel.institutionId,
    id: channel.id,
    externalId,
    displayHandle: me.name || null,
    config: { jid: me.id ?? null, connectedAt: new Date().toISOString() },
  });
}

async function markLoggedOut(channel) {
  const { setChannelActive } = await import("./channelRepository.js");
  await setChannelActive(channel.institutionId, channel.id, false);
}

let activeManager = createWhatsAppWebManager({ onInbound: deliverInbound, onConnected: bindConnected, onLoggedOut: markLoggedOut });

export const getWhatsAppWebManager = () => activeManager;

export function setWhatsAppWebManager(manager) {
  activeManager = manager;
}
