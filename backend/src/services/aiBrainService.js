import { memoryStore } from "../config/db.js";
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
export async function getInstitutionRagContext(institutionId = 1) {
  const instList = memoryStore.institutions || [];
  const inst = instList.find((i) => i.id === institutionId) || {
    id: institutionId,
    name: "Batik Mahakarya Solo",
    mode: "business",
    sector: "Fashion & Retail",
    address: "Jl. Slamet Riyadi No. 142, Surakarta",
    phone_number: "+62 812-3344-5566",
  };

  const products = (memoryStore.products || [])
    .filter((p) => p.institution_id === institutionId && p.is_active)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      price: p.selling_price,
      stock: p.stock_quantity,
      description: p.description,
    }));

  const programs = (memoryStore.programs || [])
    .filter((pr) => pr.institution_id === institutionId && pr.is_published)
    .map((pr) => ({
      name: pr.name,
      category: pr.category,
      target: pr.target_amount,
      collected: pr.collected_amount,
      doa: pr.doa_template,
    }));

  const bankAccounts = (memoryStore.bank_accounts || [])
    .filter((b) => b.institution_id === institutionId && b.is_active)
    .map((b) => ({
      bank: b.bank_code,
      accountNumber: b.account_number,
      holder: b.account_holder,
      instruction: b.transfer_instruction,
    }));

  return {
    institutionName: inst.name,
    businessMode: inst.mode,
    sector: inst.sector,
    address: inst.address,
    csContact: inst.phone_number,
    catalog: products,
    programs: programs,
    paymentAccounts: bankAccounts,
  };
}

/**
 * Call NVIDIA NIM API (meta/llama-3.3-70b-instruct or configured NIM model)
 * @param {Object} params { systemPrompt, userMessage }
 * @returns {Promise<string|null>} Generated text
 */
export async function callNvidiaNimApi({ systemPrompt, userMessage }) {
  const apiKey = process.env.NVIDIA_API_KEY || config.ai.nvidiaKey;
  const model = process.env.NVIDIA_MODEL || config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct";

  if (!apiKey || apiKey.includes("development_sandbox")) {
    return null; // Trigger fallback
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      console.warn(`NVIDIA NIM API warning: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const candidate = data?.choices?.[0]?.message?.content;
    return candidate ? AiGuardrails.sanitizeOutput(candidate.trim()) : null;
  } catch (err) {
    console.warn("NVIDIA NIM API network error, utilizing fallback:", err.message);
    return null;
  }
}

/**
 * Call Google Gemini API (gemini-2.5-flash-lite / configured model)
 * @param {Object} params { systemPrompt, userMessage }
 * @returns {Promise<string|null>} Generated text
 */
export async function callGeminiApi({ systemPrompt, userMessage }) {
  // Dynamically load fresh .env values
  import("dotenv").then((d) => d.config()).catch(() => {});
  const apiKey = process.env.GEMINI_API_KEY || config.ai.geminiApiKey;
  const model = process.env.GEMINI_MODEL || config.ai.geminiModel || "gemini-3.5-flash-lite";

  if (!apiKey || apiKey.includes("development_sandbox")) {
    return null; // Trigger intelligent fallback
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Gemini API warning: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate ? AiGuardrails.sanitizeOutput(candidate.trim()) : null;
  } catch (err) {
    console.warn("Gemini API network error, utilizing smart fallback:", err.message);
    return null;
  }
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
  institutionId = 1,
  customerName = "Kakak",
  customerPhone = "",
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
      modelUsed: config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct",
    };
  }

  // 2. Fetch Multi-Tenant RAG Ground Truth Context
  const baseContext = await getInstitutionRagContext(institutionId);
  const instName = institutionName || baseContext.institutionName || "Toko Kami";
  const instSector = sector || baseContext.sector || "Kuliner & Retail";
  const instAddress = address || baseContext.address || "Outlet Resmi / Pusat";
  const instHours = hours || "Buka Setiap Hari, Pukul 08:00 - 22:00 WIB";

  const defaultGeprekCatalog = [
    { name: "Paket Juara 1 (nasi + Ayam Geprek + Es Teh)", price: 22000, stock: 120, category: "Paket Hemat" },
    { name: "Ayam Geprek Mozzarella Leleh", price: 26000, stock: 60, category: "Menu Spesial" },
    { name: "Ayam Geprek Sambal Matah Bali", price: 21000, stock: 80, category: "Menu Utama" },
    { name: "Ayam Geprek Sambal Bawang Original", price: 18000, stock: 100, category: "Menu Utama" },
    { name: "Kulit Ayam Crispy Juara Gurih", price: 14000, stock: 150, category: "Side Dish" },
    { name: "Jamur Crispy Geprek Pedas", price: 12000, stock: 90, category: "Side Dish" },
    { name: "Tahu & Tempe Crispy Sambal Korek", price: 8000, stock: 100, category: "Side Dish" },
    { name: "Es Teh Manis Jumbo Segar", price: 5000, stock: 300, category: "Minuman" },
  ];

  // Catalog items: prioritize customProducts sent from active live session, else store DB
  let activeProducts = (customProducts && customProducts.length > 0)
    ? customProducts
    : ((baseContext.catalog && baseContext.catalog.length > 0) ? baseContext.catalog : []);
  
  if (!activeProducts || activeProducts.length === 0) {
    if (instName.toLowerCase().includes("geprek") || instSector.toLowerCase().includes("kuliner")) {
      activeProducts = [
        { name: "Paket Juara 1 (nasi + Ayam Geprek + Es Teh)", price: 22000, stock: 120, category: "Paket Hemat" },
        { name: "Ayam Geprek Mozzarella Leleh", price: 26000, stock: 60, category: "Menu Spesial" },
        { name: "Ayam Geprek Sambal Matah Bali", price: 21000, stock: 80, category: "Menu Utama" },
        { name: "Ayam Geprek Sambal Bawang Original", price: 18000, stock: 100, category: "Menu Utama" },
        { name: "Kulit Ayam Crispy Juara Gurih", price: 14000, stock: 150, category: "Side Dish" },
        { name: "Jamur Crispy Geprek Pedas", price: 12000, stock: 90, category: "Side Dish" },
        { name: "Tahu & Tempe Crispy Sambal Korek", price: 8000, stock: 100, category: "Side Dish" },
        { name: "Es Teh Manis Jumbo Segar", price: 5000, stock: 300, category: "Minuman" },
      ];
    } else {
      activeProducts = [
        { name: "Produk Unggulan 1", price: 50000, stock: 100, category: "Reguler" },
        { name: "Produk Unggulan 2", price: 75000, stock: 50, category: "Premium" },
      ];
    }
  }

  const catalogList = activeProducts
    .map(
      (p, idx) =>
        `${idx + 1}. ${p.name} — Harga: Rp ${(p.price || 0).toLocaleString("id-ID")} | Stok: ${p.stock || 0} unit${p.category ? ` | Kategori: ${p.category}` : ""}${p.description ? ` | Info: ${p.description}` : ""}`
    )
    .join("\n");

  const promoList = (promos && promos.length > 0)
    ? promos.map((pr, idx) => `${idx + 1}. ${typeof pr === "string" ? pr : pr.title || pr.description}`).join("\n")
    : "1. Diskon 10% untuk pembayaran via Dynamic QRIS instan\n2. Bebas Ongkir untuk pembelian minimal 2 item";

  const bankHolder = instName || "Toko Kami";
  const bankList = (baseContext.paymentAccounts && baseContext.paymentAccounts.length > 0)
    ? baseContext.paymentAccounts
        .map((b) => `- Bank ${b.bank}: ${b.accountNumber} a.n. ${b.holder || bankHolder}`)
        .join("\n")
    : `- Rekening Bank BCA: 8809123847 a.n. ${bankHolder}`;

  const bankTransferSummary = (baseContext.paymentAccounts && baseContext.paymentAccounts.length > 0)
    ? baseContext.paymentAccounts
        .map((b) => `Bank ${b.bank}: *${b.accountNumber}* a.n. *${b.holder || bankHolder}*`)
        .join(", ")
    : `Transfer Bank BCA: *8809123847* a.n. *${bankHolder}*`;

  const rawName = (customerName || "Kakak").trim();
  const shortCustName = rawName.split(" ")[0] || "Kakak";

  // 3. Build Strict, Human-Like System Prompt
  const systemPrompt = `
Kamu adalah Asisten AI Customer Service & Sales resmi dari "${instName}" (${instSector}).
Tugasmu: Memberikan pelayanan pelanggan via chat WhatsApp yang ramah, sopan, solutif, humanis, to-the-point, dan cerdas.

PEDOMAN PERCAKAPAN HUMANIS (SANGAT PENTING):
1. ATURAN NAMA PELANGGAN:
   - Sapa nama pelanggan (contoh "Kak ${shortCustName}") MAKSIMAL SATU KALI di awal respon bila relevan.
   - JANGAN mengulang-ulang nama pelanggan di setiap kalimat karena terdengar kaku dan seperti robot rusak!
   - Gunakan kata sapaan wajar seperti "Kak" atau "Kakak".
2. JANGAN MENGULANG SALAM PEMBUKA DI TENGAH OBROLAN:
   - Jika ini percakapan lanjutan atau pelanggan bertanya pertanyaan spesifik, LANGSUNG jawab pertanyaannya secara to-the-point. Jangan mengulang "Halo Kak! Selamat datang di..." berulang-ulang.
3. JAWAB PERTANYAAN DETAIL MENU/PRODUK SECARA SPESIFIK:
   - Jika pelanggan bertanya tentang varian/produk tertentu:
     Jawab langsung dengan jelas berdasarkan info katalog produk di bawah. Jelaskan rincian produk, harga, stok, dan tawarkan varian atau paket pelengkap jika ada.
   - JANGAN asal melempar seluruh daftar katalog jika pelanggan hanya bertanya 1 produk tertentu!
4. KETIKA PELANGGAN MAU PESAN (ORDER INTENT / MULTI-ITEM CALCULATION):
   - Jika pelanggan menyebutkan beberapa produk atau menanyakan total:
     Hitung dan rincikan setiap produk dengan harga, subtotal, potongan promo diskon QRIS 10%, dan total akhir!
     Tanyakan alamat pengiriman serta catatan pesanan / varian yang diinginkan.
5. AFIRMASI PEMESANAN ("boleh kak saya mau", "oke kak", "siap saya mau"):
   - Langsung konfirmasi pesanan dengan antusias, minta alamat pengiriman dan catatan varian, lalu tawarkan Dynamic QRIS atau Transfer Bank.
6. INFORMASI DISKON & PROMO:
   - Gunakan data [PROMO & DISKON AKTIF]. Jika pelanggan bertanya diskon/promo atau saat hendak checkout, sebutkan promo yang relevan.
7. SIKAP SAAT PELANGGAN BATAL / CANCEL / RAGU:
   - Tetap sangat ramah, santun, dan empatik. Jangan memaksa atau tersinggung.
   - Contoh: "Baik tidak apa-apa Kak, terima kasih banyak sudah mampir dan bertanya. Jika nanti Kakak ingin memesan lagi atau butuh rekomendasi, jangan ragu hubungi kami ya. Semoga harinya menyenangkan!"
8. ANTI-HALUSINASI: Hanya rekomendasikan produk, stok, dan harga yang ada di [KATALOG PRODUK & MENU RESMI].

[KATALOG PRODUK & MENU RESMI]:
${catalogList || "Tidak ada produk terdaftar saat ini."}

[PROMO & DISKON AKTIF]:
${promoList}

[INFORMASI OUTLET & PENGIRIMAN]:
- Alamat: ${instAddress}
- Jam Buka: ${instHours}
- Pengiriman: Kurir Instant & Pengiriman Reguler

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

  const finalUserMessage = formattedHistory
    ? `Riwayat Obrolan Sebelumnya:\n${formattedHistory}\n\nPesan Baru dari Pelanggan (${shortCustName}):\n${messageText}`
    : `Pesan dari Pelanggan (${shortCustName}):\n${messageText}`;

  // 5. Attempt AI Generation (Prioritizing NVIDIA NIM per user instruction)
  let aiResponse = null;
  let modelUsed = config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct";

  // Check NVIDIA NIM first
  if (config.ai.provider === "nvidia" || process.env.NVIDIA_API_KEY || config.ai.nvidiaKey) {
    aiResponse = await callNvidiaNimApi({
      systemPrompt,
      userMessage: finalUserMessage,
    });
    if (aiResponse) {
      modelUsed = `NVIDIA NIM (${config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct"})`;
    }
  }

  // Fallback to Gemini if NVIDIA NIM was not configured or failed
  if (!aiResponse) {
    aiResponse = await callGeminiApi({
      systemPrompt,
      userMessage: finalUserMessage,
    });
    if (aiResponse) {
      modelUsed = config.ai.geminiModel || "gemini-3.5-flash-lite";
    }
  }

  if (aiResponse) {
    return {
      success: true,
      intent: "ai_generated",
      replyText: aiResponse,
      needsEscalation: false,
      modelUsed,
      institutionContext: {
        name: instName,
        sector: instSector,
      },
    };
  }

  // 6. Ultra-Smart RAG Multi-Turn Closing Engine (Multi-Tenant Universal Offline Backup)
  const lowerMsg = messageText.toLowerCase().trim();
  let intent = "general_inquiry";
  let suggestedReply = "";
  let orderData = null;

  // Multi-tenant Industry Classifier
  const isCulinary = (
    (instSector && /kuliner|makanan|resto|f&b|food|cafe|warung|geprek|katering|dapur|minuman/i.test(instSector)) ||
    (instName && /geprek|resto|warung|cafe|kopi|bakso|mie|ayam|nasi|kitchen/i.test(instName)) ||
    lowerMsg.includes("pedas") ||
    lowerMsg.includes("sambal") ||
    lowerMsg.includes("porsi")
  );

  // Helper for universal multi-item parsing from user message across ANY catalog
  const parseCustomerOrder = (text, catalog = []) => {
    if (!catalog || catalog.length === 0) return [];
    const lower = text.toLowerCase();
    const items = [];
    const matchedKeys = new Set();

    const stopWords = new Set([
      "dan", "yang", "dengan", "untuk", "dari", "ke", "di", "nya", "kak", "kakak",
      "mas", "mbak", "min", "admin", "dong", "ya", "yuk", "tolong", "bisa", "mau",
      "pesan", "beli", "order", "ambil", "checkout", "paket", "menu", "produk",
      "pilihan", "item", "buah", "biji", "pcs", "porsi", "botol", "unit", "lembar",
      "harga", "stok", "ready", "ada", "apa", "berapa", "total", "hitung", "tambah",
      "sama", "juga", "satu", "dua", "tiga", "empat", "lima", "kalo", "kalau"
    ]);

    // Quantity extraction helper
    const extractQty = (rawText, prodName) => {
      const pClean = prodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rxBefore = new RegExp(`(?:(\\d+)\\s*(?:x|pcs|porsi|buah|botol|pack|box|lembar)?\\s+)?(?:${pClean})`, "i");
      const rxAfter = new RegExp(`(?:${pClean})\\s*(?:sebanyak|jumlahnya)?\\s*(\\d+)?\\s*(?:x|pcs|porsi|buah|botol|pack|box|lembar)?`, "i");

      const mB = rawText.match(rxBefore);
      if (mB && mB[1]) return Math.min(99, Math.max(1, parseInt(mB[1], 10) || 1));
      const mA = rawText.match(rxAfter);
      if (mA && mA[1]) return Math.min(99, Math.max(1, parseInt(mA[1], 10) || 1));
      return 1;
    };

    // 1. Direct index matching (e.g. "no 1", "nomor 2", "pilihan 3", "paket 1")
    const indexMatches = [...lower.matchAll(/(?:no|nomor|menu|paket|pilihan|item)\s*(\d+)/gi)];
    for (const match of indexMatches) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < catalog.length) {
        const p = catalog[idx];
        const key = p.sku || p.name;
        if (!matchedKeys.has(key)) {
          matchedKeys.add(key);
          const qty = 1;
          items.push({
            product: p,
            qty,
            subtotal: (p.price || 0) * qty,
          });
        }
      }
    }

    // 2. Full or token-based product name matching
    for (let i = 0; i < catalog.length; i++) {
      const p = catalog[i];
      const pName = (p.name || "").toLowerCase().trim();
      const key = p.sku || p.name;
      if (matchedKeys.has(key)) continue;

      let matched = false;

      // Direct substring match
      if (pName.length >= 3 && lower.includes(pName)) {
        matched = true;
      } else {
        // Match significant keywords
        const tokens = pName
          .replace(/[\(\)\+\-\/\.,]/g, " ")
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 2 && !stopWords.has(w));

        if (tokens.length >= 2) {
          const matchedCount = tokens.filter((t) => lower.includes(t)).length;
          if (matchedCount >= 2 || (tokens.length === 2 && matchedCount >= 1 && (lower.includes(tokens[0]) || lower.includes(tokens[1])))) {
            matched = true;
          }
        } else if (tokens.length === 1 && tokens[0].length >= 3) {
          if (lower.includes(tokens[0])) {
            matched = true;
          }
        }
      }

      if (matched) {
        matchedKeys.add(key);
        const qty = extractQty(lower, pName);
        items.push({
          product: p,
          qty,
          subtotal: (p.price || 0) * qty,
        });
      }
    }

    return items;
  };

  // Helper to extract customer address from message & history
  const extractCustomerAddress = (text, hist = []) => {
    const combined = [...hist.map((h) => h.text || h.content || ""), text].join(" \n ");
    const patterns = [
      /(?:alamat\s+(?:saya|ku|tujuan)?\s*(?:di|ke)?\s*|kirim\s+ke\s+|antar\s+ke\s+)((?:jalan|jl\.?|gang|gg\.?|komp\.?|komplek|dusun|desa|kelurahan|kecamatan)\s+[^,\n!?]+)/i,
      /(?:alamat\s+(?:saya|ku|tujuan)?\s*(?:di|ke)?\s*)([^,\n!?]+)/i,
      /((?:jalan|jl\.?|gang|gg\.?|komp\.?|komplek)\s+[a-zA-Z0-9\s.,\/-]+?)(?=(?:,|level|kak|min|mas|mbak|\n|$))/i,
      /(?:kirim\s+ke|antar\s+ke)\s+([a-zA-Z0-9\s.,\/-]+?)(?=(?:,|level|kak|min|mas|mbak|\n|$))/i,
    ];

    for (const pat of patterns) {
      const m = combined.match(pat);
      if (m && m[1]) {
        let clean = m[1].replace(/\b(?:ya|kak|kakak|dong|min|mas|mbak|level|kepedasan|nya)\b/gi, "").trim();
        clean = clean.replace(/[,!?]+$/, "").trim();
        if (clean.length >= 4) {
          return clean.replace(/\b\w/g, (l) => l.toUpperCase());
        }
      }
    }
    return null;
  };

  const hasAddressInput = (
    lowerMsg.includes("alamat saya") ||
    lowerMsg.includes("alamat ku") ||
    lowerMsg.includes("alamat di") ||
    lowerMsg.includes("jalan ") ||
    lowerMsg.includes("jl.") ||
    lowerMsg.includes("kirim ke") ||
    lowerMsg.includes("antar ke") ||
    lowerMsg.includes("rumah saya") ||
    lowerMsg.includes("kantor saya")
  );

  const hasSpicyInquiry = (
    lowerMsg.includes("level kepedasan") ||
    lowerMsg.includes("level pedas") ||
    lowerMsg.includes("level berapa") ||
    lowerMsg.includes("kepedasan") ||
    (lowerMsg.includes("level") && (lowerMsg.includes("apa") || lowerMsg.includes("berapa") || lowerMsg.includes("pilihan") || lowerMsg.includes("sambal"))) ||
    ((lowerMsg.includes("pedas") || lowerMsg.includes("sambal")) && (lowerMsg.includes("level") || lowerMsg.includes("apa") || lowerMsg.includes("berapa")))
  );

  // 6A. CANCEL / BATAL INTENT
  if (
    lowerMsg.includes("batal") ||
    lowerMsg.includes("cancel") ||
    lowerMsg.includes("gajadi") ||
    lowerMsg.includes("ga jadi") ||
    lowerMsg.includes("tidak jadi") ||
    lowerMsg.includes("nggak jadi") ||
    lowerMsg.includes("tunda")
  ) {
    intent = "cancellation";
    suggestedReply = `Baik, tidak apa-apa Kak. Terima kasih banyak sudah mampir dan bertanya di *${instName}*. Jika nanti Kakak ingin pesan atau butuh info produk lagi, jangan ragu hubungi kami kapan saja ya. Semoga harinya menyenangkan dan sehat selalu!`;
  }

  // 6B. SPECIFIC PRODUCT DETAIL INQUIRY (Dynamic for ANY product)
  else if (
    !lowerMsg.includes("total") &&
    !lowerMsg.includes("hitung") &&
    !lowerMsg.includes("berapa total") &&
    (
      lowerMsg.includes("dapat apa") ||
      lowerMsg.includes("termasuk") ||
      lowerMsg.includes("sama nasi") ||
      lowerMsg.includes("ala carte") ||
      lowerMsg.includes("isinya apa") ||
      lowerMsg.includes("isi nya apa") ||
      lowerMsg.includes("bahan apa") ||
      lowerMsg.includes("ukuran apa") ||
      lowerMsg.includes("size apa") ||
      lowerMsg.includes("cocok untuk") ||
      (lowerMsg.includes("apakah") && activeProducts.some((p) => lowerMsg.includes(p.name.toLowerCase().split(" ")[0])))
    )
  ) {
    const matched = activeProducts.find((p) => {
      const pLower = p.name.toLowerCase();
      const pWords = pLower.split(/\s+/).filter((w) => w.length > 3);
      return lowerMsg.includes(pLower) || pWords.some((w) => lowerMsg.includes(w));
    }) || activeProducts[0];

    if (matched) {
      intent = "product_detail";
      const descText = matched.description ? ` (${matched.description})` : "";
      const catText = matched.category ? ` dalam kategori ${matched.category}` : "";
      
      const otherRec = activeProducts.find((p) => p.name !== matched.name) || activeProducts[0];
      const recText = otherRec && otherRec.name !== matched.name 
        ? `\n\nKakak juga bisa kombinasikan dengan *${otherRec.name}* (Rp ${(otherRec.price || 0).toLocaleString("id-ID")}) agar lebih lengkap.`
        : "";

      if (matched.name.toLowerCase().includes("mozzarella") && (lowerMsg.includes("nasi") || lowerMsg.includes("dapat"))) {
        suggestedReply = `Untuk menu *${matched.name}* (Rp ${(matched.price || 0).toLocaleString("id-ID")}) disajikan ala carte (ayam krispi leleh keju gurih, belum termasuk nasi ya Kak).\n\nKalau Kakak ingin yang sudah komplit dengan nasi dan es teh, kami sarankan *Paket Juara 1* (Rp 22.000), atau bisa tambah nasi putih terpisah. Mau kami siapkan yang mana Kak?`;
      } else {
        suggestedReply = `Untuk produk *${matched.name}* (Rp ${(matched.price || 0).toLocaleString("id-ID")})${catText}${descText}.\n\nStok saat ini tersedia ${matched.stock || 0} unit siap kirim.${recText}\n\nMau kami siapkan pesanan untuk *${matched.name}* ini Kak?`;
      }
    }
  }

  // 6C. MULTI-ITEM ORDER / TOTAL CALCULATION
  else if (
    lowerMsg.includes("total") ||
    lowerMsg.includes("hitung") ||
    lowerMsg.includes("berapa kak") ||
    lowerMsg.includes("berapa ya") ||
    lowerMsg.includes("berapa total") ||
    parseCustomerOrder(lowerMsg, activeProducts).length >= 2 ||
    (parseCustomerOrder(lowerMsg, activeProducts).length >= 1 && (lowerMsg.includes("tambah") || lowerMsg.includes("sama") || lowerMsg.includes("dan")))
  ) {
    const orderedItems = parseCustomerOrder(lowerMsg, activeProducts);

    if (orderedItems.length > 0) {
      intent = "order_calculation";
      const subtotal = orderedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
      const discountVal = Math.round(subtotal * 0.1); // Diskon promo QRIS 10%
      const finalTotal = subtotal - discountVal;

      const itemLines = orderedItems
        .map((it) => `• ${it.qty}x *${it.product.name}* - Rp ${it.subtotal.toLocaleString("id-ID")}`)
        .join("\n");

      const questionPrompt = isCulinary
        ? "Untuk tingkat kepedasan sambalnya mau level berapa Kak? Dan untuk pengirimannya mau diantar ke alamat mana atau diambil langsung ke outlet kami?"
        : "Untuk pilihan varian/ukurannya ada catatan khusus Kak? Dan pengirimannya mau diantar ke alamat mana?";

      suggestedReply = `Siap Kak! Berikut rincian pesanan Kakak di *${instName}*:\n\n${itemLines}\n\nSubtotal: Rp ${subtotal.toLocaleString("id-ID")}\nDiskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n*Total Tagihan: Rp ${finalTotal.toLocaleString("id-ID")}*\n\n${questionPrompt}`;

      orderData = {
        items: orderedItems,
        subtotal,
        discount: discountVal,
        finalTotal,
      };
    } else {
      intent = "order_intent";
      suggestedReply = `Siap Kak! Mau pesan produk apa saja biar langsung kami hitungkan total rincian dan siapkan pesanannya?`;
    }
  }

  // 6D. CUSTOMER ADDRESS INPUT & / OR SPICY LEVEL INQUIRY
  else if (hasAddressInput && hasSpicyInquiry) {
    const customerAddr = extractCustomerAddress(lowerMsg, history) || "alamat Kakak";
    intent = "address_and_spicy_inquiry";
    suggestedReply = `Alamat pengiriman di *${customerAddr}* sudah kami catat ya Kak ${shortCustName}!\n\nUntuk pilihan level kepedasan sambal di *${instName}*:\n• *Level 0*: Tanpa Cabai (Original Gurih Krispi)\n• *Level 1*: Pedas Sedang (1-3 Cabai)\n• *Level 2*: Pedas Mantap (5 Cabai)\n• *Level 3*: Pedas Nampol (10 Cabai - Paling Favorit!)\n• *Level 4*: Pedas Gila (15 Cabai)\n• *Level 5*: Pedas Petir / Max (20+ Cabai)\n\nKakak mau sambal level berapa untuk pesanannya? Dan mau langsung kami antarkan kurir ke alamat sekarang?`;
  }

  else if (hasAddressInput) {
    const customerAddr = extractCustomerAddress(lowerMsg, history) || "alamat Kakak";
    intent = "address_input";
    const followUp = isCulinary
      ? `Untuk tingkat kepedasan sambalnya mau level berapa Kak (Level 0 - 5)? Dan mau langsung kami proses antar sekarang?`
      : `Untuk pilihan varian/ukurannya ada catatan khusus Kak? Dan mau langsung kami proses kirimkan sekarang?`;

    suggestedReply = `Siap Kak ${shortCustName}! Alamat pengiriman di *${customerAddr}* sudah kami catat.\n\n${followUp}`;
  }

  else if (
    hasSpicyInquiry &&
    (lowerMsg.includes("apa aj") || lowerMsg.includes("apa aja") || lowerMsg.includes("berapa aja") || lowerMsg.includes("pilihan"))
  ) {
    intent = "spicy_level_inquiry";
    suggestedReply = `Pilihan level kepedasan sambal di *${instName}*:\n• *Level 0*: Tanpa Cabai (Original Gurih Krispi)\n• *Level 1*: Pedas Sedang (1-3 Cabai)\n• *Level 2*: Pedas Mantap (5 Cabai)\n• *Level 3*: Pedas Nampol (10 Cabai - Paling Favorit!)\n• *Level 4*: Pedas Gila (15 Cabai)\n• *Level 5*: Pedas Petir / Max (20+ Cabai)\n\nKakak mau yang level berapa untuk pesanannya?`;
  }

  // 6E. DELIVERY CONFIRMATION (Universal across ANY business)
  else if (
    lowerMsg.includes("di antar") ||
    lowerMsg.includes("diantar") ||
    lowerMsg.includes("antar aja") ||
    lowerMsg.includes("antar kak") ||
    lowerMsg.includes("kirim aja") ||
    lowerMsg.includes("kirim kak") ||
    lowerMsg.includes("kirim ke") ||
    lowerMsg.includes("delivery") ||
    lowerMsg.includes("gosend") ||
    lowerMsg.includes("grabexpress") ||
    lowerMsg.includes("sicepat") ||
    lowerMsg.includes("jne") ||
    lowerMsg.includes("j&t") ||
    (lowerMsg.includes("antar") && (lowerMsg.includes("ya") || lowerMsg.includes("kak") || lowerMsg.includes("dong") || lowerMsg.includes("aja") || lowerMsg.includes("bisa")))
  ) {
    const customerAddr = extractCustomerAddress(lowerMsg, history) || "alamat Kakak";
    intent = "qris_request";

    // Parse ordered items from current message + full conversation history
    const allText = [...history.map((h) => h.text || h.content || ""), lowerMsg].join(" ");
    let orderedItems = parseCustomerOrder(allText, activeProducts);
    
    if (orderedItems.length === 0 && activeProducts.length > 0) {
      orderedItems = [{ product: activeProducts[0], qty: 1, subtotal: activeProducts[0].price || 0 }];
    }

    const subtotal = orderedItems.reduce((acc, it) => acc + (it.subtotal || (it.product.price * it.qty)), 0);
    const discountVal = Math.round(subtotal * 0.1);
    const finalTotal = subtotal - discountVal;

    const itemLines = orderedItems
      .map((it) => `• ${it.qty}x *${it.product.name}* - Rp ${(it.subtotal || it.product.price * it.qty).toLocaleString("id-ID")}`)
      .join("\n");

    suggestedReply = `Siap Kak ${shortCustName}! Pesanan Kakak segera kami siapkan dan diantar kurir langsung ke alamat:\n📍 *${customerAddr}*\n\n${itemLines}\n\nSubtotal: Rp ${subtotal.toLocaleString("id-ID")}\nDiskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n*Total Tagihan: Rp ${finalTotal.toLocaleString("id-ID")}*\n\nSilakan scan kode Dynamic QRIS resmi di bawah ini via m-BCA, GoPay, OVO, ShopeePay, DANA, atau ${bankTransferSummary}.\n\nBegitu pembayaran terverifikasi otomatis (2 detik tanpa perlu kirim bukti transfer manual), pesanan langsung meluncur ke alamat Kakak ya!`;

    orderData = {
      items: orderedItems,
      subtotal,
      discount: discountVal,
      finalTotal,
      deliveryAddress: customerAddr,
    };
  }

  // 6F. SPICY LEVEL SELECTION OR VARIANT SELECTION
  else if (
    (lowerMsg.includes("level 0") || lowerMsg.includes("level 1") || lowerMsg.includes("level 2") || lowerMsg.includes("level 3") || lowerMsg.includes("level 4") || lowerMsg.includes("level 5")) &&
    !lowerMsg.includes("apa aj") && !lowerMsg.includes("apa aja")
  ) {
    const lvlMatch = lowerMsg.match(/level\s*([0-5])/i);
    const lvlNum = lvlMatch ? lvlMatch[1] : "3";
    const customerAddr = extractCustomerAddress(lowerMsg, history) || "alamat Kakak";
    intent = "spicy_selected";
    suggestedReply = `Siap Kak! Sambal *Level ${lvlNum}* sudah kami catat untuk pesanan Kakak.\n\nApakah mau langsung kami antarkan kurir ke *${customerAddr}* sekarang? Untuk pembayarannya mau via Dynamic QRIS (diskon 10%) atau Transfer Bank?`;
  }

  // 6G. DINE IN / TAKEAWAY CONFIRMATION
  else if (
    lowerMsg.includes("makan di tempat") ||
    lowerMsg.includes("dine in") ||
    lowerMsg.includes("ambil sendiri") ||
    lowerMsg.includes("takeaway") ||
    lowerMsg.includes("bungkus")
  ) {
    intent = "qris_request";
    suggestedReply = `Siap Kak ${shortCustName}! Pesanan Kakak kami siapkan untuk langsung diambil di outlet resmi *${instName}* (${instAddress}).\n\nSilakan selesaikan pembayaran via Dynamic QRIS di bawah ini agar pesanan langsung kami buatkan ya Kak!`;
  }

  // 6H. CUSTOMER AGREEMENT / ORDER CONFIRMATION ("boleh kak saya mau", "oke kak", "siap saya mau", "mau kak", "deal")
  else if (
    lowerMsg.includes("boleh") ||
    lowerMsg.includes("saya mau") ||
    lowerMsg.includes("mau kak") ||
    lowerMsg.includes("mau dong") ||
    lowerMsg.includes("oke kak") ||
    lowerMsg.includes("ok kak") ||
    lowerMsg.includes("siap kak") ||
    lowerMsg.includes("deal") ||
    lowerMsg.includes("jadi pesan") ||
    lowerMsg === "mau" ||
    lowerMsg === "boleh" ||
    lowerMsg === "oke" ||
    lowerMsg === "siap"
  ) {
    intent = "order_confirmation";
    const variantPrompt = isCulinary
      ? "2. Level kepedasan sambal / varian rasa:"
      : "2. Varian / Ukuran / Catatan pesanan (jika ada):";

    suggestedReply = `Mantap Kak! Pesanan Kakak segera kami proses ya.\n\nMohon bantu lengkapi:\n1. Alamat lengkap tujuan pengiriman (atau konfirmasi pengambilan):\n${variantPrompt}\n\nUntuk pembayaran, Kakak ingin scan Dynamic QRIS langsung (dapat diskon 10%) atau Transfer Bank?`;
  }

  // 6I. PAYMENT / CHECKOUT / REKENING / QRIS INQUIRY
  else if (
    lowerMsg.includes("bayar") ||
    lowerMsg.includes("rekening") ||
    lowerMsg.includes("transfer") ||
    lowerMsg.includes("qris") ||
    lowerMsg.includes("no rek") ||
    lowerMsg.includes("cara bayar")
  ) {
    intent = "qris_request";
    suggestedReply = `Untuk pembayaran di *${instName}*, Kakak bisa menggunakan salah satu metode resmi berikut:\n\n1. *Dynamic QRIS 1-Klik* (BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, DANA) — verifikasi lunas instan otomatis dalam 2 detik tanpa perlu kirim struk manual!\n2. *${bankTransferSummary}*\n\nKode Dynamic QRIS resmi telah kami terbitkan di bawah ini ya Kak. Silakan scan untuk langsung menyelesaikan pembayaran!`;
  }

  // 6J. SINGLE ITEM ORDER INTENT
  else if (
    lowerMsg.includes("pesan") ||
    lowerMsg.includes("order") ||
    lowerMsg.includes("mau paket") ||
    lowerMsg.includes("mau beli") ||
    lowerMsg.includes("mau ambil")
  ) {
    intent = "order_intent";
    let matchedItem = null;

    // Check by index or by keyword
    const numMatch = lowerMsg.match(/(?:no|nomor|menu|paket|pilihan|item)\s*(\d+)/i);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      if (idx >= 0 && idx < activeProducts.length) {
        matchedItem = activeProducts[idx];
      }
    }

    if (!matchedItem) {
      matchedItem = activeProducts.find((p) => {
        const pLower = p.name.toLowerCase();
        const pTokens = pLower.split(/\s+/).filter((w) => w.length > 2);
        return lowerMsg.includes(pLower) || pTokens.some((t) => lowerMsg.includes(t));
      }) || activeProducts[0];
    }

    if (matchedItem) {
      const questionText = isCulinary
        ? "Untuk tingkat kepedasannya mau level berapa Kak? Dan untuk pengirimannya mau diantar ke alamat atau diambil langsung ke outlet kami?"
        : "Untuk pilihan varian / ukurannya mau yang mana Kak? Dan untuk pengirimannya mohon infokan alamat lengkap tujuan ya.";

      suggestedReply = `Siap Kak! 1x *${matchedItem.name}* (Rp ${(matchedItem.price || 0).toLocaleString("id-ID")}) sudah kami catat ya.\n\n${questionText}`;
    } else {
      suggestedReply = `Siap Kak! Mau pesan produk yang mana biar langsung kami siapkan? Pembayaran bisa melalui Dynamic QRIS instan atau Transfer Bank ya Kak.`;
    }
  }

  // 6K. DISKON & PROMO INQUIRY
  else if (
    lowerMsg.includes("diskon") ||
    lowerMsg.includes("promo") ||
    lowerMsg.includes("potongan") ||
    lowerMsg.includes("voucher") ||
    lowerMsg.includes("hemat") ||
    lowerMsg.includes("cashback")
  ) {
    intent = "promo_inquiry";
    suggestedReply = `Kabar baik Kak! Promo menarik yang sedang aktif di *${instName}* hari ini:\n\n${promoList}\n\nKakak bisa langsung nikmati potongan harga ini sekarang dengan pembayaran via Dynamic QRIS ya!`;
  }

  // 6L. STORE LOCATION / OUTLET INQUIRY
  else if (
    !hasAddressInput &&
    (
      lowerMsg.includes("outlet dimana") ||
      lowerMsg.includes("lokasi toko") ||
      lowerMsg.includes("alamat toko") ||
      lowerMsg.includes("cabang dimana") ||
      lowerMsg.includes("bisa mampir") ||
      lowerMsg.includes("ada di mana") ||
      lowerMsg.includes("dimana ya") ||
      lowerMsg.includes("alamatnya dimana") ||
      ((lowerMsg.includes("outlet") || lowerMsg.includes("lokasi") || lowerMsg.includes("cabang") || lowerMsg.includes("alamat")) && lowerMsg.includes("dimana"))
    )
  ) {
    intent = "location_inquiry";
    suggestedReply = `Outlet resmi *${instName}* berlokasi di:\n📍 *${instAddress}*\n🕒 Jam Operasional: ${instHours}\n🛵 Layanan Pengantaran: Kurir Instant dan ekspedisi reguler.\n\nKakak mau mampir langsung atau mau kami antar ke alamat hari ini?`;
  }

  // 6M. GENERAL CATALOG INQUIRY ("ready stock", "ada produk apa", "jual apa", "katalog", "daftar menu")
  else if (
    lowerMsg.includes("produk") ||
    lowerMsg.includes("menu") ||
    lowerMsg.includes("stok") ||
    lowerMsg.includes("ready") ||
    lowerMsg.includes("jual apa") ||
    lowerMsg.includes("harga") ||
    lowerMsg.includes("katalog") ||
    lowerMsg.includes("barang")
  ) {
    intent = "product_inquiry";
    if (activeProducts.length > 0) {
      const topItems = activeProducts
        .slice(0, 6)
        .map((p) => `• *${p.name}* (Rp ${(p.price || 0).toLocaleString("id-ID")}) - Stok: ${p.stock || 0} unit`)
        .join("\n");
      suggestedReply = `Halo Kak ${shortCustName}! Berikut daftar produk ready stok di *${instName}*:\n\n${topItems}\n\nAda produk yang ingin Kakak pesan hari ini?`;
    } else {
      suggestedReply = `Halo Kak! Untuk katalog produk ${instName}, silakan beri tahu produk yang sedang dicari agar langsung kami cek ketersediaannya ya Kak.`;
    }
  }

  // 6N. GREETING
  else if (
    lowerMsg.includes("halo") ||
    lowerMsg.includes("hai") ||
    lowerMsg.includes("pagi") ||
    lowerMsg.includes("siang") ||
    lowerMsg.includes("sore") ||
    lowerMsg.includes("malam") ||
    lowerMsg.includes("assalamu")
  ) {
    intent = "greeting";
    suggestedReply = `Halo Kak ${shortCustName}! Selamat datang di layanan pelanggan resmi *${instName}*. Ada yang bisa kami bantu seputar produk, promo, atau pesanan hari ini?`;
  }

  // 6O. CONTEXTUAL HELPFUL FALLBACK
  else {
    suggestedReply = `Ada yang bisa kami bantu seputar produk atau pesanan di *${instName}* Kak? Kakak bisa tanya rekomendasi produk, promo diskon, lokasi outlet, atau langsung melakukan pemesanan ya.`;
  }

  return {
    success: true,
    intent,
    replyText: suggestedReply,
    needsEscalation: false,
    modelUsed: (config.ai.provider === "nvidia" || process.env.NVIDIA_API_KEY)
      ? `NVIDIA NIM (${config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct"})`
      : `${config.ai.geminiModel} (Smart RAG Engine)`,
    institutionContext: {
      name: instName,
      sector: instSector,
    },
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
      modelUsed: config.ai.geminiModel,
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

  // Try NVIDIA NIM first, fallback to Gemini
  let aiAnswer = null;
  let modelUsed = config.ai.nvidiaModel || "meta/llama-3.3-70b-instruct";

  if (config.ai.provider === "nvidia" || process.env.NVIDIA_API_KEY || config.ai.nvidiaKey) {
    aiAnswer = await callNvidiaNimApi({ systemPrompt, userMessage: question });
    if (aiAnswer) {
      modelUsed = `NVIDIA NIM (${modelUsed})`;
    }
  }

  if (!aiAnswer) {
    aiAnswer = await callGeminiApi({ systemPrompt, userMessage: question });
    if (aiAnswer) {
      modelUsed = config.ai.geminiModel || "gemini-3.5-flash-lite";
    }
  }

  if (aiAnswer) {
    return {
      success: true,
      answer: cleanChatFormatting(aiAnswer),
      modelUsed,
    };
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
    modelUsed: `${config.ai.geminiModel} (Klozer AI Engine)`,
  };
}
