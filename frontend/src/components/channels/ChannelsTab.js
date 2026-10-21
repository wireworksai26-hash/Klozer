"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useDashboard } from "@/context/DashboardContext";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Modal, Switch } from "@/components/ui";
import EmbedCode from "./EmbedCode";
import TypeIcon from "./TypeIcon";
import ChannelFormModal from "./ChannelFormModal";
import WhatsappConnect from "./WhatsappConnect";
import { TOKEN_TYPES, TYPE_ORDER, channelTypes } from "./channelTypes";

/** Short lines from a successful platform answer (name, account, quality), only what the platform sent. */
function describeTest(result, t) {
  const parts = [];
  const who = result.verifiedName || result.name;
  if (who) parts.push(who);
  const account = result.displayPhone || (result.username ? `@${String(result.username).replace(/^@/, "")}` : null);
  if (account) parts.push(account);
  if (result.quality) parts.push(t("Kualitas nomor: {quality}", { quality: result.quality }));
  return parts.join(" | ");
}

function ChannelRow({ channel, canManage, testResult, testing, toggling, onTest, onEdit, onDelete, onToggleAi, onShowSnippet }) {
  const { t } = useDashboard();
  const missingToken = TOKEN_TYPES.includes(channel.type) && !channel.hasToken;
  return (
    <li className="p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
            <TypeIcon type={channel.type} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-bold text-fg break-words">{channel.name}</span>
              {channel.isDefault ? <Badge tone="brand">{t("Utama")}</Badge> : null}
              <Badge tone={channel.isActive ? "success" : "neutral"}>{channel.isActive ? t("Aktif") : t("Nonaktif")}</Badge>
              {missingToken ? <Badge tone="warning">{t("Token belum ada")}</Badge> : null}
            </div>
            <div className="text-label text-fg-muted mt-0.5 flex flex-wrap gap-x-3">
              {channel.displayHandle ? <span>{channel.displayHandle}</span> : null}
              <span className="font-mono break-all">{channel.externalId}</span>
              {TOKEN_TYPES.includes(channel.type) && channel.hasToken ? <span>{t("Token tersimpan")}</span> : null}
            </div>
          </div>
        </div>

        <div className="lg:w-56 flex-shrink-0">
          <Switch label={t("AI menjawab")} checked={channel.aiEnabled} disabled={!canManage || toggling} onChange={(value) => onToggleAi(channel, value)} />
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
            {channel.type === "webchat" ? (
              <Button variant="secondary" size="sm" icon="code" onClick={() => onShowSnippet(channel)}>
                {t("Kode pasang")}
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" icon="refresh" loading={testing} onClick={() => onTest(channel)}>
              {t("Tes koneksi")}
            </Button>
            <IconButton icon="edit" label={t("Ubah {name}", { name: channel.name })} onClick={() => onEdit(channel)} />
            <IconButton icon="trash" label={t("Hapus {name}", { name: channel.name })} onClick={() => onDelete(channel)} />
          </div>
        ) : null}
      </div>

      {testResult ? (
        <p role="status" className={`text-label rounded-xl px-3.5 py-2.5 border ${testResult.ok ? "bg-success-50 text-success-700 border-success-200" : "bg-danger-50 text-danger-700 border-danger-200"}`}>
          {testResult.ok ? t("Terhubung.") : t("Gagal terhubung:")} {testResult.text}
        </p>
      ) : null}
    </li>
  );
}

export default function ChannelsTab() {
  const { t, isManager, activeInstitution } = useDashboard();
  const query = useApi("/channels");
  const { run } = useAction();
  const [form, setForm] = useState(null); // { mode: "create" } | { mode: "edit", channel }
  const [toDelete, setToDelete] = useState(null);
  const [snippet, setSnippet] = useState(null);
  const [results, setResults] = useState({});
  const [testingId, setTestingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const catalog = channelTypes(t);

  const test = async (channel) => {
    setTestingId(channel.id);
    const res = await run(() => api.post(`/channels/${channel.id}/test`));
    setTestingId(null);
    if (res.ok) {
      const body = res.data;
      setResults((r) => ({ ...r, [channel.id]: body.success ? { ok: true, text: describeTest(body, t) } : { ok: false, text: body.error || t("Platform tidak menjawab.") } }));
    } else {
      setResults((r) => ({ ...r, [channel.id]: { ok: false, text: res.error?.message || t("Platform tidak menjawab.") } }));
    }
  };

  const toggleAi = async (channel, aiEnabled) => {
    setTogglingId(channel.id);
    const res = await run(() => api.put(`/channels/${channel.id}`, { aiEnabled }), { success: aiEnabled ? t("AI menjawab di {name}.", { name: channel.name }) : t("AI berhenti menjawab di {name}.", { name: channel.name }) });
    setTogglingId(null);
    if (res.ok) query.reload();
  };

  const remove = async () => {
    setDeleting(true);
    const res = await run(() => api.delete(`/channels/${toDelete.id}`), { success: t("Saluran dihapus.") });
    setDeleting(false);
    if (res.ok) {
      setToDelete(null);
      query.reload();
    }
  };

  return (
    <Async query={query} loadingLabel={t("Memuat saluran...")}>
      {(body) => {
        const channels = body.data || [];
        const limit = body.limit;
        const full = typeof limit === "number" && channels.length >= limit;
        const allowed = (body.supportedTypes?.length ? TYPE_ORDER.filter((id) => body.supportedTypes.includes(id)) : TYPE_ORDER).filter((id) => !(id === "instagram" && activeInstitution?.modules?.instagram === false));
        const addButton = isManager ? (
          <Button icon="plus" onClick={() => setForm({ mode: "create" })} disabled={full}>
            {t("Tambah saluran")}
          </Button>
        ) : null;

        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-body-sm text-fg-muted tabular-nums">{typeof limit === "number" ? t("{used} dari {limit} saluran dipakai", { used: channels.length, limit }) : t("{used} saluran terhubung", { used: channels.length })}</p>
                {full ? <p className="text-label text-warning-800 mt-0.5">{t("Batas paket tercapai. Hapus saluran yang tidak dipakai atau naikkan paket.")}</p> : null}
              </div>
              {addButton}
            </div>

            {isManager ? <WhatsappConnect disabled={full} onConnected={query.reload} /> : null}

            {channels.length === 0 ? (
              <Card>
                <EmptyState
                  icon="inbox"
                  title={t("Belum ada saluran")}
                  body={isManager ? t("Hubungkan WhatsApp, Instagram, Messenger, Telegram atau chat di website Anda supaya pesan pelanggan masuk ke sini.") : t("Pemilik atau supervisor toko yang menghubungkan saluran. Minta mereka menambahkannya.")}
                  action={addButton}
                />
              </Card>
            ) : (
              TYPE_ORDER.map((type) => {
                const group = channels.filter((c) => c.type === type);
                if (!group.length) return null;
                return (
                  <Card key={type} padded={false} title={catalog[type].label} description={t("{count} saluran", { count: group.length })}>
                    <ul className="list-none p-0 mt-4 mb-0 divide-y divide-line border-t border-line">
                      {group.map((channel) => (
                        <ChannelRow
                          key={channel.id}
                          channel={channel}
                          canManage={isManager}
                          testResult={results[channel.id]}
                          testing={testingId === channel.id}
                          toggling={togglingId === channel.id}
                          onTest={test}
                          onEdit={(c) => setForm({ mode: "edit", channel: c })}
                          onDelete={setToDelete}
                          onToggleAi={toggleAi}
                          onShowSnippet={setSnippet}
                        />
                      ))}
                    </ul>
                  </Card>
                );
              })
            )}

            {form ? <ChannelFormModal key={form.channel?.id ?? "new"} mode={form.mode} channel={form.channel} types={allowed} limit={limit} onClose={() => setForm(null)} onSaved={query.reload} /> : null}

            <ConfirmDialog
              open={Boolean(toDelete)}
              onClose={() => setToDelete(null)}
              onConfirm={remove}
              pending={deleting}
              title={t("Hapus saluran?")}
              body={toDelete ? t("{name} diputus dan tidak lagi menerima pesan. Riwayat percakapan tetap tersimpan.", { name: toDelete.name }) : ""}
              confirmLabel={t("Hapus saluran")}
            />

            <Modal open={Boolean(snippet)} onClose={() => setSnippet(null)} title={t("Kode pasang chat website")} description={snippet ? snippet.name : undefined} footer={<Button onClick={() => setSnippet(null)}>{t("Selesai")}</Button>}>
              {snippet ? <EmbedCode snippet={snippet.embedSnippet} /> : null}
            </Modal>
          </div>
        );
      }}
    </Async>
  );
}
