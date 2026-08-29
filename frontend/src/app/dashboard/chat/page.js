"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { ShieldCheckIcon, QrIcon, SparklesIcon, CheckCircleIcon } from "@/components/icons";

const initialChatMessages = [
  { id: 1, sender: "customer", type: "text", text: "Halo kak, mau tanya Kemeja Batik Modern Navy ukuran XL masih ready?", time: "10:01" },
  { id: 2, sender: "ai_agent", type: "text", text: "Halo Kak Andi! Kemeja Batik Modern Navy XL masih ready stok (42 pcs). Harganya Rp 150.000/pcs. Mau kirim ke kota mana kak?", time: "10:01", isAI: true },
  { id: 3, sender: "customer", type: "text", text: "Mau pesan 2 pcs kirim ke Bandung ya kak.", time: "10:05" },
  { id: 4, sender: "ai_agent", type: "text", text: "Siap kak! Rincian Pesanan:\n\n• 2x Kemeja Batik Modern Navy (XL) — Rp 300.000\n• Ongkir J&T Express ke Bandung — Rp 12.000\n\nTotal: Rp 312.000\n\nMau bayar via QRIS otomatis (1-klik lunas) atau Transfer BCA kak?", time: "10:06", isAI: true },
  { id: 5, sender: "customer", type: "text", text: "QRIS aja kak biar langsung scan dari m-BCA.", time: "10:10" },
  { id: 6, sender: "ai_agent", type: "qris_invoice", text: "Berikut QRIS Dynamic resmi untuk pesanan Kak Andi:", time: "10:10", isAI: true, qris: true },
  { id: 7, sender: "customer", type: "text", text: "Sudah aku scan dan bayar ya kak, statusnya lunas.", time: "10:22" },
  { id: 8, sender: "ai_agent", type: "text", text: "Pembayaran Rp 312.000 terverifikasi lunas otomatis!\n\nNomor Pesanan: ORD-8921\nNomor Resi: JX9821448201 (J&T Express)\n\nPaket sedang disiapkan dan dijadwalkan pick-up kurir jam 14.00 WIB hari ini.", time: "10:23", isAI: true },
];

export default function ChatPage() {
  const { products, addOrder, role } = useDashboard();

  const [contacts, setContacts] = useState([
    { id: 1, name: "Andi Pratama", phone: "+62 812-3456-7890", lastMsg: "Pembayaran Rp 312.000 terverifikasi...", time: "10:23", unread: 0, status: "closing", avatar: "AP", city: "Bandung, Jawa Barat" },
    { id: 2, name: "Siti Nurhaliza", phone: "+62 812-9876-5432", lastMsg: "Sudah saya transfer kak, ini buktinya", time: "10:15", unread: 1, status: "closing", avatar: "SN", city: "Surabaya, Jawa Timur" },
    { id: 3, name: "Rizky Maulana", phone: "+62 856-7890-1234", lastMsg: "Kirim voice note tanya ongkir", time: "09:48", unread: 2, status: "in_progress", avatar: "RM", city: "Yogyakarta" },
    { id: 4, name: "Dewi Lestari", phone: "+62 890-1234-5678", lastMsg: "Kapan barangnya sampai ya?", time: "09:30", unread: 0, status: "repeat", avatar: "DL", city: "Semarang" },
  ]);

  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [messages, setMessages] = useState(initialChatMessages);
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
          {contacts.map((c) => {
            const isSelected = selectedContact.id === c.id;
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
          })}
        </div>
      </div>

      {/* 2. Active Chat Canvas */}
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

                {msg.qris ? (
                  <div className="bg-white rounded-xl p-4 border border-[#f0e9e1] text-center my-1 text-[#0c1754]">
                    <div className="text-[12px] font-bold mb-2">{msg.text}</div>
                    <div className="w-36 h-36 mx-auto bg-[#f9f8f6] rounded-xl flex items-center justify-center mb-2 border border-[#f0e9e1]">
                      <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#0c1754" strokeWidth="1.2">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      </svg>
                    </div>
                    <div className="text-[18px] font-extrabold text-[#2545ff]">Rp 312.000</div>
                    <span className="text-[10px] text-[#969696]">Berlaku 15 menit • Auto-Settlement</span>
                  </div>
                ) : (
                  <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                )}

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
              <span>COD Aman (94%)</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-[12.5px]">
          <div className="flex justify-between text-[#64748b]">
            <span>Lokasi:</span>
            <span className="font-bold text-[#0c1754] text-right">{selectedContact.city}</span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>Total Belanja:</span>
            <span className="font-bold text-[#0c1754]">Rp 1.450.000</span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>Sumber:</span>
            <span className="font-bold text-[#2545ff]">Instagram Ads</span>
          </div>
        </div>
      </div>

      {/* Quick QRIS Generator Drawer Modal */}
      {showQrisDrawer && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-5 shadow-2xl border border-[#f0e9e1] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[16px] font-extrabold text-[#0c1754]">Terbitkan QRIS Instan di Chat</h3>
              <button
                onClick={() => setShowQrisDrawer(false)}
                className="w-6 h-6 rounded-full bg-[#f9f8f6] flex items-center justify-center text-[#64748b] border-none cursor-pointer font-bold text-[12px]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-[13px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Pilih Produk:</label>
                <select className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] font-medium outline-none">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Rp {p.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Jumlah (Qty)</label>
                  <input type="number" defaultValue="2" className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2 font-bold" />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Ongkir (Rp)</label>
                  <input type="number" defaultValue="12000" className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2 font-bold" />
                </div>
              </div>

              <div className="p-3 bg-[#eaebf8] rounded-xl text-[12px] text-[#0c1754] font-medium">
                Tagihan Total: <strong className="text-[#2545ff] text-[14px]">Rp 312.000</strong> (QRIS Dinamis 15 Menit)
              </div>

              <button
                onClick={handleQuickSendQris}
                className="btn-primary !py-2.5 text-[13px] font-bold w-full text-center mt-2 flex items-center justify-center gap-1.5"
              >
                <QrIcon className="w-4 h-4" />
                <span>Kirim QRIS ke Chat Pembeli</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
