import { query, queryOne, retryOnDeadlock } from "../config/db.js";
import { emitToTenant } from "../realtime.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { buildPagination, escapeLike, normalizePhone, parsePagination } from "../utils/helpers.js";
import { sendText } from "../services/channels/channelService.js";
import { loadDefaultChannel } from "../services/channels/channelRepository.js";
import { setConsent } from "../services/broadcast/consentService.js";
import { loadLead, sendTemplateToContact } from "../services/broadcast/templateSender.js";
import { withinMessagingWindow } from "../services/followup/followupPolicy.js";
import { claimIdempotencyKey, markIdempotentFailed, markIdempotentSuccess } from "../services/idempotencyService.js";
import { emitEvent } from "../services/integrations/eventBus.js";
import { contactPayload, loadContactPayload, loadOrderPayload, messagePayload } from "../services/integrations/eventPayloads.js";
import { DuplicateOrderRequest, createOrderRecord } from "../services/orderCreationService.js";

/**
 * The public API, called with an API key by automations (n8n, Make, custom code). Every handler works on the key's
 * own tenant only (`req.tenantId` comes from the key, never from the request), and returns the same field names the
 * webhook events use.
 */

const WINDOWED = new Set(["whatsapp", "messenger", "instagram"]);
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,60}$/;

function idempotencyKeyOf(req) {
  const key = req.get("idempotency-key") || null;
  if (key && !IDEMPOTENCY_KEY.test(key)) throw badRequest("Header Idempotency-Key tidak valid (8-60 karakter: huruf, angka, - atau _).", { code: "INVALID_IDEMPOTENCY_KEY" });
  return key;
}

async function defaultWhatsappChannelId(institutionId) {
  return (await loadDefaultChannel(institutionId, "whatsapp"))?.id ?? null;
}

/** The contact a request is about, from its id or its phone number; created when `create` is set and the number is new. */
async function resolveContact(req, { create = false, name = null } = {}) {
  const { contactId, phone } = req.body;
  if (contactId) return loadLead(req.tenantId, contactId);

  const normalized = normalizePhone(phone);
  if (normalized.length < 9 || normalized.length > 15) throw badRequest("Nomor telepon tidak valid.", { code: "INVALID_PHONE" });
  const existing = await queryOne("SELECT * FROM leads WHERE institution_id = ? AND phone_number = ?", [req.tenantId, normalized]);
  if (existing) return existing;
  if (!create) throw notFound("Kontak dengan nomor ini tidak ditemukan.");
  return createContact(req.tenantId, { phone: normalized, name });
}

async function createContact(institutionId, { phone, name = null, city = null, status = "new", notes = null }) {
  const channelId = await defaultWhatsappChannelId(institutionId);
  const result = await retryOnDeadlock(() =>
    query(
      `INSERT INTO leads (institution_id, channel_id, channel_type, external_id, phone_number, name, city, status, source, notes, last_contacted_at)
       VALUES (?, ?, 'whatsapp', ?, ?, ?, ?, ?, 'api', ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [institutionId, channelId, phone, phone, name || "Pelanggan", city, status, notes]
    )
  );
  const lead = await queryOne("SELECT * FROM leads WHERE id = ?", [result.insertId]);
  if (result.affectedRows === 1) emitEvent({ institutionId, type: "contact.created", data: () => contactPayload(lead) });
  return lead;
}

const ok = (res, data, extra = {}) => res.json({ success: true, data, ...extra });

// ---------------------------------------------------------------- contacts
/** GET /open/contacts */
export async function listContacts(req, res) {
  const paging = parsePagination(req.query);
  const where = ["institution_id = ?"];
  const params = [req.tenantId];
  if (req.query.search) {
    const like = `%${escapeLike(req.query.search)}%`;
    where.push("(name LIKE ? OR phone_number LIKE ?)");
    params.push(like, like);
  }
  if (req.query.status) (where.push("status = ?"), params.push(req.query.status));
  if (req.query.consent) (where.push("marketing_consent = ?"), params.push(req.query.consent));
  const clause = where.join(" AND ");
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM leads WHERE ${clause}`, params);
  const rows = await query(`SELECT * FROM leads WHERE ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);
  ok(res, rows.map(contactPayload), { pagination: buildPagination(paging, Number(total)) });
}

/** GET /open/contacts/:id */
export async function getContact(req, res) {
  const data = await loadContactPayload(req.tenantId, Number(req.params.id));
  if (!data) throw notFound("Kontak tidak ditemukan.");
  ok(res, data);
}

/** POST /open/contacts: create a contact, or return the one with this number. */
export async function upsertContact(req, res) {
  const b = req.body;
  const phone = normalizePhone(b.phone);
  if (phone.length < 9 || phone.length > 15) throw badRequest("Nomor telepon tidak valid.", { code: "INVALID_PHONE" });
  const existing = await queryOne("SELECT id FROM leads WHERE institution_id = ? AND phone_number = ?", [req.tenantId, phone]);
  const lead = await createContact(req.tenantId, { phone, name: b.name, city: b.city, status: b.status, notes: b.notes });
  ok(res.status(existing ? 200 : 201), contactPayload(lead), { created: !existing });
}

/** PATCH /open/contacts/:id */
export async function patchContact(req, res) {
  const id = Number(req.params.id);
  const lead = await loadLead(req.tenantId, id);
  const columns = { name: "name", city: "city", status: "status", notes: "notes" };
  const sets = [];
  const values = [];
  for (const [field, column] of Object.entries(columns)) {
    if (req.body[field] !== undefined) (sets.push(`${column} = ?`), values.push(req.body[field]));
  }
  await query(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`, [...values, lead.id]);
  emitEvent({ institutionId: req.tenantId, type: "contact.updated", data: () => loadContactPayload(req.tenantId, lead.id) });
  ok(res, await loadContactPayload(req.tenantId, lead.id));
}

/** PUT /open/contacts/:id/consent */
export async function putConsent(req, res) {
  const data = await setConsent({ institutionId: req.tenantId, leadId: Number(req.params.id), state: req.body.state, source: `API: ${req.body.source}` });
  ok(res, data);
}

// ---------------------------------------------------------------- messages
/** GET /open/contacts/:id/messages: newest first; `before` pages backwards. */
export async function listMessages(req, res) {
  const lead = await loadLead(req.tenantId, Number(req.params.id));
  const limit = req.query.limit ?? 50;
  const rows = await query(
    `SELECT id, sender_type, message_type, content_text, is_delivered, created_at FROM chat_messages
      WHERE lead_id = ? AND institution_id = ? AND sender_type <> 'system' AND (? IS NULL OR id < ?) ORDER BY id DESC LIMIT ?`,
    [lead.id, req.tenantId, req.query.before ?? null, req.query.before ?? null, limit]
  );
  const data = rows.map((m) => ({
    id: Number(m.id),
    direction: m.sender_type === "customer" ? "inbound" : "outbound",
    sender: m.sender_type === "customer" ? "customer" : m.sender_type === "ai_agent" ? "ai" : "cs",
    type: m.message_type,
    text: m.content_text,
    delivered: Boolean(m.is_delivered),
    created_at: new Date(m.created_at).toISOString(),
  }));
  ok(res, data, { next_before: data.length === limit ? data[data.length - 1].id : null });
}

/** POST /open/messages: send a text to a contact, on the channel the conversation is on. */
export async function sendMessage(req, res) {
  const key = idempotencyKeyOf(req);
  const claimKey = key ? `API:${req.tenantId}:message:${key}` : null;
  if (claimKey) {
    const claim = await claimIdempotencyKey({ key: claimKey, provider: "openapi", eventType: "message.send", payload: { text: req.body.text }, institutionId: req.tenantId });
    if (!claim.claimed) return ok(res, { duplicate: true }, { message: "Pesan dengan Idempotency-Key ini sudah diproses." });
  }

  try {
    const lead = await resolveContact(req);
    if (lead.marketing_consent === "opted_out" && !req.body.transactional) throw conflict("Kontak ini sudah berhenti menerima pesan. Untuk pesan transaksional (info pesanan) kirim transactional: true.", { code: "OPTED_OUT" });
    if (WINDOWED.has(lead.channel_type) && !withinMessagingWindow(lead.channel_type, lead.last_inbound_at)) {
      throw conflict("Jendela chat 24 jam sudah tertutup. Kirim templat yang disetujui lewat POST /open/messages/template.", { code: "WINDOW_CLOSED" });
    }

    const sent = await sendText({ institutionId: req.tenantId, channelId: lead.channel_id, type: lead.channel_type, to: lead.external_id ?? lead.phone_number, text: req.body.text });
    const stored = await query(
      `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, message_type, content_text, is_delivered, delivery_error, meta_json)
       VALUES (?, ?, ?, ?, 'cs', 'text', ?, ?, ?, ?)`,
      [req.tenantId, lead.id, lead.channel_id, sent.messageId ?? null, req.body.text, sent.success ? 1 : 0, sent.success ? null : String(sent.error).slice(0, 250), JSON.stringify({ api: { keyId: req.apiKey.id } })]
    );
    if (sent.success) {
      emitToTenant(req.tenantId, "chat:message", { leadId: lead.id, direction: "outbound", text: req.body.text, sender: "cs" });
      emitEvent({ institutionId: req.tenantId, type: "message.sent", data: messagePayload({ contactId: lead.id, channelType: lead.channel_type, direction: "outbound", sender: "api", text: req.body.text, externalId: sent.messageId ?? null }) });
    }
    if (claimKey) await markIdempotentSuccess(claimKey, { messageId: Number(stored.insertId), delivered: sent.success });
    res.status(sent.success ? 201 : 502).json({
      success: sent.success,
      message: sent.success ? "Pesan terkirim." : `Pesan tersimpan tetapi gagal terkirim: ${sent.error}`,
      data: { id: Number(stored.insertId), contact_id: lead.id, delivered: sent.success, external_id: sent.messageId ?? null },
    });
  } catch (err) {
    if (claimKey) await markIdempotentFailed(claimKey, err.message);
    throw err;
  }
}

/** POST /open/messages/template */
export async function sendTemplate(req, res) {
  const b = req.body;
  const lead = await resolveContact(req);
  const result = await sendTemplateToContact({ institutionId: req.tenantId, lead, templateId: b.templateId, values: b.variables, headerMediaUrl: b.headerMediaUrl ?? null, transactional: Boolean(b.transactional), source: { api: true, keyId: req.apiKey.id } });
  res.status(result.success ? 201 : 502).json({
    success: result.success,
    message: result.success ? "Templat terkirim." : `Gagal mengirim: ${result.error}`,
    data: result.success ? { contact_id: lead.id, external_id: result.messageId, text: result.text } : null,
  });
}

// ---------------------------------------------------------------- orders and products
/** GET /open/orders */
export async function listOrders(req, res) {
  const paging = parsePagination(req.query);
  const where = ["institution_id = ?"];
  const params = [req.tenantId];
  if (req.query.status) (where.push("status = ?"), params.push(req.query.status));
  if (req.query.since) (where.push("created_at >= ?"), params.push(new Date(req.query.since)));
  const clause = where.join(" AND ");
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM orders WHERE ${clause}`, params);
  const rows = await query(`SELECT id FROM orders WHERE ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);
  const data = await Promise.all(rows.map((r) => loadOrderPayload(req.tenantId, r.id)));
  ok(res, data, { pagination: buildPagination(paging, Number(total)) });
}

/** GET /open/orders/:id (by id or order number) */
export async function getOrder(req, res) {
  const ref = req.params.id;
  const row = await queryOne("SELECT id FROM orders WHERE institution_id = ? AND (id = ? OR order_number = ?)", [req.tenantId, /^\d+$/.test(ref) ? Number(ref) : 0, ref]);
  if (!row) throw notFound("Pesanan tidak ditemukan.");
  ok(res, await loadOrderPayload(req.tenantId, row.id));
}

/** POST /open/orders: prices, stock and totals are computed by the server, exactly as for an order made on the dashboard. */
export async function createOrder(req, res) {
  const b = req.body;
  const idempotencyKey = idempotencyKeyOf(req);
  const scoped = idempotencyKey ? `api-${req.apiKey.id}-${idempotencyKey}` : null;

  const existing = scoped ? await queryOne("SELECT id FROM orders WHERE institution_id = ? AND idempotency_key = ?", [req.tenantId, scoped]) : null;
  if (existing) return res.status(200).json({ success: true, replayed: true, message: "Pesanan ini sudah dibuat sebelumnya.", data: await loadOrderPayload(req.tenantId, existing.id) });

  const lead = await resolveContact(req, { create: true, name: b.name });
  try {
    const created = await createOrderRecord({
      tenantId: req.tenantId,
      leadId: lead.id,
      csUserId: lead.assigned_cs_id ?? null,
      items: b.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      shippingFee: b.shippingFee,
      discountAmount: b.discountAmount,
      paymentMethod: b.paymentMethod,
      fulfillmentType: b.fulfillmentType,
      notes: b.notes ?? null,
      idempotencyKey: scoped,
      createdVia: "api",
    });
    res.status(201).json({ success: true, message: "Pesanan dibuat.", data: await loadOrderPayload(req.tenantId, created.orderId) });
  } catch (err) {
    if (err instanceof DuplicateOrderRequest) {
      const won = await queryOne("SELECT id FROM orders WHERE institution_id = ? AND idempotency_key = ?", [req.tenantId, scoped]);
      return res.status(200).json({ success: true, replayed: true, data: await loadOrderPayload(req.tenantId, won.id) });
    }
    throw err;
  }
}

/** GET /open/products */
export async function listProducts(req, res) {
  const paging = parsePagination(req.query);
  const where = ["institution_id = ?", "is_active = 1"];
  const params = [req.tenantId];
  if (req.query.search) {
    const like = `%${escapeLike(req.query.search)}%`;
    where.push("(name LIKE ? OR sku LIKE ?)");
    params.push(like, like);
  }
  const clause = where.join(" AND ");
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM products WHERE ${clause}`, params);
  const rows = await query(`SELECT id, sku, name, category, selling_price, stock_quantity, weight_in_grams FROM products WHERE ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);
  ok(
    res,
    rows.map((p) => ({ id: p.id, sku: p.sku, name: p.name, category: p.category, price: Number(p.selling_price), stock: Number(p.stock_quantity), weight_grams: Number(p.weight_in_grams), currency: "IDR" })),
    { pagination: buildPagination(paging, Number(total)) }
  );
}
