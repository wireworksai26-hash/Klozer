"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Badge, Button, ConfirmDialog, EmptyState, SelectField } from "@/components/ui";
import PagedList from "./PagedList";
import RuleModal from "./RuleModal";
import { CORRECTIONS_PAGE_SIZE } from "./limits";

function Block({ label, children, muted = false }) {
  return (
    <div className="min-w-0">
      <div className="text-label font-semibold text-fg-muted">{label}</div>
      <p className={`text-body-sm ${muted ? "text-fg-muted" : "text-fg"} whitespace-pre-wrap break-words mt-0.5`}>{children}</p>
    </div>
  );
}

function CorrectionCard({ item, busy, onEdit, onToggle, onDelete }) {
  const { t } = useDashboard();
  const fmt = useFormat();
  const isRule = item.kind === "rule";

  return (
    <article className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={isRule ? "accent" : "brand"}>{isRule ? t("Aturan") : t("Contoh koreksi")}</Badge>
          <Badge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? t("Aktif") : t("Nonaktif")}</Badge>
        </div>
        <time className="text-caption text-fg-subtle" dateTime={item.createdAt}>
          {t("Dibuat {time}", { time: fmt.dateTime(item.createdAt) })}
        </time>
      </header>

      {isRule ? (
        <Block label={t("Aturan")}>{item.ruleText}</Block>
      ) : (
        <div className="flex flex-col gap-3">
          <Block label={t("Pesan pelanggan")}>{item.customerMessage || "-"}</Block>
          <Block label={t("Balasan AI")} muted>
            {item.originalReply || "-"}
          </Block>
          <Block label={t("Jawaban yang benar")}>{item.correctedReply}</Block>
        </div>
      )}
      {item.note ? <Block label={t("Catatan")} muted>{item.note}</Block> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" icon="edit" onClick={onEdit}>
          {t("Ubah")}
        </Button>
        <Button size="sm" variant="secondary" icon={item.isActive ? "pause" : "play"} disabled={busy} onClick={onToggle}>
          {item.isActive ? t("Nonaktifkan") : t("Aktifkan")}
        </Button>
        <Button size="sm" variant="quietDanger" icon="trash" onClick={onDelete}>
          {t("Hapus")}
        </Button>
      </div>
    </article>
  );
}

/** Corrected answers and standing rules the AI is given. Managers only. */
export default function CorrectionsPanel() {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [kind, setKind] = useState("");
  const [version, setVersion] = useState(0); // bump to reload the list from page 1
  const [changes, setChanges] = useState({}); // id -> stored item after an edit
  const [removed, setRemoved] = useState([]);
  const [dialog, setDialog] = useState(null); // { type: "add" | "edit" | "delete", item? }

  const close = () => setDialog(null);
  const restart = () => {
    setChanges({});
    setRemoved([]);
    setVersion((n) => n + 1);
  };

  const toggle = async (item) => {
    const result = await run(() => api.put(`/ai/corrections/${item.id}`, { isActive: !item.isActive }), { success: t("Perubahan disimpan.") });
    if (result.ok) setChanges((prev) => ({ ...prev, [item.id]: result.data.data }));
  };

  const remove = async () => {
    const id = dialog.item.id;
    const result = await run(() => api.delete(`/ai/corrections/${id}`), { success: t("Koreksi dihapus.") });
    if (result.ok) {
      setRemoved((prev) => [...prev, id]);
      close();
    }
  };

  const options = [
    { value: "", label: t("Semua") },
    { value: "rule", label: t("Aturan") },
    { value: "example", label: t("Contoh koreksi") },
  ];

  const renderEmpty = () => (
    <div className="bg-white border border-line rounded-2xl">
      <EmptyState
        icon="book"
        title={kind === "example" ? t("Belum ada contoh koreksi") : kind === "rule" ? t("Belum ada aturan") : t("Belum ada koreksi atau aturan")}
        body={t("Koreksi dibuat dari tab Balasan AI. Aturan adalah instruksi tetap yang berlaku untuk semua balasan.")}
        action={
          <Button icon="plus" onClick={() => setDialog({ type: "add" })}>
            {t("Tambah aturan")}
          </Button>
        }
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-64">
          <SelectField label={t("Tampilkan")} value={kind} onChange={(e) => setKind(e.target.value)} options={options} />
        </div>
        <Button icon="plus" onClick={() => setDialog({ type: "add" })}>
          {t("Tambah aturan")}
        </Button>
      </div>

      <PagedList
        key={`${kind}-${version}`}
        path="/ai/corrections"
        query={{ kind }}
        limit={CORRECTIONS_PAGE_SIZE}
        renderEmpty={renderEmpty}
        renderItem={(raw) => {
          if (removed.includes(raw.id)) return null;
          const item = changes[raw.id] ?? raw;
          return <CorrectionCard key={item.id} item={item} busy={pending} onEdit={() => setDialog({ type: "edit", item })} onToggle={() => toggle(item)} onDelete={() => setDialog({ type: "delete", item })} />;
        }}
      />

      {dialog?.type === "add" ? (
        <RuleModal
          onClose={close}
          onSaved={() => {
            close();
            restart();
          }}
        />
      ) : null}
      {dialog?.type === "edit" ? (
        <RuleModal
          correction={dialog.item}
          onClose={close}
          onSaved={(saved) => {
            setChanges((prev) => ({ ...prev, [saved.id]: saved }));
            close();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={dialog?.type === "delete"}
        onClose={close}
        onConfirm={remove}
        pending={pending}
        title={dialog?.item?.kind === "rule" ? t("Hapus aturan?") : t("Hapus koreksi?")}
        body={dialog?.item?.kind === "rule" ? t("AI tidak lagi mengikuti aturan ini. Ini tidak bisa dibatalkan.") : t("AI tidak lagi memakai jawaban ini untuk pertanyaan serupa. Ini tidak bisa dibatalkan.")}
        confirmLabel={dialog?.item?.kind === "rule" ? t("Hapus aturan") : t("Hapus koreksi")}
      />
    </div>
  );
}
