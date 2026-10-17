import fs from "fs";
import path from "path";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";
import { RelatedLinks } from "@/components/legal/LegalDocument";
import { LEGAL, whatsappUrl } from "@/utils/legal/config";
import { PLAN_PRICES, PROMO, formatRupiah, isPromoRunning, planPrice, promoUntilText } from "@/utils/plans";

// Re-render hourly so a promo with an end date switches off without a redeploy.
export const revalidate = 3600;

export const metadata = {
  title: "Cara Bayar Langganan — Klozer",
  description: "Bayar langganan Klozer lewat QRIS GoPay, lalu kirim bukti pembayaran untuk aktivasi.",
};

// The QR is a static file placed in /public; show it only when it is really there, so a missing
// file never renders as a broken image.
const qrisFile = LEGAL.payment.qrisImage;
const hasQris = Boolean(qrisFile) && fs.existsSync(path.join(process.cwd(), "public", qrisFile));

const STEPS = [
  "Pilih paket dan periode di tabel di bawah, lalu catat nominalnya.",
  "Scan QRIS di halaman ini dengan GoPay, GoPay Merchant, atau aplikasi bank/e-wallet apa pun, lalu bayar sesuai nominal.",
  "Kirim bukti pembayaran beserta email akun Klozer dan nama paket ke kontak di bawah.",
  `Kami mengaktifkan atau memperpanjang langganan Anda setelah pembayaran kami cek (jam layanan ${LEGAL.operatingHours}).`,
];

export default function PayPage() {
  const wa = whatsappUrl();
  const { gopayName, gopayNumber } = LEGAL.payment;

  return (
    <LegalShell>
      <h1 className="text-heading font-bold text-fg mb-3">Cara bayar langganan</h1>
      <p className="text-body text-fg-muted leading-relaxed mb-8">
        Pembayaran langganan Klozer dilakukan lewat QRIS. Aktivasi dilakukan setelah bukti pembayaran Anda kami konfirmasi.
      </p>

      <ol className="list-decimal pl-6 mb-10 flex flex-col gap-2 text-body text-fg-muted leading-relaxed">
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <div className="rounded-xl border border-line bg-white p-6 mb-10 flex flex-col sm:flex-row gap-6 items-center">
        {hasQris ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrisFile} alt={`QRIS pembayaran ${gopayName || LEGAL.brand}`} width={240} height={240} className="w-60 h-auto rounded-lg border border-line" />
        ) : (
          <div className="w-60 h-60 rounded-lg border border-dashed border-line-strong flex items-center justify-center text-center text-body-sm text-fg-subtle p-4">
            QRIS belum tersedia. Hubungi kami untuk instruksi pembayaran.
          </div>
        )}
        <dl className="flex flex-col gap-3 text-body w-full">
          {gopayName && (
            <div>
              <dt className="text-body-sm font-semibold text-fg">Atas nama</dt>
              <dd className="text-fg-muted">{gopayName}</dd>
            </div>
          )}
          {gopayNumber && (
            <div>
              <dt className="text-body-sm font-semibold text-fg">Nomor GoPay</dt>
              <dd className="text-fg-muted font-mono">{gopayNumber}</dd>
            </div>
          )}
          <p className="text-body-sm text-fg-subtle">Pastikan nama penerima sesuai sebelum menekan bayar.</p>
        </dl>
      </div>

      <h2 className="text-title font-bold text-fg mb-4">Nominal</h2>
      <div className="rounded-xl border border-line bg-white overflow-hidden mb-3">
        <table className="w-full text-body-sm">
          <thead className="bg-sunken text-fg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Paket</th>
              <th className="px-4 py-3 font-semibold">Bulanan</th>
              <th className="px-4 py-3 font-semibold">Tahunan (bayar sekali)</th>
            </tr>
          </thead>
          <tbody className="text-fg-muted">
            {Object.keys(PLAN_PRICES).map((name) => {
              const monthly = planPrice(name, "monthly");
              const annual = planPrice(name, "annual");
              return (
                <tr key={name} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold text-fg">
                    {name}
                    {monthly.original && (
                      <span className="ml-2 text-micro font-bold bg-success-500 text-white px-2 py-0.5 rounded-full align-middle">Promo {monthly.percent}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {monthly.original && <span className="line-through text-fg-subtle mr-2">Rp {formatRupiah(monthly.original)}</span>}
                    <span className={monthly.original ? "font-semibold text-fg" : ""}>Rp {formatRupiah(monthly.final)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {annual.original && <span className="line-through text-fg-subtle mr-2">Rp {formatRupiah(annual.original * 12)}</span>}
                    <span className={annual.original ? "font-semibold text-fg" : ""}>Rp {formatRupiah(annual.final * 12)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isPromoRunning() && (
        <p className="text-body-sm text-success-700 font-semibold mb-3">
          Promo diskon {PROMO.percent}% untuk Paket {PROMO.plan} sedang berlaku{promoUntilText() ? ` ${promoUntilText()}` : ""}. Bayar sesuai harga setelah diskon.
        </p>
      )}
      <p className="text-body-sm text-fg-subtle mb-10">
        Paket Enterprise dihitung sesuai kebutuhan; hubungi kami. Harga belum termasuk pajak bila berlaku.
      </p>

      <h2 className="text-title font-bold text-fg mb-4">Kirim bukti pembayaran</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2 text-body text-fg-muted">
        <li>
          Email:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-brand hover:underline">
            {LEGAL.contactEmail}
          </a>
        </li>
        {wa && (
          <li>
            WhatsApp:{" "}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              {LEGAL.phone}
            </a>
          </li>
        )}
      </ul>
      <p className="text-body-sm text-fg-subtle mt-6">
        Ketentuan pengembalian dana ada di{" "}
        <Link href="/kebijakan-refund" className="text-brand hover:underline">
          Kebijakan Refund
        </Link>
        .
      </p>

      <RelatedLinks
        links={[
          { href: "/kontak", label: "Kontak" },
          { href: "/faq", label: "FAQ" },
          { href: "/syarat-ketentuan", label: "Syarat dan Ketentuan" },
        ]}
      />
    </LegalShell>
  );
}
