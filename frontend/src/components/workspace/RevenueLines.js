"use client";
import { useMemo } from "react";
import { useFormat } from "@/hooks/useFormat";

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 48 };

// Neutral lines are told apart by their dash, not by extra colors: the business you are in carries the one accent.
export const DASHES = ["", "6 4", "2 4", "10 4 2 4"];

/** A rounded-up axis maximum with two steps so the gridlines land on clean numbers. */
function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 2) * magnitude;
  return Math.ceil(value / step) * step;
}

const compactRp = (n) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)} Jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(n));

/**
 * Daily paid revenue, one line per business. The business the owner is signed in to gets the accent; the others are neutral
 * and dashed, so the chart reads without a color key. The table beside it carries the exact figures.
 */
export default function RevenueLines({ series, businesses, currentId, label }) {
  const { date } = useFormat();
  const model = useMemo(() => {
    const max = niceMax(Math.max(0, ...series.flatMap((s) => businesses.map((b) => s.values[b.id] ?? 0))));
    const x = (i) => PAD.left + (series.length <= 1 ? 0 : (i / (series.length - 1)) * (W - PAD.left - PAD.right));
    const y = (v) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
    const lines = businesses.map((b, bi) => ({ id: b.id, d: series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.values[b.id] ?? 0).toFixed(1)}`).join(" "), dash: DASHES[bi % DASHES.length], current: b.id === currentId }));
    return { max, lines, x, y, ticks: [0, max / 2, max] };
  }, [series, businesses, currentId]);

  if (!series.length) return null;
  const first = series[0].day;
  const mid = series[Math.floor(series.length / 2)].day;
  const last = series.at(-1).day;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto">
      {model.ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={W - PAD.right} y1={model.y(tick)} y2={model.y(tick)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={PAD.left - 8} y={model.y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--color-fg-subtle)" className="tabular-nums">
            {compactRp(tick)}
          </text>
        </g>
      ))}
      {[first, mid, last].map((day, i) => (
        <text key={day} x={[PAD.left, (PAD.left + W - PAD.right) / 2, W - PAD.right][i]} y={H - 6} textAnchor={["start", "middle", "end"][i]} fontSize="11" fill="var(--color-fg-subtle)">
          {date(`${day}T12:00:00+07:00`)}
        </text>
      ))}
      {/* neutral lines first so the accent line is drawn on top */}
      {[...model.lines].sort((a, b) => Number(a.current) - Number(b.current)).map((l) => (
        <path key={l.id} d={l.d} fill="none" stroke={l.current ? "var(--color-brand)" : "var(--color-fg-subtle)"} strokeWidth={l.current ? 2.5 : 1.75} strokeDasharray={l.dash || undefined} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** A short sample of a line's stroke, for the table rows, so a row and its line match. */
export function LineSample({ index, current }) {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" className="flex-shrink-0">
      <line x1="1" x2="27" y1="4" y2="4" stroke={current ? "var(--color-brand)" : "var(--color-fg-subtle)"} strokeWidth={current ? 2.5 : 1.75} strokeDasharray={DASHES[index % DASHES.length] || undefined} strokeLinecap="round" />
    </svg>
  );
}
