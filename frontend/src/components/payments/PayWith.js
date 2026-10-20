"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { EmptyState, LoadingState } from "@/components/ui";
import MethodCard from "./MethodCard";

/** Every active way to pay Klozer, for the dashboard (token top up). The list comes from what the team manages. */
export default function PayWith() {
  const { t } = useDashboard();
  const query = useApi("/public/payment-methods");

  if (query.error && !query.data) return <EmptyState icon="alert" title={t("Metode pembayaran belum bisa dimuat")} body={t("Hubungi tim Klozer untuk cara membayar.")} />;
  if (!query.data) return <LoadingState label={t("Memuat metode pembayaran...")} />;
  const methods = query.data.data;
  if (!methods.length) return <EmptyState icon="coins" title={t("Metode pembayaran belum diatur")} body={t("Hubungi tim Klozer untuk cara membayar.")} />;
  return (
    <div className="flex flex-col gap-3">
      {methods.map((m) => (
        <MethodCard key={m.id} method={m} t={t} />
      ))}
    </div>
  );
}
