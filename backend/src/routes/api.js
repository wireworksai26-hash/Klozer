import { Router } from "express";
import { authenticate, requireRole, optionalAuth } from "../middlewares/authMiddleware.js";
import { tenantContext } from "../middlewares/tenantContext.js";

// Controllers
import * as authCtrl from "../controllers/authController.js";
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
import * as tokenUsageCtrl from "../controllers/tokenUsageController.js";
import { getSessionStatus, updateSessionHeartbeat } from "../services/whatsappWatchdog.js";

const router = Router();

// ==================== 1. PUBLIC & AUTH ROUTES ====================
router.post("/auth/login", authCtrl.login);
router.post("/auth/register", authCtrl.register);
router.get("/auth/me", authenticate, authCtrl.getMe);

// ==================== 2. WEBHOOKS & WHATSAPP WATCHDOG ====================
router.get("/webhooks/whatsapp", webhookCtrl.verifyWhatsAppWebhook);
router.post("/webhooks/whatsapp", webhookCtrl.handleWhatsAppInbound);
router.post("/webhooks/whatsapp/simulate", webhookCtrl.simulateWhatsAppInbound);
router.post("/payments/webhook", paymentCtrl.paymentWebhookHandler);
router.get("/whatsapp/status", authenticate, async (req, res) => {
  const instId = req.tenantId || req.user?.institution_id || 1;
  const status = await getSessionStatus(instId);
  res.json(status);
});
router.post("/whatsapp/heartbeat", async (req, res) => {
  const { institution_id = 1, session_status, phone_number, battery_level } = req.body;
  const result = await updateSessionHeartbeat({
    institutionId: institution_id,
    sessionStatus: session_status,
    phoneNumber: phone_number,
    batteryLevel: battery_level,
  });
  res.json({ success: true, result });
});

// ==================== 3. INSTITUTIONS (Tenants) ====================
router.get("/institutions", authenticate, instCtrl.getAllInstitutions);
router.post("/institutions", authenticate, requireRole("superadmin"), instCtrl.createInstitution);
router.put("/institutions/:id", authenticate, requireRole("superadmin", "owner", "supervisor"), instCtrl.updateInstitution);
router.delete("/institutions/:id", authenticate, requireRole("superadmin"), instCtrl.deleteInstitution);

// ==================== 4. MASTER DATA (PRODUCTS) ====================
router.get("/products", authenticate, tenantContext, prodCtrl.getProducts);
router.post("/products", authenticate, tenantContext, prodCtrl.createProduct);
router.put("/products/:id", authenticate, tenantContext, prodCtrl.updateProduct);
router.delete("/products/:id", authenticate, tenantContext, prodCtrl.deleteProduct);

// ==================== 5. CRM & LEADS ====================
router.get("/leads", authenticate, tenantContext, leadCtrl.getLeads);
router.post("/leads", authenticate, tenantContext, leadCtrl.createLead);
router.put("/leads/:id", authenticate, tenantContext, leadCtrl.updateLead);

// ==================== 6. CHAT & AI COPILOT ====================
router.post("/ai/ask", chatCtrl.publicAskAi);
router.get("/chats/:leadId", authenticate, tenantContext, chatCtrl.getChatMessages);
router.post("/chats/send", authenticate, tenantContext, chatCtrl.sendMessage);
router.post("/ai/chat", optionalAuth, chatCtrl.aiChatSimulation);

// ==================== 7. ORDERS & INVOICING ====================
router.get("/orders", authenticate, tenantContext, orderCtrl.getOrders);
router.post("/orders", authenticate, tenantContext, orderCtrl.createOrder);
router.get("/orders/:id/invoice", authenticate, tenantContext, orderCtrl.getOrderInvoice);

// ==================== 8. DYNAMIC QRIS & PAYMENTS ====================
router.post("/payments/qris", authenticate, tenantContext, paymentCtrl.createQrisPayment);

// ==================== 9. SHIPPING & COD ANTI-RTS ====================
router.post("/shipping/rates", authenticate, shippingCtrl.getRates);
router.post("/shipping/cod-risk-score", authenticate, shippingCtrl.checkCodRisk);
router.post("/shipping/book", authenticate, tenantContext, shippingCtrl.bookShipment);

// ==================== 10. FRAUD DETECTION & RECEIPT OCR ====================
router.post("/fraud/verify-receipt", authenticate, fraudCtrl.verifyReceipt);
router.post("/fraud/reconcile-mutation", authenticate, tenantContext, fraudCtrl.reconcileMutation);

// ==================== 11. REPORTS & BUSINESS INTELLIGENCE ====================
router.get("/reports/summary", authenticate, tenantContext, reportCtrl.getSummaryReport);

// ==================== 12. SYSTEM TELEMETRY & TOKEN LOGS ====================
router.get("/system/metrics", systemCtrl.getSystemMetrics);
router.get("/ai/token-usage", tokenUsageCtrl.getTokenUsageSummary);
router.get("/ai/token-balance", tokenUsageCtrl.getTenantTokenBalance);
router.post("/ai/token-usage/log", tokenUsageCtrl.logTokenUsage);

export default router;
