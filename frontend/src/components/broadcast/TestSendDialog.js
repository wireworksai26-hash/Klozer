"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction } from "@/hooks/useApi";
import { Button, Modal, TextField } from "@/components/ui";

/** Send the template to one number (your own phone) before launching. Costs one blast credit. */
export default function TestSendDialog({ open, onClose, template, variables, headerMediaUrl }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);

  const close = () => {
    setResult(null);
    onClose();
  };

  const send = async (e) => {
    e.preventDefault();
    setResult(null);
    const out = await run(() => api.post("/broadcast/test", { channelId: template.channelId, templateId: template.id, phone: phone.trim(), variables, ...(headerMediaUrl ? { headerMediaUrl } : {}) }));
    setResult(out.ok ? { ok: true, message: out.data.message, preview: out.data.preview } : { ok: false, message: out.error?.message });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("Kirim pesan uji")}
      description={t("Pesan dikirim sungguhan ke satu nomor dan memakai 1 kredit blast.")}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t("Tutup")}
          </Button>
          <Button type="submit" form="test-send-form" icon="send" loading={pending} disabled={!phone.trim()}>
            {t("Kirim uji")}
          </Button>
        </>
      }
    >
      <form id="test-send-form" onSubmit={send} className="flex flex-col gap-4">
        <TextField label={t("Nomor WhatsApp tujuan")} type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08123456789" hint={t("Nomor milik Anda sendiri, dengan kode negara atau diawali 0.")} required data-autofocus />
        {result ? (
          <div role={result.ok ? "status" : "alert"} className={`rounded-xl border p-3.5 text-label ${result.ok ? "bg-success-50 border-success-200 text-success-800" : "bg-danger-50 border-danger-200 text-danger-700"}`}>
            <div className="font-semibold">{result.message}</div>
            {result.ok && result.preview ? <div className="mt-1.5 whitespace-pre-wrap break-words text-fg-muted">{result.preview}</div> : null}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
