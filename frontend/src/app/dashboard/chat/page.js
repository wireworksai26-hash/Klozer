"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { relativeTimeKey } from "@/utils/mappers.mjs";
import { QrIcon, SparklesIcon, MessageSquareIcon, XIcon, UserIcon } from "@/components/icons";

const SENDER = { customer: "customer", ai_agent: "ai", cs: "cs", system: "system" };

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

const clock = (iso, locale = "id-ID") => (iso ? new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "");

/** Customer summary. Rendered in the side panel on wide screens and in a drawer on narrower ones. */
function CustomerDetail({ lead }) {
  const { t } = useDashboard();
  return (
    <>
      <div className="text-center pb-4 border-b border-line mb-4">
        <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center font-bold text-title mx-auto mb-2">{initials(lead.name)}</div>
        <h3 className="text-body font-bold text-ink">{lead.name}</h3>
        <p className="text-label text-fg-muted">{lead.phone}</p>
      </div>
      <div className="flex flex-col gap-3 text-label">
        {[
          ["Kota", lead.city || "-"],
          ["Sumber", lead.source],
          ["Ditangani", lead.cs],
          ["Skor risiko COD", `${lead.codScore}/100`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-fg-muted">
            <span>{t(k)}:</span>
            <span className="font-bold text-ink text-right">{v}</span>
          </div>
        ))}
        {lead.notes && <p className="mt-2 p-2.5 bg-canvas rounded-lg text-fg-muted">{lead.notes}</p>}
      </div>
    </>
  );
}

export default function ChatPage() {
  const { leads, products, addOrder, refreshLeads, chatEvent, notify, whatsappStatus, t, locale } = useDashboard();
  const ago = (iso) => {
    const r = relativeTimeKey(iso);
    return t(r.key, r.vars);
  };

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showContactList, setShowContactList] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [showQrisDrawer, setShowQrisDrawer] = useState(false);
  const [qrisProduct, setQrisProduct] = useState("");
  const [qrisQty, setQrisQty] = useState(1);
  const [qrisBusy, setQrisBusy] = useState(false);
  const [qrisSession, setQrisSession] = useState("");
  const bottomRef = useRef(null);

  const selected = leads.find((l) => l.dbId === selectedId) || null;

  const loadMessages = useCallback(async (leadId, { quiet = false } = {}) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const res = await api.get(`/chats/${leadId}`);
      setMessages(res.data.messages);
    } catch (err) {
      notify("error", err.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [notify]);

  // Open a conversation: fetch its history.
  useEffect(() => {
    if (!selectedId) return;
    // Resetting the thread is part of switching conversations, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // A message arrived over the socket: refresh the open thread, and the list if the contact is new.
  useEffect(() => {
    if (!chatEvent) return;
    // Reacting to an external (socket) event by refetching is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (chatEvent.leadId === selectedId) loadMessages(selectedId, { quiet: true });
    if (!leads.some((l) => l.dbId === chatEvent.leadId)) refreshLeads().catch(() => {});
    // leads is intentionally not a dependency: only a new event should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatEvent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!showDetail) return undefined;
    const onKey = (e) => e.key === "Escape" && setShowDetail(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDetail]);

  const visible = leads.filter((l) => {
    const q = search.trim().toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.phone.includes(q);
  });

  const send = async (text) => {
    if (!selectedId || !text.trim()) return false;
    setSending(true);
    try {
      const res = await api.post("/chats/send", { lead_id: selectedId, content_text: text.trim() });
      setMessages((prev) => [...prev, res.data]);
      // 202: stored, but WhatsApp did not accept it. Say so instead of looking like success.
      if (res.success === false) {
        notify("error", res.message);
        return false;
      }
      return true;
    } catch (err) {
      notify("error", err.message);
      loadMessages(selectedId, { quiet: true });
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText;
    setInputText("");
    await send(text);
  };

  const openQris = () => {
    setQrisProduct(products.find((p) => p.active && p.stock > 0)?.id || "");
    setQrisQty(1);
    setQrisSession(crypto.randomUUID());
    setShowQrisDrawer(true);
  };

  const handleSendQris = async () => {
    const product = products.find((p) => p.id === qrisProduct);
    if (!product || !selected) return;
    setQrisBusy(true);
    try {
      const order = await addOrder({
        customer: selected.name,
        phone: selected.phone,
        items: [{ productId: product.id, name: product.name, qty: qrisQty, price: product.price }],
        paymentMethod: "Dynamic QRIS",
        shippingFee: 0,
        status: "waiting_payment",
        // one order per drawer session and selection: retrying after a failed QRIS step reuses the order
        idempotencyKey: `${qrisSession}-${product.dbId}-${qrisQty}`,
      });
      if (!order) return;
      const qris = await api.post("/payments/qris", { order_id: order.dbId });
      const total = `Rp ${Number(qris.amount).toLocaleString("id-ID")}`;
      const link = qris.qrImageUrl ? `\nScan QRIS di sini: ${qris.qrImageUrl}` : "";
      await send(`Pesanan ${order.id}: ${product.name} x${qrisQty}, total ${total}.${link}\nPembayaran terverifikasi otomatis setelah QRIS dibayar.`);
      setShowQrisDrawer(false);
    } catch (err) {
      notify("error", err.message);
    } finally {
      setQrisBusy(false);
    }
  };

  const bubble = (m) => {
    const kind = SENDER[m.sender_type] || "cs";
    const mine = kind !== "customer";
    return (
      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${
            kind === "customer" ? "bg-white border border-line text-charcoal" : kind === "ai" ? "bg-brand-soft border border-brand/20 text-ink" : "bg-ink text-white"
          }`}
        >
          {kind === "ai" && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-micro font-bold uppercase tracking-wider bg-brand text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" />
                <span>{t("Balasan AI")}</span>
              </span>
            </div>
          )}
          <p className="text-body-sm leading-relaxed whitespace-pre-line break-words">
            {m.message_type && m.message_type !== "text" && !m.content_text ? `[${m.message_type}]` : m.content_text}
          </p>
          <span className="text-micro mt-1 flex items-center justify-end gap-1.5 opacity-70">
            {mine && m.is_delivered === 0 && <span className="text-danger-500 font-bold" title={m.delivery_error || ""}>{t("Gagal terkirim")}</span>}
            <span>{clock(m.created_at, locale)}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-120px)] -m-4 sm:-m-6 md:-m-8 bg-canvas rounded-2xl overflow-hidden border border-line shadow-md">
      {/* Contact list */}
      <div className={`w-full lg:w-[280px] min-[1360px]:w-[320px] bg-white border-r border-line flex flex-col flex-shrink-0 ${!showContactList ? "hidden lg:flex" : "flex"}`}>
        <div className="p-3.5 border-b border-line bg-soft">
          <div className="flex items-center gap-2 bg-canvas border border-line rounded-xl px-3 py-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Cari nama atau nomor...")}
              className="bg-transparent border-none outline-none text-body lg:text-label flex-1 text-ink placeholder:text-fg-subtle"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {visible.length === 0 ? (
            <div className="p-8 text-center text-fg-muted text-label flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center mb-2">
                <MessageSquareIcon className="w-5 h-5 text-brand" />
              </div>
              <span className="font-bold text-ink">{leads.length ? t("Tidak ada hasil") : t("Belum ada percakapan")}</span>
              <span className="text-caption text-fg-subtle mt-1">
                {whatsappStatus?.configured ? t("Pesan WhatsApp baru akan tampil di sini otomatis.") : t("Hubungkan nomor WhatsApp di Pengaturan untuk mulai menerima pesan.")}
              </span>
            </div>
          ) : (
            visible.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedId(c.dbId);
                  setShowContactList(false);
                }}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${selectedId === c.dbId ? "bg-brand-soft/60" : "hover:bg-canvas"}`}
              >
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-body-sm flex-shrink-0">{initials(c.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-body-sm font-bold text-ink truncate">{c.name}</span>
                    <span className="text-micro text-fg-subtle flex-shrink-0 ml-2">{ago(c.lastInteractionAt)}</span>
                  </div>
                  <span className="text-label text-fg-muted truncate block">{c.phone}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversation */}
      {!selected ? (
        <div className={`flex-1 flex flex-col items-center justify-center bg-soft p-8 text-center ${showContactList ? "hidden lg:flex" : "flex"}`}>
          <div className="w-16 h-16 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
            <MessageSquareIcon className="w-8 h-8" />
          </div>
          <h3 className="card-title">{t("Pilih percakapan")}</h3>
          <p className="text-body-sm text-fg-muted mt-1.5 max-w-[400px] leading-relaxed">{t("Pesan dari pelanggan yang menghubungi nomor WhatsApp bisnis Anda muncul di sini secara real-time.")}</p>
        </div>
      ) : (
        <>
          <div className={`flex-1 flex flex-col bg-canvas min-w-0 ${showContactList ? "hidden lg:flex" : "flex"}`}>
            <div className="h-[64px] bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setShowContactList(true);
                    setShowDetail(false);
                  }}
                  className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center bg-transparent border-none cursor-pointer text-ink text-title flex-shrink-0"
                  aria-label={t("Kembali ke daftar percakapan")}
                >
                  ←
                </button>
                <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-label flex-shrink-0">{initials(selected.name)}</div>
                <div className="min-w-0">
                  <div className="text-body-sm font-bold text-ink truncate">{selected.name}</div>
                  <div className="text-caption text-fg-muted truncate">{selected.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => setShowDetail(true)}
                  className="min-[1360px]:hidden w-10 h-10 rounded-full bg-canvas border border-line text-ink flex items-center justify-center cursor-pointer hover:bg-sunken"
                  aria-label={t("Lihat detail pelanggan")}
                  aria-haspopup="dialog"
                >
                  <UserIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={openQris}
                  aria-label={t("Terbitkan QRIS")}
                  className="h-10 min-w-10 px-3 rounded-full bg-brand text-white font-bold text-label border-none cursor-pointer hover:bg-brand-hover flex items-center justify-center gap-1.5"
                >
                  <QrIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("Terbitkan QRIS")}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3.5">
              {loadingMessages && <div className="text-center text-fg-muted text-label">{t("Memuat pesan...")}</div>}
              {!loadingMessages && messages.length === 0 && <div className="text-center text-fg-muted text-label">{t("Belum ada pesan dalam percakapan ini.")}</div>}
              {messages.map(bubble)}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="bg-white border-t border-line p-3 sm:p-4 flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <input
                type="text"
                placeholder={t("Ketik balasan WhatsApp...")}
                value={inputText}
                maxLength={4000}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-canvas border border-line rounded-full px-4 py-2.5 text-body lg:text-body-sm text-ink placeholder:text-fg-subtle outline-none font-medium focus:bg-white focus:border-brand min-w-0"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="w-10 h-10 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center border-none cursor-pointer flex-shrink-0 disabled:opacity-50"
                aria-label={t("Kirim")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>

          {/* Wide screens: fixed third pane */}
          <div className="hidden min-[1360px]:flex w-[260px] bg-white border-l border-line flex-col flex-shrink-0 p-5 overflow-y-auto">
            <CustomerDetail lead={selected} />
          </div>

          {/* Narrower screens: the same detail slides in from the right on demand */}
          <div className={`min-[1360px]:hidden fixed inset-0 z-50 ${showDetail ? "" : "pointer-events-none"}`} inert={!showDetail}>
            <div
              onClick={() => setShowDetail(false)}
              className={`absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity duration-300 ${showDetail ? "opacity-100" : "opacity-0"}`}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t("Detail pelanggan")}
              className={`absolute top-0 right-0 h-full w-[min(320px,88vw)] bg-white border-l border-line shadow-2xl flex flex-col p-5 overflow-y-auto transition-transform duration-300 ${
                showDetail ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <button
                onClick={() => setShowDetail(false)}
                className="self-end w-10 h-10 -mt-2 -mr-2 mb-1 rounded-full bg-transparent flex items-center justify-center text-fg-muted border-none cursor-pointer hover:bg-sunken"
                aria-label={t("Tutup detail pelanggan")}
              >
                <XIcon className="w-5 h-5" />
              </button>
              <CustomerDetail lead={selected} />
            </aside>
          </div>
        </>
      )}

      {showQrisDrawer && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-5 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="card-title">{t("Terbitkan QRIS untuk")} {selected?.name}</h3>
              <button onClick={() => setShowQrisDrawer(false)} className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-fg-muted border-none cursor-pointer" aria-label={t("Tutup")}>
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-body-sm">
              {products.filter((p) => p.active).length === 0 ? (
                <div className="p-3 bg-warning-50 text-warning-800 rounded-xl text-label">{t("Tambahkan produk aktif terlebih dahulu di Katalog Produk.")}</div>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-ink block mb-1">{t("Produk||singular")}</label>
                    <select value={qrisProduct} onChange={(e) => setQrisProduct(e.target.value)} className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink font-medium outline-none">
                      {products
                        .filter((p) => p.active)
                        .map((p) => (
                          <option key={p.id} value={p.id} disabled={p.stock < 1}>
                            {p.name} | Rp {Number(p.price).toLocaleString("id-ID")} | {t("stok")} {p.stock}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-ink block mb-1">{t("Jumlah")}</label>
                    <input type="number" min={1} value={qrisQty} onChange={(e) => setQrisQty(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink font-medium outline-none" />
                  </div>
                  <p className="text-caption text-fg-muted">{t("Dibuat pesanan sungguhan (stok berkurang) dan QRIS dikirim ke chat. Pesanan lunas otomatis saat pembayaran diterima.")}</p>
                  <button type="button" onClick={handleSendQris} disabled={qrisBusy || !qrisProduct} className="btn-primary !py-2.5 font-bold mt-1 disabled:opacity-60">
                    {qrisBusy ? t("Memproses...") : t("Buat Pesanan dan Kirim QRIS")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
