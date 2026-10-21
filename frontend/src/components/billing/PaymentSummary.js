"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Stat, Tabs } from "@/components/ui";

/** The money in a period: what was received and how it was confirmed, what waits, and what deserves a look. */
export default function PaymentSummary({ refreshKey }) {
  const { t } = useDashboard();
  const { number, rupiah } = useFormat();
  const [days, setDays] = useState("30");
  const query = useApi("/billing/summary", { query: { days } });
  const { reload } = query;
  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);
  const tabs = [
    { id: "7", label: t("7 hari") },
    { id: "30", label: t("30 hari") },
    { id: "90", label: t("90 hari") },
  ];

  return (
    <section aria-label={t("Ringkasan uang masuk")} className="flex flex-col gap-4">
      <Tabs label={t("Rentang waktu")} tabs={tabs} value={days} onChange={setDays} />
      <Async query={query} loadingLabel={t("Memuat ringkasan...")}>
        {({ data }) => {
          const a = data.attention;
          const looks = a.claimedWithoutProof + a.confirmedByHandWithoutNotice + a.unmatchedNotices.count + a.reusedProofs;
          return (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label={t("Uang masuk")} value={rupiah(data.receivedIdr)} note={t("{n} pembayaran", { n: number(data.received.topups.count + data.received.orders.count) })} />
                <Stat label={t("Dari paket")} value={rupiah(data.received.orders.amountIdr)} note={t("{n} tagihan", { n: number(data.received.orders.count) })} />
                <Stat label={t("Dari top up token")} value={rupiah(data.received.topups.amountIdr)} note={t("{n} tagihan", { n: number(data.received.topups.count) })} />
                <Stat label={t("Terkonfirmasi otomatis")} value={rupiah(data.received.auto.amountIdr)} note={t("{n} pembayaran", { n: number(data.received.auto.count) })} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label={t("Menunggu pembayaran")} value={rupiah(data.waiting.amountIdr)} note={t("{n} tagihan terbuka", { n: number(data.waiting.count) })} />
                <Stat label={t("Klaim tanpa bukti")} value={number(a.claimedWithoutProof)} note={t("Sudah menekan bayar, belum unggah bukti")} />
                <Stat label={t("Manual tanpa notifikasi")} value={number(a.confirmedByHandWithoutNotice)} note={t("Cocokkan dengan mutasi")} />
                <Stat label={t("Notifikasi tidak cocok")} value={number(a.unmatchedNotices.count)} note={a.unmatchedNotices.count ? rupiah(a.unmatchedNotices.amountIdr) : t("Tidak ada")} />
              </div>
              {a.reusedProofs > 0 ? (
                <p className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-body-sm font-semibold text-danger-700">{t("{n} gambar bukti dipakai di lebih dari satu tagihan. Buka detail tagihannya untuk memeriksa.", { n: number(a.reusedProofs) })}</p>
              ) : looks === 0 ? (
                <p className="text-label text-fg-muted">{t("Tidak ada yang perlu dicek di rentang ini.")}</p>
              ) : null}
            </>
          );
        }}
      </Async>
    </section>
  );
}
