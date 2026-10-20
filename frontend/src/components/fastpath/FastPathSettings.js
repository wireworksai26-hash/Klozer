"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, Card, Switch, TextAreaField } from "@/components/ui";

/** What each topic is and the kind of message that triggers it, so the owner knows what the code answers. */
const topicCopy = (t) => ({
  greeting: { title: t("Sapaan"), example: t("Contoh: halo kak, selamat pagi") },
  thanks: { title: t("Terima kasih"), example: t("Contoh: makasih ya, oke siap") },
  payment: { title: t("Rekening dan cara bayar"), example: t("Contoh: minta rekeningnya, bisa bayar pakai apa") },
  catalog: { title: t("Daftar produk"), example: t("Contoh: list produk, ada apa aja") },
  product: { title: t("Harga dan stok satu produk"), example: t("Contoh: harga kaos polos berapa, ready?") },
  info: { title: t("Alamat dan jam buka"), example: t("Contoh: alamat toko dimana, buka jam berapa") },
});

/** The master switch, one switch per topic, and the opening hours the code (and the AI) may state. */
export default function FastPathSettings({ settings, topics, limits, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const copy = topicCopy(t);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [on, setOn] = useState(settings.topics);
  const [hours, setHours] = useState(settings.storeHours || "");

  const save = async (e) => {
    e.preventDefault();
    const result = await run(() => api.put("/ai/fast-path", { enabled, topics: on, storeHours: hours.trim() || null }), { success: t("Pengaturan Jalur Cepat disimpan.") });
    if (result.ok) onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <Card>
        <Switch checked={enabled} onChange={setEnabled} label={t("Jalur Cepat aktif")} description={t("Pesan rutin yang pendek dijawab langsung dari data toko Anda tanpa memanggil AI. Pesan lain tetap ke AI, lalu ke tim CS bila AI tidak yakin.")} />
      </Card>

      <Card title={t("Topik yang dijawab otomatis")} description={t("Hanya pesan pendek dengan satu topik. Pesan yang berisi beberapa hal, keluhan, atau ingin membeli selalu ke AI.")}>
        <div className="flex flex-col divide-y divide-line">
          {topics.map((topic) => (
            <div key={topic} className="py-3 first:pt-0 last:pb-0">
              <Switch checked={on[topic] !== false} onChange={(value) => setOn((prev) => ({ ...prev, [topic]: value }))} disabled={!enabled} label={copy[topic].title} description={copy[topic].example} />
            </div>
          ))}
        </div>
      </Card>

      <Card title={t("Jam buka")} description={t("Dijawab apa adanya saat pelanggan bertanya jam buka. Kosongkan bila tidak mau AI menyebut jam.")}>
        <TextAreaField label={t("Jam operasional")} rows={3} maxLength={limits.storeHours} hint={t("Contoh: Senin sampai Sabtu 09.00 sampai 17.00, Minggu libur.")} value={hours} onChange={(e) => setHours(e.target.value)} />
      </Card>

      <div>
        <Button type="submit" icon="check" loading={pending}>
          {t("Simpan pengaturan")}
        </Button>
      </div>
    </form>
  );
}
