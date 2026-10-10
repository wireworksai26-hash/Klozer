"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The persona editor lives in Settings; this path is kept so existing links still work.
export default function PersonaAiRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/settings?tab=ai-spv");
  }, [router]);
  return <div className="p-8 text-center text-fg-muted">Mengalihkan ke Pengaturan...</div>;
}
