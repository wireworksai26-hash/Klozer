"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Button, Card, CheckboxField, ConfirmDialog, EmptyState, Modal, SelectField, TableShell, TextField } from "@/components/ui";
import { SEGMENT_STATUSES, describeFilters } from "./crmModel";

const tri = (v) => (v === "yes" ? true : v === "no" ? false : undefined);
const num = (v) => (v === "" || v === undefined ? undefined : Number(v));

/** The form state turned into the filter the server saves: a field left empty filters nothing. */
export function buildFilters(f) {
  const out = {};
  if (f.statuses.length) out.statuses = f.statuses;
  if (tri(f.vip) !== undefined) out.vip = tri(f.vip);
  if (tri(f.bought) !== undefined) out.bought = tri(f.bought);
  if (f.consent) out.consent = f.consent;
  for (const key of ["minSpent", "maxSpent", "inactiveDays"]) {
    const n = num(f[key]);
    if (n !== undefined && Number.isFinite(n) && n >= 0) out[key] = key === "inactiveDays" ? Math.max(1, Math.trunc(n)) : n;
  }
  return out;
}

const EMPTY = { name: "", statuses: [], vip: "", bought: "", consent: "", minSpent: "", maxSpent: "", inactiveDays: "" };

function SegmentForm({ onClose, onSaved }) {
  const { t } = useDashboard();
  const { rupiah } = useFormat();
  const { run, pending } = useAction();
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setPreview(null);
  };
  const toggleStatus = (id, on) => set({ statuses: on ? [...form.statuses, id] : form.statuses.filter((s) => s !== id) });

  const check = async () => {
    const result = await run(() => api.post("/crm/contacts/preview", { filters: buildFilters(form) }));
    if (result.ok) setPreview(result.data);
  };
  const save = async () => {
    const result = await run(() => api.post("/crm/segments", { name: form.name.trim(), filters: buildFilters(form) }), { success: t("Segmen disimpan.") });
    if (result.ok) onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Segmen baru")}
      description={t("Satu segmen adalah satu filter yang disimpan. Isian yang dikosongkan tidak menyaring apa pun.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button variant="secondary" loading={pending} onClick={check}>
            {t("Lihat jumlah")}
          </Button>
          <Button loading={pending} disabled={form.name.trim().length < 2} onClick={save}>
            {t("Simpan segmen")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label={t("Nama segmen")} required maxLength={80} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("Contoh: pelanggan lama tidak aktif")} />
        <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
          <legend className="text-label font-semibold text-fg mb-1">{t("Tahap kontak")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {SEGMENT_STATUSES.map((s) => (
              <CheckboxField key={s.id} checked={form.statuses.includes(s.id)} onChange={(on) => toggleStatus(s.id, on)} label={t(s.label)} />
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label={t("Pernah membeli")} value={form.bought} onChange={(e) => set({ bought: e.target.value })} options={[{ value: "", label: t("Tidak disaring") }, { value: "yes", label: t("Pernah membeli") }, { value: "no", label: t("Belum pernah") }]} />
          <SelectField label="VIP" value={form.vip} onChange={(e) => set({ vip: e.target.value })} options={[{ value: "", label: t("Tidak disaring") }, { value: "yes", label: t("Hanya VIP") }, { value: "no", label: t("Bukan VIP") }]} />
          <TextField label={t("Tidak aktif (hari)")} type="number" min={1} value={form.inactiveDays} onChange={(e) => set({ inactiveDays: e.target.value })} hint={t("Tanpa chat dan pesanan selama sekian hari")} />
          <SelectField label={t("Persetujuan promosi")} value={form.consent} onChange={(e) => set({ consent: e.target.value })} options={[{ value: "", label: t("Tidak disaring") }, { value: "opted_in", label: t("Setuju") }, { value: "opted_out", label: t("Menolak") }, { value: "unknown", label: t("Belum diketahui") }]} />
          <TextField label={t("Belanja minimal (Rp)")} type="number" min={0} value={form.minSpent} onChange={(e) => set({ minSpent: e.target.value })} />
          <TextField label={t("Belanja maksimal (Rp)")} type="number" min={0} value={form.maxSpent} onChange={(e) => set({ maxSpent: e.target.value })} />
        </div>
        {preview ? (
          <div role="status" className="rounded-xl bg-sunken border border-line p-4 text-body-sm">
            <div className="font-semibold text-ink">{t("{count} kontak cocok", { count: preview.total })}</div>
            {preview.items.length ? (
              <ul className="list-none m-0 mt-2 p-0 flex flex-col gap-1 text-label text-fg-muted">
                {preview.items.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    {c.name || c.phone} | {rupiah(c.spent)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/** Saved filters over this business's contacts, with how many people each one holds right now. */
export default function SegmentsTab({ onOpen }) {
  const { t, role } = useDashboard();
  const { rupiah } = useFormat();
  const { run, pending } = useAction();
  const canEdit = role === "owner" || role === "spv";
  const list = useApi("/crm/segments");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [removing, setRemoving] = useState(null);
  const members = useApi(`/crm/segments/${openId}/contacts`, { query: { limit: 50 }, enabled: Boolean(openId) });

  const remove = async () => {
    const result = await run(() => api.delete(`/crm/segments/${removing.id}`), { success: t("Segmen dihapus.") });
    if (result.ok) {
      if (openId === removing.id) setOpenId(null);
      setRemoving(null);
      list.reload();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-label text-fg-muted">{t("Simpan kelompok pelanggan yang sering Anda cari, lalu buka kapan saja.")}</p>
        {canEdit ? (
          <Button icon="plus" onClick={() => setCreating(true)}>
            {t("Segmen baru")}
          </Button>
        ) : null}
      </div>

      <Async query={list} loadingLabel={t("Memuat segmen...")}>
        {({ items }) =>
          items.length === 0 ? (
            <Card>
              <EmptyState icon="user" title={t("Belum ada segmen")} body={t("Contoh: pelanggan yang pernah membeli tetapi 60 hari tidak aktif.")} />
            </Card>
          ) : (
            <ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((s) => (
                <li key={s.id} className={`rounded-2xl border bg-white p-4 flex flex-col gap-2 ${openId === s.id ? "border-brand" : "border-line"}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="m-0 text-body font-semibold text-ink">{s.name}</h3>
                    <span className="text-heading-sm font-semibold text-ink tabular-nums">{s.count}</span>
                  </div>
                  <p className="m-0 text-label text-fg-muted">{describeFilters(s.filters, t)}</p>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                      {openId === s.id ? t("Tutup daftar") : t("Lihat kontak")}
                    </Button>
                    {canEdit ? (
                      <Button size="sm" variant="secondary" onClick={() => setRemoving(s)}>
                        {t("Hapus")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Async>

      {openId ? (
        <Async query={members} loadingLabel={t("Memuat kontak...")}>
          {(data) =>
            data.items.length === 0 ? (
              <Card>
                <EmptyState icon="user" title={t("Tidak ada kontak di segmen ini sekarang")} />
              </Card>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Kontak")}</th>
                    <th className="text-right">{t("Pesanan lunas")}</th>
                    <th className="text-right">{t("Total belanja")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button type="button" onClick={() => onOpen(c.id)} className="text-left bg-transparent border-none p-0 cursor-pointer">
                          <div className="font-semibold text-fg hover:text-brand">{c.name || t("Tanpa nama")}</div>
                          <div className="text-caption text-fg-subtle tabular-nums">+{c.phone}</div>
                        </button>
                      </td>
                      <td className="text-right tabular-nums">{c.orders}</td>
                      <td className="text-right tabular-nums">{rupiah(c.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )
          }
        </Async>
      ) : null}

      {creating ? (
        <SegmentForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.reload();
          }}
        />
      ) : null}
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} pending={pending} title={t("Hapus segmen?")} body={removing ? t("Segmen {name} dihapus. Kontaknya sendiri tidak ikut terhapus.", { name: removing.name }) : ""} confirmLabel={t("Hapus")} />
    </div>
  );
}
