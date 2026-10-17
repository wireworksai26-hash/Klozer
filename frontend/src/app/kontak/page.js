import LegalShell from "@/components/legal/LegalShell";
import { RelatedLinks } from "@/components/legal/LegalDocument";
import { LEGAL, whatsappUrl } from "@/utils/legal/config";

export const metadata = {
  title: "Kontak — Klozer",
  description: "Hubungi Klozer: email, nomor telepon, dan alamat usaha.",
};

function Row({ label, children }) {
  return (
    <div className="py-4 border-b border-line last:border-b-0 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="text-body-sm font-semibold text-fg mb-1 sm:mb-0">{label}</dt>
      <dd className="text-body text-fg-muted">{children}</dd>
    </div>
  );
}

export default function ContactPage() {
  const wa = whatsappUrl();
  return (
    <LegalShell>
      <h1 className="text-heading font-bold text-fg mb-3">Kontak</h1>
      <p className="text-body text-fg-muted leading-relaxed mb-8">
        Hubungi kami untuk pertanyaan layanan, pembayaran, refund, atau data pribadi.
      </p>

      <dl className="rounded-xl border border-line bg-white px-6">
        <Row label="Nama layanan">
          {LEGAL.brand} ({LEGAL.site})
        </Row>
        <Row label="Email">
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-brand hover:underline">
            {LEGAL.contactEmail}
          </a>
        </Row>
        {LEGAL.phone && (
          <Row label="Telepon / WhatsApp">
            <a href={`tel:${LEGAL.phone.replace(/[^\d+]/g, "")}`} className="text-brand hover:underline">
              {LEGAL.phone}
            </a>
            {wa && (
              <>
                {" "}
                &middot;{" "}
                <a href={wa} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  Chat WhatsApp
                </a>
              </>
            )}
          </Row>
        )}
        {LEGAL.address && (
          <Row label="Alamat usaha">
            <span className="whitespace-pre-line">{LEGAL.address}</span>
          </Row>
        )}
        <Row label="Jam layanan">{LEGAL.operatingHours}</Row>
      </dl>

      <RelatedLinks
        links={[
          { href: "/faq", label: "FAQ" },
          { href: "/kebijakan-refund", label: "Kebijakan Refund" },
          { href: "/syarat-ketentuan", label: "Syarat dan Ketentuan" },
          { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
        ]}
      />
    </LegalShell>
  );
}
