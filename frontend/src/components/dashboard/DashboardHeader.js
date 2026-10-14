"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationCenter from "./NotificationCenter";

/**
 * Dashboard top header bar component.
 * Extracted from layout.js as part of FE-01 refactoring.
 *
 * @param {{
 *   onMenuOpen: () => void,
 *   currentUser: object,
 *   currentRoleConfig: object,
 *   role: string,
 *   logoutUser: () => void,
 *   language: string,
 *   setLanguage: (lang: string) => void,
 *   t: Function,
 *   whatsappStatus: object,
 *   notifications: Array,
 *   markNotificationRead: (id: string) => void,
 *   markAllNotificationsRead: () => void,
 * }} props
 */
export default function DashboardHeader({
  onMenuOpen,
  currentUser,
  currentRoleConfig,
  role,
  logoutUser,
  language,
  setLanguage,
  t,
  whatsappStatus,
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
}) {
  // The profile menu belongs to the page it was opened on: navigating (e.g. via the sidebar drawer)
  // closes it without an effect. Clicking anywhere outside it, or pressing Esc, closes it too.
  const pathname = usePathname();
  const [profileOpenedOn, setProfileOpenedOn] = useState(null);
  const roleDropdownOpen = profileOpenedOn === pathname;
  const setRoleDropdownOpen = (open) => setProfileOpenedOn(open ? pathname : null);
  const profileRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!roleDropdownOpen) return undefined;
    const onPointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpenedOn(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setProfileOpenedOn(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [roleDropdownOpen]);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-[72px] bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={() => {
            setRoleDropdownOpen(false);
            onMenuOpen();
          }}
          className="lg:hidden p-2 rounded-lg hover:bg-canvas text-ink border-none cursor-pointer"
          aria-label={t("Buka menu navigasi")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Live Search Bar */}
        <div className="hidden lg:flex items-center gap-2.5 bg-canvas border border-line rounded-full px-4 py-1.5 w-[260px] xl:w-[320px] focus-within:border-brand focus-within:bg-white transition-all">
          <svg className="text-fg-subtle" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder={t("Cari order ID, nomor WA, lead...")}
            className="bg-transparent border-none outline-none text-label text-ink placeholder:text-fg-subtle flex-1 font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            aria-haspopup="menu"
            aria-expanded={roleDropdownOpen}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-canvas hover:bg-brand-soft border border-line cursor-pointer transition-all text-label font-bold text-ink"
            title={t("Menu Profil Pengguna")}
          >
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-micro font-bold">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : currentRoleConfig.avatar}
            </div>
            <div className="text-left hidden sm:block">
              <div className="leading-tight text-label text-fg font-bold">
                {currentUser?.name || currentRoleConfig.name}
              </div>
              <div className="text-micro text-fg-muted font-medium leading-none">
                {currentRoleConfig.label}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {roleDropdownOpen && (
            <div className="max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[76px] sm:absolute sm:right-0 sm:mt-2 sm:w-64 bg-white rounded-2xl p-2.5 shadow-2xl border border-line z-50 animate-scale-pop">
              <div className="p-3 bg-soft rounded-xl border border-line mb-2">
                <div className="font-bold text-body-sm text-fg truncate">
                  {currentUser?.name || currentRoleConfig.name}
                </div>
                <div className="text-caption text-fg-muted font-mono truncate">
                  {currentUser?.email || (role === "superadmin" ? "superadmin@klozer.id" : "spv@klozer.id")}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-micro font-bold px-2 py-0.5 rounded-md bg-brand-soft text-brand">
                  {currentRoleConfig.icon}
                  <span>{currentRoleConfig.label}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-label font-semibold text-fg">
                <Link
                  href="/dashboard/institution"
                  onClick={() => setRoleDropdownOpen(false)}
                  className="p-2 rounded-xl hover:bg-sunken transition-colors flex items-center justify-between"
                >
                  <span>{t("Profil Instansi")}</span>
                  <span className="text-caption text-fg-subtle">→</span>
                </Link>

                <Link
                  href="/dashboard/documentation"
                  onClick={() => setRoleDropdownOpen(false)}
                  className="p-2 rounded-xl hover:bg-sunken transition-colors flex items-center justify-between"
                >
                  <span>{t("Buku Panduan")}</span>
                  <span className="text-caption text-fg-subtle">→</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setRoleDropdownOpen(false);
                    logoutUser();
                  }}
                  className="p-2 rounded-xl text-danger-600 hover:bg-danger-50 transition-colors font-bold text-left border-none cursor-pointer flex items-center justify-between mt-1 pt-2 border-t border-line"
                >
                  <span>{t("Keluar (Logout)")}</span>
                  <svg className="w-4 h-4 text-danger-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* WA Cloud API Status */}
        {role !== "superadmin" && (
          <Link
            href="/dashboard/settings?tab=profile"
            className={`hidden xl:flex items-center gap-2 px-3 py-1 rounded-full border no-underline ${
              whatsappStatus?.configured ? "bg-success-50 border-success-200" : "bg-warning-50 border-warning-200"
            }`}
            title={whatsappStatus?.configured ? t("WhatsApp Cloud API terhubung") : t("Hubungkan nomor WhatsApp Anda")}
          >
            <span className={`w-2 h-2 rounded-full ${whatsappStatus?.configured ? "bg-success-500" : "bg-warning-500"}`} />
            <span className={`text-caption font-bold ${whatsappStatus?.configured ? "text-success-700" : "text-warning-700"}`}>
              {whatsappStatus?.configured ? t("nav.connected", "WhatsApp Terhubung") : t("WhatsApp belum terhubung")}
            </span>
          </Link>
        )}

        {/* Language Switcher */}
        <div className="flex items-center bg-brand-soft p-0.5 rounded-full border border-brand-soft">
          <button
            type="button"
            onClick={() => setLanguage("id")}
            className={`px-2 py-0.5 text-caption font-bold rounded-full transition-all border-none cursor-pointer flex items-center gap-1 ${
              language === "id" ? "bg-brand text-white shadow-xs" : "text-fg-muted hover:text-ink bg-transparent"
            }`}
            title={t("Ganti ke Bahasa Indonesia")}
          >
            <span>🇮🇩</span>
            <span>ID</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2 py-0.5 text-caption font-bold rounded-full transition-all border-none cursor-pointer flex items-center gap-1 ${
              language === "en" ? "bg-brand text-white shadow-xs" : "text-fg-muted hover:text-ink bg-transparent"
            }`}
            title={t("Ganti ke Bahasa Inggris")}
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
        </div>
        {/* Notification Bell & Popover (Atomic NotificationCenter) */}
        <NotificationCenter
          notifications={notifications}
          markNotificationRead={markNotificationRead}
          markAllNotificationsRead={markAllNotificationsRead}
          isOpen={notifOpen}
          onToggle={(open) => {
            setNotifOpen(open);
            if (open && roleDropdownOpen) setRoleDropdownOpen(false);
          }}
        />
      </div>
    </header>
  );
}
