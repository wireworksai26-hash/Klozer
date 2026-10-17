import Link from "next/link";
import Logo from "@/components/common/Logo";

/** Plain page chrome (header + centred column) shared by the legal, FAQ and contact pages. */
export default function LegalShell({ children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="container-page flex items-center justify-between py-5">
          <Logo size="md" withIcon />
          <Link href="/" className="text-body-sm text-fg-muted hover:text-fg no-underline">
            &larr; Kembali ke beranda
          </Link>
        </div>
      </header>
      <main className="container-page py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
