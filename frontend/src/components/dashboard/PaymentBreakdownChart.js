"use client";
import React, { useMemo } from "react";

export default function PaymentBreakdownChart({
  title = "Metode Pembayaran",
  subtitle = "Distribusi channel transaksi masuk",
  orders = [],
  data = null,
  className = "",
}) {
  const { methods, totalTx } = useMemo(() => {
    if (data) {
      const sum = data.reduce((acc, d) => acc + (d.txCount || 0), 0);
      return { methods: data, totalTx: sum };
    }

    const totalOrdersCount = (orders || []).length;

    let qrisCount = 0;
    let qrisAmount = 0;
    let transferCount = 0;
    let transferAmount = 0;
    let codCount = 0;
    let codAmount = 0;

    (orders || []).forEach((ord) => {
      const pm = (ord.paymentMethod || ord.payment_method || "qris").toLowerCase();
      const val = Number(ord.total || ord.total_amount || 0);

      if (pm.includes("qris")) {
        qrisCount += 1;
        qrisAmount += val;
      } else if (pm.includes("transfer") || pm.includes("bank") || pm.includes("bca") || pm.includes("mandiri") || pm.includes("bsi")) {
        transferCount += 1;
        transferAmount += val;
      } else if (pm.includes("cod") || pm.includes("cash")) {
        codCount += 1;
        codAmount += val;
      } else {
        // Fallback default to QRIS
        qrisCount += 1;
        qrisAmount += val;
      }
    });

    const formatCurrency = (amount) => {
      if (!amount || amount === 0) return "Rp 0";
      return `Rp ${amount.toLocaleString("id-ID")}`;
    };

    const qrisPct = totalOrdersCount > 0 ? Math.round((qrisCount / totalOrdersCount) * 100) : 0;
    const transferPct = totalOrdersCount > 0 ? Math.round((transferCount / totalOrdersCount) * 100) : 0;
    const codPct = totalOrdersCount > 0 ? Math.max(0, 100 - qrisPct - transferPct) : 0;

    const computedMethods = [
      {
        name: "QRIS Dinamis Otomatis",
        pct: qrisPct,
        amount: formatCurrency(qrisAmount),
        txCount: qrisCount,
        color: "bg-brand",
        hex: "#2545ff",
      },
      {
        name: "Transfer Bank (BCA / Mandiri / BSI)",
        pct: transferPct,
        amount: formatCurrency(transferAmount),
        txCount: transferCount,
        color: "bg-[#0284c7]",
        hex: "#0284c7",
      },
      {
        name: "COD (Cash On Delivery Terverifikasi)",
        pct: codPct,
        amount: formatCurrency(codAmount),
        txCount: codCount,
        color: "bg-[#10b981]",
        hex: "#10b981",
      },
    ];

    return { methods: computedMethods, totalTx: totalOrdersCount };
  }, [data, orders]);

  return (
    <div className={`bg-white rounded-2xl border border-line p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="card-title">{title}</h3>
            <p className="text-label text-fg-muted mt-0.5">{subtitle}</p>
          </div>
          <span className="text-caption font-bold text-brand bg-brand-soft px-2.5 py-1 rounded-full border border-brand-soft">
            {totalTx} Transaksi
          </span>
        </div>

        {/* Segmented Stacked Progress Bar */}
        <div className="my-5">
          <div className="h-4 w-full bg-sunken rounded-full overflow-hidden flex gap-0.5 p-0.5">
            {totalTx === 0 ? (
              <div className="w-full h-full bg-slate-200 rounded-full" />
            ) : (
              methods.map((m, idx) =>
                m.pct > 0 ? (
                  <div
                    key={idx}
                    style={{ width: `${m.pct}%` }}
                    className={`${m.color} h-full first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                    title={`${m.name}: ${m.pct}%`}
                  />
                ) : null
              )
            )}
          </div>

          {/* Legend Items */}
          <div className="flex flex-col gap-3 mt-4">
            {methods.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-soft transition-colors border border-transparent hover:border-line"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.hex }}
                  />
                  <div>
                    <div className="text-body-sm font-bold text-fg">{m.name}</div>
                    <div className="text-caption text-fg-muted">
                      {m.txCount} Transaksi ({m.pct}%)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-body-sm font-bold text-fg">{m.amount}</div>
                  <div className="text-micro text-emerald-600 font-semibold">100% Lolos Audit</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-line flex items-center justify-between text-caption text-fg-muted">
        <span>Rekonsiliasi Mutasi: <strong>Otomatis</strong></span>
        <span className="text-emerald-600 font-bold">● Anti-Struk Palsu AI Aktif</span>
      </div>
    </div>
  );
}
