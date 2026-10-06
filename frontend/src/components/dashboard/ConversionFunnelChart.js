"use client";
import React, { useMemo } from "react";
import { SparklesIcon } from "@/components/icons";

export default function ConversionFunnelChart({
  title = "Corong Konversi Closing (Funnel)",
  subtitle = "Efisiensi perjalanan leads dari chat hingga lunas",
  leads = [],
  orders = [],
  data = null,
  className = "",
}) {
  const steps = useMemo(() => {
    if (data) return data;

    const totalLeads = (leads || []).length;
    const totalOrders = (orders || []).length;
    const paidOrders = (orders || []).filter(
      (o) => o.status === "paid" || o.status === "shipped" || o.status === "processing"
    ).length;

    // Responded leads: leads that have interacted or progressed past 'new_lead'
    const respondedLeads = (leads || []).filter(
      (l) => l.status !== "new_lead" && l.status !== "new"
    ).length || Math.max(totalOrders, Math.min(totalLeads, 1));

    const maxBase = Math.max(totalLeads, totalOrders, 1);
    const hasData = totalLeads > 0 || totalOrders > 0;

    const step1Count = hasData ? Math.max(totalLeads, totalOrders) : 0;
    const step2Count = hasData ? (totalLeads > 0 ? Math.max(respondedLeads, totalOrders) : totalOrders) : 0;
    const step3Count = totalOrders;
    const step4Count = paidOrders;

    const step1Pct = hasData ? 100 : 0;
    const step2Pct = hasData ? Math.min(100, Math.round((step2Count / maxBase) * 100)) : 0;
    const step3Pct = hasData ? Math.min(100, Math.round((step3Count / maxBase) * 100)) : 0;
    const step4Pct = hasData ? Math.min(100, Math.round((step4Count / maxBase) * 100)) : 0;

    return [
      {
        stage: "Leads Masuk",
        count: step1Count,
        pct: step1Pct,
        color: "bg-[#2545ff]",
        textColor: "text-[#2545ff]",
        note: "WhatsApp Inbound & Organik",
      },
      {
        stage: "Respon & Konsultasi CS",
        count: step2Count,
        pct: step2Pct,
        color: "bg-[#4338ca]",
        textColor: "text-[#4338ca]",
        note: "Interaksi percakapan aktif",
      },
      {
        stage: "Invoice / QRIS Terbit",
        count: step3Count,
        pct: step3Pct,
        color: "bg-[#0284c7]",
        textColor: "text-[#0284c7]",
        note: "Checkout & Tagihan dibuat",
      },
      {
        stage: "Closing Lunas & Terverifikasi",
        count: step4Count,
        pct: step4Pct,
        color: "bg-[#059669]",
        textColor: "text-[#059669]",
        note: `${step4Pct}% Konversi Keseluruhan`,
      },
    ];
  }, [data, leads, orders]);

  const closingRate = steps[3]?.pct || 0;
  const invoicedCount = steps[2]?.count || 0;
  const paidCount = steps[3]?.count || 0;
  const invoiceToPaidPct = invoicedCount > 0 ? Math.round((paidCount / invoicedCount) * 100) : 0;

  return (
    <div className={`bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f7]">
          <div>
            <h3 className="text-[16px] font-bold text-[#0f172a]">{title}</h3>
            <p className="text-[12.5px] text-[#64748b] mt-0.5">{subtitle}</p>
          </div>
          <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full border ${
            closingRate > 0
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-slate-600 bg-slate-50 border-slate-200"
          }`}>
            {closingRate}% Closing
          </span>
        </div>

        {/* Funnel Bars */}
        <div className="flex flex-col gap-3.5 my-4">
          {steps.map((step, idx) => (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-[12.5px] mb-1.5 font-medium">
                <span className="text-[#0f172a] font-bold flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>{step.stage}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748b] font-mono text-[12px]">
                    {step.count.toLocaleString("id-ID")} Kontak
                  </span>
                  <span className={`font-extrabold text-[12.5px] ${step.textColor}`}>
                    {step.pct}%
                  </span>
                </div>
              </div>

              {/* Progress Bar with smooth transition */}
              <div className="h-2.5 w-full bg-[#f1f3f7] rounded-full overflow-hidden">
                <div
                  style={{ width: `${step.pct}%` }}
                  className={`h-full ${step.color} rounded-full transition-all duration-700 ease-out group-hover:opacity-90`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#94a3b8] mt-1">
                <span>{step.note}</span>
                {idx > 0 && (
                  <span className="text-slate-400 font-mono">
                    Drop-off: {Math.max(0, steps[idx - 1].pct - step.pct)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insight Footer */}
      <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-[12px] text-[#475467] flex items-center gap-2.5 mt-2">
        <div className="w-6 h-6 rounded-lg bg-[#2545ff]/10 text-[#2545ff] flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-3.5 h-3.5" />
        </div>
        <div className="leading-snug">
          {invoicedCount > 0 ? (
            <>
              Konversi tagihan ke lunas mencapai <strong className="text-[#0f172a]">{invoiceToPaidPct}%</strong>. Rekomendasi: optimalkan follow-up otomatis AI pada tahap invoice.
            </>
          ) : (
            <>
              Belum ada transaksi pada instansi ini. Buat pesanan baru atau sambungkan WhatsApp untuk memulai funnel konversi.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
