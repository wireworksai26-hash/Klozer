"use client";
import { useEffect, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { PROOF_REASONS } from "@/utils/proofReasons";
import { SparklesIcon } from "@/components/icons";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const QUICK_MESSAGES = ["Halo, masih ada stok?", "Berapa harganya?", "Bisa transfer ke mana?", "Ada promo nggak?", "Saya mau pesan 2"];

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Berkas tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });

function ProofResult({ result, t }) {
  const x = result.extraction;
  const auto = result.outcome === "auto_approve";
  const row = (label, value) => (
    <div className="flex justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className="font-semibold text-ink text-right">{value ?? "-"}</span>
    </div>
  );
  return (
    <div className="max-w-[92%] rounded-2xl border border-line bg-soft p-4 text-body-sm flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-micro font-bold text-brand uppercase">
        <SparklesIcon className="w-3 h-3" />
        <span>{t("Hasil membaca bukti pembayaran")}</span>
      </div>
      {x ? (
        <div className="flex flex-col gap-1">
          {row(t("Dibaca sebagai bukti bayar"), x.isPaymentProof ? t("Ya") : t("Bukan"))}
          {row(t("Nominal terbaca"), x.amount ? `Rp ${x.amount.toLocaleString("id-ID")}` : null)}
          {row(t("Bank"), x.bank)}
          {row(t("Waktu"), x.paidAt)}
          {row(t("Pengirim"), x.senderName)}
          {row(t("Penerima"), [x.recipientName, x.recipientAccount].filter(Boolean).join(" · ") || null)}
          {row(t("Keyakinan AI"), `${Math.round(x.confidence * 100)}%`)}
        </div>
      ) : (
        <div className="text-danger-700">{t("AI tidak dapat membaca berkas ini.")}</div>
      )}
      <div className={`rounded-xl px-3 py-2 font-bold ${auto ? "bg-success-50 text-success-800 border border-success-200" : "bg-warning-50 text-warning-800 border border-warning-200"}`}>
        {auto ? t("Akan disetujui otomatis dan pesanan menjadi Lunas") : t("Akan masuk dashboard untuk dicek manual")}
        {result.matchedOrder && <span className="font-medium"> · {t("cocok dengan")} {result.matchedOrder.orderNumber}</span>}
      </div>
      {result.reasons.length > 0 && (
        <ul className="list-disc pl-5 text-caption text-fg-muted flex flex-col gap-0.5">
          {result.reasons.map((r) => (
            <li key={r}>{PROOF_REASONS[r] ? t(PROOF_REASONS[r]) : r}</li>
          ))}
        </ul>
      )}
      <div className="rounded-xl bg-brand-soft border border-brand/20 px-3 py-2 text-ink whitespace-pre-line">
        <div className="text-micro font-bold text-brand uppercase mb-0.5">{t("Balasan yang akan dikirim ke pelanggan")}</div>
        {result.replyText}
      </div>
      <div className="text-caption text-fg-subtle">
        {result.read ? `${result.read.model}${result.read.fallbackUsed ? ` (${t("model cadangan")})` : ""} · ${result.read.latencyMs} ms` : t("Tidak ada model yang tersedia")} · {result.note}
      </div>
    </div>
  );
}

export default function AiSandboxPage() {
  const { activeInstitution, aiConfig, tokenBalance, notify, t } = useDashboard();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [customer, setCustomer] = useState("Budi");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const bottom = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    // scroll the thread itself to its end; scrollIntoView would also move every scrollable box around it
    const thread = bottom.current?.parentElement;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages, busy]);

  const ask = async (content) => {
    const message = content.trim();
    if (!message || busy) return;
    const history = messages.filter((m) => m.from === "customer" || m.from === "ai").slice(-8).map((m) => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text }));
    setMessages((prev) => [...prev, { from: "customer", text: message }]);
    setText("");
    setBusy(true);
    try {
      const res = await api.post("/ai/chat", { message, customerName: customer || undefined, history });
      setMessages((prev) => [
        ...prev,
        { from: "ai", text: res.replyText || t("(AI tidak menghasilkan balasan)"), intent: res.intent, model: res.modelUsed, fallbackUsed: res.fallbackUsed, latencyMs: res.latencyMs, tokens: res.tokenDeduction?.totalTokens },
      ]);
      setUsed((u) => u + (res.tokenDeduction?.totalTokens || 0));
    } catch (err) {
      setMessages((prev) => [...prev, { from: "error", text: err.message }]);
      notify("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  const send = (e) => {
    e.preventDefault();
    ask(text);
  };

  const sendProof = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    if (file.size > MAX_FILE_BYTES) {
      notify("error", t("Ukuran berkas maksimal 5 MB."));
      return;
    }
    setMessages((prev) => [...prev, { from: "customer", text: `${t("[Mengirim bukti pembayaran]")} ${file.name}` }]);
    setBusy(true);
    try {
      const imageBase64 = await readAsBase64(file);
      const res = await api.post("/ai/analyze-proof", { imageBase64, mimeType: file.type || undefined });
      setMessages((prev) => [...prev, { from: "proof", result: res }]);
      setUsed((u) => u + ((res.read?.usage?.promptTokens || 0) + (res.read?.usage?.completionTokens || 0)));
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
        <h1 className="page-title">{t("Simulator AI Customer Service")}</h1>
        <p className="text-body-sm text-fg-muted">
          {t("Uji balasan AI untuk")} {activeInstitution?.name} {t("dengan katalog, rekening, dan persona Anda yang sebenarnya. Setiap percobaan memakai kuota token tenant.")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm">
        <div className="bg-white border border-line rounded-xl p-3">
          <div className="text-caption text-fg-muted font-bold uppercase">{t("Persona")}</div>
          <div className="font-bold text-ink truncate">{aiConfig?.spvPersona?.botName || t("Belum diatur")}</div>
        </div>
        <div className="bg-white border border-line rounded-xl p-3">
          <div className="text-caption text-fg-muted font-bold uppercase">{t("Sisa kuota token")}</div>
          <div className="font-bold text-ink">{tokenBalance ? Math.max(0, tokenBalance.remainingTokens - used).toLocaleString("id-ID") : "-"}</div>
        </div>
        <div className="bg-white border border-line rounded-xl p-3">
          <div className="text-caption text-fg-muted font-bold uppercase">{t("Dipakai di sesi ini")}</div>
          <div className="font-bold text-ink">{used.toLocaleString("id-ID")}</div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl flex flex-col h-[560px] overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center gap-x-3 gap-y-2 bg-soft">
          <label className="text-label font-bold text-fg-muted" htmlFor="customer-name">{t("Nama pelanggan")}</label>
          <input id="customer-name" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={60} className="bg-white border border-line rounded-lg px-2.5 py-1 text-body-sm outline-none min-w-0 flex-1 sm:flex-none" />
          <button type="button" onClick={() => { setMessages([]); setUsed(0); }} className="ml-auto text-caption font-bold text-brand bg-transparent border-none cursor-pointer">{t("Mulai ulang")}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="m-auto text-center text-fg-muted text-body-sm flex flex-col gap-3 items-center">
              <div>{t("Tulis pesan seperti pelanggan, atau pilih contoh di bawah. Anda juga bisa mengunggah bukti pembayaran untuk melihat bagaimana AI membacanya.")}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_MESSAGES.map((q) => (
                  <button key={q} type="button" onClick={() => ask(q)} className="px-3 py-1.5 rounded-full text-label font-semibold bg-canvas border border-line text-fg cursor-pointer hover:bg-white">
                    {t(q)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.from === "proof" ? (
              <div key={i} className="flex justify-end">
                <ProofResult result={m.result} t={t} />
              </div>
            ) : (
              <div key={i} className={`flex ${m.from === "customer" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-body-sm whitespace-pre-line ${m.from === "customer" ? "bg-canvas border border-line text-ink" : m.from === "error" ? "bg-danger-50 border border-danger-200 text-danger-700" : "bg-brand-soft border border-brand/20 text-ink"}`}>
                  {m.from === "ai" && (
                    <div className="flex items-center gap-1 text-micro font-bold text-brand uppercase mb-1">
                      <SparklesIcon className="w-3 h-3" />
                      <span>{t("Balasan AI")}</span>
                    </div>
                  )}
                  {m.text}
                  {m.from === "ai" && (m.model || m.intent) && (
                    <div className="mt-1.5 pt-1.5 border-t border-brand/10 text-caption text-fg-subtle flex flex-wrap gap-x-3 gap-y-0.5">
                      {m.model && <span>{m.model}{m.fallbackUsed ? ` (${t("model cadangan")})` : ""}</span>}
                      {m.latencyMs ? <span>{m.latencyMs} ms</span> : null}
                      {m.tokens ? <span>{m.tokens} {t("token")}</span> : null}
                      {m.intent && m.intent !== "ai_generated" && <span className="font-semibold text-warning-800">{m.intent}</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {busy && <div className="text-caption text-fg-muted">{t("AI sedang mengetik...")}</div>}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="p-3 border-t border-line flex gap-2 items-center">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={sendProof} className="hidden" />
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="btn-outline !py-2 !px-3 font-bold whitespace-nowrap disabled:opacity-50" title={t("Unggah bukti pembayaran (JPG, PNG, WebP, atau PDF, maksimal 5 MB)")}>
            {t("Bukti bayar")}
          </button>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={t("Ketik pesan pelanggan...")} className="flex-1 min-w-0 bg-canvas border border-line rounded-full px-4 py-2.5 text-body-sm outline-none focus:border-brand" />
          <button type="submit" disabled={busy || !text.trim()} className="btn-primary !py-2 !px-5 font-bold disabled:opacity-50">{t("Kirim")}</button>
        </form>
      </div>
    </div>
  );
}
