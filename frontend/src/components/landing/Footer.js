import Link from "next/link";
import Logo from "@/components/common/Logo";
import { LEGAL, whatsappUrl } from "@/utils/legal/config";

const linkClass = "text-white/65 hover:text-white transition-colors no-underline";

const columns = [
  {
    title: "Produk",
    links: [
      { label: "Dynamic QRIS", href: "#fitur" },
      { label: "Voice Note AI", href: "#fitur" },
      { label: "Anti-Struk Palsu", href: "#fitur" },
      { label: "Paket Harga", href: "#harga" },
    ],
  },
  {
    title: "Penggunaan",
    links: [
      { label: "Toko Online", href: "#solusi" },
      { label: "Brand Fashion", href: "#solusi" },
      { label: "Skincare & Retail", href: "#solusi" },
      { label: "Lembaga Donasi", href: "#solusi" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "Tanya Jawab (FAQ)", href: "/faq", internal: true },
      { label: "Cara Bayar", href: "/bayar", internal: true },
      { label: "Kontak", href: "/kontak", internal: true },
      { label: "Kebijakan Refund", href: "/kebijakan-refund", internal: true },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { label: "Tentang Kami", href: "/", internal: true },
      { label: "Masuk Dashboard", href: "/dashboard", internal: true },
      { label: "Daftar Akun", href: "/register", internal: true },
    ],
  },
];

export default function Footer() {
  const wa = whatsappUrl("Halo tim Klozer, saya ingin bertanya tentang Klozer.");

  return (
    <footer className="bg-ink text-white relative z-30 overflow-hidden">
      <div className="container-page">
        {/* Closing call to action */}
        <div className="py-16 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end border-b border-white/10">
          <div className="lg:col-span-8">
            <span className="eyebrow-label text-brand-light block mb-4">Mulai hari ini</span>
            <h2 className="font-display text-heading-lg md:text-display leading-[1.08] tracking-tight text-white m-0">
              Biarkan Klozer yang membalas,{" "}
              <span className="italic-signature text-white">Anda fokus berjualan</span>
            </h2>
          </div>
          <div className="lg:col-span-4 flex flex-wrap items-center gap-4 lg:justify-end">
            <Link href="/register" className="btn-primary !py-3 !px-8 text-body no-underline">
              Coba gratis 14 hari
            </Link>
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="text-body font-medium text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors">
                Bicara dengan tim
              </a>
            ) : (
              <Link href="/kontak" className="text-body font-medium text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors">
                Bicara dengan tim
              </Link>
            )}
          </div>
        </div>

        {/* Brand and links */}
        <div className="py-14 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 flex flex-col gap-5">
            <Logo size="lg" variant="light" withIcon={true} />
            <p className="text-body-sm leading-relaxed text-white/65 max-w-[320px] m-0">
              Asisten AI WhatsApp yang melayani pesanan, menerbitkan Dynamic QRIS di chat, dan mencocokkan pembayaran secara otomatis.
            </p>
            <div className="flex flex-col gap-2 text-body-sm">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className={linkClass}>
                  WhatsApp {LEGAL.phone}
                </a>
              )}
              <a href={`mailto:${LEGAL.contactEmail}`} className={`${linkClass} break-all`}>
                {LEGAL.contactEmail}
              </a>
              {LEGAL.instagramUrl && (
                <a href={LEGAL.instagramUrl} target="_blank" rel="noreferrer" className={linkClass}>
                  Instagram {LEGAL.instagramHandle}
                </a>
              )}
            </div>
          </div>

          <nav aria-label="Footer" className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-body-sm">
            {columns.map((col) => (
              <div key={col.title}>
                <h5 className="text-caption font-medium text-white/45 tracking-wide mb-5">{col.title}</h5>
                <ul className="flex flex-col gap-3 list-none p-0 m-0">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.internal ? (
                        <Link href={l.href} className={linkClass}>{l.label}</Link>
                      ) : (
                        <a href={l.href} className={linkClass}>{l.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Legal */}
        <div className="py-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-label text-white/50">
          <span>© 2026 Klozer. Seluruh hak dilindungi.</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/syarat-ketentuan" className="text-white/50 hover:text-white transition-colors no-underline">Syarat &amp; Ketentuan</Link>
            <Link href="/kebijakan-privasi" className="text-white/50 hover:text-white transition-colors no-underline">Kebijakan Privasi</Link>
            <span>Standar keamanan Meta &amp; Bank Indonesia</span>
          </div>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the bottom edge */}
      <div aria-hidden="true" className="select-none pointer-events-none text-center leading-[0.8] font-bold tracking-tighter text-white/[0.04] text-[22vw] -mb-[0.12em] whitespace-nowrap">
        klozer
      </div>
    </footer>
  );
}
