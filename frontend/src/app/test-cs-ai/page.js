"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
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
} from "@/components/icons";

function TestCsAiContent() {
  const { aiConfig, products, role } = useDashboard();

  // Left Panel: Live Adjustable Persona & Test Config State
  const [testPersona, setTestPersona] = useState({
    botName: aiConfig.spvPersona?.botName || "Klozer Assistant",
    tone: aiConfig.spvPersona?.tone || "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage: aiConfig.spvPersona?.greetingMessage || "Halo kak! Terima kasih sudah menghubungi kami. Mau cari produk apa hari ini?",
    voiceAccent: aiConfig.spvPersona?.voiceAccent || "Bahasa Indonesia Standar (Aksen Ramah)",
    voiceGender: aiConfig.spvPersona?.voiceGender || "Female (Putri)",
    fraudThreshold: aiConfig.ocrFraudThreshold || 85,
  });

  // Chat Messages State
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "system",
      text: "AI Testing Studio diinisialisasi. Model siap merespons simulasi WhatsApp.",
      time: "10:00",
    },
    {
      id: 2,
      sender: "ai",
      text: testPersona.greetingMessage,
      time: "10:00",
      isAI: true,
      engine: aiConfig.primaryModelName || "meta/llama-3.3-70b-instruct",
      provider: aiConfig.primaryProvider || "nvidia",
      latency: "110ms",
    },
  ]);

  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simulatedVoicePlaying, setSimulatedVoicePlaying] = useState(false);

  // Live Real-Time Telemetry
  const [telemetry, setTelemetry] = useState({
    engine: aiConfig.primaryModelName || "meta/llama-3.3-70b-instruct",
    provider: aiConfig.primaryProvider || "nvidia",
    baseUrl: aiConfig.primaryBaseUrl || "https://integrate.api.nvidia.com/v1",
    latency: "112ms",
    tokensPrompt: 52,
    tokensCompletion: 38,
    totalTokens: 90,
    ocrConfidence: null,
    status: "HTTP 200 OK (Connected)",
  });

  const [mounted, setMounted] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Simulate AI Response based on current live persona & NVIDIA NIM configuration
  const generateAiReply = (userText, overrideType = null) => {
    setIsTyping(true);
    const delay = Math.max(700, (aiConfig.humanDelayMin || 2) * 400);

    setTimeout(() => {
      let replyText = "";
      let qrisData = null;
      let ocrData = null;
      let isVoice = false;
      const lower = userText.toLowerCase();

      if (overrideType === "ocr_fake" || lower.includes("struk palsu") || lower.includes("struk_edit")) {
        replyText = `[PERINGATAN IMAGE FORENSICS]: Bukti transfer terdeteksi hasil manipulasi grafis (Font mismatch & raster anomaly: 92% Indikasi Palsu).\n\n"Halo kak, mohon maaf bukti transfer belum cocok dengan mutasi otomatis kami. Mohon cek mutasi perbankan kakak atau gunakan QRIS instan resmi agar pesanan langsung diproses."`;
        ocrData = {
          confidence: 92,
          isFraud: true,
          verdict: "DITOLAK — Anomali Tipografi Font Terdeteksi",
        };
      } else if (overrideType === "ocr_real" || lower.includes("bukti transfer") || lower.includes("struk asli") || lower.includes("sudah transfer")) {
        replyText = `Bukti transfer berhasil diverifikasi cocok 100% dengan Mutasi Bank BCA!\n\nPembayaran sebesar Rp 312.000 terkonfirmasi lunas otomatis.\nNomor Pesanan: ORD-${Math.floor(1000 + Math.random() * 9000)}\nResi Otomatis: JX${Math.floor(100000000 + Math.random() * 900000000)} (J&T Express).\n\nPaket sedang disiapkan tim gudang dan akan dikirimkan hari ini. Terima kasih kak!`;
        ocrData = {
          confidence: 98.6,
          isFraud: false,
          verdict: "VALID — Mutasi Rekening BCA Cocok (Auto-Settled)",
        };
      } else if (overrideType === "qris" || lower.includes("qris") || lower.includes("bayar") || lower.includes("rekening")) {
        replyText = `Baik kak! Berikut kode QRIS Dinamis 1-Klik resmi untuk pesanan kakak:\n\n• 2x Kemeja Batik Navy (XL): Rp 300.000\n• Ongkir J&T Express: Rp 12.000\n• Total Tagihan: Rp 312.000\n\nSilakan scan via m-BCA, GoPay, OVO, ShopeePay, atau Livin Mandiri. Begitu discan, status lunas akan otomatis terverifikasi dalam 2 detik tanpa perlu kirim struk manual.`;
        qrisData = {
          amount: 312000,
          expired: "15 Menit",
        };
      } else if (overrideType === "voice" || lower.includes("voice note") || lower.includes("vn")) {
        isVoice = true;
        replyText = `(Transkripsi Suara Pelanggan: "Halo kak, ongkir ke Bandung kena berapa ya?")\n\n"Halo kak! Untuk pengiriman ke Bandung ongkirnya cuma Rp 12.000 pakai J&T Express estimasi 1-2 hari sampai ya kak. Mau langsung dibungkus sekarang?"`;
      } else if (lower.includes("batik") || lower.includes("kemeja") || lower.includes("stok") || lower.includes("harga")) {
        replyText = `Halo kak! Untuk ${products[0]?.name || "Kemeja Batik Modern Navy"} stoknya ready (tersisa ${products[0]?.stock || 42} pcs). Harganya Rp ${(products[0]?.price || 150000).toLocaleString()} kak.\n\nKualitas katun primisima premium adem dan jahitan rapi. Mau kirim ke kota mana kak biar sekalian dihitungkan ongkirnya?`;
      } else {
        replyText = `Halo kak! Terima kasih atas pertanyaannya. ${testPersona.botName} siap membantu. Apakah ada produk tertentu atau informasi ukuran yang kakak butuhkan hari ini?`;
      }

      const latencyVal = `${Math.floor(75 + Math.random() * 55)}ms`;
      const promptTok = Math.floor(userText.length / 3) + 32;
      const compTok = Math.floor(replyText.length / 3.4);

      const newAiMsg = {
        id: Date.now(),
        sender: "ai",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAI: true,
        qris: qrisData,
        ocr: ocrData,
        isVoice,
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
        totalTokens: promptTok + compTok,
        ocrConfidence: ocrData ? `${ocrData.confidence}%` : null,
        status: "HTTP 200 OK (Stream Active)",
      });
    }, delay);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputMsg.trim() || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const curr = inputMsg;
    setInputMsg("");
    generateAiReply(curr);
  };

  const handleQuickScenario = (text, overrideType = null) => {
    if (isTyping) return;
    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    generateAiReply(text, overrideType);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "system",
        text: "Sesi simulasi chat telah di-reset.",
        time: "10:00",
      },
      {
        id: Date.now() + 1,
        sender: "ai",
        text: testPersona.greetingMessage,
        time: "10:00",
        isAI: true,
        engine: aiConfig.primaryModelName || "meta/llama-3.3-70b-instruct",
        provider: aiConfig.primaryProvider || "nvidia",
        latency: "108ms",
      },
    ]);
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
                Ruang Uji Percakapan & Validasi Endpoint Terisolasi
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-800">Model Active: {telemetry.latency}</span>
          </div>

          <button
            onClick={handleResetChat}
            className="px-3.5 py-1.5 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] text-[#64748b] hover:text-[#0c1754] text-[12px] font-bold border border-[#f0e9e1] cursor-pointer transition-all"
          >
            Reset Chat
          </button>
        </div>
      </header>

      {/* Workspace Body: Left Persona Panel + Right Full Chat Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* ==================== LEFT PANEL: PERSONA & CONTROLS ==================== */}
        <aside className="w-full md:w-[360px] lg:w-[400px] bg-white border-r border-[#f0e9e1] flex flex-col flex-shrink-0 h-full overflow-y-auto">
          
          {/* Section 1: AI Persona & Brand Voice */}
          <div className="p-5 border-b border-[#f0e9e1]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2545ff] flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Persona & Karakter AI</span>
              </span>
              <span className="text-[10.5px] font-bold bg-[#eaebf8] text-[#0c1754] px-2 py-0.5 rounded-full">
                Supervisor Config
              </span>
            </div>

            <div className="flex flex-col gap-3 text-[12.5px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Bot Asisten</label>
                <input
                  type="text"
                  value={testPersona.botName}
                  onChange={(e) => setTestPersona({ ...testPersona, botName: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2 text-[#0c1754] font-medium outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Gaya Bahasa (Tone of Voice)</label>
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

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Template Salam Sambutan</label>
                <textarea
                  rows="2"
                  value={testPersona.greetingMessage}
                  onChange={(e) => setTestPersona({ ...testPersona, greetingMessage: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2 text-[#0c1754] font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Karakter Suara</label>
                  <select
                    value={testPersona.voiceGender}
                    onChange={(e) => setTestPersona({ ...testPersona, voiceGender: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-1.5 text-[#0c1754] font-medium outline-none text-[11.5px]"
                  >
                    <option value="Female (Putri)">Wanita (Putri)</option>
                    <option value="Male (Bagas)">Pria (Bagas)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Aksen Audio</label>
                  <input
                    type="text"
                    value={testPersona.voiceAccent}
                    onChange={(e) => setTestPersona({ ...testPersona, voiceAccent: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-1.5 text-[#0c1754] font-medium outline-none text-[11.5px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 1-Click Scenario Trigger Buttons */}
          <div className="p-5 border-b border-[#f0e9e1]">
            <div className="flex items-center gap-2 mb-3">
              <ZapIcon className="w-4 h-4 text-[#2545ff]" />
              <h3 className="text-[13px] font-extrabold text-[#0c1754]">1-Klik Skenario Pengujian</h3>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleQuickScenario("Halo kak, kemeja batik navy ukuran XL masih ada diskon?")}
                disabled={isTyping}
                className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <LayersIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>Tanya Stok Produk & Varian</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickScenario("Aku mau ambil 2 pcs ya kak, minta QRIS biar langsung bayar.", "qris")}
                disabled={isTyping}
                className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <QrIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>Terbitkan Dynamic QRIS</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickScenario("Halo kak, ongkir ke Bandung kena berapa ya?", "voice")}
                disabled={isTyping}
                className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f6] hover:bg-[#eaebf8] text-[12px] font-bold text-[#0c1754] border border-[#f0e9e1] hover:border-[#2545ff]/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <MicIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                  <span>Kirim Voice Note Audio (STT/TTS)</span>
                </span>
                <span className="text-[#2545ff]">→</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickScenario("Sudah aku transfer ya kak sebesar Rp 312.000 ke BCA.", "ocr_real")}
                disabled={isTyping}
                className="w-full text-left p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[12px] font-bold text-emerald-800 border border-emerald-200 cursor-pointer transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Uji Forensik Struk Valid</span>
                </span>
                <span className="text-emerald-600">→</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickScenario("Ini bukti transfer editan photoshop saya.", "ocr_fake")}
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

          {/* Section 3: Telemetry & Engine Details */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <CpuIcon className="w-4 h-4 text-[#2545ff]" />
              <h3 className="text-[13px] font-extrabold text-[#0c1754]">Telemetri Mesin Aktif</h3>
            </div>

            <div className="bg-[#f9f8f6] p-3.5 rounded-xl border border-[#f0e9e1] flex flex-col gap-2 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Provider:</span>
                <span className="font-bold text-[#0c1754] uppercase">{telemetry.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Model:</span>
                <span className="font-mono font-bold text-[#2545ff] truncate max-w-[170px]" title={telemetry.engine}>
                  {telemetry.engine}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Latensi Respon:</span>
                <span className="font-bold text-emerald-600">{telemetry.latency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Token Dipakai:</span>
                <span className="font-mono font-bold text-[#0c1754]">{telemetry.totalTokens} Tokens</span>
              </div>
            </div>
          </div>

        </aside>

        {/* ==================== RIGHT PANEL: FULL-WIDTH WHATSAPP CHAT CANVAS ==================== */}
        <main className="flex-1 flex flex-col h-full bg-[#f4f2ee] relative">
          
          {/* Chat Header Bar */}
          <div className="h-[60px] bg-white border-b border-[#f0e9e1] flex items-center justify-between px-6 flex-shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[13px]">
                {testPersona.botName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[14px] font-bold text-[#0c1754]">{testPersona.botName}</div>
                <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>WhatsApp Cloud API Simulasi Aktif</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[12px] font-bold text-[#64748b]">
              <span className="hidden sm:inline">Engine:</span>
              <span className="font-mono text-[#2545ff] bg-[#eaebf8] px-2.5 py-1 rounded-full border border-[#2545ff]/20">
                {telemetry.engine}
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "system"
                    ? "justify-center"
                    : msg.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {msg.sender === "system" ? (
                  <div className="px-4 py-1.5 bg-[#eaebf8] text-[#2545ff] text-[11.5px] font-bold rounded-full border border-[#2545ff]/20 shadow-xs">
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-3.5 shadow-xs ${
                      msg.sender === "user"
                        ? "bg-[#0c1754] text-white rounded-br-xs"
                        : "bg-white border border-[#f0e9e1] text-[#171417] rounded-bl-xs"
                    }`}
                  >
                    {msg.isAI && (
                      <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-[#f0e9e1] text-[10.5px]">
                        <span className="font-extrabold uppercase tracking-wider text-[#2545ff] flex items-center gap-1">
                          <SparklesIcon className="w-3 h-3" />
                          <span>{msg.provider === "nvidia" ? "NVIDIA NIM" : msg.provider}</span>
                        </span>
                        <span className="font-mono text-[#969696]">Latensi: {msg.latency}</span>
                      </div>
                    )}

                    {/* QRIS Widget in Chat */}
                    {msg.qris ? (
                      <div className="my-2 p-4 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] text-center text-[#0c1754]">
                        <div className="text-[12.5px] font-bold mb-2">Kode Pembayaran QRIS Dinamis</div>
                        <div className="w-36 h-36 mx-auto bg-white rounded-xl flex items-center justify-center mb-2 border border-[#f0e9e1] shadow-xs">
                          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#0c1754" strokeWidth="1.2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                          </svg>
                        </div>
                        <div className="text-[18px] font-extrabold text-[#2545ff]">Rp {msg.qris.amount.toLocaleString()}</div>
                        <span className="text-[10px] text-[#969696]">Auto-Settlement BCA • Berlaku 15 Menit</span>
                      </div>
                    ) : null}

                    {/* OCR Result Box */}
                    {msg.ocr ? (
                      <div className={`my-2 p-3.5 rounded-xl border text-[12.5px] font-medium ${
                        msg.ocr.isFraud ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      }`}>
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          {msg.ocr.isFraud ? <AlertTriangleIcon className="w-4 h-4" /> : <ShieldCheckIcon className="w-4 h-4" />}
                          <span>Hasil Forensik OCR: {msg.ocr.verdict}</span>
                        </div>
                        <div className="text-[11px] opacity-80">Tingkat Keyakinan: {msg.ocr.confidence}%</div>
                      </div>
                    ) : null}

                    {/* Voice Note Simulation */}
                    {msg.isVoice ? (
                      <div className="my-2 p-3 bg-[#eaebf8] rounded-xl border border-[#2545ff]/20 text-[12px] flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSimulatedVoicePlaying(!simulatedVoicePlaying)}
                          className="w-9 h-9 rounded-full bg-[#2545ff] text-white flex items-center justify-center border-none text-[12px] cursor-pointer shadow-xs"
                          aria-label={simulatedVoicePlaying ? "Jeda" : "Putar"}
                        >
                          {simulatedVoicePlaying ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-[#2545ff] rounded-full w-4/5 mb-1" />
                          <span className="text-[10px] text-[#64748b]">
                            Voice Audio ({testPersona.voiceGender} • {testPersona.voiceAccent})
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                    <span className={`text-[10px] mt-1.5 block text-right ${msg.sender === "user" ? "text-white/70" : "text-[#969696]"}`}>
                      {msg.time}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#f0e9e1] rounded-2xl px-5 py-3 rounded-bl-xs flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 bg-[#2545ff] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[#2545ff] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-[#2545ff] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11.5px] font-bold text-[#64748b] ml-1">
                    {aiConfig.primaryProvider === "nvidia" ? "NVIDIA NIM memproses respon..." : "AI sedang mengetik..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-4 bg-white border-t border-[#f0e9e1] flex-shrink-0">
            <form onSubmit={handleSend} className="max-w-[900px] mx-auto flex items-center gap-2 sm:gap-3">
              <input
                type="text"
                placeholder="Ketik pertanyaan untuk menguji AI (misal: tanya stok, minta qris, kirim bukti bayar)..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                disabled={isTyping}
                className="flex-1 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-5 py-3 text-[13.5px] text-[#0c1754] placeholder:text-[#969696] outline-none font-medium focus:bg-white focus:border-[#2545ff] transition-all shadow-xs"
              />
              <button
                type="submit"
                disabled={isTyping || !inputMsg.trim()}
                className="px-6 py-3 rounded-full bg-[#2545ff] hover:bg-[#1a35dd] text-white font-bold text-[13.5px] border-none cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all shadow-md active:scale-95 flex-shrink-0"
              >
                <span>Kirim</span>
                <ZapIcon className="w-4 h-4" />
              </button>
            </form>
          </div>

        </main>

      </div>

    </div>
  );
}

export default function StandaloneTestCsAiPage() {
  return (
    <DashboardProvider>
      <TestCsAiContent />
    </DashboardProvider>
  );
}
