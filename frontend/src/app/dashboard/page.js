"use client";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import { MetricCard, TrendAreaChart, ConversionFunnelChart, PaymentBreakdownChart } from "@/components/dashboard";
import { CrownIcon, DollarSignIcon, ShoppingCartIcon, UsersIcon, TrendingUpIcon, MessageSquareIcon, SparklesIcon } from "@/components/icons";
import { PAID_STATUSES } from "@/utils/mappers.mjs";

const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const compact = (n, unit = "Jt") => (n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)} ${unit}` : rp(n));

/** Seven daily buckets ending today, from the real records. */
function spark(items, dateOf, valueOf = () => 1) {
  const points = [0, 0, 0, 0, 0, 0, 0];
  const now = Date.now();
  for (const item of items) {
    const created = dateOf(item);
    if (!created) continue;
    const days = Math.floor((now - new Date(created).getTime()) / 86400000);
    if (days >= 0 && days <= 6) points[6 - days] += valueOf(item);
  }
  return points;
}

const STATUS_BADGE = {
  waiting_payment: ["Menunggu Bayar", "bg-warning-50 text-warning-700 border-warning-200"],
  paid: ["Lunas", "bg-success-50 text-success-700 border-success-200"],
  processing: ["Diproses", "bg-brand-soft/50 text-brand border-brand/20"],
  shipped: ["Dikirim", "bg-accent-50 text-accent-700 border-accent-200"],
  delivered: ["Diterima", "bg-success-50 text-success-700 border-success-200"],
  completed: ["Selesai||status", "bg-success-50 text-success-700 border-success-200"],
  cancelled: ["Dibatalkan", "bg-sunken text-fg-muted border-line"],
};

function Header({ badge, title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
          <span className="text-caption font-bold text-brand bg-brand-soft px-2.5 py-0.5 whitespace-nowrap rounded-full border border-brand-soft">{badge}</span>
          <span className="text-label text-fg-muted">{subtitle}</span>
        </div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="flex items-center flex-wrap gap-2.5">{actions}</div>
    </div>
  );
}

const linkSecondary = "px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-soft text-fg text-body-sm font-bold flex items-center gap-1.5 no-underline";
const linkPrimary = "px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-body-sm font-bold flex items-center gap-1.5 no-underline";

function SuperadminView({ institutions, subscriptions }) {
  const { t } = useDashboard();
  const active = institutions.filter((i) => i.status === "active").length;
  const quota = subscriptions.reduce((a, s) => a + s.tokenQuotaTotal, 0);
  const used = subscriptions.reduce((a, s) => a + s.tokenUsed, 0);

  return (
    <div className="flex flex-col gap-6">
      <Header
        badge="Super Admin Console"
        subtitle={t("Ringkasan seluruh tenant")}
        title="Platform Overview"
        actions={
          <>
            <Link href="/dashboard/superadmin/token-usage" className={linkSecondary}>{t("Pemakaian Token")}</Link>
            <Link href="/dashboard/institutions" className={linkPrimary}>{t("+ Tambah Instansi")}</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title={t("Total Tenant")} value={`${institutions.length}`} subtitle={t("{count} aktif", { count: active })} icon={CrownIcon} />
        <MetricCard title={t("Tenant Nonaktif")} value={`${institutions.length - active}`} subtitle={t("Tidak bisa login")} icon={UsersIcon} />
        <MetricCard title={t("Kuota Token AI")} value={quota.toLocaleString("id-ID")} subtitle={t("Total seluruh tenant")} icon={SparklesIcon} />
        <MetricCard title={t("Token Terpakai")} value={used.toLocaleString("id-ID")} subtitle={quota ? t("{percent}% dari kuota", { percent: Math.round((used / quota) * 100) }) : "-"} icon={TrendingUpIcon} />
      </div>

      <div className="bg-white rounded-2xl border border-line p-6">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <h3 className="card-title">{t("Daftar Institusi dan Pemakaian Token AI")}</h3>
          <Link href="/dashboard/institutions" className="text-label font-bold text-brand hover:underline">{t("Kelola Semua →")}</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-soft border-b border-line">
                <th className="py-2.5 px-4 font-bold text-fg-muted">{t("Nama")}</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">{t("Sektor")}</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">{t("Paket")}</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">{t("Token Terpakai / Kuota")}</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {institutions.map((i) => (
                <tr key={i.id} className="hover:bg-soft/80">
                  <td className="py-3 px-4 font-bold text-fg">{i.name}</td>
                  <td className="py-3 px-4 text-fg-muted">{i.sector}</td>
                  <td className="py-3 px-4">{i.tier}</td>
                  <td className="py-3 px-4 tabular-nums">{i.quotaUsed.toLocaleString("id-ID")} / {i.quotaMax.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4">
                    <span className={`text-caption font-bold px-2 py-0.5 rounded-full border ${i.status === "active" ? "text-success-700 bg-success-50 border-success-200" : "text-fg-muted bg-sunken border-line"}`}>{i.status === "active" ? t("Aktif") : t("Nonaktif")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RecentOrders({ orders }) {
  const { t } = useDashboard();
  return (
    <div className="bg-white rounded-2xl border border-line p-6">
      <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
        <h3 className="card-title">{t("Pesanan Terbaru")}</h3>
        <Link href="/dashboard/orders" className="text-label font-bold text-brand hover:underline">{t("Lihat Semua →")}</Link>
      </div>
      {orders.length === 0 ? (
        <div className="p-8 text-center text-fg-muted bg-soft rounded-xl border border-dashed border-line text-body-sm">{t("Belum ada pesanan.")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-soft border-b border-line">
                {["Pesanan||singular", "Pelanggan", "Item", "Total", "Metode", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-4 font-bold text-fg-muted whitespace-nowrap">{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.slice(0, 5).map((o) => {
                const [label, tone] = STATUS_BADGE[o.status] || [o.status, "bg-sunken text-fg-muted border-line"];
                return (
                  <tr key={o.dbId} className="hover:bg-soft/80">
                    <td className="py-3 px-4 font-mono font-bold text-brand whitespace-nowrap">{o.id}</td>
                    <td className="py-3 px-4 font-bold text-fg whitespace-nowrap">{o.customer}</td>
                    <td className="py-3 px-4 text-fg-muted w-full max-w-0 truncate">
                      {o.items[0]?.name || "-"}
                      {o.items.length > 1 && ` (+${o.items.length - 1} ${t("lainnya")})`}
                    </td>
                    <td className="py-3 px-4 font-bold text-fg whitespace-nowrap tabular-nums">{rp(o.total)}</td>
                    <td className="py-3 px-4 text-fg-muted whitespace-nowrap">{o.paymentMethod}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-caption font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${tone}`}>{t(label)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { role, institutions, subscriptions, orders, leads, currentUser, activeInstitution, reportSummary, myPerformance, dataLoading, whatsappStatus, t } = useDashboard();

  if (role === "superadmin") return <SuperadminView institutions={institutions} subscriptions={subscriptions} />;

  const isCs = role === "cs";
  // A CS sees their own numbers; managers see the whole tenant.
  const scope = isCs ? orders.filter((o) => o.csDbId === currentUser?.id) : orders;
  const paid = scope.filter((o) => PAID_STATUSES.includes(o.status));
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const attempted = scope.filter((o) => o.status !== "cancelled").length;
  const closingRate = attempted ? Math.round((paid.length / attempted) * 100) : 0;
  const myLeads = isCs ? leads.filter((l) => l.csDbId === currentUser?.id) : leads;
  const csList = reportSummary?.csPerformance || [];
  const csTotals = csList.reduce(
    (a, c) => ({ revenue: a.revenue + (c.revenueGenerated || 0), commission: a.commission + (c.commissionEarned || 0), chats: a.chats + (c.handledChats || 0) }),
    { revenue: 0, commission: 0, chats: 0 }
  );

  const revenueSpark = spark(paid, (o) => o.created_at, (o) => o.total / 1_000_000);
  const ordersSpark = spark(paid, (o) => o.created_at);
  const leadsSpark = spark(myLeads, (l) => l.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <Header
        badge={currentUser?.institutionName || activeInstitution?.name || "Klozer"}
        subtitle={isCs ? t("Ringkasan penjualan Anda") : t("Ringkasan penjualan dan performa tim")}
        title={isCs ? t("Workspace Customer Service") : t("Dashboard Utama")}
        actions={
          <>
            <Link href="/dashboard/chat" className={linkSecondary}>
              <MessageSquareIcon className="w-4 h-4 text-brand" />
              <span>Live Chat</span>
            </Link>
            <Link href="/dashboard/orders" className={linkPrimary}>{t("+ Buat Pesanan")}</Link>
          </>
        }
      />

      {!whatsappStatus?.configured && !dataLoading && role !== "cs" && (
        <div className="p-4 rounded-xl bg-warning-50 border border-warning-200 text-warning-900 text-body-sm font-semibold flex flex-wrap items-center justify-between gap-3">
          <span>{t("Nomor WhatsApp belum terhubung, jadi pesan pelanggan belum masuk ke Klozer.")}</span>
          <Link href="/dashboard/settings?tab=profile" className="text-brand font-bold no-underline hover:underline">{t("Hubungkan sekarang →")}</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title={isCs ? t("Omzet Penjualan Saya") : t("Omzet Pesanan Lunas")} value={compact(revenue, t("Jt"))} subtitle={t("{count} pesanan lunas", { count: paid.length })} sparklineData={revenueSpark} icon={DollarSignIcon} />
        <MetricCard title={t("Pesanan Berhasil")} value={`${paid.length}`} subtitle={t("{count} pesanan tidak dibatalkan", { count: attempted })} sparklineData={ordersSpark} icon={ShoppingCartIcon} />
        {isCs ? (
          <MetricCard title={t("Komisi Saya")} value={rp(myPerformance?.commissionEarned)} subtitle={t("Dari pesanan lunas, sesuai tarif akun")} icon={TrendingUpIcon} />
        ) : (
          <MetricCard title={t("Laba Kotor")} value={compact(reportSummary?.totalGrossProfit ?? 0, t("Jt"))} subtitle={t("Harga jual dikurangi HPP")} icon={TrendingUpIcon} />
        )}
        <MetricCard title={isCs ? t("Kontak Ditangani") : t("Total Kontak")} value={`${myLeads.length}`} subtitle={t("Closing rate {rate}%", { rate: closingRate })} sparklineData={leadsSpark} icon={UsersIcon} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_23rem] gap-6">
        <TrendAreaChart orders={paid} title={t("Tren Omzet dan Volume")} subtitle={t("Hanya pesanan yang sudah dibayar")} />
        <ConversionFunnelChart leads={myLeads} orders={scope} title={t("Funnel Konversi")} subtitle={t("Dari kontak hingga lunas")} />
      </div>

      {!isCs && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_28.5rem] gap-6 items-start">
          <div className="bg-white rounded-2xl border border-line p-6">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-line mb-4">
              <div className="min-w-0">
                <h3 className="card-title whitespace-nowrap">{t("Performa dan Komisi Tim CS")}</h3>
                <p className="text-label text-fg-muted whitespace-nowrap">{t("Dihitung dari pesanan lunas dan chat yang dibalas")}</p>
              </div>
              <Link href="/dashboard/settings?tab=team" className="text-label font-bold text-brand hover:underline whitespace-nowrap flex-shrink-0">{t("Kelola Staf →")}</Link>
            </div>
            {csList.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  [t("Omzet Tim CS"), rp(csTotals.revenue)],
                  [t("Komisi Tim"), rp(csTotals.commission)],
                  [t("Chat Dibalas"), csTotals.chats.toLocaleString("id-ID")],
                ].map(([label, val]) => (
                  <div key={label} className="min-w-0">
                    <div className="text-caption text-fg-muted whitespace-nowrap">{label}</div>
                    <div className="text-body font-bold text-fg whitespace-nowrap tabular-nums">{val}</div>
                  </div>
                ))}
              </div>
            )}
            {csList.length === 0 ? (
              <div className="p-6 text-center text-fg-muted bg-soft rounded-xl border border-dashed border-line text-body-sm">{t("Belum ada staf CS aktif.")}</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {csList.map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-soft border border-line">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-soft text-brand font-bold text-label flex items-center justify-center">{cs.name.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-body-sm text-fg truncate">{cs.name}</div>
                        <div className="text-caption text-fg-muted whitespace-nowrap">{t("{chats} chat dibalas • {orders} closing", { chats: cs.handledChats, orders: cs.closedOrders })}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 whitespace-nowrap tabular-nums">
                      <div className="text-body-sm font-bold text-fg">{rp(cs.revenueGenerated)}</div>
                      <div className="text-caption text-brand font-medium">{t("Komisi")} {rp(cs.commissionEarned)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <PaymentBreakdownChart orders={paid} title={t("Distribusi Pembayaran")} subtitle={t("Metode bayar pesanan lunas")} />
        </div>
      )}

      <RecentOrders orders={scope} />
    </div>
  );
}
