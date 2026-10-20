import { z } from "zod";
import { LEAD_STATUSES, ORDER_STATUSES, PAYMENT_METHODS, STAFF_ROLES } from "../utils/constants.js";

// ---------- primitives ----------
const trimmed = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `maksimal ${max} karakter`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));
// Only http(s): rejects javascript:, data:, file: and friends that would be rendered in the dashboard later.
const httpUrl = z
  .string()
  .trim()
  .max(500, "maksimal 500 karakter")
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), "harus berupa URL http(s) yang valid");
const emailField = z.string().trim().toLowerCase().max(120).pipe(z.email("format email tidak valid"));
const money = z.coerce.number().finite().min(0, "tidak boleh negatif").max(1e12, "nilai terlalu besar");
const positiveInt = z.coerce.number().int().positive();
const nonNegInt = z.coerce.number().int().min(0).max(1e9);
const boolField = z.preprocess(
  (v) => (v === "true" || v === 1 || v === "1" ? true : v === "false" || v === 0 || v === "0" ? false : v),
  z.boolean()
);
const idParam = z.object({ id: positiveInt });

export const passwordField = z
  .string()
  .min(10, "minimal 10 karakter")
  .max(128, "maksimal 128 karakter")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "harus mengandung huruf dan angka");

const pagination = {
  page: z.coerce.number().int().min(1).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

// ---------- auth ----------
export const loginBody = z.object({
  email: emailField,
  password: z.string().min(1, "wajib diisi").max(128),
});

export const registerBody = z.object({
  institutionName: trimmed(120, 2),
  sector: optionalText(100),
  mode: z.enum(["business", "ngo"]).default("business"),
  ownerName: optionalText(120),
  phone: optionalText(30),
  contactEmail: emailField.optional(),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordField,
});

// ---------- institutions ----------
const featuresField = z.record(z.string().max(40), z.boolean()).optional();

export const createInstitutionBody = z.object({
  name: trimmed(150, 2),
  mode: z.enum(["business", "ngo"]).default("business"),
  sector: optionalText(100),
  email: emailField,
  phone_number: optionalText(30),
  address: optionalText(1000),
  features: featuresField,
});

export const updateInstitutionBody = z.object({
  name: trimmed(150, 2).optional(),
  mode: z.enum(["business", "ngo"]).optional(),
  sector: optionalText(100),
  phone_number: optionalText(30),
  email: emailField.optional(),
  address: optionalText(1000),
  language: z.enum(["id", "en"]).optional(),
  // platform-controlled fields: only honoured for superadmin (enforced in controller)
  features: featuresField,
  is_active: boolField.optional(),
  subscription_tier: z.enum(["starter", "pro", "enterprise"]).optional(),
  blast_credit_quota: nonNegInt.optional(),
  ai_token_quota: z.coerce.number().int().min(0).max(1e12).optional(),
});

export const listInstitutionsQuery = z.object({
  ...pagination,
  search: optionalText(100),
  mode: z.enum(["business", "ngo"]).optional(),
});

export const resetPasswordBody = z.object({ newPassword: passwordField.optional() });

// ---------- users ----------
const permissionsField = z.record(z.string().max(40), z.boolean()).optional();

export const createUserBody = z.object({
  name: trimmed(120, 2),
  email: emailField,
  role: z.enum(STAFF_ROLES.filter((r) => r !== "owner")),
  phone_number: optionalText(30),
  commission_rate_percent: z.coerce.number().min(0).max(100).optional(),
  permissions: permissionsField,
});

export const updateUserBody = z.object({
  name: trimmed(120, 2).optional(),
  role: z.enum(STAFF_ROLES.filter((r) => r !== "owner")).optional(),
  phone_number: optionalText(30),
  commission_rate_percent: z.coerce.number().min(0).max(100).optional(),
  permissions: permissionsField,
  is_active: boolField.optional(),
});

// ---------- products ----------
const productFields = {
  sku: trimmed(60),
  name: trimmed(200),
  category: optionalText(100),
  description: optionalText(5000),
  image_url: z.preprocess((v) => (v === "" || v === null ? undefined : v), httpUrl.optional()),
  selling_price: money,
  cost_price_hpp: money,
  stock_quantity: z.coerce.number().int().min(0).max(1e9),
  low_stock_threshold: nonNegInt,
  weight_in_grams: z.coerce.number().int().min(0).max(1e7),
  is_active: boolField,
};

export const createProductBody = z.object({
  ...productFields,
  cost_price_hpp: productFields.cost_price_hpp.default(0),
  stock_quantity: productFields.stock_quantity.default(0),
  low_stock_threshold: productFields.low_stock_threshold.default(5),
  weight_in_grams: productFields.weight_in_grams.default(200),
  is_active: productFields.is_active.default(true),
});

export const updateProductBody = z.object(productFields).partial();

export const listProductsQuery = z.object({
  ...pagination,
  search: optionalText(100),
  category: optionalText(100),
  all: z.enum(["true", "false"]).optional(),
});

// ---------- leads ----------
const leadExtras = {
  source: optionalText(80),
  interest: optionalText(150),
  est_value: money.optional(),
  notes: optionalText(5000),
  risk_cod_score: z.coerce.number().int().min(0).max(100).optional(),
};

export const createLeadBody = z.object({
  name: optionalText(150),
  phone_number: trimmed(30, 6),
  gender: z.enum(["Laki-laki", "Perempuan"]).optional(),
  address_full: optionalText(2000),
  city: optionalText(100),
  assigned_cs_id: positiveInt.optional(),
  status: z.enum(LEAD_STATUSES).default("new"),
  ...leadExtras,
});

export const updateLeadBody = z.object({
  name: optionalText(150),
  gender: z.enum(["Laki-laki", "Perempuan"]).optional(),
  address_full: optionalText(2000),
  city: optionalText(100),
  assigned_cs_id: positiveInt.nullable().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  ...leadExtras,
});

export const listLeadsQuery = z.object({
  ...pagination,
  search: optionalText(100),
  status: z.enum(LEAD_STATUSES).optional(),
  cs_id: positiveInt.optional(),
});

// ---------- orders ----------
const orderItem = z
  .object({
    product_id: positiveInt.optional(),
    program_id: positiveInt.optional(),
    quantity: z.coerce.number().int().min(1).max(100000).default(1),
    // Only used for program/donation lines; product lines are priced from the database.
    unit_price: money.optional(),
  })
  .refine((v) => v.product_id || v.program_id, "setiap item wajib punya product_id atau program_id")
  .refine((v) => !(v.program_id && v.unit_price === undefined), "item program wajib punya unit_price");

export const createOrderBody = z.object({
  lead_id: positiveInt.optional(),
  customer_name: optionalText(150),
  customer_phone: optionalText(30),
  items: z.array(orderItem).min(1, "minimal 1 item").max(100),
  shipping_fee: money.default(0),
  discount_amount: money.default(0),
  payment_method: z.enum(PAYMENT_METHODS).default("qris"),
  fulfillment_type: z.enum(["delivery", "pickup", "manual_service"]).default("delivery"),
  notes: optionalText(2000),
});

export const listOrdersQuery = z.object({
  ...pagination,
  search: optionalText(100),
  status: z.enum(ORDER_STATUSES).optional(),
});

export const updateOrderStatusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  rejection_reason: optionalText(255),
});

// ---------- chat ----------
export const sendMessageBody = z.object({
  lead_id: positiveInt,
  content_text: trimmed(4000),
  // set when the text is an AI reply (or suggestion) that a person edited; `learn` lets a manager teach the assistant the corrected wording
  edited_from_message_id: positiveInt.optional(),
  learn: boolField.optional(),
});

export const aiChatBody = z.object({
  message: trimmed(2000),
  customerName: optionalText(120),
  customerPhone: optionalText(30),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(20)
    .optional(),
  products: z.array(z.record(z.string(), z.any())).max(100).nullable().optional(),
  promos: z.array(z.record(z.string(), z.any())).max(50).nullable().optional(),
  institutionName: optionalText(150),
  sector: optionalText(100),
  address: optionalText(500),
  hours: optionalText(200),
});

export const publicAskBody = z.object({ question: trimmed(500) });

// ---------- payments ----------
export const createQrisBody = z.object({
  order_id: z.union([positiveInt, z.string().trim().min(3).max(60)]),
});

// ---------- shipping / fraud ----------
export const ratesBody = z.object({
  originCity: optionalText(100),
  destinationCity: optionalText(100),
  weightGrams: z.coerce.number().int().min(1).max(1e7).default(500),
});

export const codRiskBody = z.object({
  phone: optionalText(30),
  address: optionalText(2000),
  pastReturnRate: z.coerce.number().min(0).max(100).default(0),
});

export const bookShipmentBody = z.object({
  order_id: positiveInt,
  courier_code: trimmed(30).default("jnt"),
  service_name: optionalText(50),
  awb_number: optionalText(100),
  is_cod: boolField.default(false),
  cod_amount: money.default(0),
});

export const verifyReceiptBody = z.object({
  order_id: positiveInt,
  imageUrl: httpUrl,
  expectedAmount: money.optional(),
});

export const reconcileBody = z.object({
  amount: money.refine((v) => v > 0, "harus lebih dari 0"),
  reference: optionalText(200),
});

// ---------- whatsapp ----------
export const whatsappChannelBody = z.object({
  phone_number_id: trimmed(60),
  display_phone: optionalText(30),
  access_token: trimmed(1000, 10),
});

export const heartbeatBody = z.object({
  session_status: z.enum(["connected", "connecting", "disconnected", "banned"]).default("connected"),
  phone_number: optionalText(30),
  battery_level: z.coerce.number().int().min(0).max(100).optional(),
});

// ---------- misc ----------
export const idParams = idParam;
export const leadIdParams = z.object({ leadId: positiveInt });
export const tokenUsageQuery = z.object({ range: z.enum(["24h", "7d", "30d"]).default("30d") });

export const simulateInboundBody = z.object({
  phone: trimmed(30, 6).default("081298765432"),
  name: trimmed(120).default("Calon Pembeli"),
  message: trimmed(2000),
});

export const metaCapiBody = z.object({
  pixel_id: trimmed(40, 5),
  access_token: trimmed(1000, 10),
});

export const simulateSettlementBody = z.object({ payment_reference: trimmed(60) });

export const updateOrderStatusParams = idParam;

const bulkProductItem = z.object({
  sku: trimmed(60),
  name: trimmed(200),
  category: optionalText(100),
  description: optionalText(5000),
  selling_price: money,
  cost_price_hpp: money.default(0),
  stock_quantity: z.coerce.number().int().min(0).max(1e9).default(0),
  low_stock_threshold: nonNegInt.default(5),
  weight_in_grams: z.coerce.number().int().min(0).max(1e7).default(200),
});

export const bulkProductsBody = z.object({
  items: z.array(bulkProductItem).min(1, "minimal 1 produk").max(500, "maksimal 500 produk per impor"),
  // upsert: create new SKUs, update existing ones. replace: same, then deactivate SKUs missing from the file.
  mode: z.enum(["upsert", "replace"]).default("upsert"),
});

export const stockImportBody = z.object({
  items: z
    .array(z.object({ sku: trimmed(60), stock_quantity: z.coerce.number().int().min(0).max(1e9) }))
    .min(1)
    .max(1000),
});

export const aiPersonaBody = z.object({
  botName: optionalText(80),
  tone: optionalText(300),
  greetingMessage: optionalText(500),
  abandonedMessage: optionalText(500),
  customFaqKeywords: optionalText(500),
  voiceAccent: optionalText(120),
  voiceGender: optionalText(60),
});

const bankFields = {
  bank_code: trimmed(20),
  account_number: z.string().trim().regex(/^[0-9A-Za-z .\-:]{3,50}$/, "nomor rekening tidak valid"),
  account_holder: trimmed(150),
  branch_office: optionalText(100),
  transfer_instruction: optionalText(2000),
  is_manual_transfer: boolField.optional(),
  is_active: boolField.optional(),
};

export const createBankAccountBody = z.object({
  ...bankFields,
  is_manual_transfer: boolField.default(true),
  is_active: boolField.default(true),
});

export const updateBankAccountBody = z.object(bankFields).partial();

// ---------- platform AI settings (superadmin) ----------
const apiKeyField = z
  .string()
  .trim()
  .min(10, "API key terlalu pendek")
  .max(400, "API key terlalu panjang")
  .refine((k) => /^[!-~]+$/.test(k), "API key hanya boleh berisi karakter ASCII tanpa spasi")
  .optional();

export const aiSettingsBody = z.object({
  provider: z.enum(["nvidia", "gemini"]).optional(),
  nvidiaModel: optionalText(120),
  nvidiaFallbackModel: optionalText(120),
  geminiModel: optionalText(120),
  geminiFallbackModel: optionalText(120),
  nvidiaKey: z.preprocess((v) => (v === "" ? undefined : v), apiKeyField),
  geminiApiKey: z.preprocess((v) => (v === "" ? undefined : v), apiKeyField),
  clearNvidiaKey: boolField.optional(),
  clearGeminiKey: boolField.optional(),
});

export const aiSettingsTestBody = z.object({ provider: z.enum(["nvidia", "gemini"]) });

// ---------- payment proof simulator ----------
export const analyzeProofBody = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]).optional(),
  imageBase64: z.string().min(100, "berkas kosong").max(7_500_000, "berkas terlalu besar (maksimal 5 MB)").regex(/^[A-Za-z0-9+/=\s]+$/, "bukan data base64 yang valid"),
});
