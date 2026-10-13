"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

// Business profile and team management live in Settings; this path is kept so existing links still work.
export default function InstitutionRedirect() {
  const router = useRouter();
  const { t } = useDashboard();
  useEffect(() => {
    router.replace("/dashboard/settings?tab=profile");
  }, [router]);
  return <div className="p-8 text-center text-fg-muted">{t("Mengalihkan ke Pengaturan...")}</div>;
}
