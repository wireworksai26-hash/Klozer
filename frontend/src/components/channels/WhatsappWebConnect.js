"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";
import { Button, Card, Modal, TextField } from "@/components/ui";

const ACTIVE_STATES = ["starting", "connecting", "qr", "closed"];
const POLL_MS = 2000;

/**
 * Connect a WhatsApp number the linked-device way: scan one QR code, no Meta Business account or token.
 * The server keeps the session; this dialog only shows the QR and polls until the phone confirms.
 */
export default function WhatsappWebConnect({ existing = null, disabled = false, onChanged }) {
  const { t, notify } = useDashboard();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const notified = useRef(false);

  const channelId = data?.channel?.id ?? existing?.id ?? null;

  useEffect(() => {
    if (!open || !channelId || !ACTIVE_STATES.includes(data?.status)) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const body = await api.get(`/channels/${channelId}/whatsapp-web`);
        if (!cancelled) setData(body.data);
      } catch (err) {
        if (!cancelled) setProblem(err?.message || t("Tidak dapat memeriksa status WhatsApp."));
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open, channelId, data?.status, t]);

  useEffect(() => {
    if (data?.status === "open" && !notified.current) {
      notified.current = true;
      notify("success", t("WhatsApp terhubung."));
      onChanged?.();
    }
    if (data?.status !== "open") notified.current = false;
  }, [data?.status, notify, onChanged, t]);

  const show = async () => {
    setOpen(true);
    setProblem("");
    setData(null);
    notified.current = false;
    setName(existing?.name || "WhatsApp");
    if (!existing) return;
    setChecking(true);
    try {
      const body = await api.get(`/channels/${existing.id}/whatsapp-web`);
      setData(body.data);
      setName(body.data.channel?.name || existing.name);
    } catch (err) {
      setProblem(err?.message || t("Kanal WhatsApp tidak ditemukan."));
    } finally {
      setChecking(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setProblem("");
    try {
      const body = await api.post("/channels/whatsapp-web", { name: name.trim() || undefined });
      setData(body.data);
      onChanged?.();
    } catch (err) {
      setProblem(err?.message || t("Gagal menghubungkan WhatsApp."));
    } finally {
      setBusy(false);
    }
  };

  const connected = data?.status === "open";
  const waiting = ACTIVE_STATES.includes(data?.status);
  const actionLabel = existing ? t("Hubungkan ulang / tampilkan QR") : t("Tampilkan kode QR");

  return (
    <>
      <Card
        title={t("Hubungkan WhatsApp lewat QR")}
        description={t("Pindai satu kode QR dari WhatsApp di ponsel. Tidak perlu akun Meta Business atau access token.")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon="whatsapp" disabled={disabled} onClick={show}>
              {existing ? t("Status WhatsApp QR") : t("Hubungkan WhatsApp (QR)")}
            </Button>
            {existing?.displayHandle ? <span className="text-label text-fg-muted">{existing.displayHandle}</span> : null}
          </div>
          {disabled ? <p className="text-label text-warning-800">{t("Batas paket tercapai. Hapus saluran yang tidak dipakai atau naikkan paket.")}</p> : null}
          <p className="text-label text-fg-muted">
            {t("Metode ini memakai tautan perangkat WhatsApp Web, bukan API resmi Meta. WhatsApp dapat memblokir nomor yang melanggar aturan; pakai nomor khusus untuk CS.")}
          </p>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("Hubungkan WhatsApp dengan QR")}
        description={t("Buka WhatsApp di ponsel, pilih Perangkat tertaut, lalu pindai kode ini.")}
        footer={
          <>
            {!connected ? (
              <Button variant="secondary" onClick={start} loading={busy} disabled={checking || (waiting && data?.status !== "closed")}>
                {actionLabel}
              </Button>
            ) : null}
            <Button onClick={() => setOpen(false)}>{t("Selesai")}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {problem ? (
            <p role="alert" className="text-label rounded-xl px-3.5 py-2.5 border bg-danger-50 text-danger-700 border-danger-200">
              {problem}
            </p>
          ) : null}

          {checking ? <p className="text-body-sm text-fg-muted">{t("Memeriksa status WhatsApp...")}</p> : null}

          {connected ? (
            <div className="rounded-xl border border-success-200 bg-success-50 px-3.5 py-3 text-success-700">
              <p className="font-bold">{t("WhatsApp terhubung.")}</p>
              {data.connectedPhone || data.connectedName ? <p className="text-label mt-0.5">{[data.connectedName, data.connectedPhone].filter(Boolean).join(" | ")}</p> : null}
            </div>
          ) : null}

          {!connected && data?.qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qr} alt={t("Kode QR WhatsApp")} className="w-56 h-56 mx-auto rounded-xl border border-line-strong bg-white p-2" />
              <p role="status" className="text-label text-center text-fg-muted">
                {t("Kode berganti sendiri bila kedaluwarsa. Biarkan jendela ini terbuka sampai ponsel menampilkan WhatsApp terhubung.")}
              </p>
            </>
          ) : null}

          {!connected && !checking && !data?.qr ? (
            <div className="flex flex-col gap-3">
              {!existing ? (
                <TextField label={t("Nama saluran")} hint={t("Hanya untuk tim Anda, mis. WhatsApp CS.")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              ) : null}
              {data?.error ? <p className="text-label rounded-xl px-3.5 py-2.5 border bg-danger-50 text-danger-700 border-danger-200">{data.error}</p> : null}
              <p className="text-label text-fg-muted">{t("Tekan tombol di bawah untuk membuat sesi baru dan menampilkan kode QR.")}</p>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
