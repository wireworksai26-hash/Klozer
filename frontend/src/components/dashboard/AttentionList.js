"use client";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";

const DOT = { urgent: "bg-danger-500", soon: "bg-warning-500", calm: "bg-fg-subtle" };

/**
 * What needs a person right now, each with its count and a direct link to where it is handled. It reads only what the
 * dashboard already holds, so it costs no extra request, and an empty list says so plainly.
 * `scope` is the orders and leads this person may act on (a CS sees only their own).
 */
export default function AttentionList({ orders, leads, isManager }) {
  const { t, taskSummary, products } = useDashboard();

  const waiting = orders.filter((o) => o.status === "waiting_payment");
  const proofs = waiting.filter((o) => o.reviewStatus === "pending");
  const needTeam = leads.filter((l) => l.handledBy === "human");
  const lowStock = isManager ? (products || []).filter((p) => p.active && p.stock <= p.lowStock) : [];
  const overdue = taskSummary?.overdue || 0;

  const rows = [
    { key: "proof", count: proofs.length, tone: "urgent", label: t("Bukti bayar menunggu dicek"), hint: t("Pelanggan sudah mengirim bukti. Cocokkan dengan mutasi."), href: "/dashboard/orders" },
    { key: "human", count: needTeam.length, tone: "urgent", label: t("Chat menunggu tim"), hint: t("AI menyerahkan percakapan ini kepada manusia."), href: "/dashboard/chat" },
    { key: "overdue", count: overdue, tone: "urgent", label: t("Tugas lewat tenggat"), hint: t("Buka daftar tugas dan selesaikan atau jadwalkan ulang."), href: "/dashboard/tasks" },
    { key: "waiting", count: waiting.length - proofs.length, tone: "soon", label: t("Pesanan menunggu pembayaran"), hint: t("Belum ada bukti bayar. Ingatkan pelanggan bila sudah lama."), href: "/dashboard/orders" },
    { key: "stock", count: lowStock.length, tone: "soon", label: t("Produk stok menipis"), hint: t("Stok sudah di batas minimum atau di bawahnya."), href: "/dashboard/products" },
  ].filter((r) => r.count > 0);

  return (
    <section aria-labelledby="attention-title" className="bg-white rounded-2xl border border-line">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <h3 id="attention-title" className="card-title">{t("Perlu ditangani")}</h3>
        <span className="text-label text-fg-muted tabular-nums">{rows.length ? t("{count} jenis pekerjaan", { count: rows.length }) : ""}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-5 text-body-sm text-fg-muted m-0">{t("Tidak ada yang menunggu. Pesanan, chat, dan tugas semuanya sudah ditangani.")}</p>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="flex items-center gap-4 px-6 py-3 no-underline hover:bg-soft transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[r.tone]}`} aria-hidden="true" />
                <span className="w-10 text-heading-sm font-semibold text-ink tabular-nums leading-none">{r.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-fg">{r.label}</span>
                  <span className="block text-caption text-fg-muted truncate">{r.hint}</span>
                </span>
                <span className="text-label font-medium text-brand whitespace-nowrap">{t("Buka")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
