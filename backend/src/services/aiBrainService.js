import { query, queryOne } from "../config/db.js";
import { logger } from "../config/logger.js";
import { notFound } from "../utils/errors.js";
import { config } from "../config/env.js";
import { parseJsonColumn } from "../utils/jsonColumn.js";
import {
  ADMIN_LABEL,
  CUSTOMER_LABEL,
  GUARDRAIL_REPLIES,
  buildCsSystemPrompt,
  buildCsUserMessage,
  formatChatReply,
  friendlyFirstName,
} from "./aiPrompt.js";

// A little looser than before (was 0.3) so replies sound like a person; the prompt keeps prices,
// stock and bank details tied to the data it is given. Landing answers state product facts, so they stay tighter.
const LANDING_TEMPERATURE = 0.5;
import { getEffectiveAi } from "./platformSettings.js";

/**
 * Multi-layer AI Guardrails Rules & Evaluator
 */
export class AiGuardrails {
  /**
   * Prompt injection / jailbreak patterns
   */
  static INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous\s+)?instructions/i,
    /system\s+prompt/i,
    /tampilkan\s+(semua\s+)?prompt/i,
    /bocorkan\s+instruksi/i,
    /jailbreak/i,
    /dan\s+mode/i,
    /developer\s+mode/i,
    /bypass\s+rules/i,
    /forget\s+rules/i,
    /act\s+as\s+unfiltered/i,
  ];

  /**
   * Toxicity and safety filters
   */
  static TOXIC_PATTERNS = [
    /\b(bajingan|kontol|memek|anjing|bangsat|tai)\b/i,
    /cara\s+(hack|meretas|menipu|bobol)/i,
    /bikin\s+(bom|senjata|narkoba)/i,
  ];

  /**
   * Explicit human escalation keywords
   */
  static ESCALATION_PATTERNS = [
    /bicara\s+dengan\s+(manusia|orang|staf|admin|cs)/i,
    /cs\s+asli/i,
    /bukan\s+bot/i,
    /hubungkan\s+ke\s+(manusia|admin)/i,
    /komplain\s+berat/i,
    /mau\s+lapor\s+polisi/i,
    /penipuan/i,
    /barang\s+rusak/i,
  ];

  /**
   * Evaluate message against all guardrails
   * @param {string} text 
   * @returns {Object} Guardrail decision
   */
  static evaluate(text = "") {
    const trimmed = text.trim();

    // 1. Check Prompt Injection Guardrail
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isSafe: false,
          violationType: "prompt_injection",
          safeReply: GUARDRAIL_REPLIES.prompt_injection,
          needsEscalation: false,
        };
      }
    }

    // 2. Check Toxic Content Guardrail
    for (const pattern of this.TOXIC_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isSafe: false,
          violationType: "toxicity",
          safeReply: GUARDRAIL_REPLIES.toxicity,
          needsEscalation: false,
        };
      }
    }

    // 3. Check Human Escalation Guardrail
    for (const pattern of this.ESCALATION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isSafe: true,
          violationType: null,
          safeReply: GUARDRAIL_REPLIES.escalation,
          needsEscalation: true,
        };
      }
    }

    return {
      isSafe: true,
      violationType: null,
      safeReply: null,
      needsEscalation: false,
    };
  }

  /**
   * Sanitize output from Gemini to prevent leaking sensitive variables
   * @param {string} text 
   * @returns {string} Sanitized output
   */
  static sanitizeOutput(text = "") {
    if (!text) return "";
    return text
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_API_KEY]")
      .replace(/sk-[A-Za-z0-9]{32,}/g, "[REDACTED_SECRET]")
      .replace(/EAAG[A-Za-z0-9]+/g, "[REDACTED_META_TOKEN]");
  }
}

/**
 * Fetch dynamic RAG context for a specific institution
 * @param {number} institutionId 
 * @returns {Promise<Object>} Institution knowledge context
 */
export async function getInstitutionRagContext(institutionId) {
  const inst = await queryOne(
    "SELECT id, name, mode, sector, address, phone_number, ai_persona_json FROM institutions WHERE id = ? AND is_active = 1",
    [institutionId]
  );
  if (!inst) throw notFound("Instansi tidak ditemukan.");

  const [products, programs, bankAccounts, vouchers] = await Promise.all([
    query(
      `SELECT sku, name, category, selling_price AS price, stock_quantity AS stock, description
         FROM products WHERE institution_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 100`,
      [institutionId]
    ),
    query(
      `SELECT name, category, target_amount AS target, collected_amount AS collected, doa_template AS doa
         FROM programs WHERE institution_id = ? AND is_published = 1 LIMIT 50`,
      [institutionId]
    ),
    query(
      `SELECT bank_code AS bank, account_number AS accountNumber, account_holder AS holder, transfer_instruction AS instruction
         FROM bank_accounts WHERE institution_id = ? AND is_active = 1`,
      [institutionId]
    ),
    query(
      `SELECT code, discount_type, discount_value, min_spend_idr FROM promos_vouchers
         WHERE institution_id = ? AND is_active = 1 AND valid_from <= UTC_TIMESTAMP() AND valid_until >= UTC_TIMESTAMP()
           AND used_count < max_uses_total`,
      [institutionId]
    ),
  ]);

  return {
    institutionName: inst.name,
    businessMode: inst.mode,
    sector: inst.sector,
    address: inst.address,
    csContact: inst.phone_number,
    persona: parseJsonColumn(inst.ai_persona_json),
    catalog: products,
    programs,
    paymentAccounts: bankAccounts,
    vouchers,
  };
}

/**
 * Call NVIDIA NIM API (meta/llama-3.3-70b-instruct or configured NIM model)
 * @param {Object} params { systemPrompt, userMessage }
 * @returns {Promise<string|null>} Generated text
 */
/** Fill `report` (when given) with the provider's HTTP status and error text, with the key scrubbed out. */
async function captureProviderError(response, report, apiKey) {
  if (!report) return;
  report.status = response.status;
  try {
    const body = await response.json();
    const text = String(body?.error?.message ?? body?.error ?? body?.detail ?? body?.message ?? "");
    report.message = text.split(apiKey).join("[key]").slice(0, 240);
  } catch {
    report.message = "";
  }
}

export async function callNvidiaNimApi({ systemPrompt, userMessage, temperature = config.ai.temperature, maxTokens = 600, report = null }) {
  const ai = await getEffectiveAi();
  const apiKey = ai.nvidiaKey;
  const model = ai.nvidiaModel || "meta/llama-3.3-70b-instruct";
  if (!apiKey) return null;

  const started = Date.now();
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, provider: "nvidia" }, "AI provider returned an error");
      await captureProviderError(response, report, apiKey);
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return {
      text: AiGuardrails.sanitizeOutput(text.trim()),
      model,
      usage: {
        promptTokens: data?.usage?.prompt_tokens ?? null,
        completionTokens: data?.usage?.completion_tokens ?? null,
      },
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    logger.warn({ err: err.message, provider: "nvidia" }, "AI provider request failed");
    if (report) report.message = err.name === "TimeoutError" ? "Waktu habis (tidak ada jawaban dalam 25 detik)." : "Tidak dapat terhubung ke penyedia.";
    return null;
  }
}

/**
 * Call Google Gemini API.
 * @returns {Promise<{text: string, model: string, usage: Object, latencyMs: number}|null>}
 */
export async function callGeminiApi({ systemPrompt, userMessage, temperature = config.ai.temperature, maxTokens = 600, report = null }) {
  const ai = await getEffectiveAi();
  const apiKey = ai.geminiApiKey;
  const model = ai.geminiModel;
  if (!apiKey) return null;

  const started = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, provider: "gemini" }, "AI provider returned an error");
      await captureProviderError(response, report, apiKey);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return {
      text: AiGuardrails.sanitizeOutput(text.trim()),
      model,
      usage: {
        promptTokens: data?.usageMetadata?.promptTokenCount ?? null,
        completionTokens: data?.usageMetadata?.candidatesTokenCount ?? null,
      },
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    logger.warn({ err: err.message, provider: "gemini" }, "AI provider request failed");
    if (report) report.message = err.name === "TimeoutError" ? "Waktu habis (tidak ada jawaban dalam 25 detik)." : "Tidak dapat terhubung ke penyedia.";
    return null;
  }
}

/** Small round trip used by the superadmin "uji koneksi" button. Returns the provider's reason on failure, never the key. */
export async function testAiProvider(provider) {
  const call = provider === "gemini" ? callGeminiApi : callNvidiaNimApi;
  const report = {};
  const result = await call({ systemPrompt: "Balas hanya dengan kata: OK", userMessage: "Tes koneksi", report });
  if (!result) {
    const reason = [report.status ? `HTTP ${report.status}` : null, report.message].filter(Boolean).join(": ");
    return { ok: false, message: reason ? `Gagal: ${reason}` : "Penyedia menolak permintaan, atau jawabannya kosong. Periksa API key dan nama model." };
  }
  return { ok: true, model: result.model, latencyMs: result.latencyMs, message: "Koneksi berhasil." };
}
