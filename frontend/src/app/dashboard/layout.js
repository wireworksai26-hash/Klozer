"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import {
  SidebarNav,
  HeaderTopbar,
  RoleGuard,
  buildRolesConfig,
} from "@/components/dashboard";

/**
 * DashboardContent
 * Assembles atomic dashboard components:
 * - RoleGuard for route & authentication protection
 * - SidebarNav for navigation drawer
 * - HeaderTopbar for quick actions, language toggle, and NotificationCenter
 */
function DashboardContent({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    role,
    activeInstitution,
    currentUser,
    logoutUser,
    language,
    setLanguage,
    t,
    notice,
    dismissNotice,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    whatsappStatus,
  } = useDashboard();

  // Notices auto-dismiss
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(dismissNotice, notice.type === "error" ? 9000 : 4500);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  // Precise Active Navigation Detector (fixes multi-active button highlight bug)
  const isItemActive = (itemHref) => {
    if (itemHref.includes("?")) {
      const [targetPath, targetQuery] = itemHref.split("?");
      if (pathname !== targetPath) return false;

      const targetParams = new URLSearchParams(targetQuery);
      const targetTab = targetParams.get("tab");
      const currentTab = searchParams.get("tab");

      if (targetTab) {
        if (currentTab) return currentTab === targetTab;
        if (role === "superadmin") return targetTab === "ai-admin";
        if (role === "spv") return targetTab === "ai-spv";
        if (role === "owner") return targetTab === "team";
        return targetTab === "profile";
      }
      return true;
    }

    return pathname === itemHref && !searchParams.get("tab");
  };

  const rolesConfig = useMemo(
    () => buildRolesConfig({ t, language }),
    [t, language]
  );
  const currentRoleConfig = rolesConfig[role] || rolesConfig.agent;

  return (
    <RoleGuard>
      <div className="flex h-screen bg-canvas overflow-hidden">
        {/* Atomic Sidebar Navigation */}
        <SidebarNav
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentRoleConfig={currentRoleConfig}
          role={role}
          currentUser={currentUser}
          activeInstitution={activeInstitution}
          isItemActive={isItemActive}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Atomic Header Topbar */}
          <HeaderTopbar
            onMenuOpen={() => setSidebarOpen(true)}
            currentUser={currentUser}
            currentRoleConfig={currentRoleConfig}
            role={role}
            logoutUser={logoutUser}
            language={language}
            setLanguage={setLanguage}
            t={t}
            whatsappStatus={whatsappStatus}
            notifications={notifications}
            markNotificationRead={markNotificationRead}
            markAllNotificationsRead={markAllNotificationsRead}
          />

          {/* Scrollable Viewport */}
          <main
            className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-10"
            style={{ backgroundColor: "var(--dash-bg)" }}
          >
            <div className="max-w-[1240px] mx-auto">
              {notice && (
                <div
                  role="status"
                  className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-body-sm font-semibold ${
                    notice.type === "error"
                      ? "bg-danger-50 border-danger-200 text-danger-700"
                      : "bg-success-50 border-success-200 text-success-800"
                  }`}
                >
                  <span className="flex-1">{t(notice.message)}</span>
                  <button
                    type="button"
                    onClick={dismissNotice}
                    className="bg-transparent border-none cursor-pointer text-current font-bold"
                    aria-label={t("Tutup")}
                  >
                    ×
                  </button>
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

/** Shown while the dashboard shell suspends; sits inside the provider so it can follow the language. */
function LoadingFallback() {
  const { t } = useDashboard();
  return <div className="p-8 text-center text-fg-muted" suppressHydrationWarning>{t("Memuat Dashboard...")}</div>;
}

export default function DashboardLayout({ children }) {
  return (
    <DashboardProvider>
      <Suspense
        fallback={<LoadingFallback />}
      >
        <DashboardContent>{children}</DashboardContent>
      </Suspense>
    </DashboardProvider>
  );
}
