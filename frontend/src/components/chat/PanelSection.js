/** One titled block of the customer panel. */
export default function PanelSection({ title, children }) {
  return (
    <section className="border-t border-line pt-4 mt-4 flex flex-col gap-3">
      <h4 className="text-label font-bold text-fg">{title}</h4>
      {children}
    </section>
  );
}
