"use client";
import { useDashboard } from "@/context/DashboardContext";
import { PAID_STATUSES } from "@/utils/mappers.mjs";
import { downloadCsv } from "@/utils/download";

const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const DAYS = 14;

export default function ReportsPage() {
  const { orders, reportSummary: summary, currentUser, activeInstitution, dataLoading } = useDashboard();
  const name = currentUser?.institutionName || activeInstitution?.name || "Bisnis";

  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const revenue = summary?.totalRevenue ?? paid.reduce((a, o) => a + o.total, 0);
  const aov = paid.length ? Math.round(revenue / paid.length) : 0;

  // Revenue per day for the last DAYS days, from paid orders.
  const today = new Date();
  const daily = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    return { key: d.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }), label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), total: 0 };
  });
  for (const o of paid) {
    const key = new Date(o.created_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    const bucket = daily.find((d) => d.key === key);
    if (bucket) bucket.total += o.total;
  }
  const maxDaily = Math.max(...daily.map((d) => d.total), 1);

  const byMethod = {};
  for (const o of paid) byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] || 0) + o.total;
  const methods = Object.entries(byMethod).sort((a, b) => b[1] - a[1]);

  const byProduct = {};
  for (const o of paid) for (const it of o.items) {
    const row = (byProduct[it.name] ||= { units: 0, revenue: 0 });
    row.units += it.qty;
    row.revenue += it.qty * it.price;
  }
  const topProducts = Object.entries(byProduct).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

  const exportOrders = () =>
    downloadCsv(`pesanan_${new Date().toISOString().slice(0, 10)}.csv`, ["No. Pesanan", "Tanggal", "Pelanggan", "Telepon", "Metode", "Status", "Subtotal", "Ongkir", "Total", "CS"], orders.map((o) => [o.id, o.date, o.customer, o.phone, o.paymentMethod, o.status, o.subtotal, o.shippingFee, o.total, o.cs]));

  const exportCs = () =>
    downloadCsv(`performa_cs_${new Date().toISOString().slice(0, 10)}.csv`, ["Nama", "Chat dibalas", "Closing", "Omzet", "Komisi"], (summary?.csPerformance || []).map((c) => [c.name, c.handledChats, c.closedOrders, c.revenueGenerated, c.commissionEarned]));

  const kpis = [
    ["Total Omzet", rp(revenue), `${paid.length} pesanan lunas`],
    ["Laba Kotor", summary ? rp(summary.totalGrossProfit) : "-", "Harga jual dikurangi HPP produk"],
    ["Rata-rata Nilai Pesanan", rp(aov), "Per pesanan lunas"],
    ["Closing Rate", summary ? `${summary.closingRatePercent}%` : "-", `${summary?.paidOrders ?? 0} dari ${summary?.totalOrders ?? 0} pesanan`],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Laporan dan Analytics</h1>
          <p className="text-body-sm text-fg-muted">Performa bisnis {name}, dihitung dari pesanan yang sudah dibayar.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportOrders} disabled={!orders.length} className="btn-outline !py-2 !px-4 text-body-sm font-bold disabled:opacity-50">Ekspor Pesanan (CSV)</button>
          <button onClick={exportCs} disabled={!summary?.csPerformance?.length} className="btn-outline !py-2 !px-4 text-body-sm font-bold disabled:opacity-50">Ekspor Performa CS</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(([k, v, sub]) => (
          <div key={k} className="bg-white p-5 rounded-2xl border border-line">
            <div className="text-label font-bold text-fg-muted uppercase">{k}</div>
            <div className="text-heading-md font-bold text-ink mt-1">{v}</div>
            <div className="text-caption text-fg-muted mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-line">
        <h3 className="card-title mb-4">Omzet {DAYS} Hari Terakhir</h3>
        {revenue === 0 && !dataLoading ? (
          <div className="py-10 text-center text-fg-muted text-body-sm">Belum ada pesanan lunas.</div>
        ) : (
          <div className="flex items-end gap-1.5 h-40">
            {daily.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${d.label}: ${rp(d.total)}`}>
                <div className="w-full bg-brand rounded-t" style={{ height: `${(d.total / maxDaily) * 100}%`, minHeight: d.total ? 3 : 0 }} />
                <span className="text-micro text-fg-subtle">{d.label.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-line">
          <h3 className="card-title mb-4">Metode Pembayaran</h3>
          {methods.length === 0 ? (
            <p className="text-fg-muted text-body-sm">Belum ada data.</p>
          ) : (
            methods.map(([m, total]) => (
              <div key={m} className="mb-3">
                <div className="flex justify-between text-body-sm mb-1">
                  <span className="font-semibold text-ink">{m}</span>
                  <span className="text-fg-muted">{rp(total)} ({Math.round((total / revenue) * 100)}%)</span>
                </div>
                <div className="h-2 bg-canvas rounded-full overflow-hidden">
                  <div className="h-full bg-brand" style={{ width: `${(total / revenue) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-line">
          <h3 className="card-title mb-4">Produk Terlaris</h3>
          {topProducts.length === 0 ? (
            <p className="text-fg-muted text-body-sm">Belum ada penjualan.</p>
          ) : (
            <table className="w-full text-left text-body-sm">
              <tbody className="divide-y divide-line">
                {topProducts.map(([productName, row]) => (
                  <tr key={productName}>
                    <td className="py-2.5 font-semibold text-ink">{productName}</td>
                    <td className="py-2.5 text-fg-muted text-right">{row.units} terjual</td>
                    <td className="py-2.5 font-bold text-right">{rp(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line overflow-x-auto">
        <div className="px-6 py-4 border-b border-line font-bold text-ink">Performa Tim CS</div>
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="bg-canvas text-label font-bold uppercase text-fg-muted">
              <th className="py-2.5 px-6">Nama</th>
              <th className="py-2.5 px-6">Chat dibalas</th>
              <th className="py-2.5 px-6">Closing</th>
              <th className="py-2.5 px-6">Omzet</th>
              <th className="py-2.5 px-6">Komisi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(summary?.csPerformance || []).map((c) => (
              <tr key={c.id}>
                <td className="py-2.5 px-6 font-bold text-ink">{c.name}</td>
                <td className="py-2.5 px-6">{c.handledChats}</td>
                <td className="py-2.5 px-6">{c.closedOrders}</td>
                <td className="py-2.5 px-6">{rp(c.revenueGenerated)}</td>
                <td className="py-2.5 px-6 text-brand font-semibold">{rp(c.commissionEarned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(summary?.csPerformance || []).length && <div className="py-8 text-center text-fg-muted">Belum ada staf CS aktif.</div>}
      </div>
    </div>
  );
}
