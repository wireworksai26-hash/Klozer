import Link from "next/link";

/** Shown for modules that are planned but not connected to the backend yet. No sample data is displayed. */
export default function ComingSoon({ title, description }) {
  return (
    <div className="max-w-[640px] mx-auto text-center bg-white border border-line rounded-2xl p-10 mt-6">
      <span className="inline-block text-caption font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full mb-4">Belum tersedia</span>
      <h1 className="page-title mb-2">{title}</h1>
      <p className="text-body-sm text-fg-muted leading-relaxed">{description || "Modul ini sedang disiapkan dan belum terhubung ke data. Anda akan melihatnya di sini setelah tersedia."}</p>
      <Link href="/dashboard" className="btn-primary inline-block mt-6 !py-2 !px-5 font-bold no-underline">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
