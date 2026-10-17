"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Platform settings (AI keys and integration status) live in Settings > Integrasi Platform.
export default function PlatformSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/settings?tab=ai-admin");
  }, [router]);
  return <div className="p-8 text-center text-fg-muted">Mengalihkan ke Pengaturan...</div>;
}
