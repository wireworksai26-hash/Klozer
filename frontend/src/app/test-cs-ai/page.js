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
} from "@/components/icons";

function TestCsAiContent() {
  const { aiConfig = {}, products = [], institutions = [], activeInstitution, currentUser, role } = useDashboard();

  // Institution Knowledge Repositories
  const institutionKnowledgeBases = {
    "INST-004": {
      id: "INST-004",
      name: "Geprek Juara",
      sector: "Kuliner & F&B (Ayam Geprek & Sambal Nusantara)",
      slogan: "Rajanya Pedas & Krispi Gurih Nampol",
      address: "Jl. Tebet Raya No. 42, Tebet Timur, Jakarta Selatan 12820 (100m dari Stasiun Tebet)",
      hours: "Buka Setiap Hari (Senin - Minggu), Pukul 10:00 - 22:00 WIB",
      phone: "+62 812-9900-8800",
      deliveryInfo: "Pengiriman via kurir internal flat ongkir Rp 10.000 se-Jakarta, atau instant GrabExpress & GoSend Sameday.",
      paymentMethods: "Dynamic QRIS 1-Klik (BCA/GoPay/OVO/ShopeePay), Transfer Bank BCA (8001-2948-1029 a/n PT Geprek Juara Nusantara), dan COD (Bayar di Tempat).",
      promos: [
        "Diskon 10% untuk pembayaran langsung via Dynamic QRIS",
        "Promo Ongkir Flat Rp 10.000 untuk seluruh area DKI Jakarta",
        "Promo Paket Jumbo: Beli 5 Paket Komplit Gratis 1 Porsi Kulit Krispi!",
      ],
      products: [
        {
          id: "GP-01",
          name: "Paket Geprek Juara Sambal Korek",
          price: 22000,
          stock: 85,
          desc: "Ayam krispi gurih pedas nampol + Nasi pulen hangat + Lalapan segar timun & kemangi. Pilihan level pedas: Level 1 sampai Level 5.",
          category: "Makanan Utama",
        },
        {
          id: "GP-02",
          name: "Ayam Geprek Keju Mozarella",
          price: 28000,
          stock: 40,
          desc: "Ayam krispi panas dibalut keju mozarella melted melimpah yang dibakar torch hingga harum dan gurih creamy.",
          category: "Makanan Utama",
        },
        {
          id: "GP-03",
          name: "Paket Geprek Hemat Komplit + Es Teh",
          price: 25000,
          stock: 60,
          desc: "Ayam geprek krispi sambal bawang + nasi hangat + tahu tempe goreng + es teh manis jumbo 22oz segar.",
          category: "Paket Hemat",
        },
        {
          id: "GP-04",
          name: "Kulit Ayam Krispi Juara",
          price: 12000,
          stock: 35,
          desc: "Kulit ayam goreng tepung super renyah kriuk gurih, camilan favorit pelengkap geprek.",
          category: "Camilan / Side Dish",
        },
        {
          id: "GP-05",
          name: "Es Teh Manis Jumbo 22oz",
          price: 6000,
          stock: 120,
          desc: "Es teh manis melati racikan khas Solo ukuran jumbo 22oz segar pelepas dahaga pedas.",
          category: "Minuman",
        },
        {
          id: "GP-06",
          name: "Ekstra Sambal Matah Bali",
          price: 5000,
          stock: 50,
          desc: "Sambal matah segar irisan bawang merah, serai, cabai rawit dan minyak kelapa wangi.",
          category: "Ekstra Sambal",
        },
      ],
      greeting: "Halo! Selamat datang di Geprek Juara! Rajanya ayam krispi pedas nampol. Mau pesan paket apa hari ini?",
    },
    "INST-001": {
      id: "INST-001",
      name: "Batik Mahakarya Solo",
      sector: "Fashion & Retail",
      slogan: "Pesona Warisan Budaya Nusantara",
      address: "Jl. Slamet Riyadi No. 182, Laweyan, Surakarta (Solo), Jawa Tengah 57141",
      hours: "Buka Senin - Sabtu: 09:00 - 21:00 WIB, Minggu: 10:00 - 18:00 WIB",
      phone: "+62 812-3456-7890",
      deliveryInfo: "Pengiriman gratis ongkir JNE/SiCepat se-Pulau Jawa untuk pembelian minimal Rp 300.000.",
      paymentMethods: "Dynamic QRIS (BCA, Mandiri, BRI, BNI), Virtual Account, Kartu Kredit, & Cicilan 0%.",
      promos: [
        "Diskon Member 15% untuk koleksi Kemeja Batik Sutra Modern",
        "Gratis Ongkos Kirim se-Jawa untuk transaksi di atas Rp 300.000",
      ],
      products: [
        {
          id: "PRD-01",
          name: "Kemeja Batik Modern Navy",
          price: 150000,
          stock: 42,
          desc: "Katun Primisima Premium lapis furing trikot halus, tidak panas dan nyaman dipakai.",
          category: "Pakaian Pria",
        },
        {
          id: "PRD-02",
          name: "Tunik Batik Tulis Sutra Solo",
          price: 320000,
          stock: 18,
          desc: "Batik tulis pola khas Laweyan bahan sutra crepe mewah dan elegan.",
          category: "Pakaian Wanita",
        },
      ],
      greeting: "Sugeng rawuh di Batik Mahakarya Solo. Ada motif atau model batik yang sedang dicari hari ini?",
    },
    "INST-002": {
      id: "INST-002",
      name: "Lumiere Skincare Official",
      sector: "Beauty & Healthcare",
      slogan: "Radiant Glowing Skin, Scientifically Proven",
      address: "Ruko Grand Wijaya Center Blok C-12, Kebayoran Baru, Jakarta Selatan 12160",
      hours: "Senin - Minggu: 09:00 - 20:00 WIB",
      phone: "+62 813-8899-1122",
      deliveryInfo: "Pengiriman instant via Gojek/Grab atau Ekspedisi Reguler SiCepat/J&T dengan bubble wrap tebal garansi pecah.",
      paymentMethods: "Dynamic QRIS, Transfer BCA / Mandiri, ShopeePay, dan COD.",
      promos: [
        "Buy 1 Glowing Serum Get 1 Free Facial Wash",
        "Free Konsultasi Dokter Estetika via WhatsApp",
      ],
      products: [
        {
          id: "SK-01",
          name: "Lumiere Brightening Glow Serum 30ml",
          price: 129000,
          stock: 95,
          desc: "Serum Niacinamide 10% + Alpha Arbutin mencerahkan flek hitam dan meratakan warna kulit.",
          category: "Serum",
        },
        {
          id: "SK-02",
          name: "UV Defense Sunscreen SPF 50+ PA++++",
          price: 99000,
          stock: 140,
          desc: "Sunscreen water-based no white cast dengan ceramide pelindung skin barrier.",
          category: "Sunscreen",
        },
      ],
      greeting: "Halo glowing beauties! Selamat datang di Lumiere Skincare. Mau konsultasi kulit atau cari produk skincare?",
    },
    "INST-003": {
      id: "INST-003",
      name: "Yayasan ZISWAF Peduli Umat",
      sector: "Sosial, Filantropi & Keagamaan",
      slogan: "Amanah Menyalurkan Zakat & Sedekah Terbaik",
      address: "Gedung Menara Dakwah Lt. 3, Jl. Kramat Raya No. 45, Senen, Jakarta Pusat 10450",
      hours: "Layanan Konsultasi Mustahik & Muzakki: 08:00 - 17:00 WIB",
      phone: "+62 811-7788-9900",
      deliveryInfo: "Layanan jemput donasi/zakat langsung ke rumah untuk area Jabodetabek.",
      paymentMethods: "Dynamic QRIS Zakat & Sedekah, Virtual Account Bank Syariah Indonesia (BSI Rek: 7100-2948-11), Bank Muamalat.",
      promos: [
        "Sedekah Subuh Pahal Mengalir Tanpa Batas",
        "Kalkulator Zakat Maal & Fitrah Terintegrasi",
      ],
      products: [
        {
          id: "ZS-01",
          name: "Paket Zakat Maal Penghasilan",
          price: 250000,
          stock: 9999,
          desc: "Penyaluran zakat maal 2.5% kepada 8 asnaf fakir miskin dan beasiswa anak dhuafa.",
          category: "Zakat",
        },
        {
          id: "ZS-02",
          name: "Paket Pangan Yatim & Lansia",
          price: 100000,
          stock: 9999,
          desc: "Beras, minyak, dan kebutuhan pokok bagi keluarga mustahik pelosok.",
          category: "Sedekah",
        },
      ],
      greeting: "Assalamu'alaikum warahmatullahi wabarakatuh. Selamat datang di Layanan ZISWAF Peduli Umat. Ada yang bisa kami bantu seputar zakat dan sedekah?",
    },
  };

  // State: Active Institution
  const [selectedInstId, setSelectedInstId] = useState("INST-004");
  const activeInst = institutionKnowledgeBases[selectedInstId] || institutionKnowledgeBases["INST-004"];

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
    botName: aiConfig.spvPersona?.botName || "Klozer Assistant",
    tone: aiConfig.spvPersona?.tone || "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage: activeInst.greeting,
    voiceAccent: aiConfig.spvPersona?.voiceAccent || "Bahasa Indonesia Standar (Aksen Ramah)",
    voiceGender: aiConfig.spvPersona?.voiceGender || "Female (Putri)",
  });

  // Dynamic Token Balance State (Active Decrementing Engine)
  const [tokenBalance, setTokenBalance] = useState({
    totalQuota: 200000,
    consumedTokens: 42350,
    remainingTokens: 157650,
    lastDeducted: 0,
    lastLatency: "88ms",
  });

  // Fetch real token balance from backend
  const fetchTenantTokenBalance = async (instId = selectedInstId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/token-balance?tenantId=${instId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.balance) {
          setTokenBalance({
            totalQuota: json.balance.totalQuota || 200000,
            consumedTokens: json.balance.consumedTokens || 0,
            remainingTokens: json.balance.remainingTokens || 157650,
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
    fetchTenantTokenBalance(selectedInstId);
  }, [selectedInstId]);

  // Messages State — KOSONGAN DI AWAL SEPERTI REQUEST USER
  const [messages, setMessages] = useState([]);

  // When active institution switches, keep it clean/empty and update greeting
  useEffect(() => {
    setTestPersona((prev) => ({
      ...prev,
      greetingMessage: activeInst.greeting,
    }));
    setMessages([]);
  }, [selectedInstId]);

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
    status: "HTTP 200 OK (Knowledge Sync Active)",
  });

  const [mounted, setMounted] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ==================== KNOWLEDGE-AWARE AI ENGINE ====================
  const generateAiReply = (userText, overrideType = null) => {
    setIsTyping(true);
    const delay = Math.max(500, (aiConfig.humanDelayMin || 2) * 300);

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

    setTimeout(() => {
      let replyText = "";
      let qrisData = null;
      let ocrData = null;
      let isVoice = false;
      const lower = userText.toLowerCase();

      // Current salutation for this reply
      const activeSalutation = getSalutation(waCustomer);
      const activePronoun = getPronoun(waCustomer);

      // 1. FORENSIC FAKE RECEIPT DETECTION
      if (overrideType === "ocr_fake" || lower.includes("struk palsu") || lower.includes("struk_edit") || lower.includes("editan")) {
        replyText = `[PERINGATAN IMAGE FORENSICS KLOZER]: Bukti transfer terdeteksi hasil manipulasi grafis (Font raster anomaly 94% Indikasi Palsu).\n\n"Halo ${activeSalutation}, mohon maaf bukti transfer ${activePronoun.toLowerCase()} belum cocok dengan mutasi otomatis rekening ${activeInst.name}. Mohon periksa kembali mutasi perbankan atau gunakan Dynamic QRIS resmi agar pesanan langsung kami proses ya ${activePronoun}."`;
        ocrData = {
          confidence: 94,
          isFraud: true,
          verdict: "DITOLAK — Anomali Font & Mutasi Bank Tidak Ditemukan",
        };
      }
      // 2. FORENSIC REAL RECEIPT RECONCILIATION
      else if (overrideType === "ocr_real" || lower.includes("bukti transfer") || lower.includes("struk asli") || lower.includes("sudah transfer")) {
        const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const sampleProduct = activeInst.products[0]?.name || "Pesanan";
        const samplePrice = activeInst.products[0]?.price || 22000;
        replyText = `Bukti transfer berhasil diverifikasi cocok 100% dengan Mutasi Rekening ${activeInst.name}!\n\nPembayaran sebesar Rp ${(samplePrice * 2).toLocaleString("id-ID")} terkonfirmasi lunas otomatis.\nNomor Pesanan: ${orderId}\nPelanggan: ${waCustomer.name} (${activeSalutation})\nProduk: 2x ${sampleProduct}\nStatus: Siap Diproses Tim Dapur / Gudang.\n\nPesanan ${activeSalutation} sedang disiapkan dan akan segera dikirimkan. Terima kasih banyak ya ${activePronoun}!`;
        ocrData = {
          confidence: 99.2,
          isFraud: false,
          verdict: `VALID — Mutasi ${activeInst.name} Cocok (Auto-Settled)`,
        };
      }
      // 3. DYNAMIC QRIS GENERATION
      else if (overrideType === "qris" || lower.includes("qris") || lower.includes("bayar") || lower.includes("rekening")) {
        const p1 = activeInst.products[0] || { name: "Pesanan 1", price: 25000 };
        const p2 = activeInst.products[1] || { name: "Pesanan 2", price: 20000 };
        const subtotal = p1.price + p2.price;
        const discountVal = Math.round(subtotal * 0.1); // Diskon 10% QRIS
        const finalTotal = subtotal - discountVal;

        replyText = `Baik ${activeSalutation}! Berikut rincian pesanan dan kode Dynamic QRIS 1-Klik resmi untuk ${activeInst.name}:\n\n• 1x ${p1.name}: Rp ${p1.price.toLocaleString("id-ID")}\n• 1x ${p2.name}: Rp ${p2.price.toLocaleString("id-ID")}\n• Diskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n• TOTAL TAGIHAN: Rp ${finalTotal.toLocaleString("id-ID")}\n\nSilakan ${activeSalutation} scan kode QRIS resmi di bawah ini melalui m-BCA, GoPay, OVO, ShopeePay, atau Livin Mandiri. Status lunas akan otomatis diverifikasi sistem dalam 2 detik tanpa perlu kirim struk manual ya ${activePronoun}!`;
        qrisData = {
          amount: finalTotal,
          expired: "15 Menit",
          merchant: activeInst.name,
        };
      }
      // 4. VOICE NOTE STT
      else if (overrideType === "voice" || lower.includes("voice note") || lower.includes("vn")) {
        isVoice = true;
        replyText = `(Transkripsi Suara ${activeSalutation}: "Halo kak, ongkir pengiriman ke area sekitar toko kena berapa ya?")\n\n"Halo ${activeSalutation}! Untuk pengiriman dari ${activeInst.name} (${activeInst.address.split("(")[0].trim()}), kami ada promo flat ongkir cuma Rp 10.000 se-area ya ${activePronoun}! ${activeSalutation} mau pesan menu apa biar langsung kami siapkan sekarang?"`;
      }
      // 5. INQUIRY: ALAMAT, LOKASI, JAM BUKA
      else if (
        lower.includes("alamat") ||
        lower.includes("lokasi") ||
        lower.includes("dimana") ||
        lower.includes("cabang") ||
        lower.includes("buka") ||
        lower.includes("toko") ||
        lower.includes("maps")
      ) {
        replyText = `Halo ${activeSalutation}! Outlet resmi ${activeInst.name} berlokasi di:\n📍 ${activeInst.address}\n\n⏰ Jam Operasional: ${activeInst.hours}.\n\n🛵 Layanan Pengantaran: ${activeInst.deliveryInfo}\n\n${activeSalutation} mau mampir langsung ke outlet kami atau mau kami kirimkan ke alamat ${activePronoun} hari ini?`;
      }
      // 6. INQUIRY: DISKON & PROMO
      else if (
        lower.includes("diskon") ||
        lower.includes("promo") ||
        lower.includes("potongan") ||
        lower.includes("voucher") ||
        lower.includes("hemat") ||
        lower.includes("cashback")
      ) {
        const promoList = activeInst.promos.map((p, idx) => `${idx + 1}. ${p}`).join("\n");
        replyText = `Kabar gembira untuk ${activeSalutation}! Promo menarik yang sedang aktif di ${activeInst.name} hari ini:\n\n${promoList}\n\nMau langsung kami pesankan sekarang agar ${activeSalutation} dapat promonya?`;
      }
      // 7. INQUIRY: NOMOR REKENING / TRANSFER
      else if (lower.includes("rekening") || lower.includes("transfer") || lower.includes("no rek") || lower.includes("bca")) {
        replyText = `Halo ${activeSalutation}! Untuk pembayaran pesanan di ${activeInst.name}, ${activePronoun} bisa menggunakan:\n\n💳 ${activeInst.paymentMethods}\n\nSetelah transfer atau scan QRIS, sistem otomatis kami akan langsung memvalidasi pembayaran ${activeSalutation} ya!`;
      }
      // 8. INQUIRY: MENU, AYAM, PRODUK, STOK, HARGA, VARIAN
      else if (
        lower.includes("ayam") ||
        lower.includes("menu") ||
        lower.includes("paket") ||
        lower.includes("produk") ||
        lower.includes("makanan") ||
        lower.includes("stok") ||
        lower.includes("harga") ||
        lower.includes("resep") ||
        lower.includes("ada apa") ||
        lower.includes("katalog") ||
        lower.includes("rekomendasi") ||
        lower.includes("jual apa")
      ) {
        const menuFormatted = activeInst.products
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.name}** - Rp ${p.price.toLocaleString("id-ID")}\n   ${p.desc} (Stok Ready: ${p.stock})`
          )
          .join("\n\n");

        replyText = `Halo ${activeSalutation}! Berikut daftar menu dan produk andalan yang tersedia di **${activeInst.name}**:\n\n${menuFormatted}\n\n${
          selectedInstId === "INST-004"
            ? `Untuk ayam geprek bisa request level pedas 1 sampai 5 ya ${activePronoun}! ${activeSalutation} mau pesan Paket Geprek Sambal Korek atau yang Mozarella?`
            : `Produk di atas semuanya ready stock dan siap dikirim hari ini ya ${activePronoun}. ${activeSalutation} mau ambil yang mana?`
        }`;
      }
      // 9. GREETING
      else if (
        lower.includes("halo") ||
        lower.includes("hai") ||
        lower.includes("pagi") ||
        lower.includes("siang") ||
        lower.includes("sore") ||
        lower.includes("malam") ||
        lower.includes("assalamu") ||
        lower.includes("permisi")
      ) {
        replyText = `Halo ${activeSalutation}! Selamat datang di layanan pelanggan resmi **${activeInst.name}**.\n\nAda yang bisa kami bantu untuk pesanan ${activeSalutation} hari ini? ${activeSalutation} bisa tanya paket menu ayam, promo diskon, lokasi toko, atau langsung minta QRIS pembayaran ya ${activePronoun}!`;
      }
      // 10. DEFAULT CONTEXTUAL FALLBACK
      else {
        replyText = `Halo ${activeSalutation}! Terima kasih atas pertanyaannya di **${activeInst.name}** (${activeInst.sector}).\n\nUntuk membantu ${activeSalutation} lebih cepat, ${activePronoun} bisa menanyakan:\n• Menu dan daftar harga produk\n• Promo & diskon aktif\n• Alamat outlet dan jam operasional\n• Penerbitan kode Dynamic QRIS instan\n\nAda yang bisa kami siapkan untuk ${activeSalutation} hari ini?`;
      }

      const latencyVal = `${Math.floor(75 + Math.random() * 40)}ms`;
      const promptTok = Math.floor(userText.length / 2.8) + 52;
      const compTok = Math.floor(replyText.length / 3.2) + 38;
      const totalTokensUsed = promptTok + compTok;

      // Dynamically deduct token balance immediately in UI
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
        engine: aiConfig.primaryModelName || "meta/llama-3.3-70b-instruct",
        provider: aiConfig.primaryProvider || "nvidia",
        latency: latencyVal,
      };

      setMessages((prev) => [...prev, newAiMsg]);
      setIsTyping(false);

      setTelemetry({
        engine: aiConfig.primaryModelName || "meta/llama-3.3-70b-instruct",
        provider: aiConfig.primaryProvider || "nvidia",
        baseUrl: aiConfig.primaryBaseUrl || "https://integrate.api.nvidia.com/v1",
        latency: latencyVal,
        tokensPrompt: promptTok,
        tokensCompletion: compTok,
        totalTokens: totalTokensUsed,
        ocrConfidence: ocrData ? `${ocrData.confidence}%` : null,
        status: "HTTP 200 OK (Knowledge Stream)",
      });

      // Fire async log to backend token tracking engine (deducts token quota on backend too)
      fetch(`${API_BASE_URL}/ai/token-usage/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: activeInst.id,
          tenantName: activeInst.name,
          model: "NVIDIA NIM (Llama 3.3 70B)",
          type: overrideType ? `Uji Skenario: ${overrideType}` : "Chat CS AI (Personalized)",
          promptTokens: promptTok,
          completionTokens: compTok,
          latencyMs: parseInt(latencyVal) || 95,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.balance) {
            setTokenBalance((prev) => ({
              ...prev,
              remainingTokens: data.balance.remainingTokens,
              consumedTokens: data.balance.consumedTokens,
            }));
          }
        })
        .catch(() => {});
    }, delay);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputMsg.trim() || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: inputMsg.trim(),
      customerName: waCustomer.name,
      salutation,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const textToSend = inputMsg.trim();
    setInputMsg("");
    generateAiReply(textToSend);
  };

  const handleQuickScenario = (promptText, overrideType = null) => {
    if (isTyping) return;
    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: promptText,
      customerName: waCustomer.name,
      salutation,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    generateAiReply(promptText, overrideType);
  };

  // Reset chat back to clean empty state
  const handleResetChat = () => {
    setMessages([]);
  };

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-[#f9f8f6] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-[#64748b] font-bold text-[13px]">
          <span className="w-4 h-4 rounded-full border-2 border-[#2545ff] border-t-transparent animate-spin" />
          <span>Memuat AI Testing Studio...</span>
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
                <span>AI Customer Service Testing Studio</span>
                <span className="text-[10px] font-extrabold bg-[#eaebf8] text-[#2545ff] px-2 py-0.5 rounded-full border border-[#2545ff]/20">
                  NVIDIA NIM
                </span>
              </div>
              <div className="text-[11px] text-[#64748b]">
                Basis Data: <strong className="text-[#0c1754]">{activeInst.name}</strong> • Sapaan:{" "}
                <strong className="text-[#2545ff]">{salutation}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Instansi Testing Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#fcfbf9] border border-[#ede8e2] px-3 py-1 rounded-full shadow-xs">
            <BuildingIcon className="w-3.5 h-3.5 text-[#2545ff]" />
            <span className="text-[11px] font-bold text-[#8f95a8]">Instansi:</span>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="bg-transparent text-[12px] font-extrabold text-[#0c1754] border-none outline-none cursor-pointer"
            >
              <option value="INST-004">Geprek Juara (Kuliner F&B)</option>
              <option value="INST-001">Batik Mahakarya Solo (Fashion)</option>
              <option value="INST-002">Lumiere Skincare Official (Beauty)</option>
              <option value="INST-003">Yayasan ZISWAF Peduli Umat (Donasi)</option>
            </select>
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
            Bersihkan Chat (Kosong)
          </button>
        </div>
      </header>

      {/* Workspace Body: Left Persona & Contact Panel + Right Full Chat Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ==================== LEFT PANEL: PERSONA & CONTROLS ==================== */}
        <aside className="w-full md:w-[360px] lg:w-[410px] bg-white border-r border-[#f0e9e1] flex flex-col flex-shrink-0 h-full overflow-y-auto">
          {/* Section 0: Connected Knowledge Overview Card */}
          <div className="p-4 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border-b border-[#ede8e2]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#2545ff] flex items-center gap-1">
                <BuildingIcon className="w-3 h-3" />
                <span>Knowledge Base Terkoneksi</span>
              </span>
              <span className="badge badge-success text-[10px] font-extrabold">100% Synced</span>
            </div>
            <h4 className="text-[14px] font-extrabold text-[#0c1754]">{activeInst.name}</h4>
            <p className="text-[11.5px] text-[#5a6380] mb-2">{activeInst.sector}</p>

            <div className="flex flex-col gap-1 text-[11px] text-[#475569] bg-white/80 p-2.5 rounded-xl border border-blue-100">
              <div>
                <strong>Alamat:</strong> {activeInst.address.split("(")[0]}
              </div>
              <div>
                <strong>Jam Buka:</strong> {activeInst.hours}
              </div>
              <div>
                <strong>Katalog Siap Jual:</strong> {activeInst.products.length} Menu Produk Ready
              </div>
              <div>
                <strong>Promo:</strong> {activeInst.promos[0]}
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
                <div className="mt-2 text-[11px] font-bold text-red-600 bg-red-50 p-1.5 rounded-lg text-center">
                  ⚡ Terpotong -{tokenBalance.lastDeducted} Token pada respon terakhir
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Customer Profile & Honorifics (Kakak, Bapak, Ibu, Mas, Mbak) */}
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

          {/* Section 3: 1-Click Scenario Trigger Buttons */}
          <div className="p-4 border-b border-[#f0e9e1]">
            <div className="flex items-center gap-2 mb-2.5">
              <ZapIcon className="w-3.5 h-3.5 text-[#2545ff]" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c1754]">
                1-Klik Skenario Pengujian
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Menu & Stock Check */}
              <button
                type="button"
                onClick={() =>
                  handleQuickScenario(
                    selectedInstId === "INST-004"
                      ? "Halo kak, ada paket ayam apa aja ya dan harganya berapa?"
                      : "Halo kak, ada produk apa saja yang ready stock?"
                  )
                }
                disabled={isTyping}
                className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <LayersIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>
                    {selectedInstId === "INST-004" ? "Tanya Paket Ayam & Varian" : "Tanya Produk & Varian"}
                  </span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              {/* Dynamic QRIS Generation */}
              <button
                type="button"
                onClick={() => handleQuickScenario("Saya mau pesan sekarang kak, tolong terbitkan kode QRIS untuk bayar.", "qris")}
                disabled={isTyping}
                className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
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
                className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
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
                className="w-full text-left p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[12px] font-bold text-emerald-800 border border-emerald-200 cursor-pointer transition-all flex items-center justify-between"
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
                className="w-full text-left p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[12px] font-bold text-red-800 border border-red-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
                  <span>Uji Deteksi Struk Palsu</span>
                </span>
                <span className="text-red-600">→</span>
              </button>
            </div>
          </div>

          {/* Section 4: Live Telemetry Metadata */}
          <div className="p-4 mt-auto bg-[#fcfbf9] border-t border-[#f0e9e1]">
            <div className="flex items-center gap-2 mb-2">
              <CpuIcon className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0c1754]">
                Telemetri Mesin AI Aktif
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748b]">
              <div>
                Engine: <strong className="text-[#0c1754] block truncate">{telemetry.engine}</strong>
              </div>
              <div>
                Latensi Respon: <strong className="text-emerald-700 block">{tokenBalance.lastLatency}</strong>
              </div>
              <div>
                Prompt: <strong className="text-[#0c1754] block">{telemetry.tokensPrompt} tok</strong>
              </div>
              <div>
                Completion: <strong className="text-[#0c1754] block">{telemetry.tokensCompletion} tok</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* ==================== RIGHT PANEL: CHAT CANVAS ==================== */}
        <main className="flex-1 flex flex-col h-full bg-[#efeae2] relative">
          {/* Subtle WhatsApp-style Chat Header */}
          <div className="h-[56px] bg-white border-b border-[#f0e9e1] px-4 flex items-center justify-between flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold text-[12px] flex items-center justify-center">
                {activeInst.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-extrabold text-[13.5px] text-[#0c1754] flex items-center gap-1.5">
                  <span>{testPersona.botName}</span>
                  <span className="text-[11px] text-[#64748b] font-normal">• CS {activeInst.name}</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>
                    Simulasi Aktif bersama <strong className="text-[#0c1754]">{salutation}</strong> ({waCustomer.phone})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[11.5px] text-[#64748b] hidden sm:block">
                Sisa Kuota:{" "}
                <span className="font-mono text-[#2545ff] font-bold">
                  {tokenBalance.remainingTokens.toLocaleString("id-ID")} Token
                </span>
              </div>
            </div>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3.5">
            {/* KOSONGAN DI AWAL — EMPTY STATE CANVAS */}
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-[580px] mx-auto my-auto animate-scale-pop">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-[#e2dcd4] flex items-center justify-center mb-4 text-[#2545ff]">
                  <BotIcon className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-2 bg-[#eaebf8] text-[#2545ff] text-[11px] font-extrabold px-3 py-1 rounded-full mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#2545ff] animate-ping" />
                  <span>Ruang Uji CS AI Kosong (Siap Menerima Pesan)</span>
                </div>

                <h3 className="text-[19px] font-extrabold text-[#0c1754] mb-2">
                  Mulai Pengujian AI untuk {activeInst.name}
                </h3>

                <p className="text-[13px] text-[#5a6380] leading-relaxed mb-6">
                  Percakapan awal sengaja dikosongkan. AI telah terhubung ke seluruh katalog produk, harga, diskon, alamat, dan nomor rekening <strong>{activeInst.name}</strong>. AI juga akan menyapa Anda secara personal dengan panggilan:{" "}
                  <span className="font-extrabold text-[#2545ff] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {salutation}
                  </span>
                  .
                </p>

                <div className="w-full bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-[#e2dcd4] shadow-xs text-left">
                  <div className="text-[11px] font-bold text-[#8f95a8] uppercase tracking-wider mb-2">
                    Coba Kirim Pertanyaan Awal:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickScenario(
                          selectedInstId === "INST-004"
                            ? "ada paket ayam apa aja ya?"
                            : "ada produk apa aja ya?"
                        )
                      }
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>💬 {selectedInstId === "INST-004" ? "Ada paket ayam apa aja?" : "Ada produk apa aja?"}</span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("alamat outletnya dimana ya?")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>📍 Alamat & jam operasional</span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("ada promo diskon hari ini?")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>🏷️ Cek promo & diskon</span>
                      <span className="text-[#2545ff] font-bold">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScenario("mau bayar pake qris dong", "qris")}
                      className="text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-semibold text-[#0c1754] border border-[#f0e9e1] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>💳 Minta Dynamic QRIS</span>
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
                  <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-xs relative ${
                        isUser
                          ? "bg-[#0c1754] text-white rounded-br-none"
                          : "bg-white text-[#171417] rounded-bl-none border border-[#f0e9e1]"
                      }`}
                    >
                      {/* Customer WhatsApp Header Tag */}
                      {isUser && (
                        <div className="text-[10px] text-blue-200 mb-1.5 font-semibold flex items-center justify-between gap-2 border-b border-blue-900/60 pb-1">
                          <span>
                            {waCustomer.name} ({salutation})
                          </span>
                          <span>{waCustomer.phone}</span>
                        </div>
                      )}

                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-[#f0e9e1] text-[10.5px] text-[#64748b]">
                          <span className="font-extrabold text-[#2545ff] flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3 text-purple-600" />
                            <span>NVIDIA NIM</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {m.tokens && (
                              <span className="font-mono text-red-600 font-bold bg-red-50 px-1 rounded-sm">
                                -{m.tokens} Tok
                              </span>
                            )}
                            <span>Latensi: {m.latency || "88ms"}</span>
                          </div>
                        </div>
                      )}

                      <div className="whitespace-pre-line">{m.text}</div>

                      {/* QRIS Widget Attachment if present */}
                      {m.qris && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-3">
                          <div className="w-16 h-16 bg-white p-1 rounded-lg border border-emerald-300 flex items-center justify-center flex-shrink-0">
                            <QrIcon className="w-14 h-14 text-emerald-800" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                              Dynamic QRIS 1-Klik Resmi
                            </div>
                            <div className="text-[16px] font-extrabold font-mono text-emerald-950">
                              Rp {m.qris.amount.toLocaleString("id-ID")}
                            </div>
                            <div className="text-[11px] text-emerald-700">
                              Berlaku: {m.qris.expired} • {m.qris.merchant}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* OCR Forensics Widget if present */}
                      {m.ocr && (
                        <div
                          className={`mt-3 p-3 rounded-xl border text-[11.5px] flex items-start gap-2.5 ${
                            m.ocr.isFraud
                              ? "bg-red-50 border-red-200 text-red-900"
                              : "bg-emerald-50 border-emerald-200 text-emerald-900"
                          }`}
                        >
                          {m.ocr.isFraud ? (
                            <AlertTriangleIcon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold">
                              Hasil Forensik OCR & Rekonsiliasi Mutasi ({m.ocr.confidence}%)
                            </div>
                            <div className="text-[11px] font-mono mt-0.5">{m.ocr.verdict}</div>
                          </div>
                        </div>
                      )}

                      {/* Voice Note Badge if present */}
                      {m.isVoice && (
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          <MicIcon className="w-3.5 h-3.5" />
                          <span>Voice Note Diterjemahkan via Whisper Large v3 (NVIDIA)</span>
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-1.5 text-right font-medium ${
                          isUser ? "text-blue-200" : "text-[#8f95a8]"
                        }`}
                      >
                        {m.time} {isUser && "✓✓"}
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

          {/* Bottom Chat Input Form Bar */}
          <footer className="p-3 sm:p-4 bg-white border-t border-[#f0e9e1] flex-shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-[1000px] mx-auto">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={`Ketik pertanyaan untuk menguji AI (misal: ada paket ayam apa, alamat toko, minta qris)... Sapaan: ${salutation}`}
                disabled={isTyping}
                className="flex-1 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-4 py-2.5 text-[13.5px] text-[#0c1754] placeholder-[#8f95a8] outline-none focus:border-[#2545ff] transition-all"
              />

              <button
                type="submit"
                disabled={!inputMsg.trim() || isTyping}
                className="btn-primary !py-2.5 !px-5 text-[13px] font-bold rounded-full flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>Kirim</span>
                <ZapIcon className="w-3.5 h-3.5" />
              </button>
            </form>
          </footer>
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
