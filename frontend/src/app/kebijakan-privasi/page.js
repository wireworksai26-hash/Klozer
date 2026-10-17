import LegalDocument from "@/components/legal/LegalDocument";
import { LEGAL } from "@/utils/legal/config";
import { privacyIntro, privacySections } from "@/utils/legal/privacy";

export const metadata = {
  title: "Kebijakan Privasi — Klozer",
  description: "Kebijakan Privasi Klozer: data yang diproses, tujuan, pihak ketiga, masa simpan, keamanan, dan hak Anda menurut UU PDP.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Kebijakan Privasi"
      intro={privacyIntro}
      effectiveDate={LEGAL.effectiveDate}
      lastUpdated={LEGAL.lastUpdated}
      sections={privacySections}
      related={[
        { href: "/syarat-ketentuan", label: "Syarat dan Ketentuan" },
        { href: "/kebijakan-refund", label: "Kebijakan Refund" },
        { href: "/faq", label: "FAQ" },
        { href: "/kontak", label: "Kontak" },
      ]}
    />
  );
}
