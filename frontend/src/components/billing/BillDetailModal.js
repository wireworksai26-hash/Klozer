"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, Modal } from "@/components/ui";

const TIER = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };

/** A plain statement the team can act on, with a tone: "danger" and "warning" want a look, "success" is reassurance. */
function Signals({ data }) {
  const { t } = useDashboard();
  const { signals, bill } = data;
  const open = data.type === "topup" ? bill.status === "quoted" : bill.status === "pending";
  const items = [];
  if (signals.proofReusedElsewhere) items.push({ tone: "danger", text: t("Gambar bukti yang sama dipakai di tagihan lain. Periksa sebelum menyetujui.") });
  if (signals.claimedWithoutProof) items.push({ tone: "warning", text: t("Klien mengaku sudah bayar tetapi belum mengunggah bukti.") });
  if (signals.confirmedByHandWithoutNotice) items.push({ tone: "warning", text: t("Dikonfirmasi manual tanpa notifikasi pembayaran. Cocokkan dengan mutasi rekening atau dompet.") });
  if (signals.noticeMatched && signals.noticeAmountMatches) items.push({ tone: "success", text: t("Notifikasi pembayaran dengan nominal yang sama sudah masuk.") });
  else if (open && !signals.noticeMatched) items.push({ tone: "neutral", text: t("Belum ada notifikasi pembayaran untuk tagihan ini.") });
  if (signals.proofCount > 0 && !signals.proofReusedElsewhere) items.push({ tone: "neutral", text: t("{n} bukti transfer diunggah klien.", { n: signals.proofCount }) });
  if (!items.length) return null;
  const style = { danger: "bg-danger-50 border-danger-200 text-danger-700", warning: "bg-warning-50 border-warning-200 text-warning-800", success: "bg-success-50 border-success-200 text-success-700", neutral: "bg-sunken border-line text-fg-muted" };
  return (
    <ul className="flex flex-col gap-2" aria-label={t("Hal yang perlu dicek")}>
      {items.map((item) => (
        <li key={item.text} className={`rounded-xl border px-4 py-2.5 text-body-sm font-medium ${style[item.tone]}`}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2 border-b border-line last:border-0">
      <dt className="text-label text-fg-muted">{label}</dt>
      <dd className="text-body-sm font-semibold text-fg text-right tabular-nums">{children}</dd>
    </div>
  );
}

function Timeline({ items }) {
  const { t } = useDashboard();
  const { dateTime, rupiah } = useFormat();
  const text = (e) => {
    if (e.kind === "created") return e.by ? t("Tagihan dibuat oleh {name}", { name: e.by }) : t("Tagihan dibuat");
    if (e.kind === "claimed") return e.reference ? t("Klien menekan Saya sudah bayar: {reference}", { reference: e.reference }) : t("Klien menekan Saya sudah bayar");
    if (e.kind === "proof") return t("Bukti transfer diunggah");
    if (e.kind === "notice") return t("Notifikasi pembayaran {amount} dari {source}", { amount: rupiah(e.amountIdr), source: e.source || "-" });
    if (e.kind === "settled") return e.via === "auto" ? t("Diselesaikan otomatis oleh notifikasi pembayaran") : e.by ? t("Dikonfirmasi manual oleh {name}", { name: e.by }) : t("Dikonfirmasi manual");
    return t("Tagihan dibatalkan");
  };
  return (
    <ol className="flex flex-col gap-3">
      {items.map((e, i) => (
        <li key={`${e.kind}-${i}`} className="flex gap-3">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-brand flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-body-sm text-fg">{text(e)}</div>
            <div className="text-caption text-fg-muted">{dateTime(e.at)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Body({ data }) {
  const { t } = useDashboard();
  const { date, dateTime, number, rupiah } = useFormat();
  const { bill, shop } = data;
  const topup = data.type === "topup";
  const amount = bill.payAmountIdr ?? bill.quotedAmountIdr;

  return (
    <div className="flex flex-col gap-6">
      <Signals data={data} />

      <section aria-label={t("Tagihan")}>
        <h3 className="card-title mb-2">{t("Tagihan")}</h3>
        <dl>
          <Row label={t("Jenis")}>{topup ? t("Top up token") : `${t("Paket")} ${bill.planName} ${bill.period === "annual" ? t("tahunan") : t("bulanan")}`}</Row>
          {topup ? <Row label={t("Token")}>{number(bill.tokens)}</Row> : null}
          <Row label={t("Harga normal")}>{rupiah(bill.listPriceIdr ?? bill.quotedAmountIdr)}</Row>
          {bill.discountIdr > 0 ? <Row label={topup ? t("Voucher {code}", { code: bill.voucherCode }) : t("Diskon pembelian pertama")}>{`- ${rupiah(bill.discountIdr)}`}</Row> : null}
          <Row label={t("Kode unik")}>{bill.uniqueCode ? `Rp ${bill.uniqueCode}` : "-"}</Row>
          <Row label={t("Nominal yang ditunggu")}>{rupiah(amount)}</Row>
          {!topup && bill.status === "paid" ? <Row label={t("Token ditambahkan")}>{number(bill.tokensGranted)}</Row> : null}
          {!topup && bill.activatedUntil ? <Row label={t("Paket berlaku sampai")}>{date(bill.activatedUntil)}</Row> : null}
        </dl>
      </section>

      <section aria-label={t("Toko")}>
        <h3 className="card-title mb-2">{t("Toko")}</h3>
        <dl>
          <Row label={t("Nama")}>{shop.name}</Row>
          <Row label={t("Pemilik")}>{shop.ownerName || "-"}</Row>
          <Row label={t("Email")}>{shop.email || "-"}</Row>
          <Row label={t("Paket sekarang")}>
            {TIER[shop.tier] || shop.tier}
            {shop.expiresAt ? <span className="block text-caption font-normal text-fg-muted">{t("Berlaku sampai {date}", { date: date(shop.expiresAt) })}</span> : null}
          </Row>
          <Row label={t("Token")}>{t("{left} sisa dari {total}", { left: number(Math.max(0, shop.tokenQuota - shop.tokensUsed)), total: number(shop.tokenQuota) })}</Row>
        </dl>
      </section>

      <section aria-label={t("Bukti transfer")}>
        <h3 className="card-title mb-2">{t("Bukti transfer")}</h3>
        {data.proofs.length === 0 ? (
          <p className="text-body-sm text-fg-muted">{t("Klien belum mengunggah bukti.")}</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.proofs.map((proof) => (
              <li key={proof.id} className="flex flex-col gap-1.5">
                <a href={proof.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-line overflow-hidden bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proof.url} alt={t("Bukti transfer {time}", { time: dateTime(proof.createdAt) })} className="w-full h-40 object-contain" loading="lazy" />
                </a>
                <span className="text-caption text-fg-muted">{dateTime(proof.createdAt)}</span>
                {proof.reusedOn.length ? <Badge tone="danger">{t("Dipakai juga di {where}", { where: proof.reusedOn.map((r) => `#${r.refId} ${r.institutionName}`).join(", ") })}</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t("Notifikasi pembayaran")}>
        <h3 className="card-title mb-2">{t("Notifikasi pembayaran")}</h3>
        {data.notices.length === 0 ? (
          <p className="text-body-sm text-fg-muted">{t("Belum ada notifikasi yang cocok dengan tagihan ini.")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.notices.map((n) => (
              <li key={n.id} className="rounded-lg border border-line px-4 py-2.5 text-body-sm flex flex-wrap justify-between gap-2">
                <span className="font-semibold tabular-nums">{rupiah(n.amountIdr)}</span>
                <span className="text-fg-muted">{[n.source, n.payer, n.reference].filter(Boolean).join(" / ") || "-"}</span>
                <span className="text-caption text-fg-muted">{dateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t("Riwayat")}>
        <h3 className="card-title mb-2">{t("Riwayat")}</h3>
        <Timeline items={data.timeline} />
      </section>
    </div>
  );
}

/** One payment in full, for the team: the bill, the shop, the proof pictures, the payment notices, the history, and what to look at. */
export default function BillDetailModal({ type, id, onClose }) {
  const { t } = useDashboard();
  const query = useApi(`/billing/detail/${type}/${id}`);
  return (
    <Modal open onClose={onClose} title={type === "topup" ? t("Detail top up #{id}", { id }) : t("Detail tagihan paket #{id}", { id })} size="lg" footer={<Button onClick={onClose}>{t("Tutup")}</Button>}>
      <Async query={query} loadingLabel={t("Memuat detail...")}>{(res) => <Body data={res.data} />}</Async>
    </Modal>
  );
}
