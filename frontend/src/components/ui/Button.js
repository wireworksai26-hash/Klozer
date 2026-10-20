"use client";
import Link from "next/link";
import Icon from "@/components/icons/Icon";

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-hover border border-transparent",
  secondary: "bg-white text-fg border border-line-strong hover:bg-sunken",
  ghost: "bg-transparent text-fg-muted border border-transparent hover:bg-sunken hover:text-fg",
  danger: "bg-danger-600 text-white hover:bg-danger-700 border border-transparent",
  quietDanger: "bg-white text-danger-700 border border-danger-200 hover:bg-danger-50",
};

const SIZES = {
  sm: "px-3.5 py-1.5 min-h-9 max-sm:min-h-11 text-label gap-1.5",
  md: "px-5 py-2.5 min-h-11 text-body-sm gap-2",
};

export function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`${className} animate-spin motion-reduce:animate-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The one button. `icon` is a glyph name (see icons/glyphs.js); `loading` disables it and shows a spinner;
 * `href` renders a link with the same look. Pill shape, flat: the colour carries the weight (DESIGN.md).
 */
export default function Button({ variant = "primary", size = "md", icon, loading = false, href, className = "", children, type = "button", disabled, ...props }) {
  const classes = `inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors cursor-pointer no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="w-4 h-4" /> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}

/** A square icon-only button. `label` is required: it is the accessible name. */
export function IconButton({ icon, label, className = "", ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`w-11 h-11 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full text-fg-muted bg-transparent border border-transparent cursor-pointer hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 ${className}`}
      {...props}
    >
      <Icon name={icon} className="w-4 h-4" />
    </button>
  );
}
