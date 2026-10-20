"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, TableShell } from "@/components/ui";
import VoucherForm from "@/components/vouchers/VoucherForm";

const PAGE = 25;
const STATE = {
  active: { label: "Aktif", tone: "success" },
  scheduled: { label: "Belum mulai", tone: "brand" },
  expired: { label: "Sudah kedaluwarsa", tone: "neutral" },
  used_up: { label: "Habis dipakai", tone: "warning" },
  off: { label: "Nonaktif", tone: "neutral" },
};

/** Discount codes the team gives to clients for token top ups: create, limit, switch off. */
export default function VouchersPage() {
  const { t, role } = useDashboard();
  const { date, number, rupiah } = useFormat();
  const { run, pending } = useAction();
  const [page, setPage] = useState(0);
  const query = useApi("/platform/vouchers", { query: { limit: PAGE, offset: page * PAGE }, enabled: role === "superadmin" });
  const { reload } = query;
  const [form, setForm] = useState(null); // { voucher } to change, {} to create
  const [deleting, setDeleting] = useState(null);

  if (role !== "superadmin") return <EmptyState icon="lock" title={t("Hanya untuk tim Klozer")} />;

  const toggle = async (voucher) => {
    const result = await run(() => api.put(`/platform/vouchers/${voucher.id}`, { isActive: !voucher.isActive }), { success: voucher.isActive ? t("Voucher dinonaktifkan.") : t("Voucher diaktifkan.") });
    if (result.ok) reload();
  };
  const remove = async () => {
    const result = await run(() => api.delete(`/platform/vouchers/${deleting.id}`), { success: t("Voucher dihapus.") });
    if (result.ok) {
      setDeleting(null);
      reload();
    }
  };

  const describe = (v) => (v.discountType === "percent" ? `${number(v.discountValue)}%${v.maxDiscountIdr ? ` ${t("maks. {amount}", { amount: rupiah(v.maxDiscountIdr) })}` : ""}` : rupiah(v.discountValue));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Voucher Diskon")}
        description={t("Kode potongan harga untuk klien saat membeli token. Bisa untuk semua toko atau satu toko, dengan batas pemakaian dan masa berlaku.")}
        actions={
          <Button icon="plus" onClick={() => setForm({})}>
            {t("Buat voucher")}
          </Button>
        }
      />
      <Async query={query} loadingLabel={t("Memuat voucher...")}>
        {(data) =>
          data.vouchers.length === 0 ? (
            <Card>
              <EmptyState
                icon="coins"
                title={t("Belum ada voucher")}
                body={t("Buat kode pertama, lalu berikan ke klien. Mereka mengisinya di halaman top up token.")}
                action={
                  <Button icon="plus" onClick={() => setForm({})}>
                    {t("Buat voucher")}
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Kode")}</th>
                    <th>{t("Potongan")}</th>
                    <th>{t("Berlaku untuk")}</th>
                    <th className="text-right">{t("Dipakai")}</th>
                    <th>{t("Masa berlaku")}</th>
                    <th>{t("Status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.vouchers.map((v) => {
                    const state = STATE[v.state];
                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="font-mono font-semibold text-fg">{v.code}</div>
                          {v.description ? <div className="text-caption text-fg-subtle max-w-[220px]">{v.description}</div> : null}
                        </td>
                        <td className="whitespace-nowrap tabular-nums">
                          {describe(v)}
                          {v.minTokens ? <div className="text-caption text-fg-muted">{t("min. {tokens} token", { tokens: number(v.minTokens) })}</div> : null}
                        </td>
                        <td>{v.institutionName || t("Semua toko")}</td>
                        <td className="text-right tabular-nums whitespace-nowrap">
                          {v.maxUses ? `${number(v.usesCount)} / ${number(v.maxUses)}` : number(v.usesCount)}
                          <div className="text-caption text-fg-muted">{t("maks. {n} per toko", { n: number(v.perShopLimit) })}</div>
                        </td>
                        <td className="whitespace-nowrap text-fg-muted">{v.validFrom || v.validUntil ? `${v.validFrom ? date(v.validFrom) : t("sekarang")} - ${v.validUntil ? date(v.validUntil) : t("tanpa batas")}` : t("Tanpa batas")}</td>
                        <td>
                          <Badge tone={state.tone}>{t(state.label)}</Badge>
                        </td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="secondary" icon="edit" onClick={() => setForm({ voucher: v })}>
                              {t("Ubah")}
                            </Button>
                            <Button size="sm" variant="secondary" disabled={pending} onClick={() => toggle(v)}>
                              {v.isActive ? t("Nonaktifkan") : t("Aktifkan")}
                            </Button>
                            {v.usesCount === 0 ? (
                              <Button size="sm" variant="quietDanger" icon="trash" onClick={() => setDeleting(v)}>
                                {t("Hapus")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
              {data.total > PAGE ? (
                <div className="flex items-center justify-between text-label text-fg-muted">
                  <span>{t("{from} sampai {to} dari {total}", { from: page * PAGE + 1, to: Math.min(data.total, (page + 1) * PAGE), total: data.total })}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      {t("Sebelumnya")}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage((p) => p + 1)}>
                      {t("Berikutnya")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )
        }
      </Async>

      {form ? (
        <VoucherForm
          voucher={form.voucher}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} pending={pending} title={t("Hapus voucher?")} body={deleting ? t("Kode {code} dihapus. Voucher yang sudah pernah dipakai tidak bisa dihapus, hanya dinonaktifkan.", { code: deleting.code }) : ""} confirmLabel={t("Hapus")} />
    </div>
  );
}
