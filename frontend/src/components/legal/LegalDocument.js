import Link from "next/link";
import LegalShell from "./LegalShell";

function Block({ block }) {
  if (typeof block === "string") {
    return <p className="text-body text-fg-muted leading-relaxed mb-4">{block}</p>;
  }
  if (block.list) {
    return (
      <ul className="list-disc pl-6 mb-4 flex flex-col gap-2 text-body text-fg-muted leading-relaxed">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return null;
}

export function RelatedLinks({ links }) {
  return (
    <div className="mt-14 pt-6 border-t border-line text-body-sm text-fg-muted flex flex-wrap gap-x-5 gap-y-2">
      <span>Lihat juga:</span>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="text-brand hover:underline">
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export default function LegalDocument({ title, intro, effectiveDate, lastUpdated, sections, related }) {
  return (
    <LegalShell>
      <h1 className="text-heading font-bold text-fg mb-3">{title}</h1>
      <p className="text-body-sm text-fg-subtle mb-8">
        Berlaku sejak {effectiveDate} &middot; Terakhir diperbarui {lastUpdated}
      </p>
      {intro.map((p) => (
        <p key={p} className="text-body text-fg-muted leading-relaxed mb-4">
          {p}
        </p>
      ))}

      <nav aria-label="Daftar isi" className="my-10 rounded-xl border border-line bg-white p-6">
        <h2 className="text-title font-semibold text-fg mb-3">Daftar isi</h2>
        <ol className="list-decimal pl-5 flex flex-col gap-1.5 text-body-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-brand hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="mb-10 scroll-mt-24">
          <h2 className="text-title font-bold text-fg mb-4">
            {i + 1}. {s.title}
          </h2>
          {s.blocks.map((b, j) => (
            <Block key={j} block={b} />
          ))}
        </section>
      ))}

      <RelatedLinks links={related} />
    </LegalShell>
  );
}
