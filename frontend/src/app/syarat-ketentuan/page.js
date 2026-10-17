import LegalDocument from "@/components/legal/LegalDocument";
import { LEGAL } from "@/utils/legal/config";
import { termsIntro, termsSections } from "@/utils/legal/terms";

export const metadata = {
  title: "Syarat dan Ketentuan — Klozer",
  description: "Syarat dan Ketentuan penggunaan layanan Klozer: akun, langganan, pembayaran QRIS, fitur AI, dan tanggung jawab.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Syarat dan Ketentuan"
      intro={termsIntro}
      effectiveDate={LEGAL.effectiveDate}
      lastUpdated={LEGAL.lastUpdated}
      sections={termsSections}
      related={[
        { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
        { href: "/kebijakan-refund", label: "Kebijakan Refund" },
        { href: "/faq", label: "FAQ" },
        { href: "/kontak", label: "Kontak" },
      ]}
    />
  );
}
