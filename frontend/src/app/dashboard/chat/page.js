"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { ShieldCheckIcon, QrIcon, SparklesIcon, CheckCircleIcon, MessageSquareIcon, XIcon } from "@/components/icons";

const initialChatMessages = [
  { id: 1, sender: "customer", type: "text", text: "Halo kak, mau tanya produk ukuran XL masih ready?", time: "10:01" },
  { id: 2, sender: "ai_agent", type: "text", text: "Halo Kak! Produk ukuran XL masih ready stok. Mau kirim ke kota mana kak?", time: "10:01", isAI: true },
];

export default function ChatPage() {
  const { products, addOrder, role, currentUser, activeInstitution } = useDashboard();

  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [contacts, setContacts] = useState(
    isDefaultDemo
      ? [
          { id: 1, name: "Andi Pratama", phone: "+62 812-3456-7890", lastMsg: "Pembayaran terverifikasi...", time: "10:23", unread: 0, status: "closing", avatar: "AP", city: "Bandung, Jawa Barat" },
        ]
      : []
  );

  const [selectedContact, setSelectedContact] = useState(isDefaultDemo ? contacts[0] : null);
  const [messages, setMessages] = useState(isDefaultDemo ? initialChatMessages : []);
  const [inputText, setInputText] = useState("");
  const [showContactList, setShowContactList] = useState(true);
  const [showQrisDrawer, setShowQrisDrawer] = useState(false);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: "cs_agent",
      type: "text",
      text: inputText,
      time: "Baru saja",
    };

    setMessages([...messages, newMsg]);
    setInputText("");
  };

  const handleQuickSendQris = () => {
    const qrisMsg = {
      id: Date.now(),
      sender: "ai_agent",
      type: "qris_invoice",
      text: "Berikut kode QRIS pembayaran instan:",
      time: "Baru saja",
      isAI: true,
      qris: true,
    };
    setMessages((prev) => [...prev, qrisMsg]);
    setShowQrisDrawer(false);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] -m-4 sm:-m-6 md:-m-8 bg-[#f9f8f6] rounded-2xl overflow-hidden border border-[#f0e9e1] shadow-md">
      
      {/* 1. Contact List Column */}
      <div className={`w-full md:w-[320px] bg-white border-r border-[#f0e9e1] flex flex-col flex-shrink-0 ${!showContactList ? "hidden md:flex" : "flex"}`}>
        
        {/* Search Header */}
        <div className="p-3.5 border-b border-[#f0e9e1] bg-[#fcfbf9]">
          <div className="flex items-center gap-2 bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#969696" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Cari obrolan pembeli..."
              className="bg-transparent border-none outline-none text-[12.5px] flex-1 text-[#0c1754] placeholder:text-[#969696]"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0e9e1]">
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] text-[12.5px] flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#f0e9e1] flex items-center justify-center mb-2">
                <MessageSquareIcon className="w-5 h-5 text-[#2545ff]" />
              </div>
              <span className="font-bold text-[#0c1754]">Belum Ada Chat Masuk</span>
              <span className="text-[11.5px] text-[#969696] mt-1">Obrolan WhatsApp baru akan otomatis tampil di sini.</span>
            </div>
          ) : (
            contacts.map((c) => {
              const isSelected = selectedContact?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedContact(c);
                    setShowContactList(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#eaebf8]/60" : "hover:bg-[#f9f8f6]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0 shadow-xs">
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13.5px] font-bold text-[#0c1754] truncate">{c.name}</span>
                      <span className="text-[10.5px] text-[#969696] flex-shrink-0">{c.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#64748b] truncate">{c.lastMsg}</span>
                      {c.unread > 0 && (
                        <span className="bg-[#2545ff] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Active Chat Canvas */}
      {!selectedContact ? (
        <div className={`flex-1 flex flex-col items-center justify-center bg-[#fcfbf9] p-8 text-center ${showContactList ? "hidden md:flex" : "flex"}`}>
          <div className="w-16 h-16 rounded-2xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-3 shadow-xs">
            <MessageSquareIcon className="w-8 h-8 text-[#2545ff]" />
          </div>
          <h3 className="text-[17px] font-extrabold text-[#0c1754]">Belum Ada Percakapan WhatsApp Masuk</h3>
          <p className="text-[13px] text-[#64748b] mt-1.5 max-w-[400px] leading-relaxed">
            Pesan dari calon pelanggan yang menghubungi nomor WhatsApp bisnis Anda akan otomatis muncul di sini secara real-time.
          </p>
        </div>
      ) : (
        <>
          <div className={`flex-1 flex flex-col bg-[#f9f8f6] ${showContactList ? "hidden md:flex" : "flex"}`}>
            {/* Chat Header */}
            <div className="h-[64px] bg-white border-b border-[#f0e9e1] flex items-center justify-between px-4 sm:px-6 flex-shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowContactList(true)}
                  className="md:hidden p-1 bg-transparent border-none cursor-pointer text-[#0c1754]"
                >
                  ←
                </button>
                <div className="w-9 h-9 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[12px]">
                  {selectedContact.avatar}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#0c1754]">{selectedContact.name}</div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online WhatsApp</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQrisDrawer(true)}
                  className="px-3 py-1.5 rounded-full bg-[#2545ff] text-white font-bold text-[12px] border-none cursor-pointer hover:bg-[#1a35dd] flex items-center gap-1.5 shadow-xs"
                >
                  <QrIcon className="w-4 h-4" />
                  <span>Terbitkan QRIS</span>
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3.5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "customer" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${
                      msg.sender === "customer"
                        ? "bg-white border border-[#f0e9e1] text-[#171417] rounded-bl-xs"
                        : msg.isAI
                        ? "bg-[#eaebf8] border border-[#2545ff]/20 text-[#0c1754] rounded-br-xs"
                        : "bg-[#0c1754] text-white rounded-br-xs"
                    }`}
                  >
                    {msg.isAI && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2545ff] text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                          <SparklesIcon className="w-3 h-3" />
                          <span>AI Auto-Reply</span>
                        </span>
                      </div>
                    )}

                    <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{msg.text}</p>

                    <span className={`text-[10px] mt-1 block text-right ${msg.sender === "customer" ? "text-[#969696]" : "text-[#64748b]"}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="bg-white border-t border-[#f0e9e1] p-3 sm:p-4 flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <input
                type="text"
                placeholder="Ketik balasan chat WhatsApp..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-4 py-2.5 text-[13.5px] text-[#0c1754] placeholder:text-[#969696] outline-none font-medium focus:bg-white focus:border-[#2545ff]"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-full bg-[#2545ff] hover:bg-[#1a35dd] text-white flex items-center justify-center border-none cursor-pointer flex-shrink-0 shadow-xs active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </div>

          {/* 3. Customer Info Right Panel (Desktop) */}
          <div className="hidden xl:flex w-[260px] bg-white border-l border-[#f0e9e1] flex-col flex-shrink-0 p-5">
            <div className="text-center pb-4 border-b border-[#f0e9e1] mb-4">
              <div className="w-14 h-14 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[18px] mx-auto mb-2">
                {selectedContact.avatar}
              </div>
              <h3 className="text-[15px] font-bold text-[#0c1754]">{selectedContact.name}</h3>
              <p className="text-[12px] text-[#64748b]">{selectedContact.phone}</p>
              <div className="mt-2">
                <span className="text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pelanggan WhatsApp</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-[12.5px]">
              <div className="flex justify-between text-[#64748b]">
                <span>Lokasi:</span>
                <span className="font-bold text-[#0c1754] text-right">{selectedContact.city || "Indonesia"}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick QRIS Generator Drawer Modal */}
      {showQrisDrawer && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-5 shadow-2xl border border-[#f0e9e1] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[16px] font-extrabold text-[#0c1754]">Terbitkan QRIS Instan di Chat</h3>
              <button
                onClick={() => setShowQrisDrawer(false)}
                className="w-6 h-6 rounded-full bg-[#f9f8f6] flex items-center justify-center text-[#64748b] border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-[13px]">
              {products.length > 0 ? (
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Pilih Produk:</label>
                  <select className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] font-medium outline-none">
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Rp {Number(p.price || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-[12px]">
                  Tambahkan produk terlebih dahulu di menu Katalog Produk.
                </div>
              )}

              <button
                type="button"
                onClick={handleQuickSendQris}
                className="btn-primary !py-2.5 font-bold mt-2"
              >
                Kirim QRIS ke Chat Pembeli
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
