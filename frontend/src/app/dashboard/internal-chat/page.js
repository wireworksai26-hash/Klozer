"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  UsersIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  CrownIcon,
  ZapIcon,
} from "@/components/icons";

export default function SupervisorInternalChatPage() {
  const { teamMembers } = useDashboard();
  const [activeChannel, setActiveChannel] = useState("general");
  const [chatInput, setChatInput] = useState("");

  const channels = [
    { id: "general", name: "# umum-operasional", unread: 0, desc: "Koordinasi operasional harian seluruh tim" },
    { id: "diskon", name: "# approval-diskon", unread: 2, desc: "Permintaan diskon khusus dan voucher custom" },
    { id: "kurir", name: "# kendala-pengiriman", unread: 0, desc: "Update resi, retur, dan komplain ekspedisi" },
    { id: "finance", name: "# rekonsiliasi-keuangan", unread: 1, desc: "Konfirmasi transfer manual dan mutasi bank" },
  ];

  const [messages, setMessages] = useState({
    general: [
      { id: 1, sender: "Rian Supervisor", role: "SPV", avatar: "RS", text: "Selamat pagi tim! Hari ini fokus follow-up lead promo weekend ya. Target closing 40 pesanan.", time: "08:30" },
      { id: 2, sender: "Sarah Amalia", role: "CS Senior", avatar: "SA", text: "Siap pak Rian! Semua leads dari TikTok jam 08:00 sudah dibalas bot dan masuk antrian follow-up.", time: "08:35" },
      { id: 3, sender: "Budi Santoso", role: "CS Junior", avatar: "BS", text: "Pagi pak, untuk stok Gamis Silk Maroon sisa 5 pcs lagi ya.", time: "08:42" },
    ],
    diskon: [
      { id: 4, sender: "Sarah Amalia", role: "CS Senior", avatar: "SA", text: "Pak Rian, ada calon pembeli mau order 30 pcs kemeja batik untuk seragam kantor. Minta diskon 15%, apakah di-approve?", time: "14:15" },
      { id: 5, sender: "Rian Supervisor", role: "SPV", avatar: "RS", text: "Approve Sarah! Kasih diskon 15% + bonus masker batik ya. Buatkan invoice resmi format B2B.", time: "14:18" },
    ],
    kurir: [
      { id: 6, sender: "Budi Santoso", role: "CS Junior", avatar: "BS", text: "Resi J&T untuk order ORD-091 sudah di-pickup kurir sore ini jam 16:00.", time: "16:05" },
    ],
    finance: [
      { id: 7, sender: "Dewi Finance", role: "Finance", avatar: "DF", text: "Transfer manual an. Hendra Gunawan Rp 650.000 via BCA sudah terverifikasi mutasi bank lunas ya.", time: "15:20" },
    ],
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: "Rian Supervisor",
      role: "Supervisor (Anda)",
      avatar: "RS",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg],
    }));
    setChatInput("");
  };

  const currentMessages = messages[activeChannel] || [];
  const currentChannelObj = channels.find((c) => c.id === activeChannel);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Komunikasi Internal Tim</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Ruang Obrolan Internal Staf (Internal Chat)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Saluran komunikasi internal antar staf CS, Supervisor, dan Finance untuk approval diskon dan briefing harian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>4 Staf Online</span>
          </span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-[#ede8e2] shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[580px]">
        {/* Left: Channels & Staff list */}
        <div className="md:col-span-1 border-r border-[#ede8e2] bg-[#fcfbf9] flex flex-col justify-between">
          <div className="p-3.5">
            <span className="text-[11px] font-bold uppercase text-[#8f95a8] block mb-2 px-2">
              Saluran Channel
            </span>
            <div className="flex flex-col gap-1">
              {channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChannel(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold flex items-center justify-between transition-all cursor-pointer border-none ${
                    activeChannel === c.id
                      ? "bg-[#2545ff] text-white shadow-xs"
                      : "bg-transparent text-[#5a6380] hover:bg-[#f5f4f2] hover:text-[#1e2640]"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.unread > 0 && activeChannel !== c.id && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-bold uppercase text-[#8f95a8] block mt-5 mb-2 px-2">
              Anggota Tim (Online)
            </span>
            <div className="flex flex-col gap-2 px-2 text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#1e2640]">Sarah Amalia</span>
                <span className="text-[10px] text-[#8f95a8]">(CS)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#1e2640]">Budi Santoso</span>
                <span className="text-[10px] text-[#8f95a8]">(CS)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#1e2640]">Dewi Lestari</span>
                <span className="text-[10px] text-[#8f95a8]">(Finance)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Message Stream */}
        <div className="md:col-span-3 flex flex-col justify-between bg-white">
          {/* Channel Header */}
          <div className="p-4 border-b border-[#ede8e2] bg-[#fcfbf9] flex items-center justify-between">
            <div>
              <div className="font-extrabold text-[15px] text-[#1e2640]">{currentChannelObj?.name}</div>
              <div className="text-[12px] text-[#64748b]">{currentChannelObj?.desc}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
            {currentMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[13.5px] text-[#1e2640]">{msg.sender}</span>
                    <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded">
                      {msg.role}
                    </span>
                    <span className="text-[11px] text-[#8f95a8]">{msg.time}</span>
                  </div>
                  <div className="p-3 bg-[#f5f4f2] text-[#1e2640] rounded-2xl rounded-tl-xs text-[13px] leading-relaxed max-w-[90%]">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3.5 border-t border-[#ede8e2] flex items-center gap-2 bg-white">
            <input
              type="text"
              placeholder={`Kirim pesan ke ${currentChannelObj?.name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 text-[13px] bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-4 py-2.5 text-[#1e2640] outline-none focus:border-[#2545ff]"
            />
            <button type="submit" className="btn-primary !py-2.5 !px-5 text-[13px] font-bold cursor-pointer">
              Kirim
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
