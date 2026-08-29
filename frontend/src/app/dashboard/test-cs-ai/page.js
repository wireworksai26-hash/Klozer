"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BotIcon, ZapIcon } from "@/components/icons";

export default function DashboardTestCsAiRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/test-cs-ai");
  }, [router]);

  return (
    <div className="bg-white p-8 rounded-2xl border border-[#f0e9e1] shadow-xs text-center max-w-[600px] mx-auto my-12 animate-scale-pop">
      <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4">
        <BotIcon className="w-7 h-7" />
      </div>
      <h2 className="text-[20px] font-extrabold text-[#0c1754] mb-2">
        Membuka AI Customer Service Testing Studio...
      </h2>
      <p className="text-[13.5px] text-[#64748b] mb-6">
        Halaman pengujian AI telah dipisahkan menjadi studio layar penuh tersendiri dengan panel persona di sisi kiri dan area chat WhatsApp luas di sisi kanan.
      </p>
      <Link
        href="/test-cs-ai"
        className="btn-primary !py-3 !px-6 text-[13.5px] font-bold inline-flex items-center gap-2"
      >
        <span>Buka AI Testing Studio Layar Penuh</span>
        <ZapIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
