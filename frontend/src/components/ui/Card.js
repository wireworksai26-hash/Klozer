/** A white panel with an optional title row. Use for one coherent block of a screen. */
export default function Card({ title, description, action, children, className = "", padded = true }) {
  return (
    <section className={`bg-white border border-line rounded-2xl ${className}`}>
      {title || action ? (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title ? <h2 className="card-title">{title}</h2> : null}
            {description ? <p className="text-label text-fg-muted mt-0.5">{description}</p> : null}
          </div>
          {action ? <div className="flex-shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** One real number with its label. Never fill it with a made-up value: pass `value="-"` when there is no data. */
export function Stat({ label, value, note }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-line min-w-0">
      <div className="text-label font-semibold text-fg-muted">{label}</div>
      <div className="text-heading-md font-bold text-fg tabular-nums mt-1 truncate">{value}</div>
      {note ? <div className="text-caption text-fg-subtle mt-0.5">{note}</div> : null}
    </div>
  );
}

/** A table inside a rounded white frame that scrolls sideways on narrow screens. */
export function TableShell({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-line table-scroll">
      <table className="w-full text-left border-collapse text-body-sm">{children}</table>
    </div>
  );
}
