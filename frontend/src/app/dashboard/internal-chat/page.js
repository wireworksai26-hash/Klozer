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
            <span className="text-micro font-bold uppercase tracking-wider bg-accent-100 text-accent-800 px-2.5 py-0.5 rounded-full border border-accent-200 flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Komunikasi Internal Tim</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Ruang Obrolan Internal Staf (Internal Chat)
          </h1>
          <p className="text-label text-fg-muted">
            Saluran komunikasi internal antar staf CS, Supervisor, dan Finance untuk approval diskon dan briefing harian ({cleanInstName}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-success-50 border border-success-200 text-success-800 rounded-xl text-caption font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span>{onlineMembers.length} Staf Terhubung</span>
          </span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[580px]">
        {/* Left: Channels & Staff list */}
        <div className="md:col-span-1 border-r border-line bg-soft flex flex-col justify-between">
          <div className="p-3.5">
            <span className="text-micro font-bold uppercase text-fg-subtle block mb-2 px-2">
              Saluran Channel
            </span>
            <div className="flex flex-col gap-1">
              {channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChannel(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-label font-bold flex items-center justify-between transition-all cursor-pointer border-none ${
                    activeChannel === c.id
                      ? "bg-brand text-white shadow-xs"
                      : "bg-transparent text-fg-muted hover:bg-sunken hover:text-fg"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.unread > 0 && activeChannel !== c.id && (
                    <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-danger-500 text-white">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <span className="text-micro font-bold uppercase text-fg-subtle block mt-5 mb-2 px-2">
              Anggota Tim ({onlineMembers.length})
            </span>
            <div className="flex flex-col gap-2 px-2 text-caption">
              {onlineMembers.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="font-bold text-fg truncate">{m.name}</span>
                  <span className="text-micro text-fg-subtle">({m.role})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Message Stream */}
        <div className="md:col-span-3 flex flex-col justify-between bg-white">
          {/* Channel Header */}
          <div className="p-4 border-b border-line bg-soft flex items-center justify-between">
            <div>
              <div className="font-bold text-body-sm text-fg">{currentChannelObj?.name}</div>
              <div className="text-caption text-fg-muted">{currentChannelObj?.desc}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 flex flex-col gap-3.5 overflow-y-auto max-h-[440px]">
            {currentMessages.length === 0 ? (
              <div className="py-12 text-center text-fg-subtle text-label">
                Belum ada pesan di channel ini. Mulai percakapan pertama untuk koordinasi tim.
              </div>
            ) : (
              currentMessages.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-soft text-brand font-bold text-caption flex items-center justify-center shrink-0">
                    {m.avatar}
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fg text-label">{m.sender}</span>
                      <span className="text-micro px-1.5 py-0.2 rounded bg-line text-fg-muted font-bold">
                        {m.role}
                      </span>
                      <span className="text-micro text-fg-subtle">{m.time}</span>
                    </div>
                    <div className="text-label text-fg bg-canvas p-2.5 rounded-2xl rounded-tl-xs border border-line leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3.5 border-t border-line bg-soft flex items-center gap-2">
            <input
              type="text"
              placeholder={`Kirim pesan ke ${currentChannelObj?.name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-line rounded-xl text-label text-fg outline-none focus:border-brand"
            />
            <button type="submit" className="btn-primary !py-2.5 !px-5 text-label font-bold">
              Kirim
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
