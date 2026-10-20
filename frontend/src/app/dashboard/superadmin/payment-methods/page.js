"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Switch } from "@/components/ui";
import MethodCard from "@/components/payments/MethodCard";
import PaymentMethodForm from "@/components/payments/PaymentMethodForm";
import QrisUpload from "@/components/payments/QrisUpload";

/** How Klozer is paid: the QRIS merchant, bank accounts and e-wallets shown on the payment page and the token top up page. */
export default function PaymentMethodsPage() {
  const { t, role } = useDashboard();
  const { run, pending } = useAction();
  const query = useApi("/platform/payment-methods", { enabled: role === "superadmin" });
  const { reload } = query;
  const [form, setForm] = useState(null); // { method } to edit, {} to add
  const [deleting, setDeleting] = useState(null);

  if (role !== "superadmin") return <EmptyState icon="lock" title={t("Hanya untuk tim Klozer")} />;

  const toggle = async (method, isActive) => {
    const result = await run(() => api.put(`/platform/payment-methods/${method.id}`, { isActive }), { success: isActive ? t("Metode ditampilkan ke pembayar.") : t("Metode disembunyikan.") });
    if (result.ok) reload();
  };
  const remove = async () => {
    const result = await run(() => api.delete(`/platform/payment-methods/${deleting.id}`), { success: t("Metode pembayaran dihapus.") });
    if (result.ok) {
      setDeleting(null);
      reload();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Metode Pembayaran")}
        description={t("Cara pelanggan membayar langganan dan top up token. Yang aktif tampil di halaman bayar dan halaman top up.")}
        actions={
          <Button icon="plus" onClick={() => setForm({})}>
            {t("Tambah metode")}
          </Button>
        }
      />
      <Async query={query} loadingLabel={t("Memuat metode pembayaran...")}>
        {(data) =>
          data.data.length === 0 ? (
            <Card>
              <EmptyState
                icon="coins"
                title={t("Belum ada metode pembayaran")}
                body={t("Tambahkan QRIS merchant atau rekening supaya toko bisa membayar langganan dan top up.")}
                action={
                  <Button icon="plus" onClick={() => setForm({})}>
                    {t("Tambah metode")}
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {data.data.map((method) => (
                <div key={method.id} className="flex flex-col gap-3">
                  <MethodCard method={method} t={t} />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={method.isActive ? "success" : "neutral"}>{method.isActive ? t("Tampil") : t("Disembunyikan")}</Badge>
                      {method.kind === "qris" && !method.hasQris ? <span className="text-label text-warning-800">{t("Belum ada gambar QRIS. Unggah dulu agar bisa ditampilkan.")}</span> : null}
                      <Switch checked={method.isActive} onChange={(on) => toggle(method, on)} label={t("Tampilkan")} disabled={pending || (method.kind === "qris" && !method.hasQris)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {method.kind === "qris" ? <QrisUpload method={method} onChanged={reload} /> : null}
                      <Button size="sm" variant="secondary" icon="edit" onClick={() => setForm({ method })}>
                        {t("Ubah")}
                      </Button>
                      <Button size="sm" variant="quietDanger" icon="trash" onClick={() => setDeleting(method)}>
                        {t("Hapus")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Async>

      {form ? (
        <PaymentMethodForm
          method={form.method}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        pending={pending}
        title={t("Hapus metode pembayaran?")}
        body={deleting ? t("{label} dihapus dan tidak tampil lagi di halaman bayar.", { label: deleting.label }) : ""}
        confirmLabel={t("Hapus")}
      />
    </div>
  );
}
