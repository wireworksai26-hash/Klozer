/**
 * The order a customer is putting together in chat, as plain data and pure functions. The database and the model
 * never decide what an order costs: lines are priced from the catalog rows handed in here.
 */

export const MAX_QUANTITY = 99;
export const MAX_LINES = 20;

/** @typedef {{ productId: number, quantity: number }} DraftItem */

export const emptyDraft = () => ({
  items: [],
  fulfillmentType: "delivery",
  recipientName: null,
  recipientPhone: null,
  addressText: null,
  city: null,
  postalCode: null,
  courierCode: null,
  courierService: null,
  shippingFee: null,
  shippingEta: null,
  paymentMethod: null,
  notes: null,
});

/**
 * Apply what the customer asked for to the items already in the draft.
 * @param {DraftItem[]} items current items
 * @param {{ productId: number, quantity: number, mode: "add"|"set"|"remove" }[]} operations already validated shapes
 * @param {Map<number, { id: number, name: string, stock: number }>} catalog this tenant's active products
 * @returns {{ items: DraftItem[], problems: { productId: number, name?: string, reason: "unknown"|"out_of_stock"|"limited", available?: number }[] }}
 */
export function applyItemOperations(items, operations, catalog) {
  const quantities = new Map(items.map((i) => [i.productId, i.quantity]));
  const problems = [];

  for (const op of operations) {
    const product = catalog.get(op.productId);
    if (!product) {
      problems.push({ productId: op.productId, reason: "unknown" });
      continue;
    }
    if (op.mode === "remove") {
      quantities.delete(op.productId);
      continue;
    }
    const current = quantities.get(op.productId) || 0;
    const wanted = Math.min(MAX_QUANTITY, op.mode === "set" ? op.quantity : current + op.quantity);
    if (wanted < 1) {
      quantities.delete(op.productId);
      continue;
    }
    if (product.stock < 1) {
      problems.push({ productId: op.productId, name: product.name, reason: "out_of_stock", available: 0 });
      continue;
    }
    if (wanted > product.stock) {
      problems.push({ productId: op.productId, name: product.name, reason: "limited", available: product.stock });
      quantities.set(op.productId, product.stock);
      continue;
    }
    quantities.set(op.productId, wanted);
  }

  return { items: [...quantities].slice(0, MAX_LINES).map(([productId, quantity]) => ({ productId, quantity })), problems };
}

/**
 * Draft items priced from the catalog. Items whose product is gone are left out and reported.
 * @param {Map<number, { id: number, name: string, price: number, stock: number, weightGrams: number }>} catalog
 */
export function priceLines(items, catalog) {
  const lines = [];
  const missing = [];
  for (const item of items) {
    const product = catalog.get(item.productId);
    if (!product) {
      missing.push(item.productId);
      continue;
    }
    lines.push({ productId: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price, subtotal: product.price * item.quantity, weightGrams: product.weightGrams * item.quantity });
  }
  return { lines, missing };
}

export const subtotalOf = (lines) => lines.reduce((sum, l) => sum + l.subtotal, 0);
export const weightOf = (lines) => lines.reduce((sum, l) => sum + l.weightGrams, 0);

/** The part of the address the customer still has to give, in the order we ask for it. */
export function missingRecipientFields(draft, { needPostalCode = false } = {}) {
  const missing = [];
  if (!draft.recipientName) missing.push("name");
  if (!draft.recipientPhone) missing.push("phone");
  if (draft.fulfillmentType === "delivery") {
    if (!draft.addressText) missing.push("address");
    if (needPostalCode && !draft.postalCode) missing.push("postalCode");
  }
  return missing;
}

/**
 * Where the order stands, which decides what we say next.
 *  items -> recipient -> shipping -> payment -> confirm
 * @returns {"items"|"recipient"|"shipping"|"payment"|"confirm"}
 */
export function nextStep(draft, { needPostalCode = false } = {}) {
  if (!draft.items.length) return "items";
  if (missingRecipientFields(draft, { needPostalCode }).length) return "recipient";
  if (draft.fulfillmentType === "delivery" && draft.shippingFee === null) return "shipping";
  if (!draft.paymentMethod) return "payment";
  return "confirm";
}

/** Take a shipping choice back (items, address or fulfilment changed, so earlier options no longer apply). */
export function clearShipping(draft) {
  return { ...draft, courierCode: null, courierService: null, shippingFee: null, shippingEta: null };
}
