"use client";
import { useEffect, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { SparklesIcon } from "@/components/icons";

export default function AiSandboxPage() {
  const { activeInstitution, aiConfig, tokenBalance, notify } = useDashboard();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [customer, setCustomer] = useState("Budi");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    const history = messages.slice(-8).map((m) => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text }));
    setMessages((prev) => [...prev, { from: "customer", text: content }]);
    setText("");
    setBusy(true);
    try {
      const res = await api.post("/ai/chat", { message: content, customerName: customer || undefined, history });
      setMessages((prev) => [...prev, { from: "ai", text: res.replyText || "(AI tidak menghasilkan balasan)", intent: res.intent }]);
      setUsed((u) => u + (res.tokenDeduction?.totalTokens || 0));
    } catch (err) {
      setMessages((prev) => [...prev, { from: "error", text: err.message }]);
      notify("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[860px]">
      <div>
        <h1 className="page-title">Simulator AI Customer Service</h1>
        <p className="text-body-sm text-fg-muted">
          Uji balasan AI untuk {activeInstitution?.name} dengan katalog, rekening, dan persona Anda yang sebenarnya. Setiap percobaan memakai kuota token tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm">
        <div className="bg-white border border-line rounded-xl p-3">
          <div className="text-caption text-fg-muted font-bold uppercase">Persona</div>
          <div className="font-bold text-ink truncate">{aiConfig?.spvPersona?.botName || "Belum diatur"}</div>
        </div>
        <div className="bg-white border border-line rounded-xl p-3">
          <div className="text-caption text-fg-muted font-bold uppercase">Sisa kuota token</div>
          <div className="font-bold text-ink">{tokenBalance ? Math.max(0, tokenBalance.remainingTokens - used).toLocaleString("id-ID") : "-"}</div>
        </div>
        <div className="bg-white border border-line rounded-xl p-3">
          <div className="text-caption text-fg-muted font-bold uppercase">Dipakai di sesi ini</div>
          <div className="font-bold text-ink">{used.toLocaleString("id-ID")}</div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl flex flex-col h-[520px] overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center gap-3 bg-soft">
          <label className="text-label font-bold text-fg-muted" htmlFor="customer-name">Nama pelanggan</label>
          <input id="customer-name" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={60} className="bg-white border border-line rounded-lg px-2.5 py-1 text-body-sm outline-none" />
          <button type="button" onClick={() => { setMessages([]); setUsed(0); }} className="ml-auto text-caption font-bold text-brand bg-transparent border-none cursor-pointer">Mulai ulang</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && <div className="m-auto text-center text-fg-muted text-body-sm">Tulis pesan seperti pelanggan, misalnya &quot;masih ada stok?&quot;</div>}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "customer" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-body-sm whitespace-pre-line ${m.from === "customer" ? "bg-canvas border border-line text-ink" : m.from === "error" ? "bg-rose-50 border border-rose-200 text-rose-700" : "bg-brand-soft border border-brand/20 text-ink"}`}>
                {m.from === "ai" && (
                  <div className="flex items-center gap-1 text-micro font-bold text-brand uppercase mb-1">
                    <SparklesIcon className="w-3 h-3" />
                    <span>Balasan AI</span>
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {busy && <div className="text-caption text-fg-muted">AI sedang mengetik...</div>}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="p-3 border-t border-line flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Ketik pesan pelanggan..." className="flex-1 bg-canvas border border-line rounded-full px-4 py-2.5 text-body-sm outline-none focus:border-brand" />
          <button type="submit" disabled={busy || !text.trim()} className="btn-primary !py-2 !px-5 font-bold disabled:opacity-50">Kirim</button>
        </form>
      </div>
    </div>
  );
}
