import { query, queryOne } from "../config/db.js";
import { logger } from "../config/logger.js";
import { notFound } from "../utils/errors.js";
import { config } from "../config/env.js";

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
          safeReply: "Maaf kak, saya adalah Asisten AI resmi Klozer yang bertugas membantu seputar produk, pemesanan, dan layanan pelanggan.",
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
          safeReply: "Mohon gunakan bahasa yang sopan ya kak. Ada hal terkait produk atau pesanan yang bisa kami bantu?",
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
          safeReply: "Baik kak, percakapan ini akan segera kami hubungkan ke staf Customer Service manusia kami untuk bantuan lebih lanjut. Mohon tunggu sebentar ya kak!",
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
    persona: inst.ai_persona_json || {},
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
export async function callNvidiaNimApi({ systemPrompt, userMessage }) {
  const apiKey = config.ai.nvidiaKey;
  const model = config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct";
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
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, provider: "nvidia" }, "AI provider returned an error");
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
    return null;
  }
}

/**
 * Call Google Gemini API.
 * @returns {Promise<{text: string, model: string, usage: Object, latencyMs: number}|null>}
 */
export async function callGeminiApi({ systemPrompt, userMessage }) {
  const apiKey = config.ai.geminiApiKey;
  const model = config.ai.geminiModel;
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
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, provider: "gemini" }, "AI provider returned an error");
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
    return null;
  }
}

/** Try the configured primary provider first, then the other one. */
async function callBestProvider(args) {
  const order = config.ai.provider === "gemini" ? [callGeminiApi, callNvidiaNimApi] : [callNvidiaNimApi, callGeminiApi];
  for (const call of order) {
    const result = await call(args);
    if (result) return result;
  }
  return null;
}

/**
 * Generate AI Customer Service Response with Gemini & Strict Guardrails
 * @param {Object} params { institutionId, customerName, customerPhone, messageText, history }
 * @returns {Promise<Object>}
 */
/**
 * Generate AI Customer Service Response with NVIDIA NIM / Gemini & Strict Guardrails
 * @param {Object} params { institutionId, customerName, customerPhone, messageText, history, customProducts, promos, institutionName, sector, address, hours }
 * @returns {Promise<Object>}
 */
export async function generateAiCsResponse({
  institutionId,
  customerName = "Kakak",
  messageText = "",
  history = [],
  customProducts = null,
  promos = null,
  institutionName = null,
  sector = null,
  address = null,
  hours = null,
}) {
  // 1. Evaluate Guardrails on User Input
  const guardrailCheck = AiGuardrails.evaluate(messageText);
  if (!guardrailCheck.isSafe || guardrailCheck.needsEscalation) {
    return {
      success: true,
      intent: guardrailCheck.needsEscalation ? "human_escalation" : "guardrail_blocked",
      replyText: guardrailCheck.safeReply,
      needsEscalation: guardrailCheck.needsEscalation,
      guardrailViolation: guardrailCheck.violationType,
      modelUsed: "guardrail",
    };
  }

  // 2. Fetch Multi-Tenant RAG Ground Truth Context
  const baseContext = await getInstitutionRagContext(institutionId);
  const instName = institutionName || baseContext.institutionName || "Toko Kami";
  const instSector = sector || baseContext.sector || "Bisnis";
  const instAddress = address || baseContext.address || "Belum diatur";
  const instHours = hours || "Belum diatur";

  // Ground truth only: caller-supplied sandbox catalog, otherwise this tenant's own products.
  const activeProducts = customProducts && customProducts.length > 0 ? customProducts : baseContext.catalog || [];

  const catalogList = activeProducts
    .map(
      (p, idx) =>
        `${idx + 1}. ${p.name} — Harga: Rp ${(p.price || 0).toLocaleString("id-ID")} | Stok: ${p.stock || 0} unit${p.category ? ` | Kategori: ${p.category}` : ""}${p.description ? ` | Info: ${p.description}` : ""}`
    )
    .join("\n");

  const describeVoucher = (v) =>
    `Kode ${v.code}: ${v.discount_type === "percentage" ? `${Number(v.discount_value)}%` : v.discount_type === "free_shipping" ? "gratis ongkir" : `Rp ${Number(v.discount_value).toLocaleString("id-ID")}`}${Number(v.min_spend_idr) > 0 ? ` (min. belanja Rp ${Number(v.min_spend_idr).toLocaleString("id-ID")})` : ""}`;
  const promoItems =
    promos && promos.length > 0
      ? promos.map((pr) => (typeof pr === "string" ? pr : pr.title || pr.description)).filter(Boolean)
      : (baseContext.vouchers || []).map(describeVoucher);
  const promoList = promoItems.length > 0 ? promoItems.map((p, i) => `${i + 1}. ${p}`).join("\n") : "Tidak ada promo aktif saat ini. JANGAN menawarkan atau menjanjikan diskon apa pun.";

  const bankHolder = instName || "Toko Kami";
  const accounts = baseContext.paymentAccounts || [];
  const bankList = accounts.length > 0
    ? accounts.map((b) => `- Bank ${b.bank}: ${b.accountNumber} a.n. ${b.holder || bankHolder}`).join("\n")
    : "Belum ada rekening transfer terdaftar. JANGAN menyebut nomor rekening; arahkan pelanggan ke Dynamic QRIS atau minta mereka menunggu admin.";
  const bankTransferSummary = accounts.length > 0
    ? accounts.map((b) => `Bank ${b.bank}: ${b.accountNumber} a.n. ${b.holder || bankHolder}`).join(", ")
    : "(rekening transfer belum tersedia)";

  const rawName = (customerName || "Kakak").trim();
  const shortCustName = rawName.split(" ")[0] || "Kakak";

  // Determine if this is the initial turn (no previous AI responses yet)
  const hasPreviousAiReplies =
    Array.isArray(history) &&
    history.some(
      (h) =>
        h.sender === "ai" ||
        h.sender === "assistant" ||
        h.role === "assistant" ||
        h.role === "ai" ||
        h.sender_type === "ai_cs" ||
        h.sender_type === "assistant"
    );
  const isInitialTurn = !hasPreviousAiReplies;

  // Tenant-configured persona (bot name, tone, greeting). Plain text only, length-limited by validation.
  const persona = baseContext.persona || {};
  const personaBlock = [
    persona.botName ? `- Namamu: ${persona.botName}` : null,
    persona.tone ? `- Gaya bicara: ${persona.tone}` : null,
    persona.greetingMessage && isInitialTurn ? `- Sapaan pembuka yang diinginkan pemilik toko (pakai bila ini pesan pertama): "${persona.greetingMessage}"` : null,
    persona.customFaqKeywords ? `- Topik yang sering ditanyakan pelanggan: ${persona.customFaqKeywords}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // 3. Build Strict, Human-Like System Prompt
  const systemPrompt = `
Kamu adalah Asisten AI Customer Service & Sales resmi dari "${instName}" (${instSector}).
Tugasmu: Memberikan pelayanan pelanggan via chat WhatsApp yang ramah, sopan, solutif, humanis, to-the-point, dan cerdas.
${personaBlock ? `
[PERSONA YANG DIATUR PEMILIK TOKO]
${personaBlock}
` : ""}
PEDOMAN PERCAKAPAN HUMANIS & NATURAL (SANGAT PENTING):
1. ATURAN SALAM DAN NAMA PELANGGAN:
   - Sapaan pembuka dengan nama pelanggan (contoh "Halo Kak ${shortCustName}!" atau "Halo ${rawName}!") HANYA BOLEH diucapkan SATU KALI di pesan pertama / awal percakapan (${isInitialTurn ? "YA, ini adalah pesan pertama, silakan sapa ramah di awal" : "TIDAK, ini adalah pesan lanjutan, DILARANG KERAS mengulang 'Halo Kak ${shortCustName}'"}).
   - PADA PESAN LANJUTAN (FOLLOW-UP / MULTI-TURN): DILARANG KERAS mengulang sapaan pembuka "Halo Kak [Nama]" atau "Halo Kakak!" di awal balasan. Langsung berikan respon to-the-point dengan kata sambung santun (contoh: "Siap Kak,", "Baik Kak,", "Tentu,", "Berikut...", "Untuk pilihan...", dll).
   - JANGAN mengulang-ulang nama pelanggan di setiap kalimat.
2. JANGAN MENGULANG SALAM PEMBUKA DI TENGAH OBROLAN:
   - Langsung jawab pertanyaan pelanggan secara to-the-point tanpa basa-basi pembuka yang berulang.
3. KETIKA PELANGGAN MEMILIH METODE PEMBAYARAN ATAU NOMOR OPSI (contoh "1", "2", "transfer bank", "qris"):
   - Jika memilih opsi 1 / QRIS: Rincikan total dan berikan instruksi scan Dynamic QRIS resmi.
   - Jika memilih opsi 2 / Transfer Bank: Berikan nomor rekening resmi (${bankTransferSummary}) dan minta info/bukti transfer setelah dikirim.
4. JAWAB PERTANYAAN DETAIL MENU/PRODUK SECARA SPESIFIK:
   - Jika pelanggan bertanya tentang varian/produk tertentu:
     Jawab langsung dengan jelas berdasarkan info katalog produk di bawah. Jelaskan rincian produk, harga, stok, dan tawarkan varian atau paket pelengkap jika ada.
   - JANGAN asal melempar seluruh daftar katalog jika pelanggan hanya bertanya 1 produk tertentu!
5. KETIKA PELANGGAN MAU PESAN (ORDER INTENT / MULTI-ITEM CALCULATION):
   - Jika pelanggan menyebutkan beberapa produk atau menanyakan total:
     Hitung dan rincikan setiap produk dengan harga, subtotal, potongan HANYA jika ada di [PROMO & DISKON AKTIF], dan total akhir!
     Tanyakan alamat pengiriman serta catatan pesanan / varian yang diinginkan.
6. AFIRMASI PEMESANAN ("boleh kak saya mau", "oke kak", "siap saya mau"):
   - Langsung konfirmasi pesanan dengan antusias, minta alamat pengiriman dan catatan varian, lalu tawarkan Dynamic QRIS atau Transfer Bank.
7. INFORMASI DISKON & PROMO:
   - Gunakan data [PROMO & DISKON AKTIF]. Jika pelanggan bertanya diskon/promo atau saat hendak checkout, sebutkan promo yang relevan.
8. SIKAP SAAT PELANGGAN BATAL / CANCEL / RAGU:
   - Tetap sangat ramah, santun, dan empatik. Jangan memaksa atau tersinggung.
   - Contoh: "Baik tidak apa-apa Kak, terima kasih banyak sudah mampir dan bertanya. Jika nanti Kakak ingin memesan lagi atau butuh rekomendasi, jangan ragu hubungi kami ya. Semoga harinya menyenangkan!"
9. ANTI-HALUSINASI: Hanya rekomendasikan produk, stok, dan harga yang ada di [KATALOG PRODUK & MENU RESMI].

[KATALOG PRODUK & MENU RESMI]:
${catalogList || "Tidak ada produk terdaftar saat ini."}

[PROMO & DISKON AKTIF]:
${promoList}

[INFORMASI OUTLET & PENGIRIMAN]:
- Alamat: ${instAddress}
- Jam Buka: ${instHours}

[REKENING & QRIS RESMI]:
- Dynamic QRIS Otomatis (Semua Bank & e-Wallet)
${bankList}
`.trim();

  // 4. Build Multi-Turn History in User Prompt
  let formattedHistory = "";
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    formattedHistory = recent
      .map((h) => {
        const isUser = h.sender === "user" || h.sender === "customer" || h.role === "user";
        const sender = isUser ? "Pelanggan" : "Asisten AI";
        const text = h.text || h.content || "";
        return `${sender}: ${text}`;
      })
      .filter((line) => !line.endsWith(": "))
      .join("\n");
  }

  const turnInstruction = isInitialTurn
    ? `[Petunjuk: Ini adalah interaksi pesan pertama. Boleh sertakan salam pembuka ramah "Halo Kak ${shortCustName}!" di awal.]`
    : `[PETUNJUK PENTING: Ini adalah pesan lanjutan dalam obrolan yang sedang berjalan. JANGAN mengulang salam pembuka "Halo Kak ${shortCustName}" atau "Halo!". Langsung jawab inti pesan dengan to-the-point.]`;

  const finalUserMessage = formattedHistory
    ? `Riwayat Obrolan Sebelumnya:\n${formattedHistory}\n\n${turnInstruction}\n\nPesan Baru dari Pelanggan (${shortCustName}):\n${messageText}`
    : `${turnInstruction}\n\nPesan dari Pelanggan (${shortCustName}):\n${messageText}`;

  // 5. Generate with the configured provider (primary, then the other as failover)
  const result = await callBestProvider({ systemPrompt, userMessage: finalUserMessage });

  if (result) {
    return {
      success: true,
      intent: "ai_generated",
      replyText: result.text,
      needsEscalation: false,
      modelUsed: result.model,
      usage: result.usage,
      latencyMs: result.latencyMs,
      institutionContext: { name: instName, sector: instSector },
    };
  }

  // No provider available. Never improvise prices, discounts or bank accounts:
  // hand the conversation to a human instead.
  return {
    success: true,
    intent: "llm_unavailable",
    replyText: null,
    needsEscalation: true,
    modelUsed: null,
    usage: { promptTokens: 0, completionTokens: 0 },
    institutionContext: { name: instName, sector: instSector },
  };
}

/**
 * Clean up raw markdown asterisks and format text for natural WhatsApp chat bubbles
 * @param {string} text 
 * @returns {string} Clean text
 */
export function cleanChatFormatting(text = "") {
  if (!text) return "";
  return text
    // Replace double asterisks **text** with clean text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    // Replace single asterisk *text* with clean text
    .replace(/\*([^*\n]+)\*/g, "$1")
    // Ensure clean newlines before numbered items
    .replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n\n$2")
    // Ensure clean newlines before bullet items
    .replace(/([^\n])\s+([•-]\s+)/g, "$1\n$2")
    // Trim extra blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Specialized Landing Page Tanya AI Knowledge Resolver
 * @param {string} question 
 * @returns {Promise<Object>}
 */
export async function generateLandingAiResponse(question = "") {
  // Evaluate Guardrails first
  const guardrailCheck = AiGuardrails.evaluate(question);
  if (!guardrailCheck.isSafe) {
    return {
      success: true,
      answer: cleanChatFormatting(guardrailCheck.safeReply),
      guardrailViolation: guardrailCheck.violationType,
      modelUsed: "guardrail",
    };
  }

  const systemPrompt = `
Kamu adalah Asisten AI Resmi dari "Klozer" — Platform AI Conversational Commerce & Smart CRM WhatsApp untuk Bisnis & NGO di Indonesia.

Fitur & Keunggulan Klozer:
- In-Chat Dynamic QRIS: Biaya transaksi hanya Rp 750 flat per transaksi lunas, settlement instan tanpa pindah aplikasi.
- AI Voice Note Engine: Mendengarkan & membalas pesan suara WhatsApp berbahasa Indonesia dan logat lokal secara natural.
- Deep Fraud Detection: Deteksi struk palsu editan m-banking (BCA, Mandiri, BRI, BNI) menggunakan OCR & ELA, serta rekonsiliasi mutasi bank otomatis.
- Proactive Follow-Up: Follow-up otomatis keranjang tertinggal & 30 hari repeat order dengan anti-spam limit.
- Anti-RTS COD Protection: Skor risiko COD (0-100) dan multi-ekspedisi (J&T, SiCepat, JNE, SAP).
- Meta Ads Offline CAPI: Tracking closing purchase WhatsApp untuk mengukur ROAS iklan riil.
- Kemudahan & Keamanan: Menggunakan WhatsApp Cloud API resmi Meta, aman dari risiko blokir nomor, dan bisa diakses via HP maupun laptop.

ATURAN FORMAT WAJIB (FORMATTING RULES):
1. JANGAN gunakan tanda bintang ganda (**) atau tanda bintang tunggal (*) sama sekali dalam jawabanmu. Tuliskan teks biasa yang bersih, elegan, dan nyaman dibaca.
2. JANGAN menulis paragraf panjang padat atau daftar bernomor berjejer rapat. Buat jawaban ringkas (maksimal 2-3 paragraf pendek) dengan baris baru antar poin agar rapi di layar chat.
3. Tone: Ramah, santun, profesional, dan to the point ala Customer Service Indonesia modern.
`.trim();

  const result = await callBestProvider({ systemPrompt, userMessage: question });
  if (result) {
    return { success: true, answer: cleanChatFormatting(result.text), modelUsed: result.model, usage: result.usage };
  }

  // Smart Knowledge Fallback
  const q = question.toLowerCase();
  let answer = "Klozer adalah platform AI Conversational Commerce dan Smart CRM yang mengubah WhatsApp bisnis Anda menjadi mesin penjualan otomatis 24 jam nonstop.";

  if (q.includes("qris") || q.includes("biaya") || q.includes("tarif")) {
    answer = "Biaya transaksi Dynamic QRIS di Klozer sangat hemat, hanya Rp 750 flat per transaksi sukses tanpa biaya bulanan tersembunyi. Pelanggan bisa langsung bayar dan scan QRIS di dalam chat WhatsApp.";
  } else if (q.includes("blokir") || q.includes("banned") || q.includes("aman")) {
    answer = "Sangat aman. Klozer menggunakan WhatsApp Cloud API resmi dari Meta dengan proteksi anti-banned dan jeda pengiriman cerdas.";
  } else if (q.includes("voice") || q.includes("suara") || q.includes("vn")) {
    answer = "AI Voice Note Klozer mengenali pesan suara bahasa Indonesia dengan berbagai logat daerah, lalu otomatis mentranskripsi dan memproses pesanan ke kasir.";
  } else if (q.includes("hp") || q.includes("ponsel") || q.includes("mobile") || q.includes("android")) {
    answer = "Tentu bisa. Dashboard dan live chat Klozer 100% responsif dan berjalan lancar di browser HP Android, iPhone, tablet, maupun laptop.";
  } else if (q.includes("struk") || q.includes("fraud") || q.includes("palsu")) {
    answer = "Fitur Fraud Detection Klozer memindai struk transfer dengan OCR dan Error Level Analysis untuk mendeteksi editan font m-banking, serta mencocokkan mutasi bank secara otomatis.";
  }

  return {
    success: true,
    answer: cleanChatFormatting(answer),
    modelUsed: "static_knowledge_base",
  };
}
