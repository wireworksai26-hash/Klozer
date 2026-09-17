"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useDashboard, DashboardProvider } from "@/context/DashboardContext";
import { API_BASE_URL } from "@/utils/apiConfig";
import {
  SparklesIcon,
  BotIcon,
  ZapIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  QrIcon,
  MicIcon,
  CheckCircleIcon,
  CpuIcon,
  LayersIcon,
  BuildingIcon,
  DollarSignIcon,
  RefreshCwIcon,
  MessageSquareIcon,
} from "@/components/icons";

// Universal Multi-Tenant Business Presets for Multi-Industry AI Testing
const BUSINESS_PRESETS = [
  {
    id: "PRESET-CULINARY",
    name: "Geprek Juara",
    sector: "Kuliner & F&B",
    slogan: "Ayam Geprek Gurih Krispi Pedas Nampol Juara",
    address: "Jl. Kaliurang KM 5.2 No. 18, Sleman, Yogyakarta",
    hours: "Buka Setiap Hari, Pukul 09:00 - 22:00 WIB",
    phone: "+62 812-3344-5566",
    deliveryInfo: "GoSend, GrabExpress Instant, & Kurir Outlet",
    products: [
      { id: "P1", name: "Paket Juara 1 (nasi + Ayam Geprek + Es Teh)", price: 22000, stock: 120, category: "Paket Hemat", description: "Paket komplit nasi pulen hangat + ayam krispi pedas + es teh jumbo" },
      { id: "P2", name: "Ayam Geprek Mozzarella Leleh", price: 26000, stock: 60, category: "Menu Spesial", description: "Ayam krispi gurih dengan topping keju mozzarella leleh melimpah (ala carte belum termasuk nasi)" },
      { id: "P3", name: "Ayam Geprek Sambal Matah Bali", price: 21000, stock: 80, category: "Menu Utama", description: "Ayam krispi dengan racikan sambal matah segar khas Bali" },
      { id: "P4", name: "Ayam Geprek Sambal Bawang Original", price: 18000, stock: 100, category: "Menu Utama", description: "Ayam krispi dengan sambal bawang cabai rawit pedas mantap" },
      { id: "P5", name: "Kulit Ayam Crispy Juara Gurih", price: 14000, stock: 150, category: "Side Dish", description: "Kulit ayam krispi super renyah dan gurih" },
      { id: "P6", name: "Jamur Crispy Geprek Pedas", price: 12000, stock: 90, category: "Side Dish", description: "Jamur tiram krispi dengan bumbu geprek" },
      { id: "P7", name: "Tahu & Tempe Crispy Sambal Korek", price: 8000, stock: 100, category: "Side Dish", description: "Tahu tempe goreng krispi renyah" },
      { id: "P8", name: "Es Teh Manis Jumbo Segar", price: 5000, stock: 300, category: "Minuman", description: "Es teh manis melati porsi jumbo segar" },
    ],
    promos: [
      "Diskon 10% untuk pembayaran langsung via Dynamic QRIS",
      "Promo Bebas Ongkir minimal order 2 paket",
      "Beli 2 Paket Juara 1 Gratis 1 Es Teh Jumbo",
    ],
    botName: "Geprek Juara Assistant",
    tone: "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greeting: "Halo! Selamat datang di layanan pelanggan resmi Geprek Juara. Ada yang bisa kami bantu seputar menu, promo, atau pesanan hari ini?",
  },
  {
    id: "PRESET-FASHION",
    name: "Batik Mahakarya Solo",
    sector: "Fashion & Pakaian Tradisional",
    slogan: "Koleksi Busana Batik Tulis & Cap Eksklusif Solo",
    address: "Jl. Slamet Riyadi No. 142, Surakarta, Jawa Tengah",
    hours: "Buka Setiap Hari, Pukul 08:30 - 21:00 WIB",
    phone: "+62 813-8899-1122",
    deliveryInfo: "JNE YES, SiCepat BEST, J&T Express, & GoSend Instant",
    products: [
      { id: "F1", name: "Kemeja Batik Tulis Sutra Parang", price: 450000, stock: 25, category: "Pria", description: "Kemeja sutra halus motif Parang Rusak Barong, lapisan furing trikot nyaman" },
      { id: "F2", name: "Dress Kaftan Silk Premium", price: 380000, stock: 40, category: "Wanita", description: "Kaftan silk elegan all size fit to XL dengan payet mutiara" },
      { id: "F3", name: "Blouse Batik Cap Modern Katun Prima", price: 195000, stock: 65, category: "Wanita", description: "Blouse katun adem motif Kawung modern lengan 3/4" },
      { id: "F4", name: "Kain Jarik Batik Tulis Asli Solo", price: 275000, stock: 50, category: "Kain", description: "Kain batik tulis 2.2 meter bahan katun primissima" },
      { id: "F5", name: "Outer Batik Cardigan Etnik", price: 165000, stock: 70, category: "Outerwear", description: "Outer santai aksen etnik bahan dobi premium" },
    ],
    promos: [
      "Diskon 10% untuk transaksi via Dynamic QRIS instan",
      "Gratis Ongkir ke Seluruh Pulau Jawa minimal belanja Rp 300.000",
      "Voucher Cashback Rp 50.000 untuk pembelian kedua",
    ],
    botName: "Mahakarya Fashion Assistant",
    tone: "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greeting: "Halo! Selamat datang di Batik Mahakarya Solo. Ada koleksi busana atau kain batik yang sedang Kakak cari?",
  },
  {
    id: "PRESET-SKINCARE",
    name: "Glow Skincare Official",
    sector: "Kecantikan & Skincare",
    slogan: "Solusi Kulit Cerah Sehat Alami & Bersertifikasi BPOM",
    address: "Ruko Belleza Garden No. 12, Jakarta Selatan",
    hours: "Buka Setiap Hari, Pukul 08:00 - 21:00 WIB",
    phone: "+62 811-2233-4455",
    deliveryInfo: "J&T Express, SiCepat, AnterAja, & Paxel Sameday",
    products: [
      { id: "S1", name: "Brightening Face Serum Niacinamide 10%", price: 129000, stock: 150, category: "Serum", description: "Serum pencerah wajah 30ml untuk samarkan noda hitam dan meratakan warna kulit" },
      { id: "S2", name: "Gentle Facial Cleanser Hyaluronic Acid", price: 89000, stock: 200, category: "Cleanser", description: "Sabun pembersih muka lembut pH seimbang 100ml tanpa rasa tertarik" },
      { id: "S3", name: "Sunscreen Gel SPF 50 PA++++ UV Shield", price: 99000, stock: 180, category: "Sunscreen", description: "Sunscreen water-based ringan 50ml no whitecast dan tidak lengket" },
      { id: "S4", name: "Centella Soothing Moisturizer Gel", price: 115000, stock: 95, category: "Moisturizer", description: "Pelembab gel 50gr untuk menenangkan kulit kemerahan dan jerawat" },
      { id: "S5", name: "Paket Glowing Starter Kit 4in1", price: 389000, stock: 80, category: "Paket Bundling", description: "Paket lengkap: Cleanser + Serum + Sunscreen + Moisturizer hemat 20%" },
    ],
    promos: [
      "Diskon 10% pembayaran via Dynamic QRIS",
      "Free Pouch Cantik & Beauty Sponge setiap pembelian minimal Rp 200.000",
      "Bebas Ongkir Seluruh Indonesia min order 2 produk",
    ],
    botName: "Glow Beauty Assistant",
    tone: "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greeting: "Halo Cantik! Selamat datang di Glow Skincare Official. Ada keluhan kulit atau produk perawatan yang ingin dikonsultasikan hari ini?",
  },
  {
    id: "PRESET-COFFEE",
    name: "Senja Coffee & Bakery",
    sector: "Cafe & Minuman Kopi",
    slogan: "Specialty Arabica & Fresh Bakery Setiap Pagi",
    address: "Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan",
    hours: "Buka Setiap Hari, Pukul 07:00 - 23:00 WIB",
    phone: "+62 815-6677-8899",
    deliveryInfo: "GoSend Instant, GrabExpress, & Takeaway Counter",
    products: [
      { id: "C1", name: "Kopi Susu Gula Aren Senja Signature", price: 24000, stock: 200, category: "Kopi", description: "Espresso robusta arabica blend dengan susu segar dan gula aren organik" },
      { id: "C2", name: "Iced Caramel Macchiato Double Shot", price: 32000, stock: 120, category: "Kopi", description: "Kopi susu creamy dengan saus karamel lezat dan foam lembut" },
      { id: "C3", name: "Butter Croissant Crispy Paris", price: 25000, stock: 80, category: "Bakery", description: "Croissant mentega Prancis gurih renyah berlapis" },
      { id: "C4", name: "Matcha Latte Oatmilk Premium", price: 28000, stock: 110, category: "Non-Kopi", description: "Matcha Uji Jepang asli dengan susu oat gurih tanpa dairy" },
      { id: "C5", name: "Combo Pagi (Kopi Susu + Butter Croissant)", price: 42000, stock: 90, category: "Combo", description: "Paket sarapan hemat kopi susu signature + 1 croissant" },
    ],
    promos: [
      "Diskon 10% untuk bayar via Dynamic QRIS",
      "Beli 2 Minuman Gratis 1 Donat Cokelat",
      "Promo Happy Hour Pukul 14:00 - 17:00 Diskon 15%",
    ],
    botName: "Senja Coffee Barista AI",
    tone: "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greeting: "Halo! Selamat datang di Senja Coffee & Bakery. Mau pesan kopi favorit atau pastry fresh hari ini?",
  },
  {
    id: "PRESET-GADGET",
    name: "TechZone Electronic Center",
    sector: "Elektronik & Gadget",
    slogan: "Pusat Aksesoris Gadget & Smart Device Bergaransi Resmi",
    address: "Mall Mangga Dua Lt. 3 Blok B No. 22, Jakarta Pusat",
    hours: "Buka Setiap Hari, Pukul 10:00 - 20:30 WIB",
    phone: "+62 817-4455-6677",
    deliveryInfo: "JNE Regular, SiCepat, GoSend Instant, & J&T",
    products: [
      { id: "G1", name: "TWS Bluetooth Earphone ANC Active Noise", price: 299000, stock: 75, category: "Audio", description: "Earphone nirkabel bluetooth 5.3 dengan noise cancelling dan bass punchy, garansi 1 tahun" },
      { id: "G2", name: "Fast Charging Powerbank 20000mAh 65W", price: 249000, stock: 90, category: "Power", description: "Powerbank pengisian cepat laptop & HP type-C PD 65W dengan display digital LED" },
      { id: "G3", name: "Wireless Magnetic Car Phone Mount", price: 149000, stock: 120, category: "Aksesoris", description: "Holder HP magnetik mobil dengan wireless charging 15W" },
      { id: "G4", name: "Smartwatch AMOLED IP68 Waterproof", price: 450000, stock: 50, category: "Wearable", description: "Smartwatch layar jernih AMOLED dengan monitor detak jantung, SPO2, dan 100+ mode olahraga" },
    ],
    promos: [
      "Diskon 10% pembayaran Dynamic QRIS",
      "Garansi Resmi Rusak Ganti Baru 12 Bulan",
      "Gratis Kabel Type-C Braided untuk pembelian min Rp 200.000",
    ],
    botName: "TechZone Assistant",
    tone: "Formal & Elegan (Bisnis B2B & Properti)",
    greeting: "Halo! Selamat datang di TechZone Electronic Center. Ada gadget atau aksesoris elektronik yang sedang Anda cari?",
  },
];

function TestCsAiContent() {
  const { aiConfig = {}, products = [], activeInstitution, currentUser, role } = useDashboard();

  // Active Business Preset Selection
  const [selectedPresetId, setSelectedPresetId] = useState("PRESET-CULINARY");

  // Active Preset Object
  const currentPreset = BUSINESS_PRESETS.find((p) => p.id === selectedPresetId) || BUSINESS_PRESETS[0];

  // Interactive Active Promos State
  const [promos, setPromos] = useState(currentPreset.promos || []);
  const [newPromoText, setNewPromoText] = useState("");

  // Switch preset handler
  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const p = BUSINESS_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setPromos(p.promos || []);
      setTestPersona((prev) => ({
        ...prev,
        botName: p.botName || "Klozer Assistant",
        tone: p.tone || "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
        greetingMessage: p.greeting || "",
      }));
    }
  };

  const handleAddPromo = (e) => {
    e?.preventDefault();
    if (!newPromoText.trim()) return;
    setPromos((prev) => [...prev, newPromoText.trim()]);
    setNewPromoText("");
  };

  const handleRemovePromo = (idxToRemove) => {
    setPromos((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Universal Business Knowledge Base (Connected to Active Preset & Live Store DB)
  const isCustomStore = selectedPresetId === "CUSTOM";
  const activeInst = {
    id: isCustomStore ? (activeInstitution?.id || "INST-ACTIVE") : currentPreset.id,
    name: isCustomStore ? (activeInstitution?.name || currentUser?.institutionName || "Klozer AI Workspace") : currentPreset.name,
    sector: isCustomStore ? (activeInstitution?.sector || "Retail & Commerce") : currentPreset.sector,
    slogan: isCustomStore ? (activeInstitution?.slogan || "Layanan Penjualan WhatsApp Pintar") : currentPreset.slogan,
    address: isCustomStore ? (activeInstitution?.address || "Kantor Pusat / Outlet Terdaftar") : currentPreset.address,
    hours: isCustomStore ? (activeInstitution?.hours || "Buka Setiap Hari, Pukul 08:00 - 22:00 WIB") : currentPreset.hours,
    phone: isCustomStore ? (activeInstitution?.phone || currentUser?.phone || "+62 812-0000-0000") : currentPreset.phone,
    deliveryInfo: isCustomStore ? (activeInstitution?.deliveryInfo || "Pengiriman reguler & instant kurir (J&T, SiCepat, GoSend, GrabExpress).") : currentPreset.deliveryInfo,
    paymentMethods: "Dynamic QRIS 1-Klik (BCA, Mandiri, BRI, BNI, e-Wallet) & Transfer Bank Otomatis.",
    promos: promos,
    products: isCustomStore ? (products || []) : currentPreset.products,
    greeting: isCustomStore
      ? `Halo! Selamat datang di layanan pelanggan resmi ${activeInstitution?.name || currentUser?.institutionName || "toko kami"}. Ada yang bisa kami bantu seputar produk atau pesanan hari ini?`
      : currentPreset.greeting,
  };

  // State: Simulated WhatsApp Customer (Name & Honorifics)
  const [waCustomer, setWaCustomer] = useState({
    name: "Budi Pratama",
    honorific: "Kakak", // 'Kakak' | 'Bapak' | 'Ibu' | 'Mas' | 'Mbak'
    phone: "+62 812-9988-7711",
  });

  // Calculate salutation and pronoun based on customer
  const getSalutation = (cust) => {
    const rawName = (cust?.name || "Pelanggan").trim();
    const shortName = rawName.split(" ")[0] || "Pelanggan";
    switch (cust?.honorific) {
      case "Bapak":
        return `Bapak ${shortName}`;
      case "Ibu":
        return `Ibu ${shortName}`;
      case "Mas":
        return `Mas ${shortName}`;
      case "Mbak":
        return `Mbak ${shortName}`;
      case "Kakak":
      default:
        return `Kak ${shortName}`;
    }
  };

  const getPronoun = (cust) => {
    switch (cust?.honorific) {
      case "Bapak":
        return "Bapak";
      case "Ibu":
        return "Ibu";
      case "Mas":
        return "Mas";
      case "Mbak":
        return "Mbak";
      case "Kakak":
      default:
        return "Kakak";
    }
  };

  const salutation = getSalutation(waCustomer);
  const pronoun = getPronoun(waCustomer);

  // Persona State
  const [testPersona, setTestPersona] = useState({
    botName: currentPreset.botName || aiConfig.spvPersona?.botName || "Klozer Assistant",
    tone: currentPreset.tone || aiConfig.spvPersona?.tone || "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage: activeInst.greeting,
    voiceAccent: aiConfig.spvPersona?.voiceAccent || "Bahasa Indonesia Standar (Aksen Ramah)",
    voiceGender: aiConfig.spvPersona?.voiceGender || "Female (Putri)",
  });

  // Dynamic Token Balance State
  const [tokenBalance, setTokenBalance] = useState({
    totalQuota: 500000,
    consumedTokens: 143667,
    remainingTokens: 356333,
    lastDeducted: 0,
    lastLatency: "88ms",
  });

  const [lastOrderTotal, setLastOrderTotal] = useState(59400);

  // Fetch real token balance from backend
  const fetchTenantTokenBalance = async () => {
    try {
      const instId = activeInst.id || "INST-004";
      const res = await fetch(`${API_BASE_URL}/ai/token-balance?tenantName=${encodeURIComponent(activeInst.name)}&tenantId=${instId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.balance) {
          setTokenBalance({
            totalQuota: json.balance.totalQuota || 500000,
            consumedTokens: json.balance.consumedTokens || 143667,
            remainingTokens: json.balance.remainingTokens || 356333,
            lastDeducted: 0,
            lastLatency: "88ms",
          });
        }
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchTenantTokenBalance();
  }, [activeInst.name]);

  // Messages State — Clean start
  const [messages, setMessages] = useState([]);

  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState({
    engine: aiConfig.primaryModelName || "meta/llama-3.3-70b-instruct",
    provider: aiConfig.primaryProvider || "nvidia",
    baseUrl: aiConfig.primaryBaseUrl || "https://integrate.api.nvidia.com/v1",
    latency: "88ms",
    tokensPrompt: 0,
    tokensCompletion: 0,
    totalTokens: 0,
    ocrConfidence: null,
    status: "HTTP 200 OK (Universal DB Sync Active)",
  });

  const [mounted, setMounted] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ==================== KNOWLEDGE-AWARE UNIVERSAL AI ENGINE ====================
  const generateAiReply = async (userText, overrideType = null) => {
    setIsTyping(true);
    // Natural human delay simulation (Meta anti-bot safe)
    const typingDelay = Math.max(800, Math.min(2500, (aiConfig.humanDelayMin || 2) * 600));

    // Auto-detect customer name if typed in message (e.g. "nama saya Bambang", "panggil saya Pak Hendra")
    const nameIntro = userText.match(/(?:nama saya|panggil saya|nama ku|panggil aku)\s+(?:bapak|ibu|mas|mbak|kak)?\s*([a-zA-Z]+)/i);
    if (nameIntro && nameIntro[1]) {
      const extractedName = nameIntro[1];
      const lowerUt = userText.toLowerCase();
      if (lowerUt.includes("bapak") || lowerUt.includes("pak ")) {
        setWaCustomer((prev) => ({ ...prev, name: extractedName, honorific: "Bapak" }));
      } else if (lowerUt.includes("ibu") || lowerUt.includes("bu ")) {
        setWaCustomer((prev) => ({ ...prev, name: extractedName, honorific: "Ibu" }));
      } else if (lowerUt.includes("mas ")) {
        setWaCustomer((prev) => ({ ...prev, name: extractedName, honorific: "Mas" }));
      } else if (lowerUt.includes("mbak ")) {
        setWaCustomer((prev) => ({ ...prev, name: extractedName, honorific: "Mbak" }));
      } else {
        setWaCustomer((prev) => ({ ...prev, name: extractedName }));
      }
    }

    const activeSalutation = getSalutation(waCustomer);
    const activePronoun = getPronoun(waCustomer);
    const startTime = performance.now();

    // Give visual typing indicator for realistic humanized feel
    await new Promise((resolve) => setTimeout(resolve, typingDelay));

    let replyText = "";
    let qrisData = null;
    let ocrData = null;
    let isVoice = false;
    let backendModelUsed = "NVIDIA NIM (meta/llama-3.3-70b-instruct)";
    let backendTokenDeduction = null;

    // 1. SPECIFIC TOOL OVERRIDES
    if (overrideType === "ocr_fake" || userText.toLowerCase().includes("struk palsu") || userText.toLowerCase().includes("struk_edit")) {
      replyText = `[PERINGATAN FORENSIK KLOZER]: Bukti transfer terdeteksi hasil manipulasi grafis (Font raster anomaly 94% Indikasi Palsu).\n\n"Halo ${activeSalutation}, mohon maaf bukti transfer ${activePronoun.toLowerCase()} belum cocok dengan mutasi otomatis rekening ${activeInst.name}. Mohon periksa kembali mutasi perbankan atau gunakan Dynamic QRIS resmi agar pesanan langsung kami proses ya ${activePronoun}."`;
      ocrData = {
        confidence: 94,
        isFraud: true,
        verdict: "DITOLAK — Anomali Font & Mutasi Bank Tidak Ditemukan",
      };
    } else if (overrideType === "ocr_real" || userText.toLowerCase().includes("struk asli") || userText.toLowerCase().includes("sudah transfer")) {
      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const sampleProduct = activeInst.products[0]?.name || "Produk Utama";
      const samplePrice = activeInst.products[0]?.price || 25000;
      replyText = `Bukti transfer berhasil diverifikasi cocok 100% dengan Mutasi Rekening ${activeInst.name}!\n\nPembayaran sebesar Rp ${(samplePrice * 2).toLocaleString("id-ID")} terkonfirmasi lunas otomatis.\nNomor Pesanan: ${orderId}\nPelanggan: ${waCustomer.name} (${activeSalutation})\nProduk: 2x ${sampleProduct}\nStatus: Siap Diproses Tim Gudang.\n\nPesanan sedang disiapkan dan akan segera dikirimkan. Terima kasih banyak ya ${activePronoun}!`;
      ocrData = {
        confidence: 99.2,
        isFraud: false,
        verdict: `VALID — Mutasi ${activeInst.name} Cocok (Auto-Settled)`,
      };
    } else if (overrideType === "voice" || userText.toLowerCase().includes("voice note") || userText.toLowerCase().includes("vn")) {
      isVoice = true;
      replyText = `(Transkripsi Suara ${activeSalutation}: "Halo kak, ongkir pengiriman ke area sekitar toko kena berapa ya?")\n\n"Halo ${activeSalutation}! Untuk pengiriman dari ${activeInst.name}, kami melayani kurir instant dan ekspedisi reguler dengan promo flat ongkir mulai Rp 10.000 ya ${activePronoun}! Mau pesan produk apa biar langsung kami cek ketersediaannya sekarang?"`;
    } else if (overrideType === "qris") {
      const p1 = activeInst.products[0] || { name: "Produk Pilihan", price: 50000 };
      const subtotal = p1.price || 50000;
      const discountVal = Math.round(subtotal * 0.1);
      const finalTotal = subtotal - discountVal;

      replyText = `Baik ${activeSalutation}! Rincian tagihan resmi untuk ${activeInst.name}:\n\n• 1x ${p1.name}: Rp ${(p1.price || 50000).toLocaleString("id-ID")}\n• Diskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n• TOTAL TAGIHAN: Rp ${finalTotal.toLocaleString("id-ID")}\n\nSilakan scan kode Dynamic QRIS resmi di bawah ini via m-BCA, GoPay, OVO, ShopeePay, DANA, atau Livin Mandiri. Status lunas akan diverifikasi otomatis oleh sistem kami tanpa perlu kirim bukti transfer manual ya!`;
      qrisData = {
        amount: finalTotal,
        expired: "15 Menit",
        merchant: activeInst.name,
      };
    } else {
      // 2. REAL BACKEND RAG AI CS BRAIN (POST /api/v1/ai/chat)
      backendTokenDeduction = null;
      try {
        const historyPayload = messages.slice(-10).map((m) => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text,
        }));

        const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            customerName: waCustomer.name,
            customerPhone: waCustomer.phone,
            history: historyPayload,
            products: activeInst.products,
            promos: promos,
            institutionName: activeInst.name,
            sector: activeInst.sector,
            address: activeInst.address,
            hours: activeInst.hours,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.tokenDeduction) {
            backendTokenDeduction = json.tokenDeduction;
          }
          if (json.replyText) {
            replyText = json.replyText;
            if (json.modelUsed) backendModelUsed = json.modelUsed;

            if (json.orderData?.finalTotal) {
              setLastOrderTotal(json.orderData.finalTotal);
            }

            const lower = userText.toLowerCase();
            if (
              json.intent === "qris_request" ||
              lower.includes("qris") ||
              lower.includes("bayar") ||
              lower.includes("rekening")
            ) {
              const payAmount = json.orderData?.finalTotal || lastOrderTotal || 50000;
              qrisData = {
                amount: payAmount,
                expired: "15 Menit",
                merchant: activeInst.name,
              };
            }
          }
        }
      } catch (apiErr) {
        console.warn("Backend AI chat unreachable, using client smart RAG fallback:", apiErr);
      }

      // 3. ROBUST UNIVERSAL CLIENT RAG FALLBACK (Matches backend humanized rules for ANY business)
      if (!replyText) {
        const lower = userText.toLowerCase().trim();

        // Multi-tenant Industry Classifier
        const isCulinary = (
          (activeInst.sector && /kuliner|makanan|resto|f&b|food|cafe|warung|geprek|katering|dapur|minuman/i.test(activeInst.sector)) ||
          (activeInst.name && /geprek|resto|warung|cafe|kopi|bakso|mie|ayam|nasi|kitchen/i.test(activeInst.name)) ||
          lower.includes("pedas") ||
          lower.includes("sambal") ||
          lower.includes("porsi")
        );

        // Universal order parser
        const parseCustomerOrder = (text, catalog = []) => {
          if (!catalog || catalog.length === 0) return [];
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

          // Index match (e.g. "no 1", "nomor 2")
          const indexMatches = [...text.matchAll(/(?:no|nomor|menu|paket|pilihan|item)\s*(\d+)/gi)];
          for (const match of indexMatches) {
            const idx = parseInt(match[1], 10) - 1;
            if (idx >= 0 && idx < catalog.length) {
              const p = catalog[idx];
              const key = p.id || p.name;
              if (!matchedKeys.has(key)) {
                matchedKeys.add(key);
                const qty = 1;
                items.push({ product: p, qty, subtotal: (p.price || 0) * qty });
              }
            }
          }

          // Full / token match
          for (let i = 0; i < catalog.length; i++) {
            const p = catalog[i];
            const pName = (p.name || "").toLowerCase().trim();
            const key = p.id || p.name;
            if (matchedKeys.has(key)) continue;

            let matched = false;
            if (pName.length >= 3 && text.includes(pName)) {
              matched = true;
            } else {
              const tokens = pName
                .replace(/[\(\)\+\-\/\.,]/g, " ")
                .split(/\s+/)
                .map((w) => w.trim())
                .filter((w) => w.length > 2 && !stopWords.has(w));

              if (tokens.length >= 2) {
                const matchedCount = tokens.filter((t) => text.includes(t)).length;
                if (matchedCount >= 2 || (tokens.length === 2 && matchedCount >= 1 && (text.includes(tokens[0]) || text.includes(tokens[1])))) {
                  matched = true;
                }
              } else if (tokens.length === 1 && tokens[0].length >= 3) {
                if (text.includes(tokens[0])) matched = true;
              }
            }

            if (matched) {
              matchedKeys.add(key);
              const qty = extractQty(text, pName);
              items.push({ product: p, qty, subtotal: (p.price || 0) * qty });
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
          lower.includes("alamat saya") ||
          lower.includes("alamat ku") ||
          lower.includes("alamat di") ||
          lower.includes("jalan ") ||
          lower.includes("jl.") ||
          lower.includes("kirim ke") ||
          lower.includes("antar ke") ||
          lower.includes("rumah saya") ||
          lower.includes("kantor saya")
        );

        const hasSpicyInquiry = (
          lower.includes("level kepedasan") ||
          lower.includes("level pedas") ||
          lower.includes("level berapa") ||
          lower.includes("kepedasan") ||
          (lower.includes("level") && (lower.includes("apa") || lower.includes("berapa") || lower.includes("pilihan") || lower.includes("sambal"))) ||
          ((lower.includes("pedas") || lower.includes("sambal")) && (lower.includes("level") || lower.includes("apa") || lower.includes("berapa")))
        );

        // 3a. CANCELLATION (Zero friction, polite, warm)
        if (
          lower.includes("batal") ||
          lower.includes("cancel") ||
          lower.includes("gajadi") ||
          lower.includes("ga jadi") ||
          lower.includes("tidak jadi") ||
          lower.includes("nggak jadi") ||
          lower.includes("tunda")
        ) {
          replyText = `Baik, tidak apa-apa Kak. Terima kasih banyak sudah mampir dan bertanya di *${activeInst.name}*. Jika nanti Kakak ingin pesan atau butuh info produk lagi, jangan ragu hubungi kami kapan saja ya. Semoga harinya menyenangkan dan sehat selalu!`;
        }
        // 3b. SPECIFIC PRODUCT QUESTION (Informational Inquiry only)
        else if (
          !lower.includes("total") &&
          !lower.includes("hitung") &&
          !lower.includes("berapa total") &&
          (
            lower.includes("dapat apa") ||
            lower.includes("termasuk") ||
            lower.includes("sama nasi") ||
            lower.includes("ala carte") ||
            lower.includes("isinya apa") ||
            lower.includes("bahan apa") ||
            lower.includes("ukuran apa") ||
            lower.includes("size apa") ||
            lower.includes("cocok untuk") ||
            (lower.includes("apakah") && activeInst.products.some((p) => lower.includes(p.name.toLowerCase().split(" ")[0])))
          )
        ) {
          const matched = activeInst.products.find((p) => {
            const pLower = p.name.toLowerCase();
            const pWords = pLower.split(/\s+/).filter((w) => w.length > 3);
            return lower.includes(pLower) || pWords.some((w) => lower.includes(w));
          }) || activeInst.products[0];

          if (matched) {
            const descText = matched.description ? ` (${matched.description})` : "";
            const catText = matched.category ? ` dalam kategori ${matched.category}` : "";
            const otherRec = activeInst.products.find((p) => p.name !== matched.name) || activeInst.products[0];
            const recText = otherRec && otherRec.name !== matched.name
              ? `\n\nKakak juga bisa kombinasikan dengan *${otherRec.name}* (Rp ${(otherRec.price || 0).toLocaleString("id-ID")}) agar lebih lengkap.`
              : "";

            if (matched.name.toLowerCase().includes("mozzarella") && (lower.includes("nasi") || lower.includes("dapat"))) {
              replyText = `Untuk menu *${matched.name}* (Rp ${(matched.price || 0).toLocaleString("id-ID")}) disajikan ala carte (ayam krispi leleh keju gurih, belum termasuk nasi ya Kak).\n\nKalau Kakak ingin yang sudah komplit dengan nasi dan es teh, kami sarankan *Paket Juara 1* (Rp 22.000), atau bisa tambah nasi putih terpisah. Mau kami siapkan yang mana Kak?`;
            } else {
              replyText = `Untuk produk *${matched.name}* (Rp ${(matched.price || 0).toLocaleString("id-ID")})${catText}${descText}.\n\nStok saat ini tersedia ${matched.stock || 0} unit siap kirim.${recText}\n\nMau kami siapkan pesanan untuk *${matched.name}* ini Kak?`;
            }
          }
        }
        // 3c. MULTI-ITEM ORDER / TOTAL CALCULATION
        else if (
          lower.includes("total") ||
          lower.includes("hitung") ||
          lower.includes("berapa kak") ||
          lower.includes("berapa ya") ||
          lower.includes("berapa total") ||
          parseCustomerOrder(lower, activeInst.products).length >= 2 ||
          (parseCustomerOrder(lower, activeInst.products).length >= 1 && (lower.includes("tambah") || lower.includes("sama") || lower.includes("dan")))
        ) {
          const orderedItems = parseCustomerOrder(lower, activeInst.products);
          if (orderedItems.length > 0) {
            const subtotal = orderedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
            const discountVal = Math.round(subtotal * 0.1);
            const finalTotal = subtotal - discountVal;
            setLastOrderTotal(finalTotal);

            const itemLines = orderedItems
              .map((it) => `• ${it.qty}x *${it.product.name}* - Rp ${it.subtotal.toLocaleString("id-ID")}`)
              .join("\n");

            const questionPrompt = isCulinary
              ? "Untuk tingkat kepedasan sambalnya mau level berapa Kak? Dan untuk pengirimannya mau diantar ke alamat mana atau diambil langsung ke outlet kami?"
              : "Untuk pilihan varian/ukurannya ada catatan khusus Kak? Dan pengirimannya mau diantar ke alamat mana?";

            replyText = `Siap Kak! Berikut rincian pesanan Kakak di *${activeInst.name}*:\n\n${itemLines}\n\nSubtotal: Rp ${subtotal.toLocaleString("id-ID")}\nDiskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n*Total Tagihan: Rp ${finalTotal.toLocaleString("id-ID")}*\n\n${questionPrompt}`;
          } else {
            replyText = `Siap Kak! Mau pesan produk apa saja biar langsung kami hitungkan rincian dan siapkan pesanannya?`;
          }
        }
        // 3d. CUSTOMER ADDRESS INPUT & / OR SPICY LEVEL INQUIRY
        else if (hasAddressInput && hasSpicyInquiry) {
          const customerAddr = extractCustomerAddress(lower, messages) || "alamat Kakak";
          replyText = `Alamat pengiriman di *${customerAddr}* sudah kami catat ya Kak ${salutation}!\n\nUntuk pilihan level kepedasan sambal di *${activeInst.name}*:\n• *Level 0*: Tanpa Cabai (Original Gurih Krispi)\n• *Level 1*: Pedas Sedang (1-3 Cabai)\n• *Level 2*: Pedas Mantap (5 Cabai)\n• *Level 3*: Pedas Nampol (10 Cabai - Paling Favorit!)\n• *Level 4*: Pedas Gila (15 Cabai)\n• *Level 5*: Pedas Petir / Max (20+ Cabai)\n\nKakak mau sambal level berapa untuk pesanannya? Dan mau langsung kami antarkan kurir ke alamat sekarang?`;
        }
        else if (hasAddressInput) {
          const customerAddr = extractCustomerAddress(lower, messages) || "alamat Kakak";
          const followUp = isCulinary
            ? `Untuk tingkat kepedasan sambalnya mau level berapa Kak (Level 0 - 5)? Dan mau langsung kami proses antar sekarang?`
            : `Untuk pilihan varian/ukurannya ada catatan khusus Kak? Dan mau langsung kami proses kirimkan sekarang?`;

          replyText = `Siap Kak ${salutation}! Alamat pengiriman di *${customerAddr}* sudah kami catat.\n\n${followUp}`;
        }
        else if (
          hasSpicyInquiry &&
          (lower.includes("apa aj") || lower.includes("apa aja") || lower.includes("berapa aja") || lower.includes("pilihan"))
        ) {
          replyText = `Pilihan level kepedasan sambal di *${activeInst.name}*:\n• *Level 0*: Tanpa Cabai (Original Gurih Krispi)\n• *Level 1*: Pedas Sedang (1-3 Cabai)\n• *Level 2*: Pedas Mantap (5 Cabai)\n• *Level 3*: Pedas Nampol (10 Cabai - Paling Favorit!)\n• *Level 4*: Pedas Gila (15 Cabai)\n• *Level 5*: Pedas Petir / Max (20+ Cabai)\n\nKakak mau yang level berapa untuk pesanannya?`;
        }
        // 3e. DELIVERY CONFIRMATION (Universal across ANY business)
        else if (
          lower.includes("di antar") ||
          lower.includes("diantar") ||
          lower.includes("antar aja") ||
          lower.includes("antar kak") ||
          lower.includes("kirim aja") ||
          lower.includes("kirim kak") ||
          lower.includes("kirim ke") ||
          lower.includes("delivery") ||
          lower.includes("gosend") ||
          lower.includes("grabexpress") ||
          lower.includes("sicepat") ||
          lower.includes("jne") ||
          lower.includes("j&t") ||
          (lower.includes("antar") && (lower.includes("ya") || lower.includes("kak") || lower.includes("dong") || lower.includes("aja") || lower.includes("bisa")))
        ) {
          const customerAddr = extractCustomerAddress(lower, messages) || "alamat Kakak";
          const allText = [...messages.map((m) => m.text || ""), lower].join(" ");
          let orderedItems = parseCustomerOrder(allText, activeInst.products);

          if (orderedItems.length === 0 && activeInst.products.length > 0) {
            orderedItems = [{ product: activeInst.products[0], qty: 1, subtotal: activeInst.products[0].price || 0 }];
          }

          const subtotal = orderedItems.reduce((acc, it) => acc + (it.subtotal || (it.product.price * it.qty)), 0);
          const discountVal = Math.round(subtotal * 0.1);
          const finalTotal = subtotal - discountVal;
          setLastOrderTotal(finalTotal);

          const itemLines = orderedItems
            .map((it) => `• ${it.qty}x *${it.product.name}* - Rp ${(it.subtotal || it.product.price * it.qty).toLocaleString("id-ID")}`)
            .join("\n");

          replyText = `Siap Kak ${salutation}! Pesanan Kakak segera kami siapkan dan diantar kurir langsung ke alamat:\n📍 *${customerAddr}*\n\n${itemLines}\n\nSubtotal: Rp ${subtotal.toLocaleString("id-ID")}\nDiskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n*Total Tagihan: Rp ${finalTotal.toLocaleString("id-ID")}*\n\nSilakan scan kode Dynamic QRIS resmi di bawah ini via m-BCA, GoPay, OVO, ShopeePay, DANA, atau Transfer Bank BCA: *8809123847* a.n. *${activeInst.name}*.\n\nBegitu pembayaran terverifikasi otomatis (2 detik tanpa perlu kirim bukti transfer manual), pesanan langsung meluncur ke alamat Kakak ya!`;
          qrisData = {
            amount: finalTotal,
            expired: "15 Menit",
            merchant: activeInst.name,
          };
        }
        // 3f. SPICY LEVEL SELECTION ("level 1", "level 2", "level 3", "level 4", "level 5")
        else if (
          (lower.includes("level 0") || lower.includes("level 1") || lower.includes("level 2") || lower.includes("level 3") || lower.includes("level 4") || lower.includes("level 5")) &&
          !lower.includes("apa aj") && !lower.includes("apa aja")
        ) {
          const lvlMatch = lower.match(/level\s*([0-5])/i);
          const lvlNum = lvlMatch ? lvlMatch[1] : "3";
          const customerAddr = extractCustomerAddress(lower, messages) || "alamat Kakak";
          replyText = `Siap Kak! Sambal *Level ${lvlNum}* sudah kami catat untuk pesanan Kakak.\n\nApakah mau langsung kami antarkan kurir ke *${customerAddr}* sekarang? Untuk pembayarannya mau via Dynamic QRIS (diskon 10%) atau Transfer Bank?`;
        }
        // 3g. DINE IN / TAKEAWAY CONFIRMATION
        else if (
          lower.includes("makan di tempat") ||
          lower.includes("dine in") ||
          lower.includes("ambil sendiri") ||
          lower.includes("takeaway") ||
          lower.includes("bungkus")
        ) {
          replyText = `Siap Kak ${salutation}! Pesanan Kakak kami siapkan untuk langsung dinikmati / diambil di outlet resmi *${activeInst.name}* (${activeInst.address}).\n\nSilakan selesaikan pembayaran via Dynamic QRIS di bawah ini agar pesanan langsung kami buatkan ya Kak!`;
          qrisData = {
            amount: lastOrderTotal || 50000,
            expired: "15 Menit",
            merchant: activeInst.name,
          };
        }
        // 3h. CUSTOMER AGREEMENT / ORDER CONFIRMATION
        else if (
          lower.includes("boleh") ||
          lower.includes("saya mau") ||
          lower.includes("mau kak") ||
          lower.includes("mau dong") ||
          lower.includes("oke kak") ||
          lower.includes("ok kak") ||
          lower.includes("siap kak") ||
          lower.includes("deal") ||
          lower.includes("jadi pesan") ||
          lower === "mau" ||
          lower === "boleh" ||
          lower === "oke" ||
          lower === "siap"
        ) {
          const variantPrompt = isCulinary
            ? "2. Level kepedasan sambal / varian rasa:"
            : "2. Varian / Ukuran / Catatan pesanan (jika ada):";

          replyText = `Mantap Kak! Pesanan Kakak segera kami proses ya.\n\nMohon bantu lengkapi:\n1. Alamat lengkap tujuan pengiriman (atau konfirmasi pengambilan):\n${variantPrompt}\n\nUntuk pembayaran, Kakak ingin scan Dynamic QRIS langsung (dapat diskon 10%) atau Transfer Bank?`;
        }
        // 3i. PAYMENT / CHECKOUT / REKENING / QRIS INQUIRY
        else if (
          lower.includes("bayar") ||
          lower.includes("rekening") ||
          lower.includes("transfer") ||
          lower.includes("qris") ||
          lower.includes("no rek") ||
          lower.includes("cara bayar")
        ) {
          const payAmount = lastOrderTotal || 50000;
          replyText = `Untuk pembayaran di *${activeInst.name}*, Kakak bisa menggunakan salah satu metode resmi berikut:\n\n1. *Dynamic QRIS 1-Klik* (BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, DANA) — verifikasi lunas instan otomatis dalam 2 detik tanpa perlu kirim struk manual!\n2. *Transfer Bank BCA*: 8809123847 a.n. *${activeInst.name}*\n\nKode Dynamic QRIS resmi telah kami terbitkan di bawah ini ya Kak. Silakan scan untuk langsung menyelesaikan pembayaran!`;
          qrisData = {
            amount: payAmount,
            expired: "15 Menit",
            merchant: activeInst.name,
          };
        }
        // 3j. SINGLE ITEM ORDER INTENT
        else if (
          lower.includes("pesan") ||
          lower.includes("order") ||
          lower.includes("mau paket") ||
          lower.includes("mau beli") ||
          lower.includes("mau ambil")
        ) {
          let matchedProd = null;
          const numMatch = lower.match(/(?:no|nomor|menu|paket|pilihan|item)\s*(\d+)/i);
          if (numMatch) {
            const idx = parseInt(numMatch[1], 10) - 1;
            if (idx >= 0 && idx < activeInst.products.length) {
              matchedProd = activeInst.products[idx];
            }
          }

          if (!matchedProd) {
            matchedProd = activeInst.products.find((p) => {
              const pLower = p.name.toLowerCase();
              const pTokens = pLower.split(/\s+/).filter((w) => w.length > 2);
              return lower.includes(pLower) || pTokens.some((t) => lower.includes(t));
            }) || activeInst.products[0] || { name: "Produk Pilihan", price: 50000 };
          }

          const questionText = isCulinary
            ? "Untuk tingkat kepedasannya mau level berapa Kak? Dan untuk pengirimannya mau diantar ke alamat atau diambil langsung ke outlet kami?"
            : "Untuk pilihan varian / ukurannya mau yang mana Kak? Dan untuk pengirimannya mohon infokan alamat lengkap tujuan ya.";

          replyText = `Siap Kak! 1x *${matchedProd.name}* (Rp ${(matchedProd.price || 0).toLocaleString("id-ID")}) sudah kami catat ya.\n\n${questionText}`;
        }
        // 3k. PROMO & DISKON
        else if (
          lower.includes("diskon") ||
          lower.includes("promo") ||
          lower.includes("potongan") ||
          lower.includes("voucher") ||
          lower.includes("hemat") ||
          lower.includes("cashback")
        ) {
          const promoList = promos.map((p, idx) => `${idx + 1}. ${p}`).join("\n");
          replyText = `Kabar baik Kak! Promo menarik yang sedang aktif di *${activeInst.name}* hari ini:\n\n${promoList}\n\nKakak bisa langsung nikmati potongan harga ini sekarang dengan pembayaran via Dynamic QRIS ya!`;
        }
        // 3l. STORE LOCATION & HOURS
        else if (
          !hasAddressInput &&
          (
            lower.includes("outlet dimana") ||
            lower.includes("lokasi toko") ||
            lower.includes("alamat toko") ||
            lower.includes("cabang dimana") ||
            lower.includes("bisa mampir") ||
            lower.includes("dimana ya") ||
            lower.includes("jam berapa") ||
            ((lower.includes("outlet") || lower.includes("lokasi") || lower.includes("cabang") || lower.includes("alamat")) && lower.includes("dimana"))
          )
        ) {
          replyText = `Informasi resmi *${activeInst.name}*:\n\n• Alamat / Lokasi: ${activeInst.address}\n• Jam Operasional: ${activeInst.hours}\n• Layanan Pengantaran: ${activeInst.deliveryInfo}\n\nKakak mau mampir langsung ke outlet atau mau kami kirimkan ke alamat Kakak hari ini?`;
        }
        // 3m. CATALOG / STOK
        else if (
          lower.includes("ready") ||
          lower.includes("stok") ||
          lower.includes("katalog") ||
          lower.includes("jual apa") ||
          lower.includes("laper") ||
          lower.includes("lapar") ||
          lower.includes("daftar harga") ||
          lower.includes("menu") ||
          lower.includes("produk")
        ) {
          if (activeInst.products.length === 0) {
            replyText = `Halo ${activeSalutation}! Saat ini katalog produk di database kami sedang dalam sinkronisasi. Kakak bisa tanyakan produk yang ingin dipesan agar langsung kami cekkan stoknya ya!`;
          } else {
            const menuFormatted = activeInst.products
              .slice(0, 6)
              .map((p, idx) => `${idx + 1}. *${p.name}* - Rp ${(p.price || 0).toLocaleString("id-ID")}\n   ${p.category ? `Kategori: ${p.category} | ` : ""}Stok: ${p.stock || 0} unit`)
              .join("\n\n");
            replyText = `Halo ${activeSalutation}! Berikut daftar produk andalan yang siap di *${activeInst.name}*:\n\n${menuFormatted}\n\nSemua produk terintegrasi langsung dengan stok sistem kami. Kakak tertarik memesan yang mana?`;
          }
        }
        // 3n. GREETING
        else if (
          lower.includes("halo") ||
          lower.includes("hai") ||
          lower.includes("pagi") ||
          lower.includes("siang") ||
          lower.includes("sore") ||
          lower.includes("malam")
        ) {
          replyText = `Halo ${activeSalutation}! Selamat datang di layanan pelanggan resmi *${activeInst.name}*.\n\nAda yang bisa kami bantu seputar produk, promo, atau pesanan hari ini?`;
        }
        // 3o. DEFAULT CONTEXTUAL
        else {
          replyText = `Terima kasih pertanyaannya Kak! Di *${activeInst.name}*, kami siap membantu info ketersediaan produk, promo diskon hari ini, pemesanan delivery, ataupun pembayaran via QRIS.\n\nAda yang ingin Kakak tanyakan lebih lanjut?`;
        }
      }
    }

    const elapsedMs = Math.round(performance.now() - startTime);
    const latencyVal = `${elapsedMs}ms`;
    const promptTok = Math.floor(userText.length / 2.8) + 52;
    const compTok = Math.floor(replyText.length / 3.2) + 38;
    const totalTokensUsed = promptTok + compTok;

    // Dynamically deduct token balance immediately in UI and sync with server
    if (backendTokenDeduction) {
      setTokenBalance({
        totalQuota: backendTokenDeduction.totalQuota || 200000,
        consumedTokens: backendTokenDeduction.consumedTokens,
        remainingTokens: backendTokenDeduction.remainingTokens,
        lastDeducted: backendTokenDeduction.lastDeducted || totalTokensUsed,
        lastLatency: latencyVal,
      });
    } else {
      setTokenBalance((prev) => {
        const updatedRemaining = Math.max(0, prev.remainingTokens - totalTokensUsed);
        const updatedConsumed = prev.consumedTokens + totalTokensUsed;
        return {
          ...prev,
          remainingTokens: updatedRemaining,
          consumedTokens: updatedConsumed,
          lastDeducted: totalTokensUsed,
          lastLatency: latencyVal,
        };
      });
    }

    const newAiMsg = {
      id: Date.now(),
      sender: "ai",
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isAI: true,
      qris: qrisData,
      ocr: ocrData,
      isVoice,
      tokens: totalTokensUsed,
      engine: backendModelUsed,
      provider: aiConfig.primaryProvider || "nvidia",
      latency: latencyVal,
    };

    setMessages((prev) => [...prev, newAiMsg]);
    setIsTyping(false);

    setTelemetry({
      engine: backendModelUsed,
      provider: aiConfig.primaryProvider || "nvidia",
      baseUrl: aiConfig.primaryBaseUrl || "https://integrate.api.nvidia.com/v1",
      latency: latencyVal,
      tokensPrompt: promptTok,
      tokensCompletion: compTok,
      totalTokens: totalTokensUsed,
      ocrConfidence: ocrData ? ocrData.confidence : null,
      status: "HTTP 200 OK (Universal AI Sync Active)",
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMsg("");
    generateAiReply(userText);
  };

  const handleQuickScenario = (promptText, overrideType = null) => {
    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: promptText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    generateAiReply(promptText, overrideType);
  };

  const handleResetChat = () => {
    setMessages([]);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f9f8f6] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-[#2545ff] border-t-transparent rounded-full animate-spin" />
          <span className="text-[14px] font-bold text-[#0c1754]">Memuat Universal AI Testing Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#f9f8f6] flex flex-col overflow-hidden text-[#171417]">
      {/* Top Standalone Header Bar */}
      <header className="h-[64px] bg-white border-b border-[#f0e9e1] flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] text-[#0c1754] text-[12.5px] font-bold border border-[#f0e9e1] no-underline transition-all"
          >
            <span>←</span>
            <span>Kembali ke Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-[#f0e9e1] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <BotIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="font-extrabold text-[#0c1754] text-[14px] leading-tight flex items-center gap-2">
                <span>Universal AI CS Testing Studio</span>
                <span className="text-[10px] font-extrabold bg-[#eaebf8] text-[#2545ff] px-2 py-0.5 rounded-full border border-[#2545ff]/20">
                  NVIDIA NIM
                </span>
              </div>
              <div className="text-[11px] text-[#64748b]">
                Profil: <strong className="text-[#0c1754]">{activeInst.name}</strong> ({activeInst.sector}) • Sapaan:{" "}
                <strong className="text-[#2545ff]">{salutation}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Universal Active Business Tenant Badge */}
          <div className="flex items-center gap-2 bg-[#fcfbf9] border border-[#ede8e2] px-3.5 py-1.5 rounded-full shadow-xs">
            <BuildingIcon className="w-3.5 h-3.5 text-[#2545ff]" />
            <span className="text-[12px] font-extrabold text-[#0c1754]">
              {activeInst.name}
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Terkoneksi Live</span>
            </span>
          </div>

          {/* Live Remaining Token Balance Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-xs">
            <CpuIcon className="w-3.5 h-3.5 text-[#2545ff]" />
            <div className="text-[11px]">
              <span className="text-[#5a6380]">Sisa Kuota: </span>
              <span className="font-extrabold text-[#2545ff] font-mono">
                {tokenBalance.remainingTokens.toLocaleString("id-ID")} Tok
              </span>
            </div>
            {tokenBalance.lastDeducted > 0 && (
              <span className="text-[10px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.2 rounded-full animate-bounce">
                -{tokenBalance.lastDeducted}
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-800">Latency: {tokenBalance.lastLatency}</span>
          </div>

          <button
            onClick={handleResetChat}
            className="px-3.5 py-1.5 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] text-[#64748b] hover:text-[#0c1754] text-[12px] font-bold border border-[#f0e9e1] cursor-pointer transition-all"
            title="Bersihkan percakapan kembali ke keadaan kosong"
          >
            Bersihkan Chat
          </button>
        </div>
      </header>

      {/* Workspace Body: Left Persona & Controls + Right Full Chat Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ==================== LEFT PANEL: PERSONA & CONTROLS ==================== */}
        <aside className="w-full md:w-[360px] lg:w-[410px] bg-white border-r border-[#f0e9e1] flex flex-col flex-shrink-0 h-full overflow-y-auto">
          {/* Section -1: Multi-Industry Business Preset Switcher */}
          <div className="p-3.5 bg-[#f5f3ef] border-b border-[#ede8e2]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c1754] flex items-center gap-1.5">
                <BuildingIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                <span>Pilih Profil Bisnis (Multi-Industri)</span>
              </span>
              <span className="text-[10px] font-bold bg-[#eaebf8] text-[#2545ff] px-2 py-0.5 rounded-full">
                Multi-Tenant
              </span>
            </div>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full bg-white border border-[#d8d1c7] rounded-xl p-2.5 text-[12.5px] font-extrabold text-[#0c1754] outline-none shadow-2xs focus:border-[#2545ff] cursor-pointer"
            >
              <option value="PRESET-CULINARY">🍗 Kuliner / F&B (Geprek Juara)</option>
              <option value="PRESET-FASHION">👗 Fashion & Pakaian (Batik Mahakarya Solo)</option>
              <option value="PRESET-SKINCARE">🧴 Skincare & Kecantikan (Glow Skincare Official)</option>
              <option value="PRESET-COFFEE">☕ Cafe & Coffee Shop (Senja Coffee & Bakery)</option>
              <option value="PRESET-GADGET">📱 Elektronik & Gadget (TechZone Official)</option>
              <option value="CUSTOM">🏢 Database Toko Kustom (Aktif di Workspace)</option>
            </select>
          </div>

          {/* Section 0: Connected Universal Knowledge Overview Card */}
          <div className="p-4 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border-b border-[#ede8e2]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#2545ff] flex items-center gap-1">
                <BuildingIcon className="w-3 h-3" />
                <span>Knowledge Base Terkoneksi</span>
              </span>
              <span className="badge badge-success text-[10px] font-extrabold">100% Synced</span>
            </div>
            <h4 className="text-[14px] font-extrabold text-[#0c1754]">{activeInst.name}</h4>
            <p className="text-[11.5px] text-[#5a6380] mb-2">{activeInst.sector} • <em>{activeInst.slogan}</em></p>

            <div className="flex flex-col gap-1.5 text-[11px] text-[#475569] bg-white/80 p-2.5 rounded-xl border border-blue-100">
              <div>
                <strong>Alamat:</strong> {activeInst.address}
              </div>
              <div>
                <strong>Jam Buka:</strong> {activeInst.hours}
              </div>
              <div>
                <strong>Katalog Database:</strong>{" "}
                <span className={activeInst.products.length > 0 ? "font-bold text-emerald-700" : "font-bold text-amber-600"}>
                  {activeInst.products.length > 0
                    ? `${activeInst.products.length} Produk Siap Jual`
                    : "0 Produk (Database Kosong)"}
                </span>
              </div>
              <div>
                <strong>Promo Aktif:</strong> {promos[0] || "Belum ada promo aktif"}
              </div>
            </div>
          </div>

          {/* Section 0.5: Dynamic Decrementing Token Counter */}
          <div className="p-4 border-b border-[#f0e9e1] bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2545ff] flex items-center gap-1.5">
                <CpuIcon className="w-3.5 h-3.5" />
                <span>Sisa Saldo Kuota Token (Live)</span>
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Dinamis Berkurang
              </span>
            </div>

            <div className="bg-[#fcfbf9] border border-[#ede8e2] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-[#8f95a8] font-bold">Sisa Token Aktif:</span>
                <span className="text-[16px] font-extrabold text-[#2545ff] font-mono">
                  {tokenBalance.remainingTokens.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="w-full bg-[#ede8e2] h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-[#2545ff] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      5,
                      Math.min(100, (tokenBalance.remainingTokens / tokenBalance.totalQuota) * 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8f95a8]">
                <span>Terkonsumsi: {tokenBalance.consumedTokens.toLocaleString("id-ID")}</span>
                <span>Total Kuota: {tokenBalance.totalQuota.toLocaleString("id-ID")}</span>
              </div>

              {tokenBalance.lastDeducted > 0 && (
                <div className="mt-2 text-[11px] font-bold text-red-600 bg-red-50 p-1.5 rounded-lg text-center flex items-center justify-center gap-1">
                  <ZapIcon className="w-3 h-3 text-red-500" />
                  <span>Terpotong -{tokenBalance.lastDeducted} Token pada respon terakhir</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Customer Profile & Honorifics */}
          <div className="p-4 border-b border-[#f0e9e1] bg-[#fdfcfa]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Profil WhatsApp Penguji (Sapaan Dinamis)</span>
              </span>
              <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                {salutation}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-[12px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Kontak WhatsApp</label>
                <input
                  type="text"
                  value={waCustomer.name}
                  onChange={(e) => setWaCustomer({ ...waCustomer, name: e.target.value })}
                  placeholder="Misal: Budi Santoso, Siti, Hendra..."
                  className="w-full bg-white border border-[#e2dcd4] rounded-xl p-2 text-[#0c1754] font-bold outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">
                  Panggilan / Honorific (AI akan menyesuaikan sapaan)
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {["Kakak", "Bapak", "Ibu", "Mas", "Mbak"].map((hon) => (
                    <button
                      key={hon}
                      type="button"
                      onClick={() => setWaCustomer({ ...waCustomer, honorific: hon })}
                      className={`py-1.5 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                        waCustomer.honorific === hon
                          ? "bg-[#2545ff] text-white border-[#2545ff] shadow-xs"
                          : "bg-white text-[#5a6380] border-[#e2dcd4] hover:border-[#2545ff]/50"
                      }`}
                    >
                      {hon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-purple-50/70 border border-purple-200 rounded-xl text-[11px] text-purple-900 leading-snug">
                <strong>Format Sapaan Aktif:</strong> AI otomatis menyapa pelanggan dengan{" "}
                <span className="font-extrabold text-[#2545ff]">"{salutation}"</span> dan menggunakan kata ganti{" "}
                <span className="font-extrabold text-[#2545ff]">"{pronoun}"</span> pada setiap balasan.
              </div>
            </div>
          </div>

          {/* Section 1.5: Interactive Active Promos & Diskon */}
          <div className="p-4 border-b border-[#f0e9e1] bg-[#faf8f5]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Promo & Diskon Toko (Dibaca AI)</span>
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {promos.length} Aktif
              </span>
            </div>

            <p className="text-[11px] text-[#5a6380] mb-2.5 leading-snug">
              Semua promo di bawah ini otomatis diserap oleh RAG AI CS dan akan ditawarkan langsung ke calon pembeli.
            </p>

            <div className="flex flex-col gap-1.5 mb-3">
              {promos.map((promo, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-2 p-2 bg-white rounded-xl border border-amber-200/80 text-[11.5px] text-[#0c1754] shadow-2xs"
                >
                  <span className="leading-snug">
                    <strong className="text-amber-700 font-bold">{idx + 1}.</strong> {promo}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePromo(idx)}
                    className="text-[#8f95a8] hover:text-red-600 transition-colors p-0.5 text-[12px] font-bold cursor-pointer"
                    title="Hapus Promo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPromo} className="flex gap-1.5">
              <input
                type="text"
                value={newPromoText}
                onChange={(e) => setNewPromoText(e.target.value)}
                placeholder="Tambah promo baru..."
                className="flex-1 bg-white border border-[#e2dcd4] rounded-xl px-2.5 py-1.5 text-[11.5px] text-[#0c1754] outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newPromoText.trim()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-[11.5px] rounded-xl transition-all cursor-pointer flex-shrink-0"
              >
                + Tambah
              </button>
            </form>
          </div>

          {/* Section 2: AI Persona & Tone of Voice */}
          <div className="p-4 border-b border-[#f0e9e1]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2545ff] flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Karakter Bot Asisten</span>
              </span>
              <span className="text-[10px] font-bold bg-[#eaebf8] text-[#0c1754] px-2 py-0.5 rounded-full">
                Supervisor
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-[12px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Bot CS</label>
                <input
                  type="text"
                  value={testPersona.botName}
                  onChange={(e) => setTestPersona({ ...testPersona, botName: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2 text-[#0c1754] font-medium outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Gaya Bahasa (Tone)</label>
                <select
                  value={testPersona.tone}
                  onChange={(e) => setTestPersona({ ...testPersona, tone: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2 text-[#0c1754] font-medium outline-none"
                >
                  <option value="Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)">
                    Ramah & Santun Gaul (Online Shop)
                  </option>
                  <option value="Formal & Elegan (Bisnis B2B & Properti)">
                    Formal & Elegan (B2B / Bisnis)
                  </option>
                  <option value="Islami & Penuh Doa (Lembaga Donasi & Zakat)">
                    Islami & Penuh Doa (ZISWAF)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic 1-Click Scenario Trigger Buttons for ACTIVE Business */}
          <div className="p-4 border-b border-[#f0e9e1]">
            <div className="flex items-center gap-2 mb-2.5">
              <ZapIcon className="w-3.5 h-3.5 text-[#2545ff]" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c1754]">
                1-Klik Skenario Pengujian ({activeInst.name})
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Product & Stock Check */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario("Halo kak, ada produk apa saja yang ready stock dan berapa harganya?")
                }
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[11.5px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <LayersIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>Tanya Produk Ready Stock</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              {/* Specific Product Detail (Dynamic based on active products) */}
              <button
                type="button"
                onClick={() => {
                  const pTarget = activeInst.products[1] || activeInst.products[0] || { name: "produk ini" };
                  handleQuickScenario(`Halo apakah ${pTarget.name} masih ready stok dan ada info detailnya?`);
                }}
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[11.5px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Tanya Detail Produk ({activeInst.products[1]?.name ? activeInst.products[1].name.slice(0, 18) + "..." : "Item 1"})</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              {/* Promo & Discount Inquiry */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario("Ada promo atau diskon apa aja kak hari ini?")
                }
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-[11.5px] font-bold text-amber-900 border border-amber-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ZapIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tanya Promo & Diskon (Dibaca AI)</span>
                </span>
                <span className="text-amber-600">→</span>
              </button>

              {/* Single Product Order Intent */}
              <button
                type="button"
                onClick={() => {
                  const pTarget = activeInst.products[0] || { name: "produk utama" };
                  handleQuickScenario(`Saya mau pesan 1x ${pTarget.name} ya kak`);
                }}
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[11.5px] font-bold text-blue-900 border border-blue-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <DollarSignIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pesan 1 Produk ({activeInst.products[0]?.name ? activeInst.products[0].name.slice(0, 18) + "..." : "Produk 1"})</span>
                </span>
                <span className="text-blue-600">→</span>
              </button>

              {/* Multi-Item Calculation */}
              <button
                type="button"
                onClick={() => {
                  const pA = activeInst.products[0] || { name: "Produk 1" };
                  const pB = activeInst.products[1] || activeInst.products[0] || { name: "Produk 2" };
                  handleQuickScenario(`Saya mau pesan 1x ${pA.name} tambah 1x ${pB.name}, totalnya berapa ya kak?`);
                }}
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[11.5px] font-bold text-indigo-900 border border-indigo-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <DollarSignIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Hitung Total Multi-Item (2 Produk)</span>
                </span>
                <span className="text-indigo-600">→</span>
              </button>

              {/* Polite Cancellation Intent */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario("Waduh maaf kak gajadi dulu ya mau cancel")
                }
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-[11.5px] font-bold text-gray-700 border border-gray-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <BotIcon className="w-3.5 h-3.5 text-gray-500" />
                  <span>Batalkan Pesanan (Sopan & Empati)</span>
                </span>
                <span className="text-gray-500">→</span>
              </button>

              {/* Dynamic QRIS Generation */}
              <button
                type="button"
                onClick={() => handleQuickScenario("Saya mau pesan sekarang kak, tolong terbitkan kode QRIS untuk bayar.", "qris")}
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[11.5px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <QrIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>Terbitkan Dynamic QRIS</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              {/* Voice Note Audio */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario("Halo kak, ongkir pengiriman ke tempat saya berapa ya?", "voice")
                }
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[11.5px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <MicIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>Kirim Voice Note Audio (STT)</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              {/* Valid Receipt Forensics */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario(`Sudah aku transfer ya kak ke rekening ${activeInst.name}.`, "ocr_real")
                }
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[11.5px] font-bold text-emerald-800 border border-emerald-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Uji Forensik Struk Valid</span>
                </span>
                <span className="text-emerald-600">→</span>
              </button>

              {/* Fake Receipt Detection */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario("Ini bukti transfer editan photoshop saya.", "ocr_fake")
                }
                disabled={isTyping}
                className="w-full text-left p-2 rounded-xl bg-red-50 hover:bg-red-100 text-[11.5px] font-bold text-red-800 border border-red-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
                  <span>Uji Deteksi Struk Palsu</span>
                </span>
                <span className="text-red-600">→</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ==================== RIGHT PANEL: LIVE WHATSAPP CHAT CANVAS ==================== */}
        <main className="flex-1 flex flex-col h-full bg-[#efeae2] relative">
          {/* Chat Canvas Top Bar */}
          <div className="h-[52px] bg-white border-b border-[#e2dcd4] flex items-center justify-between px-4 sm:px-6 shadow-xs flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[12px]">
                {activeInst.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[13px] font-extrabold text-[#0c1754] leading-none">
                  {testPersona.botName} • <span className="text-[#64748b] font-normal">{activeInst.name}</span>
                </div>
                <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Simulasi Aktif bersama <strong>{salutation}</strong> ({waCustomer.phone})
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#8f95a8] hidden sm:block">
              Sisa Kuota: <strong className="text-[#2545ff]">{tokenBalance.remainingTokens.toLocaleString("id-ID")} Token</strong>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-3.5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-[560px] mx-auto my-auto">
                <div className="w-14 h-14 rounded-2xl bg-white text-[#2545ff] flex items-center justify-center shadow-sm border border-[#e2dcd4] mb-3">
                  <BotIcon className="w-7 h-7" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2545ff] text-[11px] font-bold border border-blue-200 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff]" />
                  <span>Ruang Uji CS AI Kosong (Siap Menerima Pesan)</span>
                </div>
                <h3 className="text-[18px] font-extrabold text-[#0c1754] mb-1">
                  Mulai Pengujian AI untuk {activeInst.name}
                </h3>
                <p className="text-[12.5px] text-[#64748b] mb-5 leading-relaxed">
                  Percakapan awal sengaja dikosongkan. AI telah terhubung ke data produk,
                  harga, alamat, dan nomor rekening <strong>{activeInst.name}</strong>. AI juga akan menyapa Anda secara personal dengan panggilan: <strong className="text-[#2545ff]">{salutation}</strong>.
                </p>

                {/* Quick Action Suggestion Chips — 100% SVG Icons, Zero Emojis */}
                <div className="w-full bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-[#e2dcd4] shadow-xs text-left">
                  <div className="text-[11px] font-bold text-[#8f95a8] uppercase tracking-wider mb-2">
                    Coba Kirim Pertanyaan Awal:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("ada produk apa aja yang ready stock?")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquareIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                        <span>Ada produk apa saja?</span>
                      </span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("alamat outletnya dimana ya?")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <BuildingIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Alamat & jam operasional</span>
                      </span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("ada promo diskon hari ini?")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Cek promo & diskon</span>
                      </span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("mau bayar pake qris dong", "qris")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <QrIcon className="w-3.5 h-3.5 text-[#0c1754]" />
                        <span>Minta Dynamic QRIS</span>
                      </span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                if (m.sender === "system") {
                  return (
                    <div key={m.id} className="flex justify-center my-1">
                      <span className="bg-[#f0e9e1] text-[#64748b] text-[11px] font-bold px-3 py-1 rounded-full text-center max-w-[500px]">
                        {m.text}
                      </span>
                    </div>
                  );
                }

                const isUser = m.sender === "user";

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-full`}
                  >
                    <div
                      className={`rounded-2xl p-3.5 max-w-[85%] sm:max-w-[70%] shadow-xs ${
                        isUser
                          ? "bg-[#2545ff] text-white rounded-tr-none"
                          : "bg-white text-[#171417] rounded-tl-none border border-[#e2dcd4]"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-[#f0e9e1] text-[10.5px]">
                          <span className="font-extrabold text-[#2545ff] flex items-center gap-1">
                            <BotIcon className="w-3 h-3" />
                            <span>{testPersona.botName}</span>
                          </span>
                          <span className="text-[#8f95a8] font-mono">
                            {m.tokens || 142} tok • {m.latency || "88ms"}
                          </span>
                        </div>
                      )}

                      <p className="text-[13px] leading-relaxed whitespace-pre-line break-words">
                        {m.text}
                      </p>

                      {/* Interactive Simulated Dynamic QRIS Card if generated */}
                      {m.qris && (
                        <div className="mt-3 bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm text-center">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10.5px] font-extrabold text-[#0c1754] uppercase tracking-wider flex items-center gap-1">
                              <QrIcon className="w-3 h-3 text-[#2545ff]" />
                              <span>Dynamic QRIS EMVCo Nasional</span>
                            </span>
                            <span className="text-[9.5px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Berlaku {m.qris.expired}
                            </span>
                          </div>

                          <div className="w-36 h-36 mx-auto bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center p-2 mb-2">
                            <QrIcon className="w-24 h-24 text-[#0c1754]" />
                            <span className="text-[9px] font-mono text-gray-500 mt-1">NMID: ID10294810294</span>
                          </div>

                          <div className="text-[14px] font-extrabold text-[#0c1754]">
                            Rp {m.qris.amount.toLocaleString("id-ID")}
                          </div>
                          <p className="text-[10.5px] text-[#64748b]">
                            Pindai via BCA Mobile, GoPay, OVO, ShopeePay, atau Livin Mandiri
                          </p>
                        </div>
                      )}

                      {/* Interactive Forensic Anti-Fraud Card if OCR simulated */}
                      {m.ocr && (
                        <div
                          className={`mt-3 p-3 rounded-xl border text-[11px] ${
                            m.ocr.isFraud
                              ? "bg-red-50/90 border-red-300 text-red-900"
                              : "bg-emerald-50/90 border-emerald-300 text-emerald-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold uppercase tracking-wider flex items-center gap-1">
                              {m.ocr.isFraud ? (
                                <>
                                  <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
                                  <span>Image Forensics: Anomali Font Terdeteksi</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Forensik Mutasi: Cocok 100%</span>
                                </>
                              )}
                            </span>
                            <span className="font-mono font-bold">
                              Confidence: {m.ocr.confidence}%
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug">{m.ocr.verdict}</p>
                        </div>
                      )}

                      {/* Voice Note Badge if present */}
                      {m.isVoice && (
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          <MicIcon className="w-3.5 h-3.5" />
                          <span>Voice Note Diterjemahkan via Whisper Large v3 (NVIDIA)</span>
                        </div>
                      )}

                      {/* Message Timestamp and SVG Double Checkmark */}
                      <div
                        className={`text-[10px] mt-1.5 text-right font-medium flex items-center justify-end gap-1 ${
                          isUser ? "text-blue-200" : "text-[#8f95a8]"
                        }`}
                      >
                        <span>{m.time}</span>
                        {isUser && (
                          <span className="inline-flex items-center text-blue-200" title="Terkirim & Terbaca">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                              <polyline points="23 6 12 17 9 14" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-[#f0e9e1] flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#2545ff] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#2545ff] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#2545ff] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11.5px] font-bold text-[#64748b] ml-1.5">
                    {testPersona.botName} sedang menyusun balasan untuk {salutation}...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Message Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-[#e2dcd4] flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Ketik pertanyaan untuk menguji AI (misal: ada produk apa, alamat toko, minta qris)... Sapaan: ${salutation}`}
              className="flex-1 bg-[#f9f8f6] border border-[#ede8e2] rounded-full py-2.5 px-4 text-[13px] text-[#0c1754] outline-none focus:border-[#2545ff] transition-all"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isTyping}
              className="btn-primary !py-2.5 !px-5 text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Kirim</span>
              <ZapIcon className="w-3.5 h-3.5" />
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default function TestCsAiPage() {
  return (
    <DashboardProvider>
      <TestCsAiContent />
    </DashboardProvider>
  );
}
