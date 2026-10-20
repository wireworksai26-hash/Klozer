/** Title block on the left, actions on the right (the shared `page-head` layout). */
export default function PageHeader({ title, description, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {description ? <p className="text-body-sm text-fg-muted mt-1 max-w-[62ch]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
