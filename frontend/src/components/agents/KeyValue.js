"use client";
import { useDashboard } from "@/context/DashboardContext";

const MAX_DEPTH = 4;
const MAX_ITEMS = 20;

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Flatten a value into [label, text] lines: nested keys become "a / b", short lists become "x, y". */
function toLines(value, prefix, depth, t) {
  if (value === null || value === undefined) return [[prefix, "-"]];
  if (typeof value === "boolean") return [[prefix, value ? t("Ya") : t("Tidak")]];
  if (Array.isArray(value)) {
    if (!value.length) return [[prefix, "-"]];
    if (value.every((v) => v === null || typeof v !== "object")) return [[prefix, value.map((v) => (typeof v === "boolean" ? (v ? t("Ya") : t("Tidak")) : String(v ?? "-"))).join(", ")]];
    const shown = value.slice(0, MAX_ITEMS).flatMap((item, i) => (depth >= MAX_DEPTH ? [[`${prefix} ${i + 1}`, JSON.stringify(item)]] : toLines(item, `${prefix} ${i + 1}`, depth + 1, t)));
    if (value.length > MAX_ITEMS) shown.push([prefix, t("dan {count} lainnya", { count: value.length - MAX_ITEMS })]);
    return shown;
  }
  if (isPlain(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return [[prefix, "-"]];
    if (depth >= MAX_DEPTH) return [[prefix, JSON.stringify(value)]];
    return entries.flatMap(([k, v]) => toLines(v, prefix ? `${prefix} / ${k}` : k, depth + 1, t));
  }
  return [[prefix, String(value)]];
}

/** An object (a tool's arguments or result) as readable label and value lines. */
export default function KeyValue({ value, emptyLabel }) {
  const { t } = useDashboard();
  if (value === null || value === undefined || (isPlain(value) && !Object.keys(value).length)) return <p className="text-label text-fg-subtle">{emptyLabel}</p>;
  const lines = toLines(value, "", 0, t);
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-[minmax(7rem,12rem)_1fr] gap-x-4 gap-y-1.5 text-label">
      {lines.map(([label, text], i) => (
        <div key={i} className="contents">
          <dt className="text-fg-muted break-words">{label || t("Nilai")}</dt>
          <dd className="text-fg break-words whitespace-pre-wrap m-0 mb-1.5 sm:mb-0">{text}</dd>
        </div>
      ))}
    </dl>
  );
}
