"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Badge, Button, Card, Tabs } from "@/components/ui";

/** One plan for the chosen period: the price this shop pays now, the regular price when it is discounted, and the way to buy. */
function PlanCard({ plan, offer, period, current, onChoose, busy }) {
  const { t } = useDashboard();
  const { number, rupiah } = useFormat();
  const unit = period === "annual" ? t("tahun pertama") : t("bulan pertama");
  const ownPlan = current.tier === plan.plan && current.active;
  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-4 ${ownPlan ? "border-brand/40 bg-brand-soft/40" : "border-line bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-heading-sm font-bold text-ink">{plan.name}</h3>
        {ownPlan ? <Badge tone="brand">{t("Paket Anda")}</Badge> : null}
      </div>
      <div>
        {offer.percent > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <span className="text-caption font-bold bg-success-500 text-white px-2.5 py-1 rounded-full">{t("Diskon {percent}%", { percent: offer.percent })}</span>
            <span className="text-body-sm text-fg-subtle line-through tabular-nums">{rupiah(offer.listPriceIdr)}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-heading-md sm:text-heading-lg font-bold text-ink tabular-nums leading-none whitespace-nowrap">{rupiah(offer.priceIdr)}</span>
          <span className="text-body-sm text-fg-muted">{offer.percent > 0 ? unit : period === "annual" ? t("/tahun") : t("/bulan")}</span>
        </div>
        {offer.percent > 0 ? <p className="mt-2 text-body-sm font-semibold text-success-700 tabular-nums">{t("Hemat {price}", { price: rupiah(offer.discountIdr) })}</p> : null}
      </div>
      <p className="text-label text-fg-muted">{t("Termasuk {tokens} token AI untuk tiap bulan langganan.", { tokens: number(plan.tokensPerMonth) })}</p>
      <div className="mt-auto">
        <Button className="w-full" loading={busy} onClick={() => onChoose(plan.plan)}>
          {ownPlan ? t("Perpanjang {plan}", { plan: plan.name }) : t("Pilih {plan}", { plan: plan.name })}
        </Button>
      </div>
    </div>
  );
}

/** Choose a package and a period; a bill is made and the pay screen opens. Paying applies the plan, features and tokens. */
export default function PlanPicker({ data, onOrder }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [period, setPeriod] = useState("monthly");
  const [choosing, setChoosing] = useState(null);

  const choose = async (plan) => {
    setChoosing(plan);
    const result = await run(() => api.post("/billing/orders", { plan, period }));
    setChoosing(null);
    if (result.ok) onOrder(result.data);
  };

  return (
    <Card title={t("Pilih paket")} description={data.firstPurchase ? t("Diskon pembelian pertama sudah dihitung di harga.") : t("Perpanjang atau pindah paket kapan saja.")}>
      <div className="flex flex-col gap-5">
        <Tabs
          label={t("Lama langganan")}
          tabs={[
            { id: "monthly", label: t("Bulanan") },
            { id: "annual", label: t("Tahunan (bayar sekali)") },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.plans.map((plan) => (
            <PlanCard key={plan.plan} plan={plan} offer={plan[period]} period={period} current={data.current} onChoose={choose} busy={pending && choosing === plan.plan} />
          ))}
        </div>
        <p className="text-label text-fg-muted">{t("Butuh paket Enterprise atau jumlah token khusus? Hubungi tim kami.")}</p>
      </div>
    </Card>
  );
}
