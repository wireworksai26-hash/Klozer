import LegalShell from "@/components/legal/LegalShell";
import { RelatedLinks } from "@/components/legal/LegalDocument";
import { faqItems } from "@/utils/legal/faq";

export const metadata = {
  title: "FAQ — Klozer",
  description: "Pertanyaan yang sering diajukan tentang Klozer: pembayaran QRIS, refund, keamanan data, dan penggunaan.",
};

export default function FaqPage() {
  return (
    <LegalShell>
      <h1 className="text-heading font-bold text-fg mb-3">Pertanyaan yang sering diajukan</h1>
      <p className="text-body text-fg-muted leading-relaxed mb-10">
        Tidak menemukan jawabannya? Hubungi kami lewat halaman Kontak.
      </p>
      <div className="flex flex-col gap-3">
        {faqItems.map((item) => (
          <details key={item.q} className="group rounded-xl border border-line bg-white px-5 py-4">
            <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-body font-semibold text-fg">
              <span>{item.q}</span>
              <span aria-hidden="true" className="text-brand transition-transform group-open:rotate-45 text-heading-sm leading-none">+</span>
            </summary>
            <p className="mt-3 text-body text-fg-muted leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
      <RelatedLinks
        links={[
          { href: "/kebijakan-refund", label: "Kebijakan Refund" },
          { href: "/syarat-ketentuan", label: "Syarat dan Ketentuan" },
          { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
          { href: "/kontak", label: "Kontak" },
        ]}
      />
    </LegalShell>
  );
}
