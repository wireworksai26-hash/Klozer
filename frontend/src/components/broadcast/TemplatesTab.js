"use client";
import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, ConfirmDialog, EmptyState, IconButton, Modal, SelectField, TableShell } from "@/components/ui";
import TemplateForm from "./TemplateForm";
import TemplatePreview from "./TemplatePreview";
import { LANGUAGES, TEMPLATE_CATEGORY, TEMPLATE_STATUS, describeTemplate } from "./broadcastModel";

const STATUS_HELP = {
  draft: "Belum diajukan ke Meta.",
  pending: "Meta sedang meninjau, biasanya selesai dalam menit sampai 24 jam. Belum bisa dipakai kampanye.",
  approved: "Bisa dipakai kampanye.",
  rejected: "Ditolak Meta. Ajukan templat baru dengan isi yang sudah diperbaiki dan nama yang berbeda.",
  paused: "Meta menjeda templat ini. Tidak bisa dipakai sampai Meta mengaktifkannya lagi. Sinkronkan untuk melihat status terbaru.",
  disabled: "Templat dinonaktifkan, atau sudah tidak ada di Meta.",
};

const languageName = (code) => LANGUAGES.find((l) => l.value === code)?.label || code;

function StatusBadge({ status }) {
  const { t } = useDashboard();
  const s = TEMPLATE_STATUS[status] || { label: status, tone: "neutral" };
  return <Badge tone={s.tone}>{t(s.label)}</Badge>;
}

/** Templates with their Meta review status, creation, sync and deletion. */
export default function TemplatesTab({ templates, channels }) {
  const { t, notify } = useDashboard();
  const f = useFormat();
  const { run, pending } = useAction();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [syncChannel, setSyncChannel] = useState("");

  const waChannels = useMemo(() => (channels.data?.data || []).filter((c) => c.type === "whatsapp" && c.isActive), [channels.data]);
  const channelId = syncChannel || (waChannels[0] ? String(waChannels[0].id) : "");
  const channelName = (id) => {
    const c = (channels.data?.data || []).find((x) => x.id === id);
    return c ? c.displayHandle || c.name : "-";
  };

  const sync = async () => {
    const out = await run(() => api.post("/broadcast/templates/sync", { channelId: Number(channelId) }));
    if (!out.ok) return;
    const { added, updated, disabled } = out.data.data;
    notify("success", t("Sinkronisasi selesai: {added} baru, {updated} diperbarui, {disabled} dinonaktifkan.", { added, updated, disabled }));
    templates.reload();
  };

  const remove = async () => {
    const out = await run(() => api.delete(`/broadcast/templates/${deleting.id}`), { success: t("Templat dihapus.") });
    if (out.ok) {
      setDeleting(null);
      templates.reload();
    }
  };

  const viewData = viewing ? describeTemplate(viewing) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {waChannels.length > 1 ? <SelectField label={t("Nomor WhatsApp")} value={channelId} onChange={(e) => setSyncChannel(e.target.value)} options={waChannels.map((c) => ({ value: String(c.id), label: c.displayHandle ? `${c.name} (${c.displayHandle})` : c.name }))} /> : null}
          <Button variant="secondary" icon="refresh" loading={pending} disabled={!channelId} onClick={sync}>
            {t("Sinkronkan dengan Meta")}
          </Button>
        </div>
        <Button icon="plus" onClick={() => setCreating(true)}>
          {t("Ajukan templat")}
        </Button>
      </div>
      {!channels.error && channels.data && !waChannels.length ? <p className="text-label text-fg-muted">{t("Belum ada nomor WhatsApp aktif. Hubungkan di Saluran Chat untuk membuat atau menyinkronkan templat.")}</p> : null}

      <Async query={templates} loadingLabel={t("Memuat templat...")}>
        {(res) =>
          res.data.length ? (
            <TableShell>
              <thead>
                <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                  <th scope="col" className="py-3 px-4">{t("Templat")}</th>
                  <th scope="col" className="py-3 px-4">{t("Status")}</th>
                  <th scope="col" className="py-3 px-4">{t("Kategori")}</th>
                  <th scope="col" className="py-3 px-4">{t("Terakhir sinkron")}</th>
                  <th scope="col" className="py-3 px-4">
                    <span className="sr-only">{t("Aksi")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {res.data.map((x) => (
                  <tr key={x.id} className="hover:bg-soft align-top">
                    <td className="py-3.5 px-4 min-w-[12rem]">
                      <div className="font-mono text-label font-semibold text-fg break-all">{x.name}</div>
                      <div className="text-caption text-fg-subtle">
                        {languageName(x.language)}, {channelName(x.channelId)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 min-w-[11rem]">
                      <StatusBadge status={x.status} />
                      {x.rejectedReason ? <div className="text-caption text-danger-700 mt-1 break-words max-w-[16rem]">{t("Alasan Meta: {reason}", { reason: x.rejectedReason })}</div> : null}
                    </td>
                    <td className="py-3.5 px-4">{t(TEMPLATE_CATEGORY[x.category] || x.category)}</td>
                    <td className="py-3.5 px-4 text-label text-fg-muted whitespace-nowrap">{f.dateTime(x.lastSyncedAt)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setViewing(x)} aria-label={t("Lihat templat {name}", { name: x.name })}>
                          {t("Lihat")}
                        </Button>
                        <IconButton icon="trash" label={t("Hapus templat {name}", { name: x.name })} onClick={() => setDeleting(x)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <div className="bg-white rounded-2xl border border-line">
              <EmptyState
                icon="template"
                title={t("Belum ada templat")}
                body={t("Bisnis hanya boleh memulai chat WhatsApp dengan templat yang disetujui Meta. Ajukan templat baru, atau sinkronkan yang sudah dibuat di Meta.")}
                action={
                  <Button icon="plus" onClick={() => setCreating(true)}>
                    {t("Ajukan templat")}
                  </Button>
                }
              />
            </div>
          )
        }
      </Async>

      {creating ? (
        <TemplateForm
          open
          onClose={() => setCreating(false)}
          channels={waChannels}
          onCreated={() => {
            setCreating(false);
            templates.reload();
          }}
        />
      ) : null}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.name || ""}
        description={viewing ? `${languageName(viewing.language)}, ${t(TEMPLATE_CATEGORY[viewing.category] || viewing.category)}` : undefined}
        footer={
          <Button variant="secondary" onClick={() => setViewing(null)}>
            {t("Tutup")}
          </Button>
        }
      >
        {viewing && viewData ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div>
                <StatusBadge status={viewing.status} />
              </div>
              <p className="text-label text-fg-muted">{t(STATUS_HELP[viewing.status] || "Status belum dikenal. Sinkronkan untuk memperbarui.")}</p>
              {viewing.rejectedReason ? <p className="text-label text-danger-700 break-words">{t("Alasan Meta: {reason}", { reason: viewing.rejectedReason })}</p> : null}
            </div>
            {viewData.headerFormat !== "none" && viewData.headerFormat !== "text" ? <p className="text-label text-fg-muted">{t("Templat ini berheader {format}. Alamat berkasnya diisi saat membuat kampanye.", { format: t(viewData.headerFormat === "image" ? "gambar" : viewData.headerFormat === "video" ? "video" : "dokumen") })}</p> : null}
            <TemplatePreview header={viewData.headerText} body={viewData.body} footer={viewData.footer} buttons={viewData.buttons} />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        pending={pending}
        title={t("Hapus templat?")}
        body={t("Templat {name} dihapus di sini dan di Meta. Kampanye yang sudah selesai tetap tersimpan.", { name: deleting?.name || "" })}
        confirmLabel={t("Hapus templat")}
        onConfirm={remove}
      />
    </div>
  );
}
