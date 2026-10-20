"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, ConfirmDialog, EmptyState, IconButton, PageHeader, TableShell } from "@/components/ui";
import DocumentModal from "@/components/knowledge/DocumentModal";
import FileDocumentModal from "@/components/knowledge/FileDocumentModal";
import SearchTest from "@/components/knowledge/SearchTest";
import TextDocumentModal from "@/components/knowledge/TextDocumentModal";
import { extensionOf, formatBytes } from "@/components/knowledge/limits";

export default function KnowledgePage() {
  const { t, locale, isManager } = useDashboard();
  const fmt = useFormat();
  const { run, pending } = useAction();
  const list = useApi("/knowledge", { enabled: isManager });
  const [dialog, setDialog] = useState(null); // { type: "text" | "file" | "open" | "delete", doc? }

  const title = t("Basis Pengetahuan");
  if (!isManager) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={title} />
        <EmptyState icon="lock" title={t("Halaman ini untuk owner dan supervisor")} body={t("Minta owner atau supervisor menambah dokumen untuk AI.")} />
      </div>
    );
  }

  const usage = list.data?.usage;
  const full = Boolean(usage) && usage.documents >= usage.maxDocuments;
  const close = () => setDialog(null);
  const saved = () => {
    close();
    list.reload();
  };

  const kindOf = (doc) => (doc.sourceType === "text" ? t("Teks") : extensionOf(doc.fileName).toUpperCase() || t("Berkas"));

  const toggleActive = async (doc) => {
    const success = doc.isActive ? t("Dokumen dinonaktifkan. AI tidak lagi membacanya.") : t("Dokumen diaktifkan. AI langsung bisa memakainya.");
    const result = await run(() => api.put(`/knowledge/${doc.id}`, { isActive: !doc.isActive }), { success });
    if (result.ok) list.reload();
  };

  const remove = async () => {
    const result = await run(() => api.delete(`/knowledge/${dialog.doc.id}`), { success: t("Dokumen dihapus.") });
    if (result.ok) saved();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={t("Dokumen yang dibaca AI saat menjawab pelanggan, seperti SOP, kebijakan retur, atau tanya jawab.")}
        actions={
          list.data ? (
            <>
              <Button variant="secondary" icon="upload" disabled={full} onClick={() => setDialog({ type: "file" })}>
                {t("Unggah berkas")}
              </Button>
              <Button icon="plus" disabled={full} onClick={() => setDialog({ type: "text" })}>
                {t("Tambah dokumen teks")}
              </Button>
            </>
          ) : null
        }
      />

      <Async query={list} loadingLabel={t("Memuat dokumen...")}>
        {(data) => {
          const items = data.items ?? [];
          return (
            <>
              {usage ? (
                <p className="text-label text-fg-muted tabular-nums">
                  {t("{count} dari {max} dokumen. {chars} dari {maxChars} karakter terpakai.", {
                    count: fmt.number(usage.documents),
                    max: fmt.number(usage.maxDocuments),
                    chars: fmt.number(usage.chars),
                    maxChars: fmt.number(usage.maxTotalChars),
                  })}
                  {full ? ` ${t("Batas dokumen tercapai. Hapus dokumen lama untuk menambah.")}` : ""}
                </p>
              ) : null}

              {items.length === 0 ? (
                <div className="bg-white border border-line rounded-2xl">
                  <EmptyState
                    icon="book"
                    title={t("Belum ada dokumen")}
                    body={t("Sampai ada dokumen, AI hanya menjawab dari katalog produk dan persona. Tambahkan SOP, kebijakan, atau tanya jawab agar jawabannya lebih tepat.")}
                    action={
                      <Button icon="plus" onClick={() => setDialog({ type: "text" })}>
                        {t("Tambah dokumen teks")}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  <TableShell>
                    <thead>
                      <tr className="bg-sunken border-b border-line text-caption font-semibold text-fg-muted">
                        <th scope="col" className="py-3 px-4">{t("Judul")}</th>
                        <th scope="col" className="py-3 px-4">{t("Jenis")}</th>
                        <th scope="col" className="py-3 px-4 text-right">{t("Potongan")}</th>
                        <th scope="col" className="py-3 px-4 text-right">{t("Ukuran")}</th>
                        <th scope="col" className="py-3 px-4">{t("Status")}</th>
                        <th scope="col" className="py-3 px-4">{t("Diperbarui")}</th>
                        <th scope="col" className="py-3 px-4">
                          <span className="sr-only">{t("Aksi")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {items.map((doc) => (
                        <tr key={doc.id} className="hover:bg-soft">
                          <td className="py-3 px-4 min-w-[14rem]">
                            <button type="button" onClick={() => setDialog({ type: "open", doc })} className="text-left font-semibold text-fg bg-transparent border-none p-0 cursor-pointer hover:text-brand focus-visible:outline-2 focus-visible:outline-brand break-words">
                              {doc.title}
                            </button>
                            {doc.fileName ? <div className="text-caption text-fg-subtle break-all">{doc.fileName}</div> : null}
                          </td>
                          <td className="py-3 px-4">
                            <Badge>{kindOf(doc)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-fg-muted">{fmt.number(doc.chunkCount)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-fg-muted whitespace-nowrap">{formatBytes(doc.byteSize, locale)}</td>
                          <td className="py-3 px-4">
                            <Badge tone={doc.isActive ? "success" : "neutral"}>{doc.isActive ? t("Aktif") : t("Nonaktif")}</Badge>
                          </td>
                          <td className="py-3 px-4 text-fg-muted whitespace-nowrap">{fmt.dateTime(doc.updatedAt)}</td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <IconButton icon="edit" label={t("Buka {title}", { title: doc.title })} onClick={() => setDialog({ type: "open", doc })} />
                              <IconButton
                                icon={doc.isActive ? "pause" : "play"}
                                label={doc.isActive ? t("Nonaktifkan {title}", { title: doc.title }) : t("Aktifkan {title}", { title: doc.title })}
                                disabled={pending}
                                onClick={() => toggleActive(doc)}
                              />
                              <IconButton icon="trash" label={t("Hapus {title}", { title: doc.title })} onClick={() => setDialog({ type: "delete", doc })} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                  <SearchTest />
                </>
              )}
            </>
          );
        }}
      </Async>

      {dialog?.type === "text" ? <TextDocumentModal onClose={close} onSaved={saved} /> : null}
      {dialog?.type === "file" ? <FileDocumentModal onClose={close} onSaved={saved} /> : null}
      {dialog?.type === "open" ? <DocumentModal id={dialog.doc.id} onClose={close} onSaved={saved} /> : null}
      <ConfirmDialog
        open={dialog?.type === "delete"}
        onClose={close}
        onConfirm={remove}
        pending={pending}
        title={t("Hapus dokumen?")}
        body={t("{title} dan semua potongannya dihapus dan AI tidak bisa lagi membacanya. Ini tidak bisa dibatalkan.", { title: dialog?.doc?.title ?? "" })}
        confirmLabel={t("Hapus dokumen")}
      />
    </div>
  );
}
