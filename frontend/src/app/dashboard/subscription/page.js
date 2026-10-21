"use client";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button } from "@/components/ui";
import OrderHistory from "@/components/billing/OrderHistory";
import OrderPayModal from "@/components/billing/OrderPayModal";
import PlanPicker from "@/components/billing/PlanPicker";

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function Meter({ label, used, total }) {
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="bg-white p-5 rounded-2xl border border-line">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-label font-bold text-fg-muted uppercase">{label}</span>
        <span className="text-caption text-fg-muted">{pct}%</span>
      </div>
      <div className="text-heading-md font-bold text-ink">
        {fmt(used)} <span className="text-body-sm font-medium text-fg-muted">/ {fmt(total)}</span>
      </div>
      <div className="h-2 bg-canvas rounded-full overflow-hidden mt-3">
        <div className={`h-full ${pct >= 90 ? "bg-danger-500" : pct >= 70 ? "bg-warning-500" : "bg-success-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function StoreSubscriptionPage() {
  const { activeSubscription: sub, activeInstitution, tokenBalance, teamMembers, isManager, role, billingEvent, t } = useDashboard();
  const { date } = useFormat();
  const canBuy = isManager && role !== "superadmin";
  const plans = useApi("/billing/plans", { enabled: canBuy });
  const orders = useApi("/billing/orders", { enabled: canBuy });
  const { reload: reloadPlans } = plans;
  const { reload: reloadOrders } = orders;
  const [paying, setPaying] = useState(null); // { id, initial } while a pay screen is open

  // a payment settled, or a bill changed: the plan and the list follow without a refresh
  useEffect(() => {
    if (billingEvent) {
      reloadPlans();
      reloadOrders();
    }
  }, [billingEvent, reloadPlans, reloadOrders]);
  const settled = useCallback(() => {
    reloadPlans();
    reloadOrders();
  }, [reloadPlans, reloadOrders]);

  if (!sub) return <div className="p-8 text-center text-fg-muted">{t("Memuat data paket...")}</div>;

  const used = tokenBalance?.consumedTokens ?? sub.tokenUsed;
  const total = tokenBalance?.totalQuota ?? sub.tokenQuotaTotal;
  const staff = teamMembers.filter((m) => m.status === "active").length;
  const blocked = sub.status !== "active";

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <div>
        <h1 className="page-title">{t("Paket Langganan")}</h1>
        <p className="text-body-sm text-fg-muted">{t("Paket aktif dan pemakaian kuota")} {activeInstitution?.name}.</p>
      </div>

      {blocked && <div className="p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 font-semibold">{t("Akun tenant ini tidak aktif. Hubungi admin Klozer.")}</div>}

      <div className="bg-white p-6 rounded-2xl border border-line flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-label font-bold text-fg-muted uppercase">{t("Paket saat ini")}</div>
          <div className="text-heading font-bold text-ink">{sub.plan}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-3 py-1 rounded-full text-caption font-bold ${blocked ? "bg-line-strong text-fg" : "bg-success-100 text-success-800"}`}>{blocked ? t("Nonaktif") : t("Aktif")}</span>
          {plans.data?.current?.expiresAt ? <span className="text-caption text-fg-muted">{plans.data.current.active ? t("Berlaku sampai {date}", { date: date(plans.data.current.expiresAt) }) : t("Berakhir {date}", { date: date(plans.data.current.expiresAt) })}</span> : null}
        </div>
      </div>

      {canBuy ? (
        <>
          <Async query={plans} loadingLabel={t("Memuat paket...")}>
            {(data) => <PlanPicker data={data} onOrder={(res) => setPaying({ id: res.order.id, initial: res })} />}
          </Async>
          <Async query={orders} loadingLabel={t("Memuat tagihan...")}>
            {(data) => <OrderHistory orders={data.data} onPay={(order) => setPaying({ id: order.id, initial: null })} />}
          </Async>
          {paying ? (
            <OrderPayModal
              orderId={paying.id}
              initial={paying.initial}
              onClose={() => {
                setPaying(null);
                settled();
              }}
              onChanged={settled}
            />
          ) : null}
        </>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Meter label={t("Token AI terpakai")} used={used} total={total} />
        <div className="bg-white p-5 rounded-2xl border border-line">
          <div className="text-label font-bold text-fg-muted uppercase mb-2">{t("Tim aktif")}</div>
          <div className="text-heading-md font-bold text-ink">{staff} {t("akun")}</div>
          <div className="text-caption text-fg-muted mt-1">{sub.csSeatsUsed} {t("akun CS")}</div>
        </div>
      </div>

      {isManager && (
        <div>
          <Button href="/dashboard/topup-token" icon="coins" variant="secondary">
            {t("Top Up Token AI")}
          </Button>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-line text-body-sm text-fg-muted leading-relaxed">
        {t("Kuota token dipakai setiap kali AI membalas pelanggan. Pertanyaan rutin dijawab Jalur Cepat tanpa token. Ketika kuota habis, AI berhenti membalas dan sisanya diteruskan ke tim CS Anda. Untuk menambah token, pakai Top Up Token AI.")}
      </div>
    </div>
  );
}
