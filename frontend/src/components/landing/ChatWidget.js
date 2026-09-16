"use client";
import { useState, useEffect } from "react";
import { SparklesIcon, KlozerIcon, XIcon } from "@/components/icons";
import { API_BASE_URL } from "@/utils/apiConfig";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Halo! Saya Asisten AI Klozer. Ada yang bisa saya bantu terkait otomatisasi WhatsApp, Dynamic QRIS, atau integrasi bisnis Anda?",
      time: "Sekarang",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const quickChips = [
    "Biaya QRIS?",
    "Aman dari blokir?",
    "Bisa di HP?",
    "Voice AI?",
  ];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = async (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { sender: "user", text, time: "Sekarang" },
    ]);
    setInputText("");
    setIsTyping(true);

    try {
      let reply = "";
      try {
        const res = await fetch(`${API_BASE_URL}/ai/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
        const data = await res.json();
        if (data && data.answer) {
          reply = data.answer;
        }
      } catch (err) {
        // Fallback if offline
      }

      if (!reply) {
        if (text.toLowerCase().includes("qris") || text.toLowerCase().includes("biaya")) {
          reply = "Biaya transaksi Dynamic QRIS resmi Bank Indonesia sangat hemat, hanya Rp 750 flat per transaksi sukses tanpa biaya bulanan tersembunyi.";
        } else if (text.toLowerCase().includes("blokir") || text.toLowerCase().includes("aman")) {
          reply = "Sangat aman! Klozer menggunakan WhatsApp Cloud API resmi Meta dengan proteksi anti-banned dan jeda pengiriman cerdas.";
        } else if (text.toLowerCase().includes("hp") || text.toLowerCase().includes("ponsel")) {
          reply = "Tentu saja! Dashboard dan bot Klozer berjalan mulus di browser HP Android, iPhone, tablet, maupun laptop Anda.";
        } else if (text.toLowerCase().includes("voice") || text.toLowerCase().includes("suara")) {
          reply = "AI Voice Note Klozer mengenali pesan suara bahasa Indonesia dengan berbagai logat daerah, lalu otomatis mentranskripsi dan memproses pesanan ke kasir.";
        } else {
          reply = "Klozer dapat langsung dihubungkan ke WhatsApp Cloud API bisnis Anda dalam 15 menit tanpa koding!";
        }
      }

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: reply, time: "Sekarang" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Klozer adalah platform AI Conversational Commerce dan Smart CRM yang mengubah WhatsApp bisnis Anda menjadi mesin penjualan otomatis 24 jam nonstop.",
          time: "Sekarang",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Launchers (Mobile & Desktop) */}
      {!isOpen && (
        <>
          {/* Mobile Floating Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden fixed bottom-5 right-5 z-40 w-13 h-13 rounded-full bg-[#2545ff] text-white shadow-[0_8px_25px_rgba(37,69,255,0.45)] flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 border-2 border-white"
            title="Tanya AI Klozer"
            aria-label="Buka Chat AI"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
            <KlozerIcon className="w-7 h-7 rounded-full" />
          </button>

          {/* Desktop Right-Edge Vertical Tab */}
          <button
            onClick={() => setIsOpen(true)}
            className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#0c1754] hover:bg-[#2545ff] text-white py-3 px-2.5 rounded-l-2xl shadow-[0_8px_30px_rgba(12,23,84,0.3)] flex-col items-center gap-2 cursor-pointer transition-all duration-300 hover:pl-3.5 group border-none"
            title="Buka Tanya Asisten AI Klozer"
            aria-label="Buka Asisten AI"
          >
            <div className="relative">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
              <KlozerIcon className="w-6 h-6 rounded-lg group-hover:scale-105 transition-transform" />
            </div>
            <span
              className="text-[12px] font-bold tracking-wider uppercase text-white/90"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Tanya AI Klozer
            </span>
          </button>
        </>
      )}

      {/* Compact Floating Side Card (NOT Full Screen) */}
      {isOpen && (
        <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-50 w-[calc(100vw-32px)] sm:w-[380px] max-w-[380px] h-[520px] max-h-[85vh] bg-white rounded-[24px] shadow-[0_20px_70px_rgba(12,23,84,0.28)] border border-[#f0e9e1] flex flex-col overflow-hidden animate-scale-pop">

          {/* Header */}
          <div className="p-4 bg-[#0c1754] text-white flex items-center justify-between flex-shrink-0 relative z-20">
            <div className="flex items-center gap-2.5">
              <KlozerIcon className="w-8 h-8 rounded-xl shadow-sm flex-shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[14px]">Asisten AI Klozer</span>
                  <span className="text-[9px] font-extrabold bg-[#2545ff] text-white px-1.5 py-0.5 rounded-full">
                    24/7
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Siap Menjawab</span>
                </div>
              </div>
            </div>

            {/* Direct Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white border-none cursor-pointer transition-colors active:scale-90"
              aria-label="Tutup panel chat"
              title="Tutup Chat"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Suggestion Chips Header */}
          <div className="px-3.5 py-2.5 bg-[#f9f8f6] border-b border-[#f0e9e1] flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-[#eaebf8] hover:text-[#2545ff] text-[#171417] text-[11px] font-medium border border-[#f0e9e1] cursor-pointer transition-all hover:scale-105"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Message Feed */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-[#fcfbf9]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col max-w-[90%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-[12.5px] leading-relaxed whitespace-pre-line ${msg.sender === "user"
                      ? "bg-[#2545ff] text-white rounded-br-none shadow-xs font-medium"
                      : "bg-white text-[#171417] rounded-bl-none border border-[#f0e9e1] shadow-xs"
                    }`}
                >
                  {typeof msg.text === "string"
                    ? msg.text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*([^*\n]+)\*/g, "$1")
                    : msg.text}
                </div>
                <span className="text-[9.5px] text-[#969696] mt-0.5 px-1 font-medium">{msg.time}</span>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="self-start bg-white p-2.5 rounded-2xl rounded-bl-none border border-[#f0e9e1] flex items-center gap-1.5 w-fit shadow-xs">
                <span className="text-[10px] text-[#969696]">AI sedang mengetik</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff] typing-dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff] typing-dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#2545ff] typing-dot-3" />
              </div>
            )}
          </div>

          {/* Compact Input Form */}
          <div className="p-3 bg-white border-t border-[#f0e9e1] flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-3.5 py-1.5 focus-within:border-[#2545ff] focus-within:bg-white transition-all shadow-xs"
            >
              <input
                type="text"
                placeholder="Tanya seputar Klozer..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 text-[12.5px] bg-transparent border-none outline-none text-[#171417] placeholder:text-[#969696]"
              />
              <button
                type="submit"
                className="w-7 h-7 rounded-full bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 border-none cursor-pointer hover:bg-[#1a35dd] hover:scale-105 active:scale-95 transition-all shadow-xs"
                aria-label="Kirim pertanyaan"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
