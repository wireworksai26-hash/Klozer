"use client";
import React, { useMemo } from "react";
import { SparklesIcon } from "@/components/icons";
import { useDashboard } from "@/context/DashboardContext";

export default function ConversionFunnelChart({
  title = "Corong Konversi Closing (Funnel)",
  subtitle = "Efisiensi perjalanan leads dari chat hingga lunas",
  leads = [],
  orders = [],
  data = null,
  className = "",
}) {
  const { t } = useDashboard();
  const steps = useMemo(() => {
    if (data) return data;

    const totalLeads = (leads || []).length;
    const totalOrders = (orders || []).filter((o) => o.status !== "cancelled").length;
    const paidOrders = (orders || []).filter(
      (o) => ["paid", "processing", "shipped", "delivered", "completed"].includes(o.status)
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
        color: "bg-brand",
        textColor: "text-brand",
        note: "WhatsApp Inbound & Organik",
      },
      {
        stage: "Respon & Konsultasi CS",
        count: step2Count,
        pct: step2Pct,
        color: "bg-brand-hover",
        textColor: "text-brand-hover",
        note: "Interaksi percakapan aktif",
      },
      {
        stage: "Invoice / QRIS Terbit",
        count: step3Count,
        pct: step3Pct,
        color: "bg-info",
        textColor: "text-info",
        note: "Checkout & Tagihan dibuat",
      },
      {
        stage: "Closing Lunas & Terverifikasi",
        count: step4Count,
        pct: step4Pct,
        color: "bg-success-600",
        textColor: "text-success-600",
        note: "{pct}% Konversi Keseluruhan",
        noteVars: { pct: step4Pct },
      },
    ];
  }, [data, leads, orders]);

  const closingRate = steps[3]?.pct || 0;
  const invoicedCount = steps[2]?.count || 0;
  const paidCount = steps[3]?.count || 0;
  const invoiceToPaidPct = invoicedCount > 0 ? Math.round((paidCount / invoicedCount) * 100) : 0;

  return (
    <div className={`bg-white rounded-2xl border border-line p-6 shadow-xs flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
          <div className="min-w-0">
            <h3 className="card-title whitespace-nowrap">{t(title)}</h3>
            <p className="text-label text-fg-muted mt-0.5 whitespace-nowrap">{t(subtitle)}</p>
          </div>
          <span className={`text-label font-bold px-2.5 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${
            closingRate > 0
              ? "text-success-700 bg-success-50 border-success-200"
              : "text-fg-muted bg-soft border-line"
          }`}>
            {closingRate}% Closing
          </span>
        </div>

        {/* Funnel bars: label + share on the first line, bar, then context + counts on one line each */}
        <div className="flex flex-col gap-4 my-4">
          {steps.map((step, idx) => (
            <div key={idx} className="group">
              <div className="flex items-center justify-between gap-3 text-label mb-1.5">
                <span className="text-fg font-bold flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-sunken text-fg text-micro flex items-center justify-center font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="whitespace-nowrap">{t(step.stage)}</span>
                </span>
                <span className={`font-bold text-label tabular-nums flex-shrink-0 ${step.textColor}`}>
                  {step.pct}%
                </span>
              </div>

              <div className="h-2.5 w-full bg-sunken rounded-full overflow-hidden">
                <div
                  style={{ width: `${step.pct}%` }}
                  className={`h-full ${step.color} rounded-full transition-all duration-700 ease-out group-hover:opacity-90`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-caption text-fg-subtle mt-1.5">
                <span className="truncate min-w-0" title={t(step.note, step.noteVars)}>{t(step.note, step.noteVars)}</span>
                <span className="tabular-nums whitespace-nowrap flex-shrink-0">
                  {step.count.toLocaleString("id-ID")} {t("Kontak")}
                  {idx > 0 && ` · Drop-off ${Math.max(0, steps[idx - 1].pct - step.pct)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insight Footer */}
      <div className="p-3 bg-soft rounded-xl border border-line text-label text-fg-muted flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-3.5 h-3.5" />
        </div>
        <div className="leading-snug">
          {invoicedCount > 0 ? (
            <>
              {t("Konversi tagihan ke lunas mencapai")} <strong className="text-fg">{invoiceToPaidPct}%</strong>. {t("Rekomendasi: optimalkan follow-up otomatis AI pada tahap invoice.")}
            </>
          ) : (
            <>
              {t("Belum ada transaksi pada instansi ini. Buat pesanan baru atau sambungkan WhatsApp untuk memulai funnel konversi.")}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
