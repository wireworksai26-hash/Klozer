"use client";
import { useState } from "react";

/** A small "copy" button that needs no dashboard context, so it also works on the public payment page. */
export default function CopyAccount({ value, copyLabel = "Salin", doneLabel = "Tersalin" }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // the number is on screen to copy by hand
    }
  };

  return (
    <button type="button" onClick={copy} className="inline-flex items-center min-h-9 max-sm:min-h-11 px-3.5 py-1.5 rounded-full border border-line-strong bg-white text-label font-semibold text-fg cursor-pointer hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      {done ? doneLabel : copyLabel}
    </button>
  );
}
