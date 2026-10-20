const TONES = {
  neutral: "bg-sunken text-fg-muted border-line",
  brand: "bg-brand-soft text-ink border-brand/20",
  success: "bg-success-50 text-success-700 border-success-200",
  warning: "bg-warning-50 text-warning-800 border-warning-200",
  danger: "bg-danger-50 text-danger-700 border-danger-200",
  accent: "bg-accent-50 text-accent-700 border-accent-200",
};

/** A small label for a real state or kind (paid, overdue, WhatsApp). Not for decoration. */
export default function Badge({ tone = "neutral", children, className = "" }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-caption font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>{children}</span>;
}
