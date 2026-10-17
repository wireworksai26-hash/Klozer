import LegalDocument from "@/components/legal/LegalDocument";
import { LEGAL } from "@/utils/legal/config";
import { refundIntro, refundSections } from "@/utils/legal/refund";

export const metadata = {
  title: "Kebijakan Refund — Klozer",
  description: "Kebijakan pengembalian dana Klozer: kondisi yang dapat dikembalikan, cara mengajukan, dan waktu pengembalian.",
};

export default function RefundPage() {
  return (
    <LegalDocument
      title="Kebijakan Refund"
      intro={refundIntro}
      effectiveDate={LEGAL.effectiveDate}
      lastUpdated={LEGAL.lastUpdated}
      sections={refundSections}
      related={[
        { href: "/syarat-ketentuan", label: "Syarat dan Ketentuan" },
        { href: "/faq", label: "FAQ" },
        { href: "/kontak", label: "Kontak" },
      ]}
    />
  );
}
