import { query, queryOne } from "../../config/db.js";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { emitToTenant } from "../../realtime.js";
import { audit } from "../auditService.js";
import { addSystemNote } from "../handoff/handoffService.js";
import { createQrisCharge, isGatewayConfigured } from "../ipaymuService.js";
import { DuplicateOrderRequest, createOrderRecord } from "../orderCreationService.js";
import { quoteShipping } from "../shipping/rateService.js";
import { trackWaybill, isBiteshipConfigured } from "../shipping/biteship.js";
import { calculateCodRiskScore } from "../shippingService.js";
import { recordTokenUsage } from "../tokenService.js";
import { cancelPending, scheduleCartFollowups, scheduleOrderFollowups } from "../followup/followupService.js";
import { loadCatalog } from "./catalog.js";
import { getCommerceSettings } from "./commerceSettings.js";
import { analyzeOrderMessage } from "./commerceNlu.js";
import { clearShipping, applyItemOperations, missingRecipientFields, nextStep, priceLines, subtotalOf } from "./draftModel.js";
import { closeDraft, getActiveDraft, openDraft, saveDraft } from "./draftRepository.js";
import * as say from "./messages.js";
import { claimsPayment, detectPaymentChoice, isAffirmative, isBuyIntent, isCancel, isOptOut, isOrderStatusQuestion, parseChoiceNumber } from "./purchaseIntent.js";

/**
 * Taking an order in chat. The conversation walks a draft through
 *   items -> recipient -> shipping -> payment -> confirmation -> order
 * and every amount in it comes from the catalog and the tenant's shipping rules, never from the model. A language
 * model is used for one thing only: reading free text into products, quantities and an address
 * (commerceNlu.js). Choosing a courier or a payment method, confirming, and every sentence sent back are fixed rules
 * and templates (purchaseIntent.js, messages.js).
 *
 * `handleCommerceTurn` returns null when the message is not about ordering, and the normal assistant answers.
 */

/** @typedef {{ replyText: string, handoffReason?: string, nluUsage?: object|null, model?: string|null, meta?: object }} CommerceReply */

// Two messages from one customer a moment apart must not edit the same draft at the same time.
const locks = new Map();
function withLeadLock(leadId, fn) {
  const next = (locks.get(leadId) || Promise.resolve()).catch(() => {}).then(fn);
  locks.set(leadId, next);
  next.then(
    () => locks.get(leadId) === next && locks.delete(leadId),
    () => locks.get(leadId) === next && locks.delete(leadId)
  );
  return next;
}

/**
 * @param {object} p
 * @param {{ institutionId: number, leadId: number, channelId: number|null, channelType: string, contactId: string }} p.ctx
 * @param {{ assigned_cs_id: number|null, name: string|null }} p.lead
 * @returns {Promise<CommerceReply|null>}
 */
export function handleCommerceTurn(p) {
  return withLeadLock(p.ctx.leadId, () => run(p));
}

async function run({ ctx, lead, text, customerName, history }) {
  const settings = await getCommerceSettings(ctx.institutionId);
  if (!settings.enabled) return null;
  const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ? AND is_active = 1", [ctx.institutionId]);
  if (!inst || parseJsonColumn(inst.features_json).chatCommerce === false) return null;
  const env = { ctx, lead, settings, text, customerName, history };

  if (isOptOut(text)) return optOut(env);

  const draft = await getActiveDraft(ctx.institutionId, ctx.leadId);
  const confirming = draft?.status === "awaiting_confirmation";

  if (isOrderStatusQuestion(text) && !confirming) {
    const status = await orderStatus(env);
    if (status) return status;
  }
  if (draft) return continueDraft(env, draft);

  const help = await unpaidOrderHelp(env);
  if (help) return help;
  if (!isBuyIntent(text)) return null;
  return startDraft(env);
}

// ---------------------------------------------------------------- small answers

async function optOut({ ctx }) {
  await query("UPDATE leads SET followup_opt_out = 1 WHERE id = ? AND institution_id = ?", [ctx.leadId, ctx.institutionId]);
  await cancelPending({ leadId: ctx.leadId, status: "cancelled" });
  return { replyText: say.optOutText(), meta: { commerce: "opt_out" } };
}

async function orderStatus({ ctx }) {
  const order = await queryOne("SELECT * FROM orders WHERE institution_id = ? AND lead_id = ? ORDER BY id DESC LIMIT 1", [ctx.institutionId, ctx.leadId]);
  if (!order) return null;
  const shipment = await queryOne("SELECT courier_code, service_name, awb_number FROM shipping_shipments WHERE order_id = ?", [order.id]);
  const tracking = shipment?.awb_number && isBiteshipConfigured() ? await trackWaybill({ courierCode: shipment.courier_code, awb: shipment.awb_number }) : null;
  return { replyText: say.orderStatusText({ order, shipment, tracking }), meta: { commerce: "order_status", orderId: order.id } };
}

async function activeBanks(institutionId) {
  return query("SELECT bank_code AS bank, account_number AS accountNumber, account_holder AS holder FROM bank_accounts WHERE institution_id = ? AND is_active = 1", [institutionId]);
}

const qrisPossible = (settings) => settings.payQris && (isGatewayConfigured() || !config.isProduction);

async function newQris({ ctx, order, name, phone }) {
  try {
    const charge = await createQrisCharge({ institutionId: ctx.institutionId, order, customerName: name, customerPhone: phone });
    return { imageUrl: charge.qrImageUrl ?? null };
  } catch (err) {
    logger.warn({ err: err.message, orderId: order.id }, "QRIS for a chat order could not be created");
    return null;
  }
}

/** The customer has an unpaid order and asks about paying: say how, deterministically. */
async function unpaidOrderHelp({ ctx, settings, text, lead }) {
  const order = await queryOne("SELECT * FROM orders WHERE institution_id = ? AND lead_id = ? AND status = 'waiting_payment' AND payment_method <> 'cod' ORDER BY id DESC LIMIT 1", [ctx.institutionId, ctx.leadId]);
  if (!order) return null;

  if (claimsPayment(text)) return { replyText: say.askProofText(), meta: { commerce: "ask_proof", orderId: order.id } };

  const choice = detectPaymentChoice(text);
  if (choice === "qris" && qrisPossible(settings) && Number(order.total_amount) >= 1500) {
    const qris = await newQris({ ctx, order, name: lead?.name, phone: ctx.channelType === "whatsapp" ? ctx.contactId : null });
    if (order.payment_method !== "qris") await query("UPDATE orders SET payment_method = 'qris' WHERE id = ? AND status = 'waiting_payment'", [order.id]);
    return { replyText: say.qrisRenewedText({ orderNumber: order.order_number, total: order.total_amount, imageUrl: qris?.imageUrl }), meta: { commerce: "qris_renewed", orderId: order.id } };
  }
  if (choice === "bank_transfer" && settings.payTransfer) {
    const accounts = await activeBanks(ctx.institutionId);
    if (!accounts.length) return null;
    if (order.payment_method !== "bank_transfer") await query("UPDATE orders SET payment_method = 'bank_transfer' WHERE id = ? AND status = 'waiting_payment'", [order.id]);
    return { replyText: say.transferReminderText({ orderNumber: order.order_number, total: order.total_amount, accounts }), meta: { commerce: "transfer_reminder", orderId: order.id } };
  }
  return null;
}

// ---------------------------------------------------------------- the draft

async function startDraft(env) {
  const parsed = await readOrder(env, null);
  if (!parsed) return null;
  if (!parsed.update.items.length) return null; // no product named: not an order (yet), the normal assistant answers
  const draft = await openDraft({ institutionId: env.ctx.institutionId, leadId: env.ctx.leadId, channelId: env.ctx.channelId });
  const outcome = applyUpdate(env, { ...draft, items: [] }, parsed.update, parsed.catalog);
  return advance(env, outcome.draft, { problems: outcome.problems, nluUsage: parsed.usage, model: parsed.model });
}

async function continueDraft(env, draft) {
  const { text, settings } = env;
  const methodsFor = async () => availableMethods(env, draft, await loadCatalog(env.ctx.institutionId));

  if (isCancel(text)) {
    await closeDraft(env.ctx.institutionId, draft.id, "cancelled");
    await cancelPending({ draftId: draft.id, status: "cancelled" });
    return { replyText: say.cancelledText(), meta: { commerce: "draft_cancelled" } };
  }

  if (draft.status === "awaiting_confirmation" && isAffirmative(text)) return placeOrder(env, draft);

  // a numbered answer to the question we just asked
  if (draft.status !== "awaiting_confirmation") {
    const step = nextStep(draft, { needPostalCode: needsPostal(settings, draft) });
    if (step === "shipping" && draft.shippingOptions?.length) {
      const n = parseChoiceNumber(text, draft.shippingOptions.length);
      if (n) {
        const o = draft.shippingOptions[n - 1];
        return advance(env, { ...draft, courierCode: o.code, courierService: o.label, shippingFee: o.fee, shippingEta: o.eta, shippingOptions: null });
      }
    }
    if (step === "payment") {
      const methods = await methodsFor();
      const n = parseChoiceNumber(text, methods.length);
      const wanted = n ? methods[n - 1] : detectPaymentChoice(text);
      if (wanted && methods.includes(wanted)) return advance(env, { ...draft, paymentMethod: wanted });
      if (wanted) return advance(env, draft, { notice: `${say.PAYMENT_LABELS[wanted]} belum tersedia untuk pesanan ini kak.` });
    }
    // "ok", "lanjut": nothing new to read, just ask the next question again
    if (isAffirmative(text)) return advance(env, draft);
  }

  const parsed = await readOrder(env, draft);
  if (!parsed) return null;
  // nothing about the order in this message (a question about shipping time, a colour): the normal assistant answers it
  if (!hasOrderContent(parsed.update)) return null;
  const outcome = applyUpdate(env, draft, parsed.update, parsed.catalog);
  return advance(env, outcome.draft, { problems: outcome.problems, nluUsage: parsed.usage, model: parsed.model, notice: outcome.notice });
}

const hasOrderContent = (u) => u.items.length > 0 || Object.keys(u.recipient).length > 0 || Boolean(u.fulfillment) || Boolean(u.notes);

const needsPostal = (settings, draft) => settings.shippingMode === "provider" && draft.fulfillmentType === "delivery";

/** Read the customer's message into an order update with the model, and account for its cost. */
async function readOrder({ ctx, text, history }, draft) {
  const catalog = await loadCatalog(ctx.institutionId);
  const { lines } = priceLines(draft?.items ?? [], catalog);
  const draftSummary = lines.map((l) => `${l.quantity} x ${l.name}`).join(", ");
  const nlu = await analyzeOrderMessage({ text, history, catalog, draftSummary });
  if (!nlu) return null;
  if (nlu.usage) {
    await recordTokenUsage({
      institutionId: ctx.institutionId,
      model: nlu.model || "unknown",
      usageType: "commerce_nlu",
      promptTokens: nlu.usage.promptTokens ?? 600,
      completionTokens: nlu.usage.completionTokens ?? 100,
      latencyMs: nlu.latencyMs ?? 0,
    }).catch((err) => logger.warn({ err: err.message }, "Order-reading token usage not recorded"));
  }
  return { update: nlu.update, catalog, usage: nlu.usage, model: nlu.model };
}

/** Merge what the customer said into the draft. Anything that changes the price of delivery clears the shipping choice. */
function applyUpdate({ settings, ctx }, draft, update, catalog) {
  let next = { ...draft };
  let notice = null;
  const before = JSON.stringify([draft.items, draft.addressText, draft.city, draft.postalCode, draft.fulfillmentType]);

  const applied = applyItemOperations(draft.items, update.items, catalog);
  next.items = applied.items;

  const r = update.recipient;
  if (r.name) next.recipientName = r.name;
  if (r.phone) next.recipientPhone = r.phone;
  if (r.address) next.addressText = r.address;
  if (r.city) next.city = r.city;
  if (r.postalCode) next.postalCode = r.postalCode;
  if (!next.recipientPhone && ctx.channelType === "whatsapp") next.recipientPhone = ctx.contactId; // the chat number is the natural default

  if (update.fulfillment === "pickup") {
    if (settings.allowPickup) next.fulfillmentType = "pickup";
    else notice = "Untuk saat ini kami belum melayani ambil di tempat ya kak, pesanannya dikirim.";
  } else if (update.fulfillment === "delivery") next.fulfillmentType = "delivery";
  if (update.notes) next.notes = update.notes;

  if (JSON.stringify([next.items, next.addressText, next.city, next.postalCode, next.fulfillmentType]) !== before) {
    next = { ...clearShipping(next), shippingOptions: null };
  }
  next.status = "collecting"; // anything the customer changes has to be confirmed again
  return { draft: next, problems: applied.problems, notice };
}

// ---------------------------------------------------------------- moving the draft forward

/** Which payment methods this order can use right now, in the order they are offered. */
async function availableMethods({ ctx, settings }, draft, catalog) {
  const { lines } = priceLines(draft.items, catalog);
  const total = subtotalOf(lines) + (draft.shippingFee ?? 0);
  const methods = [];
  if (qrisPossible(settings) && total >= 1500) methods.push("qris");
  if (settings.payTransfer && (await activeBanks(ctx.institutionId)).length) methods.push("bank_transfer");
  if (settings.payCod && draft.fulfillmentType === "delivery" && calculateCodRiskScore({ address: draft.addressText || "" }).riskLevel !== "HIGH_RISK_RTS") methods.push("cod");
  return methods;
}

async function toTeam(env, draft, lines, { reason, text }) {
  const { ctx } = env;
  await closeDraft(ctx.institutionId, draft.id, "handed_off");
  await cancelPending({ draftId: draft.id, status: "cancelled" });
  const summary = [
    `Pesanan dari chat (belum dibuat): ${lines.map((l) => `${l.quantity} x ${l.name}`).join(", ")}, subtotal ${say.rupiah(subtotalOf(lines))}.`,
    draft.fulfillmentType === "pickup" ? "Ambil di toko." : `Kirim ke: ${[draft.recipientName, draft.recipientPhone, draft.addressText, draft.city, draft.postalCode].filter(Boolean).join(", ") || "-"}.`,
    draft.notes ? `Catatan: ${draft.notes}` : null,
  ].filter(Boolean);
  await addSystemNote({ institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId, text: summary.join(" ") });
  return { replyText: text, handoffReason: reason, meta: { commerce: "handoff", reason } };
}

/**
 * Work out what the customer must be asked next and say it, or place the order when everything is settled.
 * Steps that need no answer (a flat shipping fee, the only payment method) are filled in and passed over.
 */
async function advance(env, draftIn, { problems = [], nluUsage = null, model = null, notice = null } = {}) {
  const { ctx, settings } = env;
  let draft = draftIn;
  const catalog = await loadCatalog(ctx.institutionId);
  const finish = async (replyText, status = draft.status, meta = {}) => {
    draft = await saveDraft(draft, status);
    if (draft.items.length) await scheduleCartFollowups({ institutionId: ctx.institutionId, leadId: ctx.leadId, draftId: draft.id }).catch(() => {});
    return { replyText: [notice, say.problemsText(problems), replyText].filter(Boolean).join("\n\n"), nluUsage, model, meta: { commerce: "draft", step: status, ...meta } };
  };

  for (let guard = 0; guard < 6; guard++) {
    const { lines, missing } = priceLines(draft.items, catalog);
    if (missing.length) {
      draft = { ...draft, items: draft.items.filter((i) => !missing.includes(i.productId)) };
      problems = [...problems, { productId: missing[0], reason: "unknown" }];
    }
    const step = nextStep({ ...draft, items: draft.items }, { needPostalCode: needsPostal(settings, draft) });

    if (step === "items") return finish(say.askItemsText(), "collecting");

    if (step === "recipient") {
      return finish(say.askRecipientText({ lines, missing: missingRecipientFields(draft, { needPostalCode: needsPostal(settings, draft) }) }), "collecting");
    }

    if (step === "shipping") {
      if (draft.shippingOptions?.length) return finish(say.shippingOptionsText({ options: draft.shippingOptions, city: draft.city }), "collecting");
      const quote = await quoteShipping({ settings, order: { lines, postalCode: draft.postalCode } });
      if (quote.kind === "fixed") {
        draft = { ...draft, shippingFee: quote.fee, courierService: quote.label, courierCode: null, shippingEta: null };
        continue;
      }
      if (quote.kind === "options") {
        draft = { ...draft, shippingOptions: quote.options };
        continue;
      }
      if (quote.kind === "needs_postal_code") return finish(say.askRecipientText({ lines, missing: ["postalCode"] }), "collecting");
      return toTeam(env, draft, lines, { reason: "commerce_shipping", text: say.handoffShippingText() });
    }

    if (step === "payment") {
      const methods = await availableMethods(env, draft, catalog);
      if (!methods.length) return toTeam(env, draft, lines, { reason: "commerce_payment", text: say.handoffGenericText() });
      if (methods.length === 1) {
        draft = { ...draft, paymentMethod: methods[0] };
        continue;
      }
      return finish(say.paymentOptionsText({ methods, total: subtotalOf(lines) + (draft.shippingFee ?? 0) }), "collecting");
    }

    // everything is known: show the order and ask for the go-ahead
    const total = subtotalOf(lines) + (draft.shippingFee ?? 0);
    return finish(
      say.summaryText({
        lines,
        shippingFee: draft.shippingFee ?? 0,
        total,
        recipient: { name: draft.recipientName, phone: draft.recipientPhone, address: draft.addressText, city: draft.city, postalCode: draft.postalCode },
        fulfillmentType: draft.fulfillmentType,
        courierLabel: draft.courierService,
        eta: draft.shippingEta,
        paymentMethod: draft.paymentMethod,
        notes: draft.notes,
      }),
      "awaiting_confirmation"
    );
  }
  return toTeam(env, draft, priceLines(draft.items, catalog).lines, { reason: "commerce_problem", text: say.handoffGenericText() });
}

// ---------------------------------------------------------------- placing the order

async function placeOrder(env, draft) {
  const { ctx, lead, settings } = env;
  const catalog = await loadCatalog(ctx.institutionId);
  const { lines } = priceLines(draft.items, catalog);

  let created;
  try {
    created = await createOrderRecord({
      tenantId: ctx.institutionId,
      leadId: ctx.leadId,
      csUserId: lead.assigned_cs_id ?? null,
      items: draft.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      shippingFee: draft.shippingFee ?? 0,
      paymentMethod: draft.paymentMethod,
      fulfillmentType: draft.fulfillmentType === "pickup" ? "pickup" : "delivery",
      notes: draft.notes,
      idempotencyKey: `draft-${draft.id}`,
      createdVia: "chat",
      chatDetails: {
        recipient: { name: draft.recipientName, phone: draft.recipientPhone, address: draft.addressText, city: draft.city, postalCode: draft.postalCode },
        shipping: { courierCode: draft.courierCode, service: draft.courierService, fee: draft.shippingFee, eta: draft.shippingEta },
        channelType: ctx.channelType,
      },
    });
  } catch (err) {
    if (err instanceof DuplicateOrderRequest) {
      const existing = await queryOne("SELECT id FROM orders WHERE institution_id = ? AND idempotency_key = ?", [ctx.institutionId, `draft-${draft.id}`]);
      created = { orderId: existing.id, paid: null };
    } else if (err.code === "INSUFFICIENT_STOCK" || err.code === "PRODUCT_UNAVAILABLE") {
      // stock moved since the customer saw the summary: fix the draft and show it again
      const fresh = await loadCatalog(ctx.institutionId);
      const applied = applyItemOperations([], draft.items.map((i) => ({ productId: i.productId, quantity: i.quantity, mode: "set" })), fresh);
      const next = { ...clearShipping(draft), items: applied.items, shippingOptions: null, status: "collecting" };
      return advance(env, next, { problems: applied.problems.length ? applied.problems : [{ productId: err.details?.productId, name: lines.find((l) => l.productId === err.details?.productId)?.name, reason: err.details?.available ? "limited" : "out_of_stock", available: err.details?.available ?? 0 }] });
    } else throw err;
  }

  const order = await queryOne("SELECT * FROM orders WHERE id = ?", [created.orderId]);
  await closeDraft(ctx.institutionId, draft.id, "placed", order.id);
  await cancelPending({ draftId: draft.id, status: "cancelled" });

  const placedName = draft.recipientName || lead.name;
  await query(
    `UPDATE leads SET status = IF(status IN ('new', 'in_progress', 'idle', 'closed_lost'), 'closing', status),
                      name = IF(name IS NULL OR name IN ('Pelanggan', ''), ?, name),
                      address_full = COALESCE(?, address_full), city = COALESCE(?, city)
      WHERE id = ? AND institution_id = ?`,
    [placedName, draft.addressText, draft.city, ctx.leadId, ctx.institutionId]
  );

  let qris = null;
  if (draft.paymentMethod === "qris") qris = await newQris({ ctx, order, name: draft.recipientName, phone: draft.recipientPhone });
  const accounts = draft.paymentMethod === "bank_transfer" ? await activeBanks(ctx.institutionId) : [];

  if (draft.paymentMethod !== "cod") await scheduleOrderFollowups({ institutionId: ctx.institutionId, leadId: ctx.leadId, orderId: order.id }).catch((err) => logger.warn({ err: err.message }, "Reminders not scheduled"));

  emitToTenant(ctx.institutionId, "order:created", { orderId: order.id, leadId: ctx.leadId, via: "chat" });
  await audit(null, "order.create_chat", { institutionId: ctx.institutionId, entityType: "order", entityId: order.id, metadata: { channel: ctx.channelType, total: Number(order.total_amount) } });

  const replyText = say.placedText({ orderNumber: order.order_number, total: order.total_amount, paymentMethod: draft.paymentMethod, fulfillmentType: draft.fulfillmentType, qris, accounts });
  // the QR could not be made: keep the order, and let a person finish the payment step
  const handoffReason = draft.paymentMethod === "qris" && !qris?.imageUrl ? "commerce_payment" : undefined;
  return { replyText, handoffReason, meta: { commerce: "order_placed", orderId: order.id, settings: settings.shippingMode } };
}

