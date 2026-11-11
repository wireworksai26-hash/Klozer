"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, Card, ConfirmDialog, EmptyState, PageHeader, TextAreaField } from "@/components/ui";

// Real questions the assistant can answer today, each one maps to a read-only query on the server.
const EXAMPLES = [
  "Berapa omzet bulan ini di tiap bisnis?",
  "Bandingkan omzet bulan ini dengan bulan lalu",
  "Produk apa yang paling laris di semua bisnis?",
  "Siapa pelanggan terbesar di semua bisnis?",
  "Pelanggan mana yang pernah beli tapi sudah 60 hari tidak aktif?",
  "Produk mana yang stoknya menipis?",
];

// One fixed question that asks for a short morning summary: sales, what waits, and what is running low.
const BRIEFING = "Buat briefing singkat hari ini: omzet 7 hari terakhir dibanding sebelumnya, apa yang perlu ditangani, dan produk yang stoknya menipis di semua bisnis.";

function Exchange({ item, last, t }) {
  return (
    <li ref={last} className="flex flex-col gap-2">
      <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-brand-soft px-4 py-2.5 text-body-sm text-ink">{item.question}</div>
      <div className="self-start max-w-[92%] rounded-2xl rounded-bl-md bg-white border border-line px-4 py-3 text-body-sm text-fg whitespace-pre-line">
        {item.answer}
        {item.sources?.length ? (
          <div className="mt-3 pt-2 border-t border-line text-caption text-fg-subtle">
            {t("Sumber data")}:{" "}
            {item.sources.map((s, i) => (
              <span key={s.tool}>
                {i ? ", " : ""}
                <Link href={s.page} className="text-brand no-underline hover:underline">
                  {t(s.label)}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Ask questions about the workspace's own data in plain words. It only reads: it does not change anything and it sends no
 * message. The conversation is kept, so a follow-up such as "and last month?" works and a reload loses nothing.
 */
export default function AssistantTab({ workspace }) {
  const { t } = useDashboard();
  const { run, pending: clearing } = useAction();
  const history = useApi("/workspace/assistant/history", { enabled: workspace.assistantEnabled });
  // what the server already holds, what was asked since the page opened, and whether the owner cleared it
  const [added, setAdded] = useState([]);
  const [cleared, setCleared] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const last = useRef(null);

  if (!workspace.assistantEnabled) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("Asisten")} description={t("Tanya data semua bisnis Anda dengan bahasa biasa.")} />
        <Card>
          <EmptyState
            icon="lock"
            title={t("Asisten Workspace belum aktif")}
            body={t("Fitur ini diaktifkan oleh admin Klozer untuk workspace yang membutuhkannya. Hubungi admin Klozer bila Anda ingin memakainya.")}
            action={
              <Button variant="secondary" href="/kontak">
                {t("Hubungi Klozer")}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const loaded = Boolean(history.data);
  const items = [...(cleared ? [] : history.data?.items ?? []), ...added];
  const ask = async (text) => {
    const q = (text ?? question).trim();
    if (q.length < 3 || pending) return;
    setPending(true);
    setError("");
    try {
      const res = await api.post("/workspace/assistant/ask", { question: q });
      setAdded((prev) => [...prev, { question: q, answer: res.answer, sources: res.sources }]);
      setQuestion("");
      setTimeout(() => last.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (err) {
      setError(err.message || t("Asisten belum bisa menjawab. Coba lagi."));
    } finally {
      setPending(false);
    }
  };

  const clear = async () => {
    const result = await run(() => api.delete("/workspace/assistant/history"), { success: t("Percakapan dihapus.") });
    setConfirmClear(false);
    if (result.ok) {
      setCleared(true);
      setAdded([]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Asisten")}
        description={t("Tanya data semua bisnis Anda dengan bahasa biasa. Asisten hanya membaca dan tidak mengirim pesan.")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={pending} onClick={() => ask(BRIEFING)}>
              {t("Briefing hari ini")}
            </Button>
            {items.length ? (
              <Button variant="secondary" onClick={() => setConfirmClear(true)}>
                {t("Percakapan baru")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {!loaded && !history.error ? (
            <p className="m-0 text-label text-fg-muted">{t("Memuat percakapan...")}</p>
          ) : items.length === 0 ? (
            <Card>
              <p className="m-0 text-body-sm text-fg-muted">{t("Tanya dengan bahasa biasa. Asisten membaca data semua bisnis di workspace ini dan menjawab dari angka yang ada.")}</p>
              <div className="mt-4 flex flex-col gap-2">
                {EXAMPLES.map((e) => (
                  <button key={e} type="button" onClick={() => ask(t(e))} disabled={pending} className="text-left rounded-xl border border-line bg-canvas px-4 py-2.5 text-body-sm text-ink hover:bg-sunken transition-colors cursor-pointer disabled:opacity-60">
                    {t(e)}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <ol className="list-none m-0 p-0 flex flex-col gap-5" aria-live="polite">
              {items.map((m, i) => (
                <Exchange key={m.id ?? i} item={m} last={i === items.length - 1 ? last : null} t={t} />
              ))}
              {pending ? <li className="text-label text-fg-muted">{t("Membaca data...")}</li> : null}
            </ol>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="flex flex-col gap-3"
          >
            <TextAreaField label={t("Pertanyaan")} rows={2} maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("Contoh: berapa omzet bulan ini di tiap bisnis?")} />
            {error ? (
              <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-label text-danger-700">
                {error}
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption text-fg-subtle">{t("Memakai kuota token AI bisnis yang sedang dibuka.")}</span>
              <Button type="submit" loading={pending} disabled={question.trim().length < 3}>
                {t("Tanya")}
              </Button>
            </div>
          </form>
        </div>

        <Card title={t("Yang bisa dijawab")} description={t("Hanya membaca, tidak mengubah data dan tidak mengirim pesan.")}>
          <ul className="list-none m-0 p-0 flex flex-col gap-2 text-label text-fg-muted">
            <li>{t("Omzet, pesanan, dan kontak baru per bisnis")}</li>
            <li>{t("Perbandingan dengan periode sebelumnya")}</li>
            <li>{t("Produk terlaris")}</li>
            <li>{t("Pelanggan terbesar, digabung lewat nomor telepon")}</li>
            <li>{t("Pelanggan yang lama tidak aktif")}</li>
            <li>{t("Stok yang menipis")}</li>
            <li>{t("Performa CS")}</li>
            <li>{t("Pekerjaan yang menunggu")}</li>
          </ul>
          <p className="text-caption text-fg-subtle mt-4 mb-0">{t("Isi chat, catatan, alamat, dan data rahasia tidak pernah dibaca asisten.")}</p>
        </Card>
      </div>

      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={clear} pending={clearing} tone="primary" title={t("Mulai percakapan baru?")} body={t("Riwayat percakapan Anda dengan asisten dihapus. Asisten tidak lagi mengingat pertanyaan sebelumnya.")} confirmLabel={t("Hapus riwayat")} />
    </div>
  );
}
