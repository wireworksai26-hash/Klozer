import crypto from "node:crypto";
import { queryOne } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { badRequest, notFound } from "../../utils/errors.js";
import {
  assertWithinLimit,
  createChannel,
  deleteChannel,
  findChannelByType,
  getChannel,
  loadTransportChannelAny,
  setChannelActive,
} from "./channelRepository.js";
import { getWhatsAppWebManager } from "./whatsappWebManager.js";

function payload(channel, snapshot) {
  return {
    channel,
    status: snapshot?.status ?? "disconnected",
    qr: snapshot?.qr ?? null,
    connectedPhone: snapshot?.phone ?? null,
    connectedName: snapshot?.name ?? null,
    error: snapshot?.lastError ?? null,
    updatedAt: snapshot?.updatedAt ?? null,
  };
}

async function loadWebChannel(institutionId, id) {
  const channel = await loadTransportChannelAny(institutionId, id);
  if (!channel || channel.type !== "whatsapp_web") throw notFound("Kanal WhatsApp QR tidak ditemukan.");
  return channel;
}

function startFailed(err) {
  logger.error({ err: err.message }, "WhatsApp Web session could not start");
  return badRequest("Tidak dapat memulai sesi WhatsApp. Coba lagi.", { code: "CHANNEL_CONNECT_FAILED" });
}

/**
 * Start (or resume) the tenant's QR-linked WhatsApp number. A tenant has one such number; calling this again
 * reuses the same channel and session instead of creating duplicates.
 */
export async function startWhatsAppWeb({ institutionId, name, aiEnabled = true }) {
  const manager = getWhatsAppWebManager();
  const existing = await findChannelByType(institutionId, "whatsapp_web");

  if (existing) {
    await setChannelActive(institutionId, existing.id, true);
    let snapshot;
    try {
      snapshot = await manager.start(existing, { waitForQr: true });
    } catch (err) {
      throw startFailed(err);
    }
    return { created: false, ...payload(await getChannel(institutionId, existing.id), snapshot) };
  }

  await assertWithinLimit({ queryOne }, institutionId);
  const channel = await createChannel({
    institutionId,
    type: "whatsapp_web",
    name: name || "WhatsApp",
    externalId: `web-${crypto.randomBytes(16).toString("hex")}`,
    aiEnabled,
  });

  try {
    const transport = await loadTransportChannelAny(institutionId, channel.id);
    const snapshot = await manager.start(transport, { waitForQr: true });
    return { created: true, ...payload(channel, snapshot) };
  } catch (err) {
    await deleteChannel(institutionId, channel.id).catch(() => {});
    throw startFailed(err);
  }
}

/** Current connection state and the QR code when one is waiting to be scanned. */
export async function getWhatsAppWebStatus({ institutionId, id }) {
  const channel = await loadWebChannel(institutionId, id);
  const manager = getWhatsAppWebManager();
  let snapshot = manager.getStatus(id);
  if (snapshot.status === "disconnected" && typeof manager.hasAuth === "function" && (await manager.hasAuth(id))) {
    try {
      snapshot = await manager.start(channel, { waitForQr: false });
    } catch (err) {
      logger.warn({ err: err.message, channelId: id }, "Could not resume the WhatsApp Web session");
      snapshot = manager.getStatus(id);
    }
  }
  return payload(await getChannel(institutionId, id), snapshot);
}

/** Drop the current socket and show a fresh QR code. */
export async function reconnectWhatsAppWeb({ institutionId, id }) {
  const channel = await loadWebChannel(institutionId, id);
  const manager = getWhatsAppWebManager();
  const current = manager.getStatus(id);
  await manager.stop(id, { removeAuth: current.status === "logged_out" || current.status === "error" });
  await setChannelActive(institutionId, id, true);
  try {
    const snapshot = await manager.start(channel, { waitForQr: true });
    return payload(await getChannel(institutionId, id), snapshot);
  } catch (err) {
    throw startFailed(err);
  }
}
