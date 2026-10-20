"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, ConfirmDialog, EmptyState, IconButton, Modal, TableShell, TextField } from "@/components/ui";

const PAGE = 25;
const today = () => new Date().toISOString().slice(0, 10);

const blank = () => ({ date: today(), spend: "", campaignName: "", campaignId: "", adName: "", adId: "", impressions: "", clicks: "" });

const wholeNumber = (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);

function SpendForm({ open, onClose, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [form, setForm] = useState(blank);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const amount = Number(form.spend);
  const valid = Boolean(form.date) && form.spend !== "" && Number.isFinite(amount) && amount >= 0 && wholeNumber(form.impressions) && wholeNumber(form.clicks);

  const save = async (e) => {
    e.preventDefault();
    const text = (v) => v.trim();
    const row = {
      date: form.date,
      spend: amount,
      ...(text(form.campaignName) ? { campaignName: text(form.campaignName) } : {}),
      ...(text(form.campaignId) ? { campaignId: text(form.campaignId) } : {}),
      ...(text(form.adName) ? { adName: text(form.adName) } : {}),
      ...(text(form.adId) ? { adId: text(form.adId) } : {}),
      ...(form.impressions !== "" ? { impressions: Number(form.impressions) } : {}),
      ...(form.clicks !== "" ? { clicks: Number(form.clicks) } : {}),
    };
    const out = await run(() => api.post("/ads/spend", { rows: [row] }), { success: t("Biaya iklan tersimpan.") });
    if (out.ok) onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Catat biaya iklan")}
      description={t("Satu baris per hari. Mengisi hari dan iklan yang sama lagi mengganti jumlah sebelumnya.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="spend-form" loading={pending} disabled={!valid}>
            {t("Simpan biaya")}
          </Button>
        </>
      }
    >
      <form id="spend-form" onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t("Tanggal")} type="date" value={form.date} max={today()} onChange={set("date")} required data-autofocus />
          <TextField label={t("Biaya (Rp)")} type="number" inputMode="decimal" min={0} step="any" value={form.spend} onChange={set("spend")} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t("Nama kampanye")} value={form.campaignName} maxLength={200} onChange={set("campaignName")} />
          <TextField label={t("ID kampanye")} value={form.campaignId} maxLength={100} onChange={set("campaignId")} className="font-mono" />
          <TextField label={t("Nama iklan")} value={form.adName} maxLength={200} onChange={set("adName")} />
          <TextField label={t("ID iklan")} value={form.adId} maxLength={100} onChange={set("adId")} className="font-mono" hint={t("Sama dengan ID iklan di Meta agar cocok dengan asal pelanggan.")} />
          <TextField label={t("Tayangan")} type="number" inputMode="numeric" min={0} value={form.impressions} onChange={set("impressions")} error={wholeNumber(form.impressions) ? undefined : t("Isi bilangan bulat 0 atau lebih.")} />
          <TextField label={t("Klik")} type="number" inputMode="numeric" min={0} value={form.clicks} onChange={set("clicks")} error={wholeNumber(form.clicks) ? undefined : t("Isi bilangan bulat 0 atau lebih.")} />
        </div>
        <p className="text-caption text-fg-subtle">{t("Kosongkan kampanye dan iklan untuk biaya seluruh akun pada hari itu.")}</p>
      </form>
    </Modal>
  );
}

/** Ad spend entered by hand or pulled from Meta. */
export default function SpendTab() {
  const { t } = useDashboard();
  const f = useFormat();
  const { run, pending } = useAction();
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const list = useApi("/ads/spend", { query: { limit: PAGE, offset } });

  const remove = async () => {
    const out = await run(() => api.delete(`/ads/spend/${deleting.id}`), { success: t("Data biaya iklan dihapus.") });
    if (out.ok) {
      setDeleting(null);
      list.reload();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button icon="plus" onClick={() => setAdding(true)}>
          {t("Catat biaya")}
        </Button>
      </div>
      <Async query={list} loadingLabel={t("Memuat biaya iklan...")}>
        {(res) =>
          res.data.length ? (
            <div className="flex flex-col gap-3">
              <TableShell>
                <thead>
                  <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                    <th scope="col" className="py-3 px-4">{t("Tanggal")}</th>
                    <th scope="col" className="py-3 px-4">{t("Kampanye dan iklan")}</th>
                    <th scope="col" className="py-3 px-4 text-right">{t("Biaya")}</th>
                    <th scope="col" className="py-3 px-4 text-right">{t("Tayangan")}</th>
                    <th scope="col" className="py-3 px-4 text-right">{t("Klik")}</th>
                    <th scope="col" className="py-3 px-4">{t("Sumber")}</th>
                    <th scope="col" className="py-3 px-4">
                      <span className="sr-only">{t("Aksi")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {res.data.map((r) => (
                    <tr key={r.id} className="hover:bg-soft">
                      <td className="py-3 px-4 whitespace-nowrap">{f.date(r.date)}</td>
                      <td className="py-3 px-4 min-w-[12rem]">
                        {r.campaignName || r.campaignId || r.adName || r.adId ? (
                          <>
                            <div className="font-semibold text-fg break-words">{r.campaignName || r.campaignId || "-"}</div>
                            {r.adName || r.adId ? <div className="text-caption text-fg-subtle break-words">{r.adName || r.adId}</div> : null}
                          </>
                        ) : (
                          <span className="text-fg-muted">{t("Seluruh akun")}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap font-semibold">{f.rupiah(r.spend)}</td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.impressions ? f.number(r.impressions) : "-"}</td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.clicks ? f.number(r.clicks) : "-"}</td>
                      <td className="py-3 px-4">
                        <Badge tone={r.source === "meta" ? "accent" : "neutral"}>{r.source === "meta" ? t("Meta") : t("Manual")}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <IconButton icon="trash" label={t("Hapus biaya iklan tanggal {date}", { date: f.date(r.date) })} onClick={() => setDeleting(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <div className="flex items-center justify-between gap-2">
                <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                  {t("Sebelumnya")}
                </Button>
                <span className="text-caption text-fg-muted tabular-nums">{t("Baris {from} sampai {to}", { from: offset + 1, to: offset + res.data.length })}</span>
                <Button variant="secondary" size="sm" disabled={res.data.length < PAGE} onClick={() => setOffset(offset + PAGE)}>
                  {t("Berikutnya")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-line">
              <EmptyState
                icon="chart"
                title={offset ? t("Tidak ada baris lagi") : t("Belum ada biaya iklan")}
                body={offset ? undefined : t("ROAS butuh biaya iklan. Catat biaya harian di sini, atau hubungkan akun iklan Meta di tab Meta Ads.")}
                action={
                  offset ? (
                    <Button variant="secondary" onClick={() => setOffset(0)}>
                      {t("Kembali ke awal")}
                    </Button>
                  ) : (
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      {t("Catat biaya")}
                    </Button>
                  )
                }
              />
            </div>
          )
        }
      </Async>

      {adding ? (
        <SpendForm
          open
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setOffset(0);
            list.reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        pending={pending}
        title={t("Hapus biaya iklan?")}
        body={t("Biaya tanggal {date} sebesar {amount} dihapus dan tidak lagi dihitung di ROAS.", { date: deleting ? f.date(deleting.date) : "", amount: deleting ? f.rupiah(deleting.spend) : "" })}
        confirmLabel={t("Hapus biaya")}
        onConfirm={remove}
      />
    </div>
  );
}
