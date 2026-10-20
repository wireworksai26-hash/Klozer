"use client";
import { useEffect, useId, useRef } from "react";
import { useDashboard } from "@/context/DashboardContext";
import Icon from "@/components/icons/Icon";

const SIZES = { sm: "max-w-[25rem]", md: "max-w-[30rem]", lg: "max-w-[45rem]" };
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog. `variant="drawer"` slides a panel in from the right for long detail views.
 * Escape and the backdrop close it, focus moves inside and returns to where it was, Tab stays inside.
 */
export default function Modal({ open, onClose, title, description, size = "md", variant = "dialog", footer, children }) {
  const { t } = useDashboard();
  const panel = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target = panel.current?.querySelector("[data-autofocus]") || panel.current?.querySelector(FOCUSABLE) || panel.current;
    target?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const drawer = variant === "drawer";

  return (
    <div className={`fixed inset-0 z-50 flex ${drawer ? "justify-end" : "items-end sm:items-center justify-center p-0 sm:p-4"}`}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative bg-white flex flex-col outline-none shadow-lift ${drawer ? "w-full max-w-[520px] h-full" : `w-full ${SIZES[size]} max-h-[92vh] rounded-t-2xl sm:rounded-2xl`}`}
      >
        <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-line">
          <div className="min-w-0">
            <h2 id={titleId} className="card-title">
              {title}
            </h2>
            {description ? <p className="text-label text-fg-muted mt-0.5">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={t("Tutup")} className="w-8 h-8 -mr-2 flex-shrink-0 inline-flex items-center justify-center rounded-full text-fg-muted bg-transparent border-none cursor-pointer hover:bg-sunken focus-visible:outline-2 focus-visible:outline-brand">
            <Icon name="close" className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-line">{footer}</footer> : null}
      </div>
    </div>
  );
}
