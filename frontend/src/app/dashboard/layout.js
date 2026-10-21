"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { FEATURE_LIST, featureForPath } from "@/utils/plans";
import {
  SidebarNav,
  HeaderTopbar,
  RoleGuard,
  buildRolesConfig,
} from "@/components/dashboard";

// Modules whose screens are interface previews: they work on sample data held in the page and are
// not saved to the server yet. A thin notice keeps that visible during client demos.
const PREVIEW_ROUTES = [
  "templates", "labels", "label-stats", "credits", "blocked-contacts", "internal-chat", "escalation",
  "bookings", "pic-roster", "warehouses", "etalase", "doa-knowledge",
  "superadmin/ai-scenarios", "superadmin/blasting", "superadmin/exports", "superadmin/leads", "superadmin/transactions",
].map((p) => `/dashboard/${p}`);

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
    taskSummary,
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

  const taskBadge = taskSummary?.mine || 0;
  const rolesConfig = useMemo(
    () => buildRolesConfig({ t, language, badges: { tasks: taskBadge } }),
    [t, language, taskBadge]
  );
  const baseRoleConfig = rolesConfig[role] || rolesConfig.agent;

  // Pages of a feature that the tenant's package does not include stay out of the menu, and the page
  // itself explains why when opened directly. The superadmin is never restricted.
  const modules = activeInstitution?.modules || {};
  const featureOff = (href) => {
    const feature = featureForPath(href);
    return role !== "superadmin" && Boolean(feature) && modules[feature] === false;
  };
  const available = (item) => !featureOff(item.href);
  const currentRoleConfig = {
    ...baseRoleConfig,
    pinnedItems: baseRoleConfig.pinnedItems?.filter(available),
    navItems: baseRoleConfig.navItems?.filter(available),
    navSections: baseRoleConfig.navSections
      ?.map((section) => ({ ...section, items: section.items.filter(available) }))
      .filter((section) => section.items.length > 0),
  };
  const lockedFeature = featureOff(pathname) ? FEATURE_LIST.find((f) => f.key === featureForPath(pathname)) : null;
  const isPreview = PREVIEW_ROUTES.includes(pathname);
  // The chat fills the space under the header exactly (its lists scroll inside it); other pages scroll as a whole.
  const fillScreen = pathname === "/dashboard/chat";

  return (
    <RoleGuard>
      <div className="relative flex h-screen bg-canvas overflow-hidden">
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
            className={fillScreen ? "flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4 md:p-6" : "flex-1 overflow-y-auto p-5 sm:p-7 md:p-10"}
            style={{ backgroundColor: "var(--dash-bg)" }}
          >
            <div className={fillScreen ? "w-full max-w-[1240px] mx-auto flex-1 min-h-0 flex flex-col" : "max-w-[1240px] mx-auto"}>
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
              {isPreview && (
                <div className="mb-5 px-3.5 py-2 rounded-xl border border-warning-200 bg-warning-50 text-warning-800 text-caption font-semibold">
                  {t("Pratinjau fitur: tampilan ini memakai data contoh dan belum menyimpan ke server.")}
                </div>
              )}
              {lockedFeature ? (
                <div className="max-w-[560px] mx-auto text-center bg-white border border-line rounded-2xl p-10 mt-6">
                  <span className="inline-block text-caption font-bold uppercase tracking-wider text-warning-800 bg-warning-50 border border-warning-200 px-3 py-1 rounded-full mb-4">
                    {t("Tidak termasuk paket Anda")}
                  </span>
                  <h1 className="page-title mb-2">{lockedFeature.label}</h1>
                  <p className="text-body-sm text-fg-muted leading-relaxed">
                    {t("Fitur ini belum aktif di paket langganan toko Anda. Hubungi admin Klozer untuk mengaktifkannya atau menaikkan paket.")}
                  </p>
                  <Link href="/dashboard" className="btn-primary inline-block mt-6 !py-2 !px-5 font-bold no-underline">
                    {t("Kembali ke Dashboard")}
                  </Link>
                </div>
              ) : (
                children
              )}
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
