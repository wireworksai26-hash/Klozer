"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import Button from "./Button";

/** Copies `value` to the clipboard and says so. Falls back to a notice when the browser refuses. */
export default function CopyButton({ value, label, size = "sm", variant = "secondary" }) {
  const { t, notify } = useDashboard();
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      notify("error", "Browser menolak menyalin. Salin secara manual.");
    }
  };

  return (
    <Button variant={variant} size={size} icon={done ? "check" : "copy"} onClick={copy}>
      {done ? t("Tersalin") : label || t("Salin")}
    </Button>
  );
}
