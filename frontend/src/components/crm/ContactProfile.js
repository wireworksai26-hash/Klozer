"use client";
import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, ConfirmDialog, Modal, SearchInput } from "@/components/ui";
import { ORDER_STATUS_LABEL } from "./crmModel";

function Figure({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-caption text-fg-muted">{label}</div>
      <div className="text-body font-semibold text-ink tabular-nums truncate">{value}</div>
    </div>
  );
}

/** Pick another contact of this business to fold into this one, and say what will happen before it does. */
function MergePicker({ profile, onDone, onClose }) {
  const { t, leads, role } = useDashboard();
  const { run, pending } = useAction();
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState(null);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return leads.filter((l) => l.dbId !== profile.id && (l.name.toLowerCase().includes(q) || l.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~"))).slice(0, 6);
  }, [leads, search, profile.id]);

  const merge = async () => {
    const result = await run(() => api.post("/crm/contacts/merge", { keepId: profile.id, dropId: chosen.dbId }), { success: t("Kontak digabung.") });
    if (result.ok) onDone();
  };

  if (role !== "owner" && role !== "spv") return null;
  return (
    <div className="rounded-xl border border-line bg-canvas p-4 flex flex-col gap-3">
      <div className="text-body-sm font-semibold text-ink">{t("Gabungkan dengan kontak lain")}</div>
      <p className="m-0 text-caption text-fg-muted">{t("Untuk orang yang sama dengan dua catatan. Pesanan, chat, label, dan tugasnya pindah ke kontak ini, lalu kontak yang dipilih dihapus.")}</p>
      <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Cari nama atau nomor kontak lain")} aria-label={t("Cari kontak lain")} />
      {matches.length ? (
        <ul className="list-none m-0 p-0 flex flex-col gap-1">
          {matches.map((l) => (
            <li key={l.dbId}>
              <button type="button" onClick={() => setChosen(l)} className="w-full text-left rounded-lg px-3 py-2 text-body-sm bg-white border border-line hover:border-brand cursor-pointer">
                <span className="font-medium text-ink">{l.name}</span> <span className="text-fg-subtle tabular-nums">{l.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={onClose}>
          {t("Batal")}
        </Button>
      </div>
      <ConfirmDialog
        open={Boolean(chosen)}
        onClose={() => setChosen(null)}
        onConfirm={merge}
        pending={pending}
        title={t("Gabungkan kontak?")}
        body={chosen ? t("{drop} ({phone}) dihapus dan semua datanya pindah ke {keep}. Ini tidak bisa dibatalkan.", { drop: chosen.name, phone: chosen.phone, keep: profile.name || profile.phone }) : ""}
        confirmLabel={t("Gabungkan")}
      />
    </div>
  );
}

/** One contact as the team needs it before talking to them: what they bought, what is open, and who they are. */
export default function ContactProfile({ leadId, onClose, onChanged }) {
  const { t } = useDashboard();
  const { rupiah, date, dateTime, number } = useFormat();
  const query = useApi(`/crm/contacts/${leadId}`, { enabled: Boolean(leadId) });
  const [merging, setMerging] = useState(false);

  return (
    <Modal open={Boolean(leadId)} onClose={onClose} variant="drawer" title={query.data?.data.name || t("Kontak")} description={query.data ? `+${query.data.data.phone}` : undefined}>
      <Async query={query} loadingLabel={t("Memuat profil...")}>
        {({ data: p }) => (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{t(p.status === "in_progress" ? "Tindak lanjut" : p.status === "repeat" ? "Repeat" : p.status === "closing" ? "Closing" : p.status === "idle" ? "Tidak aktif" : p.status === "closed_lost" ? "Batal" : "Baru")}</Badge>
              {p.isVip ? <Badge tone="accent">VIP</Badge> : null}
              {p.handledBy === "human" ? <Badge tone="warning">{t("Perlu tim")}</Badge> : null}
              {p.marketingConsent === "opted_out" ? <Badge tone="danger">{t("Menolak promosi")}</Badge> : null}
              {p.labels.map((l) => (
                <Badge key={l.id}>{l.name}</Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-line p-4">
              <Figure label={t("Total belanja")} value={rupiah(p.stats.spent)} />
              <Figure label={t("Pesanan lunas")} value={number(p.stats.paidOrders)} />
              <Figure label={t("Rata-rata per pesanan")} value={p.stats.paidOrders ? rupiah(p.stats.averageOrder) : "-"} />
              <Figure label={t("Pesanan terakhir")} value={date(p.stats.lastOrderAt)} />
            </div>

            <section>
              <h3 className="text-body-sm font-semibold text-ink m-0 mb-2">{t("Pesanan")}</h3>
              {p.orders.length === 0 ? (
                <p className="m-0 text-label text-fg-muted">{t("Belum ada pesanan.")}</p>
              ) : (
                <ul className="list-none m-0 p-0 divide-y divide-line rounded-xl border border-line">
                  {p.orders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-body-sm">
                      <div className="min-w-0">
                        <div className="font-mono text-label text-ink">{o.number}</div>
                        <div className="text-caption text-fg-subtle">{date(o.createdAt)} | {t(ORDER_STATUS_LABEL[o.status] || o.status)}</div>
                      </div>
                      <div className="tabular-nums font-medium">{rupiah(o.total)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-body-sm font-semibold text-ink m-0 mb-2">{t("Tugas terbuka")}</h3>
              {p.tasks.length === 0 ? (
                <p className="m-0 text-label text-fg-muted">{t("Tidak ada tugas untuk kontak ini.")}</p>
              ) : (
                <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                  {p.tasks.map((task) => (
                    <li key={task.id} className="text-body-sm text-fg">
                      {task.title}
                      {task.dueAt ? <span className="text-caption text-fg-subtle"> | {t("tenggat")} {dateTime(task.dueAt)}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="grid grid-cols-2 gap-x-6 gap-y-3 text-body-sm">
              <Figure label={t("Kota")} value={p.city || "-"} />
              <Figure label={t("Ditangani CS")} value={p.assignedCs || "-"} />
              <Figure label={t("Pesan chat")} value={number(p.stats.messages)} />
              <Figure label={t("Terakhir dihubungi")} value={p.lastContactedAt ? dateTime(p.lastContactedAt) : "-"} />
            </section>
            {p.notes ? (
              <section>
                <h3 className="text-body-sm font-semibold text-ink m-0 mb-1">{t("Catatan")}</h3>
                <p className="m-0 text-body-sm text-fg whitespace-pre-line">{p.notes}</p>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" href="/dashboard/chat">
                {t("Buka chat")}
              </Button>
              {!merging ? (
                <Button variant="secondary" size="sm" onClick={() => setMerging(true)}>
                  {t("Gabungkan dengan kontak lain")}
                </Button>
              ) : null}
            </div>
            {merging ? (
              <MergePicker
                profile={{ ...p }}
                onClose={() => setMerging(false)}
                onDone={() => {
                  setMerging(false);
                  onChanged?.();
                  query.reload();
                }}
              />
            ) : null}
          </div>
        )}
      </Async>
    </Modal>
  );
}
