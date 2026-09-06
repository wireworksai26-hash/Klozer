"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  InstagramIcon,
  MessageSquareIcon,
  SparklesIcon,
  CheckCircleIcon,
  BotIcon,
  UsersIcon,
  ZapIcon,
  CameraIcon,
} from "@/components/icons";

export default function SupervisorInstagramPage() {
  const { currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Bisnis";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [activeTab, setActiveTab] = useState("dms");
  const [selectedChat, setSelectedChat] = useState(isDefaultDemo ? "ig-01" : null);
  const [replyInput, setReplyInput] = useState("");

  const [igChats, setIgChats] = useState(
    isDefaultDemo
      ? [
          {
            id: "ig-01",
            username: "@anisa_rahmawati",
            name: "Anisa Rahmawati",
            avatar: "AR",
            lastMessage: "Kak produk yang di reels kemarin size M masih ada?",
            time: "5 menit lalu",
            unread: true,
            channel: "Direct Message",
            messages: [
              { sender: "customer", text: "Halo kak, salam kenal!", time: "14:20" },
              { sender: "ai", text: `Halo kak Anisa! Terima kasih sudah DM ${cleanInstName}. Mau tanya produk yang mana nih?`, time: "14:20" },
            ],
          },
        ]
      : []
  );

  const activeConversation = igChats.find((c) => c.id === selectedChat) || igChats[0];

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeConversation) return;

    setIgChats((prev) =>
      prev.map((c) => {
        if (c.id === selectedChat) {
          return {
            ...c,
            lastMessage: replyInput,
            messages: [...c.messages, { sender: "agent", text: replyInput, time: "Baru saja" }],
          };
        }
        return c;
      })
    );
    setReplyInput("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-pink-100 text-pink-800 px-2.5 py-0.5 rounded-full border border-pink-200 flex items-center gap-1.5">
              <InstagramIcon className="w-3.5 h-3.5" />
              <span>Instagram Direct & Komentar</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Instagram Omnichannel Inbox
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola seluruh percakapan Direct Message (DM), Story Reply, dan komentar postingan Instagram dengan asisten AI otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-pink-50 border border-pink-200 text-pink-800 rounded-xl text-[12.5px] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span>@{cleanInstName.toLowerCase().replace(/[^a-z0-9]/g, "")} (Meta Graph API)</span>
          </span>
        </div>
      </div>

      {/* Main Inbox Viewport */}
      <div className="bg-white rounded-2xl border border-[#ede8e2] shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[560px]">
        {/* Left: Chat List */}
        <div className="md:col-span-1 border-r border-[#ede8e2] flex flex-col bg-[#fcfbf9]">
          <div className="p-3.5 border-b border-[#ede8e2] flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-[#1e2640]">Pesan Masuk Instagram</span>
            <span className="text-[11.5px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
              {igChats.length} Percakapan
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#ede8e2]">
            {igChats.length === 0 ? (
              <div className="p-8 text-center text-[#64748b] text-[12.5px] flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center mb-2">
                  <CameraIcon className="w-5 h-5 text-pink-600" />
                </div>
                <span className="font-bold text-[#0c1754]">Belum Ada DM Instagram</span>
                <span className="text-[11px] text-[#969696] mt-1">DM baru dari calon pembeli akan otomatis tersinkron di sini.</span>
              </div>
            ) : (
              igChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChat(chat.id)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer border-none ${
                    selectedChat === chat.id ? "bg-[#edeffe]" : "bg-transparent hover:bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                    {chat.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-[#1e2640] truncate">{chat.username}</span>
                      <span className="text-[10.5px] text-[#8f95a8]">{chat.time}</span>
                    </div>
                    <div className="text-[11px] text-pink-600 font-semibold mb-0.5">{chat.channel}</div>
                    <p className="text-[12px] text-[#5a6380] truncate">{chat.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Chat Conversation */}
        <div className="md:col-span-2 flex flex-col justify-between bg-white">
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fcfbf9]">
              <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3">
                <CameraIcon className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="text-[16px] font-extrabold text-[#0c1754]">Belum Ada Percakapan Terpilih</h3>
              <p className="text-[12.5px] text-[#64748b] mt-1 max-w-[360px]">
                Hubungkan akun Instagram profesional bisnis Anda untuk mengaktifkan fitur balas DM otomatis AI.
              </p>
            </div>
          ) : (
            <>
              {/* Top Chat Bar */}
              <div className="p-4 border-b border-[#ede8e2] flex items-center justify-between bg-[#fcfbf9]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-600 text-white flex items-center justify-center font-bold text-[12px]">
                    {activeConversation.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-[14px] text-[#1e2640]">{activeConversation.name}</div>
                    <div className="text-[11.5px] text-pink-600 font-medium">{activeConversation.username} • {activeConversation.channel}</div>
                  </div>
                </div>

                <span className="badge badge-lavender text-[11px] flex items-center gap-1">
                  <BotIcon className="w-3 h-3" />
                  <span>AI Auto-Reply Aktif</span>
                </span>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
                {activeConversation.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[80%] ${
                      m.sender === "customer" ? "self-start items-start" : "self-end items-end"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-[13px] leading-relaxed ${
                        m.sender === "customer"
                          ? "bg-[#f5f4f2] text-[#1e2640] rounded-tl-xs"
                          : "bg-[#2545ff] text-white rounded-tr-xs"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-[#8f95a8] mt-1 px-1">{m.time}</span>
                  </div>
                ))}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-[#ede8e2] bg-[#fcfbf9] flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik balasan Instagram DM..."
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#ede8e2] bg-white text-[13px] outline-none focus:border-[#2545ff]"
                />
                <button type="submit" className="btn-primary !py-2.5 !px-5 text-[13px] font-bold">
                  Kirim
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
