import fs from "fs";
import path from "path";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";
import { RelatedLinks } from "@/components/legal/LegalDocument";
import { LEGAL, whatsappUrl } from "@/utils/legal/config";
import { PLAN_PRICES, annualBreakdown, formatRupiah, planOffer, promoUntilText } from "@/utils/plans";
import { fetchPaymentMethods } from "@/utils/platformPayments";
import MethodCard from "@/components/payments/MethodCard";

// Re-render every minute: a promo with an end date switches off without a redeploy, and a payment method the team
// adds or switches off shows up soon.
export const revalidate = 60;

export const metadata = {
  title: "Cara Bayar Langganan Klozer",
  description: "Bayar langganan Klozer lewat QRIS GoPay, lalu kirim bukti pembayaran untuk aktivasi.",
};

// The QR is a static file placed in /public; show it only when it is really there, so a missing
// file never renders as a broken image.
const qrisFile = LEGAL.payment.qrisImage;
const hasQris = Boolean(qrisFile) && fs.existsSync(path.join(process.cwd(), "public", qrisFile));

const STEPS = [
  "Pilih paket dan periode di tabel di bawah, lalu catat nominalnya.",
  "Bayar sesuai nominal lewat salah satu metode di halaman ini (scan QRIS dengan aplikasi bank atau e-wallet apa pun, atau transfer).",
  "Kirim bukti pembayaran beserta email akun Klozer dan nama paket ke kontak di bawah.",
  `Kami mengaktifkan atau memperpanjang langganan Anda setelah pembayaran kami cek (jam layanan ${LEGAL.operatingHours}).`,
];

export default async function PayPage() {
  const methods = await fetchPaymentMethods();
  const wa = whatsappUrl();
  const { gopayName, gopayNumber } = LEGAL.payment;

  return (
    <LegalShell>
      <h1 className="text-heading font-bold text-fg mb-3">Cara bayar langganan</h1>
      <p className="text-body text-fg-muted leading-relaxed mb-8">
        Pembayaran langganan Klozer dilakukan lewat QRIS atau transfer. Aktivasi dilakukan setelah bukti pembayaran Anda kami konfirmasi.
      </p>

      <ol className="list-decimal pl-6 mb-10 flex flex-col gap-2 text-body text-fg-muted leading-relaxed">
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      {methods && methods.length > 0 ? (
        <div className="flex flex-col gap-4 mb-10">
          {methods.map((m) => (
            <MethodCard key={m.id} method={m} />
          ))}
          <p className="text-body-sm text-fg-subtle">Pastikan nama penerima sesuai sebelum membayar.</p>
        </div>
      ) : (
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
      )}

      <h2 className="text-title font-bold text-fg mb-4">Nominal</h2>
      <div className="rounded-xl border border-line bg-white overflow-x-auto mb-3">
        <table className="w-full text-body-sm min-w-[640px]">
          <thead className="bg-sunken text-fg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Paket</th>
              <th className="px-4 py-3 font-semibold">Pembayaran pertama</th>
              <th className="px-4 py-3 font-semibold">Perpanjangan</th>
              <th className="px-4 py-3 font-semibold">Rincian</th>
            </tr>
          </thead>
          <tbody className="text-fg-muted">
            {Object.keys(PLAN_PRICES).flatMap((name) =>
              ["monthly", "annual"].map((period) => {
                const offer = planOffer(name, period);
                const annual = period === "annual";
                return (
                  <tr key={`${name}-${period}`} className="border-t border-line align-top">
                    <td className="px-4 py-3 font-semibold text-fg">
                      {name}
                      <div className="text-caption font-normal text-fg-subtle">{annual ? "Tahunan, bayar sekali" : "Bulanan"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {offer.percent > 0 && <div className="line-through text-fg-subtle">Rp {formatRupiah(offer.regularTotal)}</div>}
                      <div className={offer.percent > 0 ? "font-semibold text-fg" : ""}>Rp {formatRupiah(offer.firstTotal)}</div>
                      {offer.percent > 0 && <div className="text-caption text-success-700 font-semibold">Diskon {offer.percent}%, {annual ? "tahun" : "bulan"} pertama saja</div>}
                    </td>
                    <td className="px-4 py-3">
                      Rp {formatRupiah(offer.regularTotal)}
                      <div className="text-caption text-fg-subtle">per {annual ? "tahun" : "bulan"}</div>
                    </td>
                    <td className="px-4 py-3">{annual ? annualBreakdown(offer) : `Rp ${formatRupiah(offer.regularMonthly)} per bulan`}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-body-sm text-fg-muted mb-3">
        Diskon berlaku untuk pembayaran pertama saja{promoUntilText() ? ` (${promoUntilText()})` : ""}. Saat diperpanjang, Anda membayar harga normal. Bayar sesuai nominal pembayaran pertama.
      </p>
      <p className="text-body-sm text-fg-subtle mb-3">
        Kuota AI dan pilihan top up berbeda di tiap paket. Konsultasikan dengan{" "}
        <Link href="/kontak" className="text-brand hover:underline">
          tim kami
        </Link>{" "}
        sebelum membayar.
      </p>
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
