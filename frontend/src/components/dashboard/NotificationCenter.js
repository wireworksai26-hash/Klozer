"use client";
import { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import {
  DollarSignIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "@/components/icons";

/**
 * Atomic Notification Center Component.
 * Displays bell icon with unread badge and dropdown list with mark-all-read & link to audit log.
 *
 * @param {{
 *   notifications: Array,
 *   markNotificationRead: (id: string) => void,
 *   markAllNotificationsRead: () => void,
 *   isOpen?: boolean,
 *   onToggle?: (open: boolean) => void,
 * }} props
 */
export default function NotificationCenter({
  notifications = [],
  markNotificationRead,
  markAllNotificationsRead,
  isOpen: controlledIsOpen,
  onToggle,
}) {
  const { t } = useDashboard();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const nextState = !isOpen;
    if (onToggle) onToggle(nextState);
    if (!isControlled) setInternalIsOpen(nextState);
  };

  const handleClose = () => {
    if (onToggle) onToggle(false);
    if (!isControlled) setInternalIsOpen(false);
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-full border cursor-pointer transition-all ${
          isOpen
            ? "bg-brand-soft border-brand text-brand"
            : "hover:bg-canvas border-line bg-white text-ink"
        }`}
        title={t("Pusat Notifikasi")}
        aria-label={t("Pusat Notifikasi")}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadNotifs > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Notification Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-line z-50 overflow-hidden animate-scale-pop">
          <div className="p-3.5 px-4 bg-soft border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-body-sm font-bold text-fg">{t("Notifikasi")}</h4>
              {unreadNotifs > 0 ? (
                <span className="text-caption font-bold bg-brand text-white px-2 py-0.2 rounded-full">
                  {t("{count} Baru", { count: unreadNotifs })}
                </span>
              ) : (
                <span className="text-caption font-semibold text-fg-muted bg-sunken px-2 py-0.2 rounded-full">
                  {t("Semua Terbaca")}
                </span>
              )}
            </div>
            {unreadNotifs > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-caption font-bold text-brand hover:underline bg-transparent border-none cursor-pointer"
              >
                {t("Tandai Dibaca")}
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-fg-muted text-body-sm">
                {t("Tidak ada notifikasi baru saat ini.")}
              </div>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  onClick={() => {
                    handleClose();
                    markNotificationRead?.(item.id);
                  }}
                  className={`p-3.5 px-4 flex items-start gap-3 transition-colors no-underline block ${
                    item.read
                      ? "bg-white hover:bg-soft"
                      : "bg-brand-soft/40 hover:bg-brand-soft"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === "order"
                        ? "bg-success-50 text-success-600 border border-success-200"
                        : item.type === "chat"
                        ? "bg-brand-soft/50 text-brand border border-brand/20"
                        : item.type === "security"
                        ? "bg-accent-50 text-accent-600 border border-accent-200"
                        : "bg-sunken text-fg-muted border border-line"
                    }`}
                  >
                    {item.type === "order" ? (
                      <DollarSignIcon className="w-4 h-4" />
                    ) : item.type === "chat" ? (
                      <MessageSquareIcon className="w-4 h-4" />
                    ) : item.type === "security" ? (
                      <ShieldCheckIcon className="w-4 h-4" />
                    ) : (
                      <ZapIcon className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-body-sm text-fg truncate">
                        {t(item.title)}
                      </span>
                      <span className="text-micro text-fg-subtle font-medium flex-shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-label text-fg-muted line-clamp-2 leading-relaxed">
                      {t(item.desc)}
                    </p>
                  </div>

                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-2" />
                  )}
                </Link>
              ))
            )}
          </div>

          <div className="p-2.5 bg-soft border-t border-line text-center">
            <Link
              href="/dashboard/audit-log"
              onClick={handleClose}
              className="text-label font-bold text-brand hover:underline"
            >
              {t("Buka Log Riwayat Aktivitas Lengkap →")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
