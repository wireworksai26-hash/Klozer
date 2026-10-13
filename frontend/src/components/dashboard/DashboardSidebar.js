"use client";
import { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import Logo from "@/components/common/Logo";
import { ChevronDownIcon } from "@/components/icons";

/** Right-aligned badge for a nav item: "Segera" for unavailable modules, otherwise the item's count badge. */
function ItemBadge({ item, isActive, padding }) {
  if (item.comingSoon) {
    return (
      <span
        className={`text-micro font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 border ${
          isActive
            ? "bg-white/20 text-white border-white/30"
            : "bg-warning-100 text-warning-800 border-warning-200"
        }`}
      >
        {item.comingSoonLabel || "Segera"}
      </span>
    );
  }
  if (!item.badge) return null;
  return (
    <span
      className={`text-micro font-bold ${padding} py-0.5 rounded-full flex-shrink-0 ${
        isActive ? "bg-white/20 text-white" : "bg-brand text-white"
      }`}
    >
      {item.badge}
    </span>
  );
}

/**
 * Dashboard sidebar navigation component.
 * Extracted from layout.js as part of FE-01 refactoring.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   currentRoleConfig: object,
 *   role: string,
 *   currentUser: object,
 *   activeInstitution: object,
 *   isItemActive: (href: string) => boolean,
 * }} props
 */
export default function DashboardSidebar({
  isOpen,
  onClose,
  currentRoleConfig,
  role,
  currentUser,
  activeInstitution,
  isItemActive,
}) {
  const { t } = useDashboard();
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (sectionKey) =>
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-[290px] bg-white border-r border-line flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-[72px] border-b border-line flex-shrink-0">
          <Logo size="md" variant="dark" href="/" withIcon={true} />
          <span
            className={`text-micro font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${currentRoleConfig.badgeColor}`}
          >
            {currentRoleConfig.icon}
            <span>{role.toUpperCase()}</span>
          </span>
        </div>

        {/* Store Indicator for Merchant Tenants */}
        {role !== "superadmin" && (
          <div className="px-5 py-3 border-b border-line bg-soft flex items-center justify-between">
            <div className="truncate">
              <div className="text-label font-bold text-ink truncate">
                {currentUser?.institutionName || activeInstitution?.name || t("Instansi Aktif")}
              </div>
              <div className="text-micro text-fg-muted truncate font-medium">
                {currentUser?.sector || activeInstitution?.sector || t("Bisnis Terverifikasi")}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-success-500 flex-shrink-0" title="Online" />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-caption font-bold uppercase tracking-wider text-fg-subtle mb-1">
            {t("Menu")} {currentRoleConfig.label}
          </div>

          {currentRoleConfig.pinnedItems && currentRoleConfig.navSections ? (
            <>
              {/* Pinned top-level items */}
              {currentRoleConfig.pinnedItems.map((item) => {
                const isActive = isItemActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-body-sm font-bold transition-all no-underline ${
                      isActive
                        ? "bg-brand text-white shadow-brand"
                        : "text-fg-muted hover:text-ink hover:bg-sunken"
                    }`}
                  >
                    <span className={isActive ? "text-white" : "text-fg-subtle"}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    <ItemBadge item={item} isActive={isActive} padding="px-2" />
                  </Link>
                );
              })}

              {/* Separator */}
              <div className="mx-3 my-2 border-t border-line" />

              {/* Collapsible Sections */}
              {currentRoleConfig.navSections.map((section) => {
                const sectionKey = section.sectionLabel;
                const hasActiveChild = section.items.some((item) => isItemActive(item.href));
                const isOpen = openSections[sectionKey] !== undefined
                  ? openSections[sectionKey]
                  : hasActiveChild;

                return (
                  <div key={sectionKey} className="mb-0.5">
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionKey)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-label font-bold uppercase tracking-wide transition-all cursor-pointer border-none ${
                        hasActiveChild
                          ? "text-brand bg-brand-soft"
                          : "text-fg-subtle hover:text-fg-muted hover:bg-sunken"
                      }`}
                    >
                      <span className={hasActiveChild ? "text-brand" : "text-fg-subtle"}>
                        {section.sectionIcon}
                      </span>
                      <span className="flex-1 text-left">{section.sectionLabel}</span>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-200 ease-in-out"
                      style={{
                        maxHeight: isOpen ? `${section.items.length * 48}px` : "0px",
                        opacity: isOpen ? 1 : 0,
                      }}
                    >
                      <div className="pl-3 pt-0.5 flex flex-col gap-0.5">
                        {section.items.map((item) => {
                          const isActive = isItemActive(item.href);
                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={onClose}
                              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-body-sm font-semibold transition-all no-underline ${
                                isActive
                                  ? "bg-brand text-white shadow-brand"
                                  : "text-fg-muted hover:text-ink hover:bg-sunken"
                              }`}
                            >
                              <span className={isActive ? "text-white" : "text-fg-subtle"}>
                                {item.icon}
                              </span>
                              <span className="flex-1">{item.label}</span>
                              <ItemBadge item={item} isActive={isActive} padding="px-1.5" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* Flat list for roles without sections */
            currentRoleConfig.navItems.map((item) => {
              const isActive = isItemActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-body-sm font-bold transition-all no-underline ${
                    isActive
                      ? "bg-brand text-white shadow-brand"
                      : "text-fg-muted hover:text-ink hover:bg-sunken"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-fg-subtle"}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <ItemBadge item={item} isActive={isActive} padding="px-2" />
                </Link>
              );
            })
          )}
        </nav>

        {/* Bottom Profile Widget */}
        <div className="p-4 border-t border-line flex-shrink-0 bg-canvas/60">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-line">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white font-bold text-body-sm">
              {currentUser?.name
                ? currentUser.name.slice(0, 2).toUpperCase()
                : currentRoleConfig.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-body-sm font-bold text-ink truncate">
                {currentUser?.name ||
                  (role === "superadmin"
                    ? "Platform Admin"
                    : role === "owner"
                    ? "Owner"
                    : t("Staf CS"))}
              </div>
              <div className="text-caption text-fg-subtle truncate">{currentRoleConfig.label}</div>
            </div>
            <Link href="/" title={t("Ke Landing Page")} className="text-fg-subtle hover:text-brand p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
