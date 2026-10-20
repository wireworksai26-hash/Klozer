"use client";
import CopyButton from "@/components/ui/CopyButton";

/** Code or a value to copy: monospace, scrolls sideways inside its own box, never widens the page. */
export default function CodeBlock({ code, label }) {
  return (
    <div className="flex flex-col gap-2">
      <pre tabIndex={0} aria-label={label} className="m-0 p-4 bg-sunken border border-line rounded-xl overflow-x-auto font-mono text-caption text-fg whitespace-pre">
        <code>{code}</code>
      </pre>
      <div>
        <CopyButton value={code} />
      </div>
    </div>
  );
}
