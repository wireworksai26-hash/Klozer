"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import Icon from "@/components/icons/Icon";
import { Async, Button, EmptyState, PageHeader, Stat } from "@/components/ui";
import TopupHistory from "@/components/topup/TopupHistory";
import TopupPacks from "@/components/topup/TopupPacks";
import TopupPayModal from "@/components/topup/TopupPayModal";
import { isRunningLow } from "@/components/topup/topupStatus";

function Meter({ balance }) {
  const { t } = useDashboard();
  const { percent } = useFormat();
  const used = balance.totalQuota ? Math.min(100, (balance.consumedTokens / balance.totalQuota) * 100) : 0;
  const low = isRunningLow(balance);
  return (
    <div>
      <div className="h-2 bg-line rounded-full overflow-hidden" role="img" aria-label={t("{value} kuota terpakai", { value: percent(used) })}>
        <div className={`h-full ${low ? "bg-danger-500" : used >= 70 ? "bg-warning-500" : "bg-success-500"}`} style={{ width: `${used}%` }} />
      </div>
      {low ? (
        <p className="mt-2 flex items-center gap-1.5 text-label font-semibold text-danger-700">
          <Icon name="alert" className="w-4 h-4" />
          {balance.remainingTokens <= 0 ? t("Token habis. Pertanyaan rutin tetap dijawab otomatis, sisanya diteruskan ke tim CS.") : t("Token hampir habis. Beli token agar AI tetap membalas.")}
        </p>
      ) : null}
    </div>
  );
}

/** The shop's token balance and the way to buy more. */
export default function TopupTokenPage() {
  const { t, isManager, role } = useDashboard();
  const { number } = useFormat();
  const query = useApi("/ai/topups", { enabled: isManager && role !== "superadmin" });
  const { reload } = query;
  const [paying, setPaying] = useState(null);

  // the team checks a payment or credits tokens: the list and the balance follow without a refresh
  const { topupEvent } = useDashboard();
  useEffect(() => {
    if (topupEvent) reload();
  }, [topupEvent, reload]);

  if (!isManager || role === "superadmin") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("Top Up Token AI")} />
        <EmptyState icon="lock" title={t("Hanya owner dan supervisor")} body={t("Minta owner atau supervisor toko Anda mengajukan top up token.")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Top Up Token AI")} description={t("Token dipakai saat AI menjawab pelanggan. Pertanyaan rutin seperti rekening dan daftar produk dijawab Jalur Cepat tanpa token.")} actions={<Button variant="secondary" href="/dashboard/subscription" icon="chart">{t("Lihat paket")}</Button>} />
      <Async query={query} loadingLabel={t("Memuat saldo token...")}>
        {(data) => (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Stat label={t("Sisa token")} value={number(data.balance.remainingTokens)} />
              <Stat label={t("Terpakai")} value={number(data.balance.consumedTokens)} />
              <Stat label={t("Total kuota")} value={number(data.balance.totalQuota)} />
            </div>
            <Meter balance={data.balance} />
            <TopupPacks packs={data.packs} rules={data.rules} onCreated={(topup) => { setPaying(topup); reload(); }} />
            <TopupHistory topups={data.data} onPay={setPaying} onChanged={reload} />
          </>
        )}
      </Async>
      {paying ? (
        <TopupPayModal
          topup={paying}
          onClose={() => setPaying(null)}
          onChanged={() => {
            setPaying(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
