/* eslint-disable @next/next/no-img-element */
import CopyAccount from "./CopyAccount";

const KIND_LABEL = { qris: "QRIS", bank: "Transfer bank", ewallet: "Dompet digital" };

/**
 * One way to pay Klozer: the QR picture for QRIS, or the account for a bank or e-wallet, with what to do next.
 * Plain props only, so it renders on the server (payment page) and in the dashboard alike. `t` is optional: pages that
 * are not translated pass nothing and the Indonesian text is shown.
 */
export default function MethodCard({ method, t = (x) => x }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 flex flex-col sm:flex-row gap-5 items-start">
      {method.qrisUrl ? (
        <img src={method.qrisUrl} alt={t("Kode QRIS {label}", { label: method.label })} width={220} height={220} className="w-[220px] max-w-full h-auto rounded-lg border border-line bg-white flex-shrink-0" />
      ) : null}
      <dl className="flex flex-col gap-3 text-body-sm min-w-0 w-full">
        <div>
          <dt className="text-caption font-semibold text-fg-subtle">{t(KIND_LABEL[method.kind])}</dt>
          <dd className="text-body font-bold text-fg">{method.label}</dd>
        </div>
        {method.accountName ? (
          <div>
            <dt className="text-caption font-semibold text-fg-subtle">{t("Atas nama")}</dt>
            <dd className="text-fg">{method.accountName}</dd>
          </div>
        ) : null}
        {method.accountNumber ? (
          <div>
            <dt className="text-caption font-semibold text-fg-subtle">{method.kind === "ewallet" ? t("Nomor akun") : t("Nomor rekening")}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-fg tabular-nums break-all">{method.accountNumber}</span>
              <CopyAccount value={method.accountNumber} copyLabel={t("Salin")} doneLabel={t("Tersalin")} />
            </dd>
          </div>
        ) : null}
        {method.instructions ? <p className="text-fg-muted">{method.instructions}</p> : null}
      </dl>
    </div>
  );
}
