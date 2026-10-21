import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole, requireSuperadmin } from "../middlewares/authMiddleware.js";
import { tenantContext } from "../middlewares/tenantContext.js";
import { validate } from "../middlewares/validate.js";
import { requireFeature } from "../middlewares/featureGate.js";
import { aiLimiter, loginLimiter, openApiLimiter, publicAiLimiter, registerLimiter, webchatPollLimiter, webchatSendLimiter, webhookLimiter } from "../middlewares/rateLimit.js";
import { apiKeyAuth } from "../middlewares/apiKeyAuth.js";
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
import * as commerceCtrl from "../controllers/commerceController.js";
import * as mv from "../validation/commerceSchemas.js";
import * as broadcastCtrl from "../controllers/broadcastController.js";
import * as adsCtrl from "../controllers/adsController.js";
import * as bv from "../validation/broadcastSchemas.js";
import * as integrationsCtrl from "../controllers/integrationsController.js";
import * as openCtrl from "../controllers/openApiController.js";
import * as iv from "../validation/integrationSchemas.js";
import * as agentCtrl from "../controllers/agentController.js";
import * as av from "../validation/agentSchemas.js";
import * as taskCtrl from "../controllers/taskController.js";
import * as tv from "../validation/taskSchemas.js";
import * as topupCtrl from "../controllers/tokenTopupController.js";
import * as topv from "../validation/topupSchemas.js";
import * as payCtrl from "../controllers/platformPaymentController.js";
import * as payv from "../validation/paymentMethodSchemas.js";
import * as billingCtrl from "../controllers/billingController.js";
import * as billv from "../validation/billingSchemas.js";
import * as voucherCtrl from "../controllers/voucherController.js";
import * as vouv from "../validation/voucherSchemas.js";
import * as fastCtrl from "../controllers/fastPathController.js";
import * as fastv from "../validation/fastPathSchemas.js";

const router = Router();
const h = asyncHandler;

// Role groups
const MANAGERS = ["owner", "supervisor"];
const SALES = ["owner", "supervisor", "cs"];
const TEAM = ["owner", "supervisor", "cs", "finance", "pic_warehouse"];
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

// ==================== CHAT COMMERCE ====================
const commerceOn = requireFeature("chatCommerce", "Chat Commerce");
router.get("/commerce/settings", ...tenant, requireRole(...SALES), commerceOn, h(commerceCtrl.getSettings));
router.put("/commerce/settings", ...tenant, requireRole(...MANAGERS), commerceOn, validate({ body: mv.updateCommerceSettingsBody }), h(commerceCtrl.putSettings));
router.get("/commerce/drafts", ...tenant, requireRole(...SALES), commerceOn, h(commerceCtrl.listDrafts));
router.post("/commerce/drafts/:id/cancel", ...tenant, requireRole(...SALES), commerceOn, validate({ params: v.idParams }), h(commerceCtrl.cancelDraft));
router.get("/commerce/followups", ...tenant, requireRole(...MANAGERS), commerceOn, h(commerceCtrl.followups));
router.post("/commerce/followups/:id/cancel", ...tenant, requireRole(...MANAGERS), commerceOn, validate({ params: v.idParams }), h(commerceCtrl.cancelFollowup));
router.put("/leads/:id/followup-opt-out", ...tenant, requireRole(...SALES), validate({ params: v.idParams, body: mv.followupOptOutBody }), h(commerceCtrl.setOptOut));

// ==================== BROADCAST, CONSENT AND ADS ====================
const blastOn = requireFeature("csBlast", "Broadcast");
const capiOn = requireFeature("metaCapi", "Meta Conversions API");
router.get("/broadcast/templates", ...tenant, requireRole(...MANAGERS), blastOn, validate({ query: bv.listTemplatesQuery }), h(broadcastCtrl.templates));
router.post("/broadcast/templates", ...tenant, requireRole(...MANAGERS), blastOn, validate({ body: bv.createTemplateBody }), h(broadcastCtrl.createTemplateHandler));
router.post("/broadcast/templates/sync", ...tenant, requireRole(...MANAGERS), blastOn, validate({ body: bv.syncTemplatesBody }), h(broadcastCtrl.syncTemplatesHandler));
router.get("/broadcast/templates/:id", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams }), h(broadcastCtrl.template));
router.delete("/broadcast/templates/:id", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams }), h(broadcastCtrl.removeTemplate));
router.get("/broadcast/settings", ...tenant, requireRole(...MANAGERS), blastOn, h(broadcastCtrl.getSettings));
router.put("/broadcast/settings", ...tenant, requireRole(...MANAGERS), blastOn, validate({ body: bv.updateBroadcastSettingsBody }), h(broadcastCtrl.putSettings));
router.post("/broadcast/audience/preview", ...tenant, requireRole(...MANAGERS), blastOn, validate({ body: bv.previewAudienceBody }), h(broadcastCtrl.preview));
router.get("/broadcast/campaigns", ...tenant, requireRole(...MANAGERS), blastOn, h(broadcastCtrl.campaigns));
router.post("/broadcast/campaigns", ...tenant, requireRole(...MANAGERS), blastOn, validate({ body: bv.createCampaignBody }), h(broadcastCtrl.createCampaignHandler));
router.get("/broadcast/campaigns/:id", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams }), h(broadcastCtrl.report));
router.post("/broadcast/campaigns/:id/launch", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams, body: bv.launchCampaignBody }), h(broadcastCtrl.launch));
router.post("/broadcast/campaigns/:id/pause", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams }), h(broadcastCtrl.pause));
router.post("/broadcast/campaigns/:id/resume", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams }), h(broadcastCtrl.resume));
router.post("/broadcast/campaigns/:id/cancel", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams }), h(broadcastCtrl.cancel));
router.get("/broadcast/campaigns/:id/recipients", ...tenant, requireRole(...MANAGERS), blastOn, validate({ params: v.idParams, query: bv.listRecipientsQuery }), h(broadcastCtrl.recipients));
router.post("/broadcast/test", ...tenant, requireRole(...MANAGERS), blastOn, aiLimiter, validate({ body: bv.testSendBody }), h(broadcastCtrl.testSend));
router.get("/broadcast/consent/summary", ...tenant, requireRole(...MANAGERS), h(broadcastCtrl.consent));
router.post("/broadcast/consent/import", ...tenant, requireRole(...MANAGERS), validate({ body: bv.importConsentBody }), h(broadcastCtrl.importConsentHandler));
router.put("/leads/:id/consent", ...tenant, requireRole(...SALES), validate({ params: v.idParams, body: bv.setConsentBody }), h(broadcastCtrl.putConsent));

router.get("/ads/roas", ...tenant, requireRole(...REPORTING), validate({ query: bv.roasQuery }), h(adsCtrl.roas));
router.get("/ads/spend", ...tenant, requireRole(...REPORTING), validate({ query: bv.listSpendQuery }), h(adsCtrl.spend));
router.post("/ads/spend", ...tenant, requireRole(...REPORTING), validate({ body: bv.upsertSpendBody }), h(adsCtrl.putSpend));
router.delete("/ads/spend/:id", ...tenant, requireRole(...REPORTING), validate({ params: v.idParams }), h(adsCtrl.removeSpend));
router.get("/ads/settings", ...tenant, requireRole(...REPORTING), h(adsCtrl.settings));
router.put("/ads/settings", ...tenant, requireRole(...MANAGERS), validate({ body: bv.adsSettingsBody }, { rawFields: ["accessToken"] }), h(adsCtrl.putSettings));
router.delete("/ads/settings", ...tenant, requireRole(...MANAGERS), h(adsCtrl.disconnect));
router.post("/ads/sync", ...tenant, requireRole(...REPORTING), aiLimiter, validate({ body: bv.syncAdsBody }), h(adsCtrl.sync));
router.get("/ads/capi", ...tenant, requireRole(...REPORTING), capiOn, h(adsCtrl.capi));
router.post("/ads/capi/orders/:orderId/send", ...tenant, requireRole(...REPORTING), capiOn, validate({ params: z.object({ orderId: v.idParams.shape.id }) }), h(adsCtrl.sendCapi));

// ==================== AI AGENTS ====================
const agentsOn = requireFeature("multiAgent", "Multi-Agen AI");
router.get("/ai/agents", ...tenant, requireRole(...SALES), agentsOn, h(agentCtrl.list));
router.post("/ai/agents", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ body: av.createAgentBody }), h(agentCtrl.create));
router.post("/ai/agents/presets", ...tenant, requireRole(...MANAGERS), agentsOn, h(agentCtrl.presets));
router.get("/ai/agents/settings", ...tenant, requireRole(...SALES), agentsOn, h(agentCtrl.getSettings));
router.put("/ai/agents/settings", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ body: av.updateAgentSettingsBody }), h(agentCtrl.putSettings));
router.post("/ai/agents/route-preview", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ body: av.routePreviewBody }), h(agentCtrl.preview));
router.get("/ai/agents/routing-log", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ query: av.routingLogQuery }), h(agentCtrl.routingLog));
router.get("/ai/agents/tools", ...tenant, requireRole(...MANAGERS), agentsOn, h(agentCtrl.tools));
router.get("/ai/agents/tool-calls", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ query: av.toolCallsQuery }), h(agentCtrl.toolCalls));
router.get("/ai/agents/:id", ...tenant, requireRole(...SALES), agentsOn, validate({ params: v.idParams }), h(agentCtrl.get));
router.put("/ai/agents/:id", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ params: v.idParams, body: av.updateAgentBody }), h(agentCtrl.update));
router.delete("/ai/agents/:id", ...tenant, requireRole(...MANAGERS), agentsOn, validate({ params: v.idParams }), h(agentCtrl.remove));
router.put("/leads/:id/agent", ...tenant, requireRole(...SALES), agentsOn, validate({ params: v.idParams, body: av.setConversationAgentBody }), h(agentCtrl.putConversationAgent));

// ==================== TASKS ====================
const tasksOn = requireFeature("tasks", "Tugas");
router.get("/tasks", ...tenant, requireRole(...TEAM), tasksOn, validate({ query: tv.taskListQuery }), h(taskCtrl.list));
router.post("/tasks", ...tenant, requireRole(...TEAM), tasksOn, validate({ body: tv.createTaskBody }), h(taskCtrl.create));
router.get("/tasks/meta", ...tenant, requireRole(...TEAM), tasksOn, h(taskCtrl.meta));
router.get("/tasks/settings", ...tenant, requireRole(...MANAGERS), tasksOn, h(taskCtrl.getSettings));
router.put("/tasks/settings", ...tenant, requireRole(...MANAGERS), tasksOn, validate({ body: tv.taskSettingsBody }), h(taskCtrl.putSettings));
router.get("/tasks/:id", ...tenant, requireRole(...TEAM), tasksOn, validate({ params: v.idParams }), h(taskCtrl.get));
router.put("/tasks/:id", ...tenant, requireRole(...TEAM), tasksOn, validate({ params: v.idParams, body: tv.updateTaskBody }), h(taskCtrl.update));
router.post("/tasks/:id/claim", ...tenant, requireRole(...TEAM), tasksOn, validate({ params: v.idParams }), h(taskCtrl.claim));
router.post("/tasks/:id/comments", ...tenant, requireRole(...TEAM), tasksOn, validate({ params: v.idParams, body: tv.commentBody }), h(taskCtrl.comment));
router.delete("/tasks/:id", ...tenant, requireRole(...MANAGERS), tasksOn, validate({ params: v.idParams }), h(taskCtrl.remove));

// ==================== HOW KLOZER IS PAID (managed by the superadmin, shown publicly) ====================
router.get("/public/payment-methods", webchatPollLimiter, h(payCtrl.publicList));
router.get("/public/payment-methods/:id/qris", webchatPollLimiter, validate({ params: v.idParams }), h(payCtrl.publicQrisImage));
router.get("/platform/vouchers", authenticate, requireSuperadmin, validate({ query: vouv.voucherListQuery }), h(voucherCtrl.list));
router.post("/platform/vouchers", authenticate, requireSuperadmin, validate({ body: vouv.createVoucherBody }), h(voucherCtrl.create));
router.put("/platform/vouchers/:id", authenticate, requireSuperadmin, validate({ params: v.idParams, body: vouv.updateVoucherBody }), h(voucherCtrl.update));
router.delete("/platform/vouchers/:id", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(voucherCtrl.remove));
router.put("/platform/payment-methods/:id/qris-code", authenticate, requireSuperadmin, validate({ params: v.idParams, body: payv.qrisCodeBody }), h(payCtrl.setQrisCode));
router.delete("/platform/payment-methods/:id/qris-code", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(payCtrl.deleteQrisCode));
router.get("/billing/plans", ...tenant, requireRole(...MANAGERS), h(billingCtrl.plans));
router.get("/billing/orders", ...tenant, requireRole(...MANAGERS), h(billingCtrl.orders));
router.post("/billing/orders", ...tenant, requireRole(...MANAGERS), validate({ body: billv.createOrderBody }), h(billingCtrl.create));
router.get("/billing/orders/admin", authenticate, requireSuperadmin, validate({ query: billv.orderListQuery }), h(billingCtrl.adminList));
router.get("/billing/orders/:id", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(billingCtrl.show));
router.post("/billing/orders/:id/paid", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams, body: billv.paidOrderBody }), h(billingCtrl.paid));
router.post("/billing/orders/:id/cancel", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(billingCtrl.cancel));
router.post("/billing/orders/:id/confirm", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(billingCtrl.adminConfirm));
router.post("/billing/orders/:id/cancel-by-team", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(billingCtrl.adminCancel));
router.get("/platform/payment-notifications", authenticate, requireSuperadmin, validate({ query: billv.notificationsQuery }), h(billingCtrl.notifications));
router.post("/payments/platform-notify", webhookLimiter, validate({ body: billv.paymentNoticeBody }), h(billingCtrl.paymentNotice));
router.get("/platform/payment-methods", authenticate, requireSuperadmin, h(payCtrl.adminList));
router.post("/platform/payment-methods", authenticate, requireSuperadmin, validate({ body: payv.createMethodBody }), h(payCtrl.create));
router.put("/platform/payment-methods/:id", authenticate, requireSuperadmin, validate({ params: v.idParams, body: payv.updateMethodBody }), h(payCtrl.update));
router.delete("/platform/payment-methods/:id", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(payCtrl.remove));
router.get("/platform/payment-methods/:id/qris", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(payCtrl.adminQrisImage));
router.put("/platform/payment-methods/:id/qris", authenticate, requireSuperadmin, validate({ params: v.idParams, body: payv.qrisImageBody }, { rawFields: ["fileBase64"] }), h(payCtrl.uploadQris));
router.delete("/platform/payment-methods/:id/qris", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(payCtrl.deleteQris));

// ==================== FAST PATH (repetitive questions answered by code, no tokens) ====================
router.get("/ai/fast-path", ...tenant, requireRole(...MANAGERS), h(fastCtrl.get));
router.put("/ai/fast-path", ...tenant, requireRole(...MANAGERS), validate({ body: fastv.updateFastPathBody }), h(fastCtrl.put));
router.get("/ai/fast-path/stats", ...tenant, requireRole(...MANAGERS), validate({ query: fastv.statsQuery }), h(fastCtrl.stats));

// ==================== AI TOKEN TOP UP ====================
router.get("/ai/topups", ...tenant, requireRole(...MANAGERS), h(topupCtrl.list));
router.get("/ai/topups/price", ...tenant, requireRole(...MANAGERS), validate({ query: topv.priceQuery }), h(topupCtrl.price));
router.post("/ai/topups", ...tenant, requireRole(...MANAGERS), validate({ body: topv.createTopupBody }), h(topupCtrl.create));
router.get("/ai/topups/admin", authenticate, requireSuperadmin, validate({ query: topv.topupListQuery }), h(topupCtrl.adminList));
router.post("/ai/topups/grant", authenticate, requireSuperadmin, validate({ body: topv.grantTokensBody }), h(topupCtrl.adminGrant));
router.get("/ai/topups/:id/pay", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(topupCtrl.pay));
router.post("/ai/topups/:id/paid", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams, body: topv.paidTopupBody }), h(topupCtrl.paid));
router.post("/ai/topups/:id/cancel", ...tenant, requireRole(...MANAGERS), validate({ params: v.idParams }), h(topupCtrl.cancel));
router.put("/ai/topups/:id/quote", authenticate, requireSuperadmin, validate({ params: v.idParams, body: topv.quoteTopupBody }), h(topupCtrl.adminQuote));
router.post("/ai/topups/:id/credit", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(topupCtrl.adminCredit));
router.post("/ai/topups/:id/cancel-by-team", authenticate, requireSuperadmin, validate({ params: v.idParams }), h(topupCtrl.adminCancel));

// ==================== API KEYS, WEBHOOKS AND THE PUBLIC API ====================
const apiOn = requireFeature("publicApi", "API dan Webhook");
router.get("/integrations/events", ...tenant, requireRole(...MANAGERS), apiOn, h(integrationsCtrl.events));
router.get("/integrations/api-keys", ...tenant, requireRole(...MANAGERS), apiOn, h(integrationsCtrl.apiKeys));
router.post("/integrations/api-keys", ...tenant, requireRole(...MANAGERS), apiOn, validate({ body: iv.createApiKeyBody }), h(integrationsCtrl.createKey));
router.delete("/integrations/api-keys/:id", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams }), h(integrationsCtrl.revokeKey));
router.get("/integrations/webhooks", ...tenant, requireRole(...MANAGERS), apiOn, h(integrationsCtrl.webhooks));
router.post("/integrations/webhooks", ...tenant, requireRole(...MANAGERS), apiOn, validate({ body: iv.createWebhookBody }), h(integrationsCtrl.createWebhook));
router.put("/integrations/webhooks/:id", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams, body: iv.updateWebhookBody }), h(integrationsCtrl.updateWebhook));
router.delete("/integrations/webhooks/:id", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams }), h(integrationsCtrl.removeWebhook));
router.post("/integrations/webhooks/:id/rotate-secret", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams }), h(integrationsCtrl.rotate));
router.post("/integrations/webhooks/:id/test", ...tenant, requireRole(...MANAGERS), apiOn, aiLimiter, validate({ params: v.idParams }), h(integrationsCtrl.test));
router.get("/integrations/webhooks/:id/deliveries", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams, query: iv.listDeliveriesQuery }), h(integrationsCtrl.deliveries));
router.get("/integrations/deliveries/:id", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams }), h(integrationsCtrl.delivery));
router.post("/integrations/deliveries/:id/retry", ...tenant, requireRole(...MANAGERS), apiOn, validate({ params: v.idParams }), h(integrationsCtrl.retry));

// The public API: authenticated by API key (scopes per route), limited per key.
const open = (...scopes) => [apiKeyAuth(...scopes), openApiLimiter];
router.get("/open/contacts", ...open("contacts:read"), validate({ query: iv.openContactsQuery }), h(openCtrl.listContacts));
router.post("/open/contacts", ...open("contacts:write"), validate({ body: iv.openUpsertContactBody }), h(openCtrl.upsertContact));
router.get("/open/contacts/:id", ...open("contacts:read"), validate({ params: v.idParams }), h(openCtrl.getContact));
router.patch("/open/contacts/:id", ...open("contacts:write"), validate({ params: v.idParams, body: iv.openPatchContactBody }), h(openCtrl.patchContact));
router.put("/open/contacts/:id/consent", ...open("contacts:write"), validate({ params: v.idParams, body: iv.openConsentBody }), h(openCtrl.putConsent));
router.get("/open/contacts/:id/messages", ...open("messages:read"), validate({ params: v.idParams, query: iv.openMessagesQuery }), h(openCtrl.listMessages));
router.post("/open/messages", ...open("messages:send"), validate({ body: iv.openSendMessageBody }, { rawFields: ["text"] }), h(openCtrl.sendMessage));
router.post("/open/messages/template", ...open("messages:send"), validate({ body: iv.openSendTemplateBody }), h(openCtrl.sendTemplate));
router.get("/open/orders", ...open("orders:read"), validate({ query: iv.openOrdersQuery }), h(openCtrl.listOrders));
router.get("/open/orders/:id", ...open("orders:read"), h(openCtrl.getOrder));
router.post("/open/orders", ...open("orders:write"), validate({ body: iv.openCreateOrderBody }), h(openCtrl.createOrder));
router.get("/open/products", ...open("products:read"), validate({ query: iv.openProductsQuery }), h(openCtrl.listProducts));

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
router.post("/chats/:leadId/suggest", ...tenant, requireRole(...SALES), aiLimiter, validate({ params: v.leadIdParams }), h(chatCtrl.suggestReply));
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
router.put("/shipping/orders/:orderId", ...tenant, requireRole(...STOCK, "cs", "finance"), validate({ params: z.object({ orderId: v.idParams.shape.id }), body: mv.updateShipmentBody }), h(shippingCtrl.updateShipment));
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
