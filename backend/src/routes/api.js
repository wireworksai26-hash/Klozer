import { Router } from "express";
import { authenticate, requireRole, requireSuperadmin } from "../middlewares/authMiddleware.js";
import { tenantContext } from "../middlewares/tenantContext.js";
import { validate } from "../middlewares/validate.js";
import { requireFeature } from "../middlewares/featureGate.js";
import { aiLimiter, loginLimiter, publicAiLimiter, registerLimiter, webchatPollLimiter, webchatSendLimiter, webhookLimiter } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/errors.js";
import * as v from "../validation/schemas.js";

import * as authCtrl from "../controllers/authController.js";
import * as userCtrl from "../controllers/userController.js";
import * as instCtrl from "../controllers/institutionController.js";
import * as prodCtrl from "../controllers/productController.js";
import * as leadCtrl from "../controllers/leadController.js";
import * as orderCtrl from "../controllers/orderController.js";
import * as chatCtrl from "../controllers/chatController.js";
import * as paymentCtrl from "../controllers/paymentController.js";
import * as shippingCtrl from "../controllers/shippingController.js";
import * as fraudCtrl from "../controllers/fraudController.js";
import * as reportCtrl from "../controllers/reportController.js";
import * as webhookCtrl from "../controllers/webhookController.js";
import * as systemCtrl from "../controllers/systemController.js";
import * as tokenCtrl from "../controllers/tokenUsageController.js";
import * as integrationCtrl from "../controllers/integrationController.js";
import * as personaCtrl from "../controllers/personaController.js";
import * as bankCtrl from "../controllers/bankAccountController.js";
import * as auditCtrl from "../controllers/auditController.js";
import * as uploadCtrl from "../controllers/uploadController.js";
import * as proofCtrl from "../controllers/proofController.js";
import * as knowledgeCtrl from "../controllers/knowledgeController.js";
import * as evalCtrl from "../controllers/aiEvaluationController.js";
import * as channelCtrl from "../controllers/channelController.js";
import * as routingCtrl from "../controllers/routingController.js";
import * as channelWebhookCtrl from "../controllers/channelWebhookController.js";
import * as webchatCtrl from "../controllers/webchatController.js";
import * as lv from "../validation/learningSchemas.js";
import * as cv from "../validation/channelSchemas.js";

const router = Router();
const h = asyncHandler;

// Role groups
const MANAGERS = ["owner", "supervisor"];
const SALES = ["owner", "supervisor", "cs"];
const MONEY = ["owner", "supervisor", "finance", "cs"];
const STOCK = ["owner", "supervisor", "pic_warehouse"];
const REPORTING = ["owner", "supervisor", "finance"];

// Authenticated + tenant-scoped (the standard guard for business data)
const tenant = [authenticate, tenantContext];

// ==================== 1. AUTH ====================
router.post("/auth/login", loginLimiter, validate({ body: v.loginBody }), h(authCtrl.login));
router.post("/auth/register", registerLimiter, validate({ body: v.registerBody }), h(authCtrl.register));
router.get("/auth/me", authenticate, h(authCtrl.getMe));
router.post("/auth/change-password", authenticate, validate({ body: v.changePasswordBody }), h(authCtrl.changePassword));
// No authentication needed: clearing a cookie is harmless, and an expired session must still be able to log out.
router.post("/auth/logout", h(authCtrl.logout));

// ==================== 2. PUBLIC WEBHOOKS (authenticated by signature, not by user) ====================
router.get("/webhooks/whatsapp", webhookLimiter, h(webhookCtrl.verifyWhatsAppWebhook));
router.post("/webhooks/whatsapp", webhookLimiter, h(webhookCtrl.handleWhatsAppInbound));
router.get("/webhooks/meta", webhookLimiter, h(webhookCtrl.verifyWhatsAppWebhook));
router.post("/webhooks/meta", webhookLimiter, h(channelWebhookCtrl.handleMetaMessagingInbound));
router.post("/webhooks/telegram/:botId", webhookLimiter, h(channelWebhookCtrl.handleTelegramInbound));
router.post("/payments/webhook", webhookLimiter, h(paymentCtrl.paymentWebhookHandler));

// ==================== 2b. PUBLIC WEB CHAT WIDGET (anonymous visitors; a signed visitor token is the credential) ====================
router.get("/public/webchat/widget.js", webchatPollLimiter, webchatCtrl.serveWidget);
router.post("/public/webchat/:key/session", webchatPollLimiter, validate({ params: cv.webchatParams }), h(webchatCtrl.startSession));
router.post("/public/webchat/:key/messages", webchatSendLimiter, validate({ params: cv.webchatParams, body: cv.webchatMessageBody }, { rawFields: ["text", "name"] }), h(webchatCtrl.sendVisitorMessage));
router.get("/public/webchat/:key/messages", webchatPollLimiter, validate({ params: cv.webchatParams, query: cv.webchatPollQuery }), h(webchatCtrl.pollMessages));

// ==================== 3. INSTITUTIONS ====================
router.get("/institutions", authenticate, validate({ query: v.listInstitutionsQuery }), h(instCtrl.getAllInstitutions));
router.post("/institutions", authenticate, requireSuperadmin, validate({ body: v.createInstitutionBody }), h(instCtrl.createInstitution));
router.put("/institutions/:id", authenticate, requireRole(...MANAGERS), validate({ params: v.idParams, body: v.updateInstitutionBody }), h(instCtrl.updateInstitution));
router.post("/institutions/:id/reset-password", authenticate, requireSuperadmin, validate({ params: v.idParams, body: v.resetPasswordBody }), h(instCtrl.resetInstitutionPassword));
router.delete("/institutions/:id", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(instCtrl.deleteInstitution));

// ==================== 4. STAFF ====================
router.get("/users", ...tenant, requireRole(...MANAGERS, "finance"), h(userCtrl.listUsers));
router.post("/users", ...tenant, requireRole(...MANAGERS), validate({ body: v.createUserBody }), h(userCtrl.createUser));
router.put("/users/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams, body: v.updateUserBody }), h(userCtrl.updateUser));
router.delete("/users/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(userCtrl.deactivateUser));
router.post("/users/:id/reset-password", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(userCtrl.resetUserPassword));

// ==================== 5. PRODUCTS ====================
router.get("/products", ...tenant, validate({ query: v.listProductsQuery }), h(prodCtrl.getProducts));
router.post("/products", ...tenant, requireRole(...STOCK), validate({ body: v.createProductBody }), h(prodCtrl.createProduct));
router.post("/products/bulk", ...tenant, requireRole(...STOCK), validate({ body: v.bulkProductsBody }), h(prodCtrl.bulkUpsertProducts));
router.post("/products/stock", ...tenant, requireRole(...STOCK), requireFeature("stockManagement", "Manajemen Stok"), validate({ body: v.stockImportBody }), h(prodCtrl.importStock));
router.put("/products/:id", ...tenant, requireRole(...STOCK), validate({ params: v.idParams, body: v.updateProductBody }), h(prodCtrl.updateProduct));
router.delete("/products/:id", ...tenant, requireRole(...STOCK), validate({ params: v.idParams }), h(prodCtrl.deleteProduct));

// ==================== 6. LEADS ====================
router.get("/leads", ...tenant, requireRole(...SALES, "finance"), validate({ query: v.listLeadsQuery }), h(leadCtrl.getLeads));
router.post("/leads", ...tenant, requireRole(...SALES), validate({ body: v.createLeadBody }), h(leadCtrl.createLead));
router.put("/leads/:id", ...tenant, requireRole(...SALES), validate({ params: v.idParams, body: v.updateLeadBody }), h(leadCtrl.updateLead));
router.delete("/leads/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(leadCtrl.deleteLead));
router.post("/leads/:id/assign", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams, body: cv.assignLeadBody }), h(routingCtrl.assign));
router.post("/leads/:id/claim", ...tenant, requireRole(...SALES), validate({ params: v.idParams }), h(routingCtrl.claim));
router.post("/leads/:id/handoff", ...tenant, requireRole(...SALES), validate({ params: v.idParams }), h(routingCtrl.handoff));
router.post("/leads/:id/handback", ...tenant, requireRole(...SALES), validate({ params: v.idParams }), h(routingCtrl.handback));

// ==================== CHANNELS & ROUTING ====================
router.get("/channels", ...tenant, requireRole(...SALES), h(channelCtrl.list));
router.post("/channels", ...tenant, requireRole(...MANAGERS), validate({ body: cv.createChannelBody }, { rawFields: ["accessToken"] }), h(channelCtrl.create));
router.put("/channels/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams, body: cv.updateChannelBody }, { rawFields: ["accessToken"] }), h(channelCtrl.update));
router.delete("/channels/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(channelCtrl.remove));
router.post("/channels/:id/test", ...tenant, requireRole(...MANAGERS), aiLimiter, validate({ params: v.idParams }), h(channelCtrl.test));
router.get("/routing/settings", ...tenant, requireRole(...SALES), h(routingCtrl.getSettings));
router.put("/routing/settings", ...tenant, requireRole(...MANAGERS), validate({ body: cv.updateRoutingBody }), h(routingCtrl.putSettings));
router.get("/routing/overview", ...tenant, requireRole(...MANAGERS), h(routingCtrl.overview));
router.put("/users/me/availability", ...tenant, requireRole(...SALES), validate({ body: cv.availabilityBody }), h(routingCtrl.putAvailability));

// ==================== 7. CHAT & AI ====================
router.post("/ai/ask", publicAiLimiter, validate({ body: v.publicAskBody }), h(chatCtrl.publicAskAi));
router.get("/chats/:leadId", ...tenant, requireRole(...SALES), validate({ params: v.leadIdParams }), h(chatCtrl.getChatMessages));
router.post("/chats/send", ...tenant, requireRole(...SALES), validate({ body: v.sendMessageBody }), h(chatCtrl.sendMessage));
router.post("/ai/chat", ...tenant, requireRole(...SALES), aiLimiter, validate({ body: v.aiChatBody }), h(chatCtrl.aiChatSimulation));
router.post("/ai/analyze-proof", ...tenant, requireRole(...MONEY), aiLimiter, validate({ body: v.analyzeProofBody }, { rawFields: ["imageBase64"] }), h(proofCtrl.analyzeProofPreview));
router.get("/orders/:id/proofs", ...tenant, requireRole(...MONEY), validate({ params: v.idParams }), h(proofCtrl.listOrderProofs));
router.get("/payment-proofs/:id/image", ...tenant, requireRole(...MONEY), validate({ params: v.idParams }), h(proofCtrl.getProofImage));

// ==================== AI KNOWLEDGE BASE ====================
const knowledgeOn = requireFeature("knowledgeBase", "Basis Pengetahuan AI");
router.get("/knowledge", ...tenant, requireRole(...MANAGERS), knowledgeOn, h(knowledgeCtrl.list));
router.post("/knowledge/text", ...tenant, requireRole(...MANAGERS), knowledgeOn, validate({ body: lv.createKnowledgeTextBody }, { rawFields: ["content"] }), h(knowledgeCtrl.createText));
router.post("/knowledge/file", ...tenant, requireRole(...MANAGERS), knowledgeOn, validate({ body: lv.createKnowledgeFileBody }, { rawFields: ["contentBase64"] }), h(knowledgeCtrl.createFile));
router.post("/knowledge/search", ...tenant, requireRole(...MANAGERS), knowledgeOn, validate({ body: lv.knowledgeSearchBody }), h(knowledgeCtrl.search));
router.get("/knowledge/:id", ...tenant, requireRole(...MANAGERS), knowledgeOn, validate({ params: v.idParams }), h(knowledgeCtrl.get));
router.put("/knowledge/:id", ...tenant, requireRole(...MANAGERS), knowledgeOn, validate({ params: v.idParams, body: lv.updateKnowledgeBody }, { rawFields: ["content"] }), h(knowledgeCtrl.update));
router.delete("/knowledge/:id", ...tenant, requireRole(...MANAGERS), knowledgeOn, validate({ params: v.idParams }), h(knowledgeCtrl.remove));

// ==================== AI EVALUATION & LEARNING ====================
const learningOn = requireFeature("aiLearning", "Evaluasi dan Pembelajaran AI");
const rawText = { rawFields: ["correctedReply", "ruleText", "note"] };
router.get("/ai/evaluation", ...tenant, requireRole(...SALES), learningOn, validate({ query: lv.evaluationQuery }), h(evalCtrl.feed));
router.get("/ai/evaluation/summary", ...tenant, requireRole(...SALES), learningOn, validate({ query: lv.evaluationSummaryQuery }), h(evalCtrl.summary));
router.post("/ai/evaluation/:id/feedback", ...tenant, requireRole(...SALES), learningOn, validate({ params: v.idParams, body: lv.feedbackBody }), h(evalCtrl.feedback));
router.post("/ai/evaluation/:id/correct", ...tenant, requireRole(...MANAGERS), learningOn, validate({ params: v.idParams, body: lv.correctReplyBody }, rawText), h(evalCtrl.correct));
router.get("/ai/corrections", ...tenant, requireRole(...MANAGERS), learningOn, validate({ query: lv.correctionsQuery }), h(evalCtrl.corrections));
router.post("/ai/rules", ...tenant, requireRole(...MANAGERS), learningOn, validate({ body: lv.createRuleBody }, rawText), h(evalCtrl.rule));
router.put("/ai/corrections/:id", ...tenant, requireRole(...MANAGERS), learningOn, validate({ params: v.idParams, body: lv.updateCorrectionBody }, rawText), h(evalCtrl.update));
router.delete("/ai/corrections/:id", ...tenant, requireRole(...MANAGERS), learningOn, validate({ params: v.idParams }), h(evalCtrl.remove));
router.post("/webhooks/whatsapp/simulate", ...tenant, requireRole(...MANAGERS), validate({ body: v.simulateInboundBody }), h(webhookCtrl.simulateWhatsAppInbound));

router.get("/bank-accounts", ...tenant, requireRole(...MANAGERS, "finance"), h(bankCtrl.listBankAccounts));
router.post("/bank-accounts", ...tenant, requireRole(...MANAGERS), validate({ body: v.createBankAccountBody }), h(bankCtrl.createBankAccount));
router.put("/bank-accounts/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams, body: v.updateBankAccountBody }), h(bankCtrl.updateBankAccount));
router.delete("/bank-accounts/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(bankCtrl.deleteBankAccount));
router.get("/reports/my-performance", ...tenant, requireRole(...SALES), h(reportCtrl.getMyPerformance));
router.get("/audit-logs", ...tenant, requireRole(...MANAGERS, "finance"), h(auditCtrl.listAuditLogs));

router.get("/ai/persona", ...tenant, requireRole(...SALES), h(personaCtrl.getPersona));
router.put("/ai/persona", ...tenant, requireRole(...MANAGERS), validate({ body: v.aiPersonaBody }), h(personaCtrl.updatePersona));

// ==================== 8. ORDERS ====================
router.get("/orders", ...tenant, requireRole(...MONEY, "pic_warehouse"), validate({ query: v.listOrdersQuery }), h(orderCtrl.getOrders));
router.post("/orders", ...tenant, requireRole(...SALES), validate({ body: v.createOrderBody }), h(orderCtrl.createOrder));
router.get("/orders/:id", ...tenant, requireRole(...MONEY, "pic_warehouse"), validate({ params: v.idParams }), h(orderCtrl.getOrder));
router.patch("/orders/:id/status", ...tenant, requireRole(...MONEY, "pic_warehouse"), validate({ params: v.idParams, body: v.updateOrderStatusBody }), h(orderCtrl.updateOrderStatus));
router.get("/orders/:id/invoice", ...tenant, requireRole(...MONEY, "pic_warehouse"), validate({ params: v.idParams }), h(orderCtrl.getOrderInvoice));

// ==================== 9. PAYMENTS ====================
router.post("/payments/qris", ...tenant, requireRole(...MONEY), requireFeature("qris", "Dynamic QRIS"), validate({ body: v.createQrisBody }), h(paymentCtrl.createQrisPayment));
router.post("/payments/simulate-settlement", ...tenant, requireRole(...MANAGERS), validate({ body: v.simulateSettlementBody }), h(paymentCtrl.simulateSettlement));

// ==================== 10. SHIPPING & FRAUD ====================
router.post("/shipping/rates", ...tenant, requireRole(...MONEY, "pic_warehouse"), validate({ body: v.ratesBody }), h(shippingCtrl.getRates));
router.post("/shipping/cod-risk-score", ...tenant, requireRole(...MONEY), validate({ body: v.codRiskBody }), h(shippingCtrl.checkCodRisk));
router.post("/shipping/book", ...tenant, requireRole(...STOCK, "cs", "finance"), validate({ body: v.bookShipmentBody }), h(shippingCtrl.bookShipment));
router.post("/fraud/verify-receipt", ...tenant, requireRole(...MONEY), requireFeature("antiFraud", "Anti-Fraud"), validate({ body: v.verifyReceiptBody }), h(fraudCtrl.verifyReceipt));
router.post("/fraud/reconcile-mutation", ...tenant, requireRole("owner", "supervisor", "finance"), requireFeature("antiFraud", "Anti-Fraud"), validate({ body: v.reconcileBody }), h(fraudCtrl.reconcileMutation));

// ==================== 11. REPORTS ====================
router.get("/reports/summary", ...tenant, requireRole(...REPORTING), h(reportCtrl.getSummaryReport));

// ==================== 12. INTEGRATIONS ====================
router.get("/whatsapp/status", ...tenant, h(integrationCtrl.getWhatsAppStatus));
router.get("/whatsapp/channel", ...tenant, requireRole(...MANAGERS), h(integrationCtrl.getWhatsAppChannel));
router.put("/whatsapp/channel", ...tenant, requireRole(...MANAGERS), validate({ body: v.whatsappChannelBody }), h(integrationCtrl.upsertWhatsAppChannel));
router.delete("/whatsapp/channel", ...tenant, requireRole(...MANAGERS), h(integrationCtrl.deleteWhatsAppChannel));
router.put("/integrations/meta-capi", ...tenant, requireRole(...MANAGERS), validate({ body: v.metaCapiBody }), h(integrationCtrl.upsertMetaCapi));

// ==================== 13. PLATFORM (superadmin) & TOKEN METERING ====================
router.get("/system/metrics", authenticate, requireSuperadmin, h(systemCtrl.getSystemMetrics));
router.get("/system/integrations", authenticate, requireSuperadmin, h(systemCtrl.getIntegrationStatus));
router.get("/system/ai-settings", authenticate, requireSuperadmin, h(systemCtrl.getAiSettings));
router.put("/system/ai-settings", authenticate, requireSuperadmin, validate({ body: v.aiSettingsBody }), h(systemCtrl.updateAiSettings));
router.post("/system/ai-settings/test", authenticate, requireSuperadmin, aiLimiter, validate({ body: v.aiSettingsTestBody }), h(systemCtrl.testAiSettings));
router.get("/ai/token-usage", authenticate, requireSuperadmin, validate({ query: v.tokenUsageQuery }), h(tokenCtrl.getTokenUsageSummary));
router.get("/ai/token-balance", ...tenant, h(tokenCtrl.getTenantTokenBalance));

// ==================== 14. UPLOADS (Magic Number & Buffer Guard - BE-05) ====================
router.post("/uploads/receipt", ...tenant, h(uploadCtrl.uploadReceiptProof));
router.post("/uploads/catalog", ...tenant, requireRole(...STOCK), h(uploadCtrl.uploadCatalogFile));

export default router;
