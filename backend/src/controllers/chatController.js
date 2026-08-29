import { memoryStore } from "../config/db.js";
import { generateAiCsResponse } from "../services/aiBrainService.js";
import { transcribeAudio, synthesizeSpeech } from "../services/voiceNoteService.js";

/**
 * Get Chat Messages Thread for a Lead
 * GET /api/v1/chats/:leadId
 */
export async function getChatMessages(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const leadId = parseInt(req.params.leadId, 10);

    const messages = (memoryStore.chat_messages || []).filter(
      (m) => m.lead_id === leadId && m.institution_id === institutionId
    );

    const lead = (memoryStore.leads || []).find((l) => l.id === leadId && l.institution_id === institutionId);

    res.json({
      success: true,
      data: {
        lead,
        messages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Send Message (Text / Voice Note / QRIS) & Trigger AI Auto-Reply if enabled
 * POST /api/v1/chats/send
 */
export async function sendMessage(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { lead_id, message_type = "text", content_text = "", sender_type = "cs" } = req.body;

    if (!lead_id) {
      return res.status(400).json({ success: false, message: "Lead ID wajib disertakan." });
    }

    const message = {
      id: (memoryStore.chat_messages?.length || 0) + 1,
      institution_id: institutionId,
      lead_id: parseInt(lead_id, 10),
      sender_type,
      sender_user_id: req.user?.id || null,
      message_type,
      content_text,
      is_delivered: 1,
      created_at: new Date().toISOString(),
    };

    if (!memoryStore.chat_messages) memoryStore.chat_messages = [];
    memoryStore.chat_messages.push(message);

    res.status(201).json({
      success: true,
      message: "Pesan berhasil dikirim.",
      data: message,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * AI CS Copilot & Sandbox Assistant
 * POST /api/v1/ai/chat
 */
export async function aiChatSimulation(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { message, customerName, customerPhone } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Pesan tidak boleh kosong." });
    }

    const aiResult = await generateAiCsResponse({
      institutionId,
      customerName: customerName || "Pelanggan",
      customerPhone: customerPhone || "",
      messageText: message,
    });

    res.json(aiResult);
  } catch (err) {
    next(err);
  }
}

/**
 * Public Landing Page "Tanya AI" Endpoint
 * POST /api/v1/ai/ask
 */
export async function publicAskAi(req, res, next) {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: "Pertanyaan tidak boleh kosong." });
    }

    const { generateLandingAiResponse } = await import("../services/aiBrainService.js");
    const result = await generateLandingAiResponse(question);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

