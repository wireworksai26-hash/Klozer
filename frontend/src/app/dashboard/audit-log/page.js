"use client";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";

const GROUPS = [
  ["", "Semua aktivitas"],
  ["auth", "Login dan keamanan"],
  ["order", "Pesanan"],
  ["payment", "Pembayaran"],
  ["user", "Akun staf"],
  ["product", "Produk"],
  ["bank_account", "Rekening"],
];

const LABELS = {
  "auth.login": "Login berhasil",
  "auth.login_failed": "Login gagal",
  "auth.register": "Pendaftaran tenant",
  "auth.change_password": "Mengubah password",
  "order.create": "Membuat pesanan",
  "order.status": "Mengubah status pesanan",
  "payment.qris_created": "Menerbitkan QRIS",
  "shipment.create": "Mencatat pengiriman",
  "product.create": "Menambah produk",
  "product.update": "Mengubah produk",
  "product.delete": "Menghapus produk",
  "product.bulk_import": "Impor produk massal",
  "product.stock_import": "Impor stok",
  "user.create": "Menambah akun staf",
  "user.update": "Mengubah akun staf",
  "user.deactivate": "Menonaktifkan staf",
  "user.reset_password": "Reset password staf",
  "bank_account.create": "Menambah rekening",
  "bank_account.update": "Mengubah rekening",
  "bank_account.delete": "Menghapus rekening",
  "whatsapp.channel_upsert": "Mengatur nomor WhatsApp",
  "whatsapp.channel_delete": "Melepas nomor WhatsApp",
  "integration.meta_capi_upsert": "Mengatur Meta CAPI",
  "institution.update": "Mengubah profil usaha",
  "ai.persona_update": "Mengubah persona AI",
};

const when = (iso, locale) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default function AuditLogPage() {
  const { notify, t, locale } = useDashboard();
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get("/audit-logs", { query: { action: group, page, limit: 25 } }));
    } catch (err) {
      notify("error", err.message);
      setData({ items: [], pagination: { totalItems: 0, totalPages: 1 } });
    }
  }, [group, page, notify]);

  useEffect(() => {
    // Refetch whenever the filter or page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{t("Log Aktivitas")}</h1>
        <p className="text-body-sm text-fg-muted">{t("Jejak tindakan penting di tenant Anda: siapa, apa, kapan, dan dari alamat IP mana.")}</p>
      </div>

      <select
        value={group}
        onChange={(e) => {
          setGroup(e.target.value);
          setPage(1);
        }}
        className="bg-white border border-line rounded-xl p-2.5 text-ink font-medium outline-none sm:max-w-xs"
      >
        {GROUPS.map(([value, label]) => (
          <option key={value} value={value}>
            {t(label)}
          </option>
        ))}
      </select>

      <div className="bg-white rounded-2xl border border-line table-scroll">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
              <th className="py-3 px-5">{t("Waktu")}</th>
              <th className="py-3 px-5">{t("Pelaku")}</th>
              <th className="py-3 px-5">{t("Aktivitas")}</th>
              <th className="py-3 px-5">{t("Objek")}</th>
              <th className="py-3 px-5">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body-sm">
            {(data?.items || []).map((l) => (
              <tr key={l.id} className="hover:bg-soft">
                <td className="py-3 px-5 whitespace-nowrap text-fg-muted">{when(l.created_at, locale)}</td>
                <td className="py-3 px-5">
                  <div className="font-bold text-ink">{l.user_name || t("Sistem")}</div>
                  <div className="text-caption text-fg-muted">{l.user_role || "-"}</div>
                </td>
                <td className="py-3 px-5">
                  <div className="font-semibold text-ink">{t(LABELS[l.action] || l.action)}</div>
                  <div className="text-caption text-fg-subtle font-mono">{l.action}</div>
                </td>
                <td className="py-3 px-5 text-fg-muted">{l.entity_type ? `${l.entity_type} #${l.entity_id}` : "-"}</td>
                <td className="py-3 px-5 font-mono text-caption text-fg-muted">{l.ip_address || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && <div className="py-10 text-center text-fg-muted">{t("Belum ada aktivitas tercatat.")}</div>}
        {!data && <div className="py-10 text-center text-fg-muted">{t("Memuat...")}</div>}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-body-sm text-fg-muted">
          <span>{pagination.totalItems} {t("catatan")}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline !py-1.5 !px-3 disabled:opacity-40">{t("Sebelumnya")}</button>
            <span className="py-1.5">{page} / {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="btn-outline !py-1.5 !px-3 disabled:opacity-40">{t("Berikutnya")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
