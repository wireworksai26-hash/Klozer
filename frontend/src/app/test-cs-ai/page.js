"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useDashboard, DashboardProvider } from "@/context/DashboardContext";
import { API_BASE_URL } from "@/utils/apiConfig";
import {
  BotIcon,
  ZapIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  QrIcon,
  MicIcon,
  CheckCircleIcon,
  BuildingIcon,
  MessageSquareIcon,
  SparklesIcon,
  ShoppingBagIcon,
  CheckIcon,
} from "@/components/icons";

function TestCsAiContent() {
  const {
    role,
    currentUser,
    activeInstitution,
    activeInstitutionId,
    setActiveInstitutionId,
    institutions = [],
    products = [],
    aiConfig = {},
  } = useDashboard();

  // Superadmin can switch between real registered institutions
  const [selectedInstId, setSelectedInstId] = useState(
    activeInstitution?.id || activeInstitutionId || "INST-001"
  );

  // Determine active institution object
  const currentInst = useMemo(() => {
    if (role === "superadmin") {
      return (
        institutions.find((i) => i.id === selectedInstId) ||
        activeInstitution ||
        institutions[0] || {
          id: "INST-001",
          name: "Toko Bisnis Utama",
          sector: "Retail & Commerce",
        }
      );
    }
    return (
      activeInstitution || {
        id: currentUser?.institutionId || "INST-ACTIVE",
        name: currentUser?.institutionName || "Klozer AI Workspace",
        sector: currentUser?.sector || "Bisnis & Retail",
      }
    );
  }, [role, selectedInstId, institutions, activeInstitution, currentUser]);

  // Load products isolated to this specific institution
  const instProducts = useMemo(() => {
    if (
      currentInst.id === activeInstitution?.id ||
      currentInst.id === activeInstitutionId ||
      role !== "superadmin"
    ) {
      return products || [];
    }

    // For superadmin inspecting other tenants, check localStorage
    try {
      const cleanId = currentInst.id;
      const cleanSlug = currentInst.name?.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const stored =
        localStorage.getItem(`klozer_inst_${cleanId}_products`) ||
        localStorage.getItem(`klozer_inst_${cleanSlug}_products`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  }, [currentInst, activeInstitution, activeInstitutionId, role, products]);

  // Institution profile details
  const activeInst = useMemo(() => {
    return {
      id: currentInst.id || "INST-001",
      name: currentInst.name || "Klozer Workspace",
      sector: currentInst.sector || "Bisnis & Retail",
      address:
        currentInst.address ||
        `Kantor Pusat & Outlet Resmi ${currentInst.name || "Klozer"}`,
      hours: currentInst.hours || "Senin - Minggu, 08:00 - 21:00 WIB",
      phone: currentInst.phone || currentUser?.phone || "+62 812-0000-0000",
      products: instProducts,
      promos: [
        "Diskon 10% untuk pembayaran via Dynamic QRIS",
        "Bebas Ongkir / Pengiriman Instan",
      ],
      greeting:
        aiConfig?.spvPersona?.greetingMessage ||
        `Halo! Selamat datang di layanan pelanggan resmi ${currentInst.name}. Ada yang bisa kami bantu seputar produk atau pesanan hari ini?`,
    };
  }, [currentInst, instProducts, currentUser, aiConfig]);

  // Simulated Customer Name & Honorific
  const [waCustomer, setWaCustomer] = useState({
    name: "Budi Pratama",
    honorific: "Kakak",
    phone: "+62 812-9988-7711",
  });

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
      default:
        return "Kakak";
    }
  };

  const salutation = getSalutation(waCustomer);
  const pronoun = getPronoun(waCustomer);

  // Bot Persona configuration (isolated per tenant)
  const [testPersona, setTestPersona] = useState({
    botName: aiConfig?.spvPersona?.botName || `${activeInst.name} CS`,
    tone:
      aiConfig?.spvPersona?.tone ||
      "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage: activeInst.greeting,
  });

  // Keep bot persona synced when institution changes
  useEffect(() => {
    setTestPersona({
      botName: aiConfig?.spvPersona?.botName || `${activeInst.name} CS`,
      tone:
        aiConfig?.spvPersona?.tone ||
        "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
      greetingMessage: activeInst.greeting,
    });
  }, [activeInst.name, activeInst.greeting, aiConfig?.spvPersona]);

  // Token Balance & Latency Tracker
  const [tokenBalance, setTokenBalance] = useState({
    totalQuota: 500000,
    remainingTokens: 356333,
    lastDeducted: 0,
    lastLatency: "88ms",
  });

  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // AI Response Generator with Strict Institution Context Isolation
  const generateAiReply = async (userText, overrideType = null) => {
    setIsTyping(true);
    const typingDelay = Math.max(
      600,
      Math.min(1800, (aiConfig?.humanDelayMin || 2) * 500)
    );

    // Auto-detect customer name if introduced in chat
    const nameIntro = userText.match(
      /(?:nama saya|panggil saya|nama ku|panggil aku)\s+(?:bapak|ibu|mas|mbak|kak)?\s*([a-zA-Z]+)/i
    );
    if (nameIntro && nameIntro[1]) {
      const extractedName = nameIntro[1];
      const lowerUt = userText.toLowerCase();
      if (lowerUt.includes("bapak") || lowerUt.includes("pak ")) {
        setWaCustomer((prev) => ({
          ...prev,
          name: extractedName,
          honorific: "Bapak",
        }));
      } else if (lowerUt.includes("ibu") || lowerUt.includes("bu ")) {
        setWaCustomer((prev) => ({
          ...prev,
          name: extractedName,
          honorific: "Ibu",
        }));
      } else if (lowerUt.includes("mas ")) {
        setWaCustomer((prev) => ({
          ...prev,
          name: extractedName,
          honorific: "Mas",
        }));
      } else if (lowerUt.includes("mbak ")) {
        setWaCustomer((prev) => ({
          ...prev,
          name: extractedName,
          honorific: "Mbak",
        }));
      } else {
        setWaCustomer((prev) => ({ ...prev, name: extractedName }));
      }
    }

    const activeSalutation = getSalutation(waCustomer);
    const activePronoun = getPronoun(waCustomer);
    const startTime = performance.now();

    await new Promise((resolve) => setTimeout(resolve, typingDelay));

    let replyText = "";
    let qrisData = null;
    let ocrData = null;

    if (overrideType === "qris") {
      const hasProducts = activeInst.products && activeInst.products.length > 0;
      const p1 = hasProducts
        ? activeInst.products[0]
        : { name: "Pesanan Produk", price: 50000 };
      const subtotal = p1.price || 50000;
      const discountVal = Math.round(subtotal * 0.1);
      const finalTotal = subtotal - discountVal;

      replyText = `Baik ${activeSalutation}! Berikut rincian tagihan resmi untuk pesanan di ${activeInst.name}:\n\n• 1x ${p1.name}: Rp ${(p1.price || 50000).toLocaleString("id-ID")}\n• Diskon Promo QRIS (10%): -Rp ${discountVal.toLocaleString("id-ID")}\n• TOTAL PEMBAYARAN: Rp ${finalTotal.toLocaleString("id-ID")}*\n\nSilakan scan kode Dynamic QRIS di bawah ini melalui m-Banking atau e-Wallet favorit ${activePronoun}. Pembayaran akan otomatis terverifikasi secara instan.`;
      qrisData = {
        amount: finalTotal,
        expired: "15 Menit",
        merchant: activeInst.name,
      };
    } else {
      // Backend AI Chat Simulation with Strict Multi-Tenant Payload
      try {
        const historyPayload = messages.slice(-8).map((m) => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text,
        }));

        const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId: activeInst.id,
            institutionName: activeInst.name,
            sector: activeInst.sector,
            address: activeInst.address,
            hours: activeInst.hours,
            products: activeInst.products,
            promos: activeInst.promos,
            message: userText,
            customerName: waCustomer.name,
            customerPhone: waCustomer.phone,
            history: historyPayload,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.replyText) {
            replyText = json.replyText;
          }
        }
      } catch {}

      // Robust Isolated Fallback Handler (Initial-Turn-Aware)
      if (!replyText) {
        const lower = userText.toLowerCase();
        const isFirstTurn = !messages.some((m) => m.sender === "ai");
        const greetingHeader = isFirstTurn ? `Halo ${activeSalutation}! ` : "";

        if (
          lower === "2" ||
          lower === "no 2" ||
          lower === "nomor 2" ||
          lower === "opsi 2" ||
          lower === "pilihan 2" ||
          lower.includes("transfer") ||
          lower.includes("bca")
        ) {
          replyText = `Baik Kak, untuk pembayaran via Transfer Bank, silakan transfer ke rekening resmi kami:\n• Bank BCA: 8809123847 a.n. ${activeInst.name}\n\nSetelah transfer, silakan kirimkan bukti transfernya di sini agar pesanan Kakak langsung kami proses pengirimannya ya!`;
        } else if (
          lower === "1" ||
          lower === "no 1" ||
          lower === "nomor 1" ||
          lower === "opsi 1" ||
          lower === "pilihan 1" ||
          lower.includes("qris")
        ) {
          replyText = `Siap Kak! Silakan gunakan Dynamic QRIS (diskon 10% sudah otomatis diterapkan). Verifikasi lunas instan otomatis dalam 2 detik tanpa perlu kirim struk manual!`;
        } else if (
          lower.includes("produk") ||
          lower.includes("menu") ||
          lower.includes("ready") ||
          lower.includes("harga") ||
          lower.includes("katalog") ||
          lower.includes("barang") ||
          lower.includes("laper")
        ) {
          if (activeInst.products.length > 0) {
            const listStr = activeInst.products
              .slice(0, 5)
              .map(
                (p, i) =>
                  `• ${p.name} (Rp ${(p.price || 0).toLocaleString(
                    "id-ID"
                  )})${p.stock !== undefined ? ` - Stok: ${p.stock} unit` : ""}`
              )
              .join("\n");
            replyText = `${greetingHeader}Berikut daftar produk ready stock di katalog ${activeInst.name}:\n\n${listStr}\n\nAda produk yang ingin ${activePronoun} pesan sekarang?`;
          } else {
            replyText = `${greetingHeader}Katalog produk resmi ${activeInst.name} saat ini sedang dalam proses pembaruan stok. ${activePronoun} dapat menghubungi staf kami atau mengecek kembali nanti. Ada informasi lain yang ingin ditanyakan?`;
          }
        } else if (
          lower.includes("alamat") ||
          lower.includes("lokasi") ||
          lower.includes("buka") ||
          lower.includes("jam") ||
          lower.includes("toko")
        ) {
          replyText = `${greetingHeader}Lokasi resmi ${activeInst.name} beralamat di:\n${activeInst.address}\n\nJam operasional kami: ${activeInst.hours}.\nKami juga siap melayani pemesanan online dengan pengiriman cepat!`;
        } else if (
          lower.includes("promo") ||
          lower.includes("diskon") ||
          lower.includes("voucher") ||
          lower.includes("ongkir")
        ) {
          const promoStr = activeInst.promos.map((p) => `• ${p}`).join("\n");
          replyText = `${greetingHeader}Promo aktif yang berlaku hari ini di ${activeInst.name}:\n\n${promoStr}\n\nMau kami bantu pesankan produk sekarang agar langsung mendapatkan promonya?`;
        } else if (isFirstTurn) {
          replyText = `Halo ${activeSalutation}! Terima kasih sudah menghubungi layanan pelanggan ${activeInst.name}. Saya ${testPersona.botName}, asisten AI resmi yang siap membantu ${activePronoun} seputar informasi produk, harga, promo, atau pemesanan hari ini. Ada yang bisa kami bantu?`;
        } else {
          replyText = `Ada yang bisa kami bantu seputar produk atau pesanan di ${activeInst.name} Kak?`;
        }
      }
    }

    const elapsedMs = Math.round(performance.now() - startTime);
    const latencyVal = `${elapsedMs}ms`;
    const tokensUsed =
      Math.floor(userText.length / 3) + Math.floor(replyText.length / 3) + 40;

    setTokenBalance((prev) => ({
      ...prev,
      remainingTokens: Math.max(0, prev.remainingTokens - tokensUsed),
      lastDeducted: tokensUsed,
      lastLatency: latencyVal,
    }));

    const newAiMsg = {
      id: Date.now(),
      sender: "ai",
      text: replyText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      qris: qrisData,
      ocr: ocrData,
      tokens: tokensUsed,
      latency: latencyVal,
    };

    setMessages((prev) => [...prev, newAiMsg]);
    setIsTyping(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMsg("");
    generateAiReply(userText);
  };

  const handleQuickPrompt = (promptText, overrideType = null) => {
    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: promptText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMsg]);
    generateAiReply(promptText, overrideType);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-[#64748b] font-bold text-[13px]">
          <span className="w-4 h-4 rounded-full border-2 border-[#2545ff] border-t-transparent animate-spin" />
          <span>Memuat Simulator AI Terisolasi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#f8fafc] flex flex-col overflow-hidden font-sans text-[#0f172a]">
      {/* Clean Top Header Bar */}
      <header className="h-[58px] bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] text-[12px] font-bold border border-[#e2e8f0] no-underline transition-colors"
          >
            <span>←</span>
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-[#e2e8f0] hidden sm:block" />

          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-extrabold text-[#0f172a] tracking-tight">
              Simulator AI CS
            </h1>
            <span className="text-[11px] font-bold bg-[#eff6ff] text-[#2545ff] px-2 py-0.5 rounded-md border border-[#dbeafe]">
              Llama 3.3 70B
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Tenant Badge */}
          <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 rounded-full text-[12px]">
            <BuildingIcon className="w-3.5 h-3.5 text-[#2545ff]" />
            <span className="font-bold text-[#0f172a]">{activeInst.name}</span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 hidden md:inline">
              Terisolasi
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11.5px] text-[#64748b] font-mono bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 rounded-full">
            <span>Sisa Kuota:</span>
            <strong className="text-[#2545ff]">
              {tokenBalance.remainingTokens.toLocaleString("id-ID")}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setMessages([])}
            className="px-3 py-1 rounded-lg text-[12px] font-bold text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] border border-transparent hover:border-[#e2e8f0] cursor-pointer transition-colors"
          >
            Bersihkan Chat
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Institution Isolation & Bot Setup (320px) */}
        <aside className="w-full md:w-[320px] bg-white border-r border-[#e2e8f0] flex flex-col flex-shrink-0 h-full overflow-y-auto p-4 gap-4">
          {/* Card 1: Institution Isolation Info / Superadmin Tenant Switcher */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11.5px] font-bold text-[#475569] uppercase tracking-wider block">
                Instansi Terisolasi
              </label>
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheckIcon className="w-3 h-3" />
                <span>Tenant Valid</span>
              </span>
            </div>

            {role === "superadmin" ? (
              <div className="space-y-2">
                <span className="text-[#64748b] text-[11px] block">
                  Pilih Instansi untuk Pengujian Superadmin:
                </span>
                <select
                  value={selectedInstId}
                  onChange={(e) => {
                    setSelectedInstId(e.target.value);
                    setMessages([]);
                  }}
                  className="w-full bg-white border border-[#cbd5e1] rounded-lg p-2 text-[12.5px] font-bold text-[#0f172a] outline-none focus:border-[#2545ff] cursor-pointer"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.sector || "Bisnis"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-2.5 space-y-1">
                <div className="text-[13px] font-extrabold text-[#0f172a]">
                  {activeInst.name}
                </div>
                <div className="text-[11px] text-[#64748b]">
                  ID: <span className="font-mono text-[#0f172a]">{activeInst.id}</span> • Sektor: {activeInst.sector}
                </div>
              </div>
            )}

            {/* Live Catalog Summary */}
            <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] text-[11.5px] text-[#64748b] space-y-1">
              <div className="flex items-center justify-between">
                <span>Katalog Produk:</span>
                <strong className="text-[#0f172a] font-bold">
                  {activeInst.products.length} Produk Siap Jual
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Jam Buka:</span>
                <span className="text-[#0f172a] text-[11px]">{activeInst.hours}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Simulated Customer Profile */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
            <label className="text-[11.5px] font-bold text-[#475569] uppercase tracking-wider block mb-2">
              Profil Simulasi Kontak WhatsApp
            </label>
            <div className="space-y-2.5 text-[12px]">
              <div>
                <span className="text-[#64748b] text-[11px] block mb-1">
                  Nama Pelanggan Penguji
                </span>
                <input
                  type="text"
                  value={waCustomer.name}
                  onChange={(e) =>
                    setWaCustomer({ ...waCustomer, name: e.target.value })
                  }
                  placeholder="Nama Penguji..."
                  className="w-full bg-white border border-[#cbd5e1] rounded-lg p-2 text-[#0f172a] font-bold outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <span className="text-[#64748b] text-[11px] block mb-1">
                  Panggilan (Honorific)
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {["Kakak", "Bapak", "Ibu", "Mas", "Mbak"].map((hon) => (
                    <button
                      key={hon}
                      type="button"
                      onClick={() =>
                        setWaCustomer({ ...waCustomer, honorific: hon })
                      }
                      className={`py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                        waCustomer.honorific === hon
                          ? "bg-[#2545ff] text-white border-[#2545ff] shadow-xs"
                          : "bg-white text-[#64748b] border-[#cbd5e1] hover:bg-slate-50"
                      }`}
                    >
                      {hon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Bot Persona Settings */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
            <label className="text-[11.5px] font-bold text-[#475569] uppercase tracking-wider block mb-2">
              Karakter Bot Asisten CS
            </label>
            <div className="space-y-2.5 text-[12px]">
              <div>
                <span className="text-[#64748b] text-[11px] block mb-1">
                  Nama Bot CS
                </span>
                <input
                  type="text"
                  value={testPersona.botName}
                  onChange={(e) =>
                    setTestPersona({ ...testPersona, botName: e.target.value })
                  }
                  className="w-full bg-white border border-[#cbd5e1] rounded-lg p-2 text-[#0f172a] font-medium outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <span className="text-[#64748b] text-[11px] block mb-1">
                  Gaya Bahasa (Tone)
                </span>
                <select
                  value={testPersona.tone}
                  onChange={(e) =>
                    setTestPersona({ ...testPersona, tone: e.target.value })
                  }
                  className="w-full bg-white border border-[#cbd5e1] rounded-lg p-2 text-[#0f172a] font-medium outline-none focus:border-[#2545ff]"
                >
                  <option value="Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)">
                    Ramah & Santun (Online Shop)
                  </option>
                  <option value="Formal & Elegan (Bisnis B2B & Properti)">
                    Formal & Elegan (B2B)
                  </option>
                  <option value="Islami & Penuh Doa (Lembaga Donasi & Zakat)">
                    Islami & Penuh Doa
                  </option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Panel: WhatsApp Live Chat Canvas */}
        <main className="flex-1 flex flex-col h-full bg-[#f1f5f9] relative">
          {/* Active Chat Header */}
          <div className="h-[48px] bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[11.5px]">
                {activeInst.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[12.5px] font-bold text-[#0f172a] leading-none">
                  {testPersona.botName} •{" "}
                  <span className="text-[#64748b] font-normal">
                    {activeInst.name}
                  </span>
                </div>
                <div className="text-[10.5px] text-emerald-600 flex items-center gap-1 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Pengujian aktif bersama {salutation}</span>
                </div>
              </div>
            </div>

            <div className="text-[11.5px] text-[#64748b] hidden sm:block">
              Latency:{" "}
              <strong className="text-[#0f172a]">
                {tokenBalance.lastLatency}
              </strong>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-[420px] mx-auto my-auto">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#2545ff] flex items-center justify-center shadow-xs border border-[#e2e8f0] mb-3">
                  <BotIcon className="w-6 h-6" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0f172a] mb-1">
                  Mulai Pengujian AI CS {activeInst.name}
                </h3>
                <p className="text-[12px] text-[#64748b] mb-4">
                  Ketik pertanyaan untuk menguji respon kecerdasan buatan, akurasi
                  harga produk dari katalog toko, dan simulasi pembuatan tagihan QRIS.
                </p>

                {/* Minimal Quick Chips */}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPrompt("ada produk apa saja yang ready stock?")
                    }
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[11.5px] font-medium text-[#475569] border border-[#e2e8f0] shadow-2xs cursor-pointer transition-colors"
                  >
                    Tanya Katalog Produk Ready
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPrompt("alamat toko dan jam buka operasional dimana?")
                    }
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[11.5px] font-medium text-[#475569] border border-[#e2e8f0] shadow-2xs cursor-pointer transition-colors"
                  >
                    Alamat & Jam Operasional
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPrompt(
                        "saya mau pesan produk, tolong buatkan tagihan qris",
                        "qris"
                      )
                    }
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[11.5px] font-medium text-[#475569] border border-[#e2e8f0] shadow-2xs cursor-pointer transition-colors"
                  >
                    Simulasi Checkout & QRIS
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isUser ? "items-end" : "items-start"
                    } max-w-full`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[70%] shadow-2xs ${
                        isUser
                          ? "bg-[#2545ff] text-white rounded-tr-none"
                          : "bg-white text-[#0f172a] rounded-tl-none border border-[#e2e8f0]"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-[#f1f5f9] text-[10.5px]">
                          <span className="font-bold text-[#2545ff] flex items-center gap-1">
                            <BotIcon className="w-3 h-3" />
                            <span>{testPersona.botName}</span>
                          </span>
                          <span className="text-[#94a3b8] font-mono">
                            {m.tokens || 120} tok • {m.latency || "88ms"}
                          </span>
                        </div>
                      )}

                      <p className="text-[13px] leading-relaxed whitespace-pre-line break-words">
                        {m.text}
                      </p>

                      {/* Clean Simulated QRIS Card */}
                      {m.qris && (
                        <div className="mt-3 bg-[#f8fafc] p-3 rounded-xl border border-[#cbd5e1] text-center">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10.5px] font-bold text-[#0f172a]">
                              Dynamic QRIS Nasional
                            </span>
                            <span className="text-[9.5px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                              Exp: {m.qris.expired}
                            </span>
                          </div>

                          <div className="w-28 h-28 mx-auto bg-white border border-[#e2e8f0] rounded-lg flex items-center justify-center p-2 mb-2">
                            <QrIcon className="w-20 h-20 text-[#0f172a]" />
                          </div>

                          <div className="text-[14px] font-extrabold text-[#0f172a]">
                            Rp {m.qris.amount.toLocaleString("id-ID")}
                          </div>
                          <p className="text-[10.5px] text-[#64748b]">
                            BCA Mobile, GoPay, OVO, ShopeePay, Livin
                          </p>
                        </div>
                      )}

                      {/* Message Timestamp */}
                      <div
                        className={`text-[10px] mt-1.5 text-right font-medium ${
                          isUser ? "text-blue-200" : "text-[#94a3b8]"
                        }`}
                      >
                        {m.time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-none border border-[#e2e8f0] flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-medium text-[#64748b] ml-1">
                    AI sedang mengetik...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Message Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-[#e2e8f0] flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Ketik pesan untuk menguji balasan AI CS ${activeInst.name}...`}
              className="flex-1 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl py-2 px-3.5 text-[13px] text-[#0f172a] outline-none focus:border-[#2545ff] transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isTyping}
              className="px-4 py-2 bg-[#2545ff] hover:bg-[#1d37cc] disabled:opacity-50 text-white text-[13px] font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Kirim</span>
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
