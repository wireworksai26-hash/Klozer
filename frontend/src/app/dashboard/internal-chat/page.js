"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  UsersIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  CrownIcon,
  ZapIcon,
  SendIcon,
} from "@/components/icons";

export default function SupervisorInternalChatPage() {
  const { teamMembers = [], currentUser, activeInstitution } = useDashboard();
  const [activeChannel, setActiveChannel] = useState("general");
  const [chatInput, setChatInput] = useState("");

  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const channels = [
    { id: "general", name: "# umum-operasional", unread: 0, desc: "Koordinasi operasional harian seluruh tim" },
    { id: "diskon", name: "# approval-diskon", unread: 0, desc: "Permintaan diskon khusus dan voucher custom" },
    { id: "kurir", name: "# kendala-pengiriman", unread: 0, desc: "Update resi, retur, dan komplain ekspedisi" },
    { id: "finance", name: "# rekonsiliasi-keuangan", unread: 0, desc: "Konfirmasi transfer manual dan mutasi bank" },
  ];

  // Online members dynamically derived from current tenant team
  const onlineMembers = isDefaultDemo
    ? [
        { name: "Sarah Amalia", role: "CS Senior" },
        { name: "Budi Santoso", role: "CS Junior" },
        { name: "Dewi Lestari", role: "Finance" },
      ]
    : [
        { name: currentUser?.name || "Owner / SPV", role: currentUser?.role === "superadmin" ? "Owner" : "Supervisor", isSelf: true },
        ...teamMembers.map((m) => ({ name: m.name, role: m.role || "Staf CS" })),
      ];

  const [messages, setMessages] = useState(
    isDefaultDemo
      ? {
          general: [
            { id: 1, sender: "Rian Supervisor", role: "SPV", avatar: "RS", text: "Selamat pagi tim! Hari ini fokus follow-up lead promo weekend ya. Target closing 40 pesanan.", time: "08:30" },
          ],
          diskon: [],
          kurir: [],
          finance: [],
        }
      : {
          general: [
            { id: 1, sender: "Sistem Klozer", role: "Bot", avatar: "KL", text: `Selamat datang di ruang obrolan internal tim ${cleanInstName}. Gunakan channel ini untuk koordinasi harian tim SPV dan Customer Service.`, time: "Hari ini" },
          ],
          diskon: [],
          kurir: [],
          finance: [],
        }
  );

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: currentUser?.name || "Supervisor",
      role: "Anda",
      avatar: currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "SP",
      text: chatInput,
      time: "Baru saja",
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
            Saluran komunikasi internal antar staf CS, Supervisor, dan Finance untuk approval diskon dan briefing harian ({cleanInstName}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{onlineMembers.length} Staf Terhubung</span>
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
              Anggota Tim ({onlineMembers.length})
            </span>
            <div className="flex flex-col gap-2 px-2 text-[12.5px]">
              {onlineMembers.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[#1e2640] truncate">{m.name}</span>
                  <span className="text-[10px] text-[#8f95a8]">({m.role})</span>
                </div>
              ))}
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
          <div className="p-4 flex flex-col gap-3.5 overflow-y-auto max-h-[440px]">
            {currentMessages.length === 0 ? (
              <div className="py-12 text-center text-[#8f95a8] text-[13px]">
                Belum ada pesan di channel ini. Mulai percakapan pertama untuk koordinasi tim.
              </div>
            ) : (
              currentMessages.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#eaebf8] text-[#2545ff] font-extrabold text-[12px] flex items-center justify-center shrink-0">
                    {m.avatar}
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1e2640] text-[13px]">{m.sender}</span>
                      <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-[#f0e9e1] text-[#64748b] font-bold">
                        {m.role}
                      </span>
                      <span className="text-[10.5px] text-[#8f95a8]">{m.time}</span>
                    </div>
                    <div className="text-[13px] text-[#1e2640] bg-[#f9f8f6] p-2.5 rounded-2xl rounded-tl-xs border border-[#ede8e2] leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3.5 border-t border-[#ede8e2] bg-[#fcfbf9] flex items-center gap-2">
            <input
              type="text"
              placeholder={`Kirim pesan ke ${currentChannelObj?.name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-[#ede8e2] rounded-xl text-[13px] text-[#1e2640] outline-none focus:border-[#2545ff]"
            />
            <button type="submit" className="btn-primary !py-2.5 !px-5 text-[13px] font-bold">
              Kirim
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
