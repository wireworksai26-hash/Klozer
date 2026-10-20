"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Async, Badge, Button, ConfirmDialog, EmptyState } from "@/components/ui";
import DeliveriesDrawer from "./DeliveriesDrawer";
import SecretDialog from "./SecretDialog";
import WebhookFormModal from "./WebhookFormModal";

function WebhookCard({ webhook, onEdit, onDelete, onRotate, onHistory, onChanged }) {
  const { t } = useDashboard();
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const all = webhook.events.includes("*");

  const sendTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await api.post(`/integrations/webhooks/${webhook.id}/test`);
      setResult({ ok: true, status: res.data?.status, ms: res.data?.durationMs });
    } catch (err) {
      setResult({ ok: false, text: err?.message || t("Terjadi kesalahan.") });
    } finally {
      setTesting(false);
      onChanged();
    }
  };

  return (
    <article className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-body font-bold text-fg break-words">{webhook.name}</h3>
          <p className="m-0 mt-1 font-mono text-label text-fg-muted break-all" title={webhook.url}>
            {webhook.url}
          </p>
        </div>
        {webhook.isActive ? <Badge tone="success">{t("Aktif")}</Badge> : <Badge tone="warning">{t("Nonaktif")}</Badge>}
      </div>

      {!webhook.isActive && (webhook.disabledReason || webhook.failureStreak > 0) ? (
        <div className="text-label text-fg-muted flex flex-col gap-0.5">
          {webhook.disabledReason ? <span className="break-words">{t("Alasan: {reason}", { reason: webhook.disabledReason })}</span> : null}
          {webhook.failureStreak > 0 ? <span className="tabular-nums">{t("Gagal berturut-turut: {count}", { count: webhook.failureStreak })}</span> : null}
        </div>
      ) : webhook.failureStreak > 0 ? (
        <p className="m-0 text-label text-warning-800 tabular-nums">{t("Gagal berturut-turut: {count}", { count: webhook.failureStreak })}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {all ? (
          <span>
            <Badge tone="brand">{t("Semua event")}</Badge>
          </span>
        ) : (
          <>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="self-start inline-flex items-center gap-1.5 p-0 bg-transparent border-none text-label font-semibold text-brand cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="tabular-nums">{t("{count} event", { count: webhook.events.length })}</span>
              <span className="text-fg-muted">{open ? t("Sembunyikan") : t("Lihat daftar")}</span>
            </button>
            {open ? (
              <ul className="flex flex-wrap gap-1.5 m-0 p-0 list-none">
                {webhook.events.map((e) => (
                  <li key={e} className="px-2.5 py-0.5 rounded-full bg-sunken border border-line font-mono text-caption text-fg break-all">
                    {e}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 m-0">
        <div className="min-w-0">
          <dt className="text-caption font-semibold text-fg-muted">{t("Terakhir berhasil")}</dt>
          <dd className="m-0 text-label text-fg">{webhook.lastSuccessAt ? format.dateTime(webhook.lastSuccessAt) : t("Belum pernah")}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption font-semibold text-fg-muted">{t("Terakhir gagal")}</dt>
          <dd className="m-0 text-label text-fg">{webhook.lastFailureAt ? format.dateTime(webhook.lastFailureAt) : t("Belum pernah")}</dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-caption font-semibold text-fg-muted">{t("Secret")}</dt>
          <dd className="m-0 font-mono text-label text-fg break-all">{webhook.secretHint}</dd>
        </div>
      </dl>

      {result ? (
        <p role="status" className={`m-0 text-label break-words ${result.ok ? "text-success-700" : "text-danger-700"}`}>
          {result.ok
            ? t("Uji berhasil: penerima menjawab dengan kode {code} dalam {ms} ms.", { code: result.status ?? "-", ms: result.ms ?? "-" })
            : result.text}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon="send" loading={testing} onClick={sendTest} aria-label={t("Kirim uji untuk {name}", { name: webhook.name })}>
          {t("Kirim uji")}
        </Button>
        <Button variant="secondary" size="sm" icon="history" onClick={onHistory} aria-label={t("Riwayat pengiriman {name}", { name: webhook.name })}>
          {t("Riwayat pengiriman")}
        </Button>
        <Button variant="secondary" size="sm" icon="edit" onClick={onEdit} aria-label={t("Ubah webhook {name}", { name: webhook.name })}>
          {t("Ubah")}
        </Button>
        <Button variant="secondary" size="sm" icon="key" onClick={onRotate} aria-label={t("Ganti secret {name}", { name: webhook.name })}>
          {t("Ganti secret")}
        </Button>
        <Button variant="quietDanger" size="sm" icon="trash" onClick={onDelete} aria-label={t("Hapus webhook {name}", { name: webhook.name })}>
          {t("Hapus")}
        </Button>
      </div>
    </article>
  );
}

export default function WebhooksPanel({ catalog }) {
  const { t, notify } = useDashboard();
  const query = useApi("/integrations/webhooks");
  const { run, pending } = useAction();
  const [form, setForm] = useState(null);
  const [shown, setShown] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [rotating, setRotating] = useState(null);
  const [history, setHistory] = useState(null);

  const onSaved = (res, editing) => {
    setForm(null);
    query.reload();
    if (editing) notify("success", t("Webhook disimpan."));
    else setShown({ secret: res.secret, name: res.data?.name, created: true });
  };

  const remove = async () => {
    const { ok } = await run(() => api.delete(`/integrations/webhooks/${deleting.id}`), { success: t("Webhook dihapus.") });
    if (ok) {
      setDeleting(null);
      query.reload();
    }
  };

  const rotate = async () => {
    const { ok, data } = await run(() => api.post(`/integrations/webhooks/${rotating.id}/rotate-secret`));
    if (ok) {
      setShown({ secret: data.secret, name: rotating.name, created: false });
      setRotating(null);
      query.reload();
    }
  };

  const createButton = (
    <Button icon="plus" size="sm" onClick={() => setForm({ webhook: null })}>
      {t("Buat webhook")}
    </Button>
  );

  return (
    <section className="flex flex-col gap-3" aria-labelledby="webhooks-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="webhooks-title" className="card-title">
          {t("Webhook")}
        </h2>
        {createButton}
      </div>
      <Async query={query} loadingLabel={t("Memuat webhook...")}>
        {(body) =>
          body.data.length === 0 ? (
            <div className="bg-white rounded-2xl border border-line">
              <EmptyState icon="plug" title={t("Belum ada webhook")} body={t("Webhook mengirim kabar pesanan, pesan, dan tugas ke alamat milik Anda, misalnya alur n8n.")} action={createButton} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {body.data.map((w) => (
                <WebhookCard key={w.id} webhook={w} onEdit={() => setForm({ webhook: w })} onDelete={() => setDeleting(w)} onRotate={() => setRotating(w)} onHistory={() => setHistory(w)} onChanged={query.reload} />
              ))}
            </div>
          )
        }
      </Async>

      {form ? <WebhookFormModal key={form.webhook?.id ?? "new"} open onClose={() => setForm(null)} webhook={form.webhook} catalog={catalog} onSaved={onSaved} /> : null}
      {history ? <DeliveriesDrawer key={history.id} webhook={history} onClose={() => setHistory(null)} onChanged={query.reload} /> : null}
      <SecretDialog
        open={Boolean(shown)}
        onClose={() => setShown(null)}
        title={shown?.created ? t("Webhook dibuat") : t("Secret baru dibuat")}
        statement={shown?.created ? t("Salin secret ini sekarang. Setelah dialog ditutup, secret tidak bisa ditampilkan lagi.") : t("Secret lama sudah berhenti berlaku. Salin secret baru ini sekarang, karena tidak bisa ditampilkan lagi.")}
        fieldLabel={t("Secret webhook {name}", { name: shown?.name || "" })}
        value={shown?.secret || ""}
      >
        <p className="m-0 text-label text-fg-muted">{t("Pakai secret ini untuk memverifikasi tanda tangan di penerima. Caranya ada di tab Daftar event.")}</p>
      </SecretDialog>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        pending={pending}
        title={t("Hapus webhook?")}
        body={t("Webhook {name} dan riwayat pengirimannya dihapus. Penerima tidak lagi mendapat event.", { name: deleting?.name || "" })}
        confirmLabel={t("Hapus webhook")}
      />
      <ConfirmDialog
        open={Boolean(rotating)}
        onClose={() => setRotating(null)}
        onConfirm={rotate}
        pending={pending}
        title={t("Ganti secret?")}
        body={t("Secret lama langsung berhenti berlaku. Perbarui penerima {name} dengan secret baru, kalau tidak tanda tangan akan ditolak.", { name: rotating?.name || "" })}
        confirmLabel={t("Ganti secret")}
      />
    </section>
  );
}
