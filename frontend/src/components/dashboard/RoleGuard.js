"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

/**
 * RoleGuard Component.
 * Protects dashboard routes based on authentication status and user roles.
 * - Redirects unauthenticated ("anonymous") users to /login.
 * - Restricts /dashboard/superadmin routes to superadmin role only.
 * - Shows loading state while authentication/profile is booting.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function RoleGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, isBooting, role, t } = useDashboard();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (
      status === "ready" &&
      role !== "superadmin" &&
      pathname.startsWith("/dashboard/superadmin")
    ) {
      router.replace("/dashboard");
    }
  }, [status, role, pathname, router]);

  if (isBooting || status === "idle") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-ink">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-body-sm font-semibold tracking-wide" suppressHydrationWarning>
            {t("Memverifikasi Sesi Dashboard...")}
          </span>
        </div>
      </div>
    );
  }

  if (status === "anonymous") {
    return null;
  }

  return <>{children}</>;
}
