import { config } from "../config/env.js";
import { memoryStore, query } from "../config/db.js";
import { generateAiCsResponse } from "./aiBrainService.js";
import { normalizePhone } from "../utils/helpers.js";

/**
 * Calculate human-like typing delay with randomized jitter (Meta Anti-Ban Safeguard)
 * Real human CS agents do not respond in 50ms. Meta's anti-spam algorithms
 * flag accounts with instant, uniform replies. Adding natural read + typing delay
 * prevents WhatsApp WABA account blocks and shadowbans.
 * 
 * @param {string} text - Message text to calculate typing duration
 * @returns {number} Milliseconds to delay
 */
export function calculateHumanPacingDelay(text = "") {
  const baseReadingDelay = 1200 + Math.floor(Math.random() * 800); // 1.2s - 2.0s
  const typingSpeedPerChar = 18 + Math.floor(Math.random() * 12); // 18ms - 30ms per char
  const textTypingTime = (text.length || 20) * typingSpeedPerChar;
  const humanJitter = Math.floor(Math.random() * 1000); // 0s - 1.0s jitter

  const totalDelay = baseReadingDelay + textTypingTime + humanJitter;

  // Clamp delay: minimum 3.0 seconds, maximum 6.8 seconds for optimal UX & safety
  return Math.min(6800, Math.max(3000, totalDelay));
}

/**
 * Mark inbound WhatsApp message as "read" on Meta Cloud API (Simulates human read receipt)
 * @param {Object} params { messageId, phoneNumberId, accessToken }
 */
export async function markWhatsAppMessageRead({ messageId, phoneNumberId, accessToken }) {
  const wabaPhoneId = phoneNumberId || config.meta.phoneNumberId;
  const token = accessToken || config.meta.accessToken;

  if (!wabaPhoneId || !token || token.includes("development_sandbox")) {
    return { success: true, simulated: true };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${wabaPhoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (err) {
    console.warn("[WhatsApp Service] Mark read error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send outbound WhatsApp message via Meta Cloud API
 * @param {Object} params { to, text, phoneNumberId, accessToken, institutionId }
 */
export async function sendWhatsAppMessage({
  to,
  text,
  phoneNumberId = null,
  accessToken = null,
  institutionId = 1,
}) {
  const wabaPhoneId = phoneNumberId || config.meta.phoneNumberId;
  const token = accessToken || config.meta.accessToken;
  const cleanTo = normalizePhone(to).replace(/[^0-9]/g, "");

  if (!cleanTo || !text) {
    throw new Error("Recipient phone and message text are required.");
  }

  // If live Meta credentials are not yet configured, provide seamless sandbox dispatch
  if (!wabaPhoneId || !token || token.includes("development_sandbox")) {
    console.log(
      `[WhatsApp Service Sandbox Outbound] To: +${cleanTo} | Msg: "${text.slice(0, 60)}..."`
    );
    return {
      success: true,
      mode: "sandbox_simulated",
      to: cleanTo,
      messageId: `wamid.HBgL${Date.now()}`,
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${wabaPhoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[WhatsApp Cloud API Send Error]", data);
      return { success: false, error: data };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
      to: cleanTo,
    };
  } catch (err) {
    console.error("[WhatsApp Service Network Error]", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Full Autonomous Inbound AI-CS Orchestrator with Anti-Ban Human Pacing
 * 
 * Flow:
 * 1. Store incoming customer message to thread
 * 2. Mark message as read on Meta
 * 3. Generate AI CS response using NVIDIA NIM (Llama 3.3 70B) + RAG Knowledge
 * 4. Apply anti-ban human typing delay (3.0s - 6.5s)
 * 5. Send outbound reply via Meta Cloud API
 * 6. Store AI response to thread
 * 
 * @param {Object} params { fromPhone, customerName, text, messageId, institutionId }
 */
export async function processInboundAiReply({
  fromPhone,
  customerName = "Pelanggan",
  text = "",
  messageId = null,
  institutionId = 1,
}) {
  const cleanPhone = normalizePhone(fromPhone);

  // 1. Find or create CRM Lead in store
  if (!memoryStore.leads) memoryStore.leads = [];
  let lead = memoryStore.leads.find(
    (l) => l.phone_number === cleanPhone && l.institution_id === institutionId
  );

  if (!lead) {
    lead = {
      id: memoryStore.leads.length + 1,
      institution_id: institutionId,
      name: customerName,
      phone_number: cleanPhone,
      source: "whatsapp",
      status: "new",
      total_orders_count: 0,
      total_spend_amount: 0,
      created_at: new Date().toISOString(),
    };
    memoryStore.leads.push(lead);
  }

  // 2. Record Customer Message in Chat History
  if (!memoryStore.chat_messages) memoryStore.chat_messages = [];
  const customerMsgRecord = {
    id: memoryStore.chat_messages.length + 1,
    institution_id: institutionId,
    lead_id: lead.id,
    sender_type: "customer",
    message_type: "text",
    content_text: text,
    is_delivered: 1,
    created_at: new Date().toISOString(),
  };
  memoryStore.chat_messages.push(customerMsgRecord);

  // 3. Mark message as read (blue checkmark)
  if (messageId) {
    markWhatsAppMessageRead({ messageId }).catch(() => {});
  }

  // 4. Extract Conversation History for Multi-Turn RAG Context
  const leadHistory = (memoryStore.chat_messages || [])
    .filter((m) => m.lead_id === lead.id && m.institution_id === institutionId)
    .slice(-10)
    .map((m) => ({
      role: m.sender_type === "customer" ? "user" : "assistant",
      content: m.content_text,
    }));

  // 5. Generate AI CS Response (NVIDIA NIM Llama-3.3-70B + RAG)
  const aiResult = await generateAiCsResponse({
    institutionId,
    customerName,
    customerPhone: cleanPhone,
    messageText: text,
    history: leadHistory,
  });

  const replyText = aiResult?.replyText || "Halo kak, ada yang bisa kami bantu seputar produk kami?";

  // 5. Calculate Human Typing Pacing (Anti-Ban Guardrail)
  const pacingDelay = calculateHumanPacingDelay(replyText);
  console.log(
    `[WhatsApp AI CS] Received "${text.slice(0, 30)}..." -> Reply generated (${aiResult.modelUsed}). Waiting ${pacingDelay}ms human typing delay to protect WhatsApp account from Meta bans...`
  );

  // Wait with Promise setTimeout to simulate human typing
  await new Promise((resolve) => setTimeout(resolve, pacingDelay));

  // 6. Send Outbound WhatsApp Message
  const sendResult = await sendWhatsAppMessage({
    to: cleanPhone,
    text: replyText,
    institutionId,
  });

  // 7. Record AI Response in Chat History
  const aiMsgRecord = {
    id: memoryStore.chat_messages.length + 1,
    institution_id: institutionId,
    lead_id: lead.id,
    sender_type: "ai_cs",
    message_type: "text",
    content_text: replyText,
    is_delivered: sendResult.success ? 1 : 0,
    model_used: aiResult.modelUsed,
    created_at: new Date().toISOString(),
  };
  memoryStore.chat_messages.push(aiMsgRecord);

  return {
    success: true,
    leadId: lead.id,
    inboundText: text,
    replyText,
    pacingDelayMs: pacingDelay,
    modelUsed: aiResult.modelUsed,
    outboundStatus: sendResult,
  };
}
