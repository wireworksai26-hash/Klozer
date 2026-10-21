"use client";
import React from "react";
import { useDashboard } from "@/context/DashboardContext";

/** **tebal** and `kode` inside one line of text. The words themselves are never changed. */
function Inline({ text }) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="font-mono text-caption bg-sunken border border-line rounded-md px-1.5 py-0.5 text-fg break-all">{part.slice(1, -1)}</code>;
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

function Callout({ tone, label, text }) {
  const style = tone === "warn" ? "bg-warning-50 border-warning-200 text-warning-800" : "bg-brand-soft border-brand/20 text-ink";
  return (
    <div role="note" className={`rounded-xl border px-4 py-3 text-body-sm leading-relaxed ${style}`}>
      <span className="font-bold mr-1.5">{label}</span>
      <Inline text={text} />
    </div>
  );
}

/** Renders a guide's blocks (see content/docs/blocks.js) as readable text, steps, lists, notes, terms and questions. */
export default function DocBlocks({ blocks }) {
  const { t } = useDashboard();
  return (
    <div className="flex flex-col gap-5 text-body-sm text-fg-muted leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "h") return <h3 key={i} className="text-body font-bold text-fg mt-2 first:mt-0">{block.text}</h3>;
        if (block.type === "p") return <p key={i}><Inline text={block.text} /></p>;
        if (block.type === "tip") return <Callout key={i} tone="tip" label={t("Tips:")} text={block.text} />;
        if (block.type === "warn") return <Callout key={i} tone="warn" label={t("Perhatian:")} text={block.text} />;
        if (block.type === "steps") {
          return (
            <ol key={i} className="flex flex-col gap-3 list-none p-0 m-0">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 h-6 flex-shrink-0 rounded-full bg-brand-soft text-brand text-caption font-bold flex items-center justify-center tabular-nums" aria-hidden="true">
                    {j + 1}
                  </span>
                  <span className="min-w-0"><Inline text={item} /></span>
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="flex flex-col gap-2.5 list-none p-0 m-0">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span className="min-w-0"><Inline text={item} /></span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "terms") {
          return (
            <dl key={i} className="rounded-xl border border-line divide-y divide-line m-0">
              {block.rows.map(([term, meaning]) => (
                <div key={term} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-0.5">
                  <dt className="font-semibold text-fg">{term}</dt>
                  <dd className="m-0"><Inline text={meaning} /></dd>
                </div>
              ))}
            </dl>
          );
        }
        if (block.type === "faq") {
          return (
            <div key={i} className="flex flex-col gap-2">
              {block.rows.map(([question, answer]) => (
                <details key={question} className="group rounded-xl border border-line bg-white px-4 py-3 open:bg-sunken/40">
                  <summary className="cursor-pointer font-semibold text-fg list-none flex items-start justify-between gap-3 min-h-6">
                    <span>{question}</span>
                    <span className="text-brand flex-shrink-0 group-open:rotate-45 transition-transform motion-reduce:transition-none" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-2 mb-0"><Inline text={answer} /></p>
                </details>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
