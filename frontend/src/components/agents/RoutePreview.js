"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { Badge, Button, Card, CheckboxField, SelectField, TextAreaField } from "@/components/ui";
import { LIMITS, useAgentText } from "./labels";

/** Try the routing rules on a made-up message. Nothing is sent to anyone. */
export default function RoutePreview({ agents }) {
  const { t } = useDashboard();
  const text = useAgentText();
  const { run, pending } = useAction();
  const [form, setForm] = useState({ text: "", channelType: "whatsapp", currentAgentId: "", leadStatus: "new", isNewContact: false, hasOpenOrder: false, orderInProgress: false });
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setField = (key) => (e) => set(key)(e.target.value);
  const activeAgents = agents.filter((a) => a.isActive);

  const submit = async (e) => {
    e.preventDefault();
    const message = form.text.trim();
    if (!message) {
      setError(t("Tulis contoh pesan pelanggan."));
      return;
    }
    setError("");
    const body = {
      text: message,
      channelType: form.channelType,
      currentAgentId: form.currentAgentId ? Number(form.currentAgentId) : null,
      leadStatus: form.leadStatus,
      isNewContact: form.isNewContact,
      hasOpenOrder: form.hasOpenOrder,
      orderInProgress: form.orderInProgress,
    };
    const res = await run(() => api.post("/ai/agents/route-preview", body));
    if (res.ok) setResult(res.data.data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card title={t("Contoh pesan")} description={t("Tidak ada pesan yang dikirim ke siapa pun.")}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <TextAreaField label={t("Pesan pelanggan")} required rows={3} value={form.text} onChange={setField("text")} maxLength={LIMITS.previewText} error={error} placeholder={t("Contoh: mau pesan kemeja batik 2 pcs")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label={t("Kanal")} value={form.channelType} onChange={setField("channelType")} options={text.channelOptions} />
            <SelectField label={t("Agen yang sedang menangani")} value={form.currentAgentId} onChange={setField("currentAgentId")} options={activeAgents.map((a) => ({ value: a.id, label: a.name }))} placeholder={t("Belum ada")} />
            <SelectField label={t("Status kontak")} value={form.leadStatus} onChange={setField("leadStatus")} options={text.statusOptions} />
          </div>
          <div className="flex flex-col gap-3">
            <CheckboxField checked={form.isNewContact} onChange={set("isNewContact")} label={t("Kontak baru")} />
            <CheckboxField checked={form.hasOpenOrder} onChange={set("hasOpenOrder")} label={t("Ada pesanan berjalan")} />
            <CheckboxField checked={form.orderInProgress} onChange={set("orderInProgress")} label={t("Pesanan sedang disusun di chat")} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" icon="route" loading={pending}>
              {t("Uji aturan")}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t("Hasil")}>
        {result ? (
          <div className="flex flex-col gap-3" role="status">
            <div>
              <div className="text-label text-fg-muted">{t("Agen terpilih")}</div>
              <div className="text-subheading font-bold text-fg break-words">{result.agent?.name ?? t("Belum ada agen aktif")}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label text-fg-muted">{t("Cara memilih")}</span>
              <Badge tone="brand">{text.methodLabel(result.method)}</Badge>
            </div>
            <div>
              <div className="text-label text-fg-muted">{t("Alasan")}</div>
              <div className="text-body-sm text-fg break-words">{result.reason}</div>
            </div>
            {result.wouldAskModel ? <p className="text-label text-warning-800 bg-warning-50 border border-warning-200 rounded-xl px-3.5 py-2.5">{t("Pada chat sungguhan, model juga akan diminta memilih agen karena tidak ada aturan yang memutuskan. Hasil ini hanya menunjukkan pilihan tanpa model.")}</p> : null}
          </div>
        ) : (
          <p className="text-label text-fg-muted">{t("Isi contoh pesan lalu jalankan uji untuk melihat agen mana yang akan menjawab.")}</p>
        )}
      </Card>
    </div>
  );
}
