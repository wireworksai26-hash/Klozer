"use client";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import { MetricCard, TrendAreaChart, ConversionFunnelChart, PaymentBreakdownChart } from "@/components/dashboard";
import { CrownIcon, DollarSignIcon, ShoppingCartIcon, UsersIcon, TrendingUpIcon, MessageSquareIcon, SparklesIcon } from "@/components/icons";
import { PAID_STATUSES } from "@/utils/mappers.mjs";

const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const compact = (n) => (n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)} Jt` : rp(n));

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
  waiting_payment: ["Menunggu Bayar", "bg-amber-50 text-amber-700 border-amber-200"],
  paid: ["Lunas", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  processing: ["Diproses", "bg-blue-50 text-blue-700 border-blue-200"],
  shipped: ["Dikirim", "bg-purple-50 text-purple-700 border-purple-200"],
  delivered: ["Diterima", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  completed: ["Selesai", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  cancelled: ["Dibatalkan", "bg-gray-100 text-gray-600 border-gray-200"],
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
  const active = institutions.filter((i) => i.status === "active").length;
  const quota = subscriptions.reduce((a, s) => a + s.tokenQuotaTotal, 0);
  const used = subscriptions.reduce((a, s) => a + s.tokenUsed, 0);

  return (
    <div className="flex flex-col gap-6">
      <Header
        badge="Super Admin Console"
        subtitle="Ringkasan seluruh tenant"
        title="Platform Overview"
        actions={
          <>
            <Link href="/dashboard/superadmin/token-usage" className={linkSecondary}>Pemakaian Token</Link>
            <Link href="/dashboard/institutions" className={linkPrimary}>+ Tambah Instansi</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Tenant" value={`${institutions.length}`} subtitle={`${active} aktif`} icon={CrownIcon} />
        <MetricCard title="Tenant Nonaktif" value={`${institutions.length - active}`} subtitle="Tidak bisa login" icon={UsersIcon} />
        <MetricCard title="Kuota Token AI" value={quota.toLocaleString("id-ID")} subtitle="Total seluruh tenant" icon={SparklesIcon} />
        <MetricCard title="Token Terpakai" value={used.toLocaleString("id-ID")} subtitle={quota ? `${Math.round((used / quota) * 100)}% dari kuota` : "-"} icon={TrendingUpIcon} />
      </div>

      <div className="bg-white rounded-2xl border border-line p-6">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <h3 className="card-title">Daftar Institusi dan Pemakaian Token AI</h3>
          <Link href="/dashboard/institutions" className="text-label font-bold text-brand hover:underline">Kelola Semua →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-soft border-b border-line">
                <th className="py-2.5 px-4 font-bold text-fg-muted">Nama</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">Sektor</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">Paket</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">Token Terpakai / Kuota</th>
                <th className="py-2.5 px-4 font-bold text-fg-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {institutions.map((i) => (
                <tr key={i.id} className="hover:bg-soft/80">
                  <td className="py-3 px-4 font-bold text-fg">{i.name}</td>
                  <td className="py-3 px-4 text-fg-muted">{i.sector}</td>
                  <td className="py-3 px-4">{i.tier}</td>
                  <td className="py-3 px-4 font-mono">{i.quotaUsed.toLocaleString("id-ID")} / {i.quotaMax.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4">
                    <span className={`text-caption font-bold px-2 py-0.5 rounded-full border ${i.status === "active" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-gray-600 bg-gray-100 border-gray-200"}`}>{i.status === "active" ? "Aktif" : "Nonaktif"}</span>
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
  return (
    <div className="bg-white rounded-2xl border border-line p-6">
      <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
        <h3 className="card-title">Pesanan Terbaru</h3>
        <Link href="/dashboard/orders" className="text-label font-bold text-brand hover:underline">Lihat Semua →</Link>
      </div>
      {orders.length === 0 ? (
        <div className="p-8 text-center text-fg-muted bg-soft rounded-xl border border-dashed border-line text-body-sm">Belum ada pesanan.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-soft border-b border-line">
                {["Pesanan", "Pelanggan", "Item", "Total", "Metode", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-4 font-bold text-fg-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.slice(0, 5).map((o) => {
                const [label, tone] = STATUS_BADGE[o.status] || [o.status, "bg-gray-100 text-gray-600 border-gray-200"];
                return (
                  <tr key={o.dbId} className="hover:bg-soft/80">
                    <td className="py-3 px-4 font-mono font-bold text-brand">{o.id}</td>
                    <td className="py-3 px-4 font-bold text-fg">{o.customer}</td>
                    <td className="py-3 px-4 text-fg-muted">
                      {o.items[0]?.name || "-"}
                      {o.items.length > 1 && ` (+${o.items.length - 1} lainnya)`}
                    </td>
                    <td className="py-3 px-4 font-bold text-fg">{rp(o.total)}</td>
                    <td className="py-3 px-4 text-fg-muted">{o.paymentMethod}</td>
                    <td className="py-3 px-4">
                      <span className={`text-caption font-bold px-2.5 py-0.5 rounded-full border ${tone}`}>{label}</span>
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
  const { role, institutions, subscriptions, orders, leads, currentUser, activeInstitution, reportSummary, myPerformance, dataLoading, whatsappStatus } = useDashboard();

  if (role === "superadmin") return <SuperadminView institutions={institutions} subscriptions={subscriptions} />;

  const isCs = role === "cs";
  // A CS sees their own numbers; managers see the whole tenant.
  const scope = isCs ? orders.filter((o) => o.csDbId === currentUser?.id) : orders;
  const paid = scope.filter((o) => PAID_STATUSES.includes(o.status));
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const attempted = scope.filter((o) => o.status !== "cancelled").length;
  const closingRate = attempted ? Math.round((paid.length / attempted) * 100) : 0;
  const myLeads = isCs ? leads.filter((l) => l.csDbId === currentUser?.id) : leads;

  const revenueSpark = spark(paid, (o) => o.created_at, (o) => o.total / 1_000_000);
  const ordersSpark = spark(paid, (o) => o.created_at);
  const leadsSpark = spark(myLeads, (l) => l.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <Header
        badge={currentUser?.institutionName || activeInstitution?.name || "Klozer"}
        subtitle={isCs ? "Ringkasan penjualan Anda" : "Ringkasan penjualan dan performa tim"}
        title={isCs ? "Workspace Customer Service" : "Dashboard Utama"}
        actions={
          <>
            <Link href="/dashboard/chat" className={linkSecondary}>
              <MessageSquareIcon className="w-4 h-4 text-brand" />
              <span>Live Chat</span>
            </Link>
            <Link href="/dashboard/orders" className={linkPrimary}>+ Buat Pesanan</Link>
          </>
        }
      />

      {!whatsappStatus?.configured && !dataLoading && role !== "cs" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-body-sm font-semibold flex flex-wrap items-center justify-between gap-3">
          <span>Nomor WhatsApp belum terhubung, jadi pesan pelanggan belum masuk ke Klozer.</span>
          <Link href="/dashboard/settings?tab=profile" className="text-brand font-bold no-underline hover:underline">Hubungkan sekarang →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title={isCs ? "Omzet Penjualan Saya" : "Omzet Pesanan Lunas"} value={compact(revenue)} subtitle={`${paid.length} pesanan lunas`} sparklineData={revenueSpark} icon={DollarSignIcon} />
        <MetricCard title="Pesanan Berhasil" value={`${paid.length}`} subtitle={`${attempted} pesanan tidak dibatalkan`} sparklineData={ordersSpark} icon={ShoppingCartIcon} />
        {isCs ? (
          <MetricCard title="Komisi Saya" value={rp(myPerformance?.commissionEarned)} subtitle="Dari pesanan lunas, sesuai tarif akun" icon={TrendingUpIcon} />
        ) : (
          <MetricCard title="Laba Kotor" value={compact(reportSummary?.totalGrossProfit ?? 0)} subtitle="Harga jual dikurangi HPP" icon={TrendingUpIcon} />
        )}
        <MetricCard title={isCs ? "Kontak Ditangani" : "Total Kontak"} value={`${myLeads.length}`} subtitle={`Closing rate ${closingRate}%`} sparklineData={leadsSpark} icon={UsersIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <TrendAreaChart orders={paid} title="Tren Omzet dan Volume" subtitle="Hanya pesanan yang sudah dibayar" />
        </div>
        <div className="lg:col-span-4">
          <ConversionFunnelChart leads={myLeads} orders={scope} title="Funnel Konversi" subtitle="Dari kontak hingga lunas" />
        </div>
      </div>

      {!isCs && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-line p-6">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <h3 className="card-title">Performa dan Komisi Tim CS</h3>
                <p className="text-label text-fg-muted">Dihitung dari pesanan lunas dan chat yang dibalas</p>
              </div>
              <Link href="/dashboard/settings?tab=team" className="text-label font-bold text-brand hover:underline">Kelola Staf →</Link>
            </div>
            {(reportSummary?.csPerformance || []).length === 0 ? (
              <div className="p-6 text-center text-fg-muted bg-soft rounded-xl border border-dashed border-line text-body-sm">Belum ada staf CS aktif.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {reportSummary.csPerformance.map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-soft border border-line">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-soft text-brand font-bold text-label flex items-center justify-center">{cs.name.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-body-sm text-fg truncate">{cs.name}</div>
                        <div className="text-caption text-fg-muted">{cs.handledChats} chat dibalas • {cs.closedOrders} closing</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-body-sm font-bold text-fg">{rp(cs.revenueGenerated)}</div>
                      <div className="text-caption text-brand font-medium">Komisi {rp(cs.commissionEarned)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-5">
            <PaymentBreakdownChart orders={paid} title="Distribusi Pembayaran" subtitle="Metode bayar pesanan lunas" />
          </div>
        </div>
      )}

      <RecentOrders orders={scope} />
    </div>
  );
}
