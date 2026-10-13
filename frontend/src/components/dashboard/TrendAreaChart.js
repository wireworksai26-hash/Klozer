"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";

const CHART_HEIGHT = 260;
const PAD = { top: 16, right: 24, bottom: 34, left: 58 };

/** Smooth curve through the points that never dips below the lowest value (monotone cubic). */
function monotonePath(pts) {
  const n = pts.length;
  if (n < 2) return "";
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / (dx[i] || 1);
  }
  const tan = [m[0]];
  for (let i = 1; i < n - 1; i++) tan[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  tan[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      tan[i] = 0;
      tan[i + 1] = 0;
    } else {
      const a = tan[i] / m[i];
      const b = tan[i + 1] / m[i];
      const sum = a * a + b * b;
      if (sum > 9) {
        const k = 3 / Math.sqrt(sum);
        tan[i] = k * a * m[i];
        tan[i + 1] = k * b * m[i];
      }
    }
  }
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    d += ` C ${(pts[i].x + h / 3).toFixed(1)},${(pts[i].y + (tan[i] * h) / 3).toFixed(1)} ${(pts[i + 1].x - h / 3).toFixed(1)},${(pts[i + 1].y - (tan[i + 1] * h) / 3).toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/** Round axis maximum up to a tidy number: returns { max, step, intervals }. */
function niceScale(rawMax, { integer = false } = {}) {
  if (!(rawMax > 0)) return { max: 4, step: 1, intervals: 4 };
  const roughStep = rawMax / 4;
  const pow = 10 ** Math.floor(Math.log10(roughStep));
  const norm = roughStep / pow;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
  if (integer) step = Math.max(1, Math.round(step));
  const intervals = Math.max(2, Math.ceil(rawMax / step));
  return { max: step * intervals, step, intervals };
}

export default function TrendAreaChart({
  title = "Tren Omzet & Transaksi",
  subtitle = "Grafik performa penjualan real-time",
  orders = [],
  dataset = null,
  className = "",
}) {
  const { t, locale } = useDashboard();
  const [activeMetric, setActiveMetric] = useState("revenue"); // "revenue" | "orders"
  const [activeRange, setActiveRange] = useState("7H"); // "7H" | "30H" | "3B" | "1T"
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Parse and aggregate real orders dynamically per time range
  const chartData = useMemo(() => {
    if (dataset && dataset[activeRange]) {
      return dataset[activeRange];
    }

    const now = new Date();
    const monthName = (monthIdx, style) => new Date(2024, monthIdx, 1).toLocaleDateString(locale, { month: style });

    if (activeRange === "7H") {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.toLocaleDateString(locale, { weekday: "short" });
        const dateStr = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
        const key = d.toISOString().split("T")[0];
        days.push({
          label: dayOfWeek,
          date: dateStr,
          key,
          revenue: 0,
          orders: 0,
        });
      }

      (orders || []).forEach((ord) => {
        const ordDate = ord.created_at ? new Date(ord.created_at) : (ord.date ? new Date() : null);
        const key = ordDate ? ordDate.toISOString().split("T")[0] : days[6].key;
        const matchingDay = days.find((d) => d.key === key) || days[days.length - 1];
        if (matchingDay) {
          const val = Number(ord.total || ord.total_amount || 0);
          matchingDay.revenue += val;
          matchingDay.orders += 1;
        }
      });

      return days;
    }

    if (activeRange === "30H") {
      // 15 Bi-daily points over the last 30 days
      const points = [];
      for (let i = 14; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 2);
        const dateStr = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
        points.push({
          label: t("Tgl {day}", { day: d.getDate() }),
          date: dateStr,
          revenue: 0,
          orders: 0,
        });
      }

      (orders || []).forEach((ord) => {
        const val = Number(ord.total || ord.total_amount || 0);
        const target = points[points.length - 1];
        if (target) {
          target.revenue += val;
          target.orders += 1;
        }
      });

      return points;
    }

    if (activeRange === "3B") {
      const weeks = [
        { label: t("Minggu {n}", { n: 1 }), date: t("2 Bulan Lalu"), revenue: 0, orders: 0 },
        { label: t("Minggu {n}", { n: 3 }), date: t("6 Minggu Lalu"), revenue: 0, orders: 0 },
        { label: t("Minggu {n}", { n: 5 }), date: t("1 Bulan Lalu"), revenue: 0, orders: 0 },
        { label: t("Minggu {n}", { n: 7 }), date: t("2 Minggu Lalu"), revenue: 0, orders: 0 },
        { label: t("Minggu {n}", { n: 9 }), date: t("Minggu Lalu"), revenue: 0, orders: 0 },
        { label: t("Minggu {n}", { n: 11 }), date: t("Minggu Ini"), revenue: 0, orders: 0 },
      ];
      (orders || []).forEach((ord) => {
        const val = Number(ord.total || ord.total_amount || 0);
        weeks[weeks.length - 1].revenue += val;
        weeks[weeks.length - 1].orders += 1;
      });
      return weeks;
    }

    // 1T (1 Tahun)
    const months = [
      ...[0, 2, 4, 6, 8, 10].map((m) => ({ label: monthName(m, "short"), date: monthName(m, "long"), revenue: 0, orders: 0 })),
    ];
    const currentMonthIdx = Math.min(5, Math.floor(now.getMonth() / 2));
    (orders || []).forEach((ord) => {
      const val = Number(ord.total || ord.total_amount || 0);
      months[currentMonthIdx].revenue += val;
      months[currentMonthIdx].orders += 1;
    });
    return months;
  }, [activeRange, dataset, orders, t, locale]);

  // Calculations for SVG rendering. The canvas follows the card width so the chart always fills it.
  const wrapRef = useRef(null);
  const [svgWidth, setSvgWidth] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setSvgWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const values = chartData.map((d) => (activeMetric === "revenue" ? d.revenue : d.orders));
  const rawMax = Math.max(...values, 0);
  const totalPeriod = values.reduce((a, b) => a + b, 0);
  const avgPeriod = totalPeriod > 0 ? Math.round(totalPeriod / values.length) : 0;
  const peakPeriod = rawMax;

  const scale = niceScale(rawMax, { integer: activeMetric === "orders" });
  const svgHeight = CHART_HEIGHT;
  const plotW = Math.max(svgWidth - PAD.left - PAD.right, 1);
  const plotH = svgHeight - PAD.top - PAD.bottom;
  const baseY = PAD.top + plotH;

  const points = chartData.map((d, i) => {
    const val = activeMetric === "revenue" ? d.revenue : d.orders;
    const x = PAD.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * plotW : plotW / 2);
    const y = baseY - (val / scale.max) * plotH;
    return { x, y, data: d, val };
  });

  const linePath = monotonePath(points);
  const areaPath =
    linePath && points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)},${baseY} L ${points[0].x.toFixed(1)},${baseY} Z`
      : "";

  const axisLabel = (v) => {
    if (activeMetric === "orders") return String(Math.round(v));
    if (v === 0) return "0";
    if (v >= 1_000_000_000) return `${+(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}Jt`;
    if (v >= 1_000) return `${+(v / 1_000).toFixed(0)}rb`;
    return String(v);
  };

  const formatVal = (num) => {
    if (activeMetric === "revenue") {
      if (!num || num === 0) return "Rp 0";
      if (num >= 1000000000) return t("Rp {value}M", { value: (num / 1000000000).toFixed(2) });
      if (num >= 1000000) return t("Rp {value}Jt", { value: (num / 1000000).toFixed(1) });
      return `Rp ${num.toLocaleString("id-ID")}`;
    }
    return `${(num || 0).toLocaleString("id-ID")} Order`;
  };

  const toggleBase = "px-3 py-1 text-label font-bold rounded-lg transition-all border-none cursor-pointer whitespace-nowrap";

  return (
    <div className={`bg-white rounded-2xl border border-line p-6 shadow-xs ${className}`}>
      {/* Header: title + live badge stay on one line; the controls wrap under them when space is short */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pb-4 border-b border-line">
        <div className="min-w-0">
          <h3 className="card-title whitespace-nowrap">{t(title)}</h3>
          <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
            <span className="text-caption font-semibold bg-success-50 text-success-700 px-2 py-0.5 rounded-full border border-success-200 whitespace-nowrap">
              Live Real-Time
            </span>
            <p className="text-label text-fg-muted">{t(subtitle)}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 ml-auto">
          {/* Metric Toggle */}
          <div className="flex p-0.5 bg-sunken rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setActiveMetric("revenue")}
              className={`${toggleBase} ${activeMetric === "revenue" ? "bg-white text-brand shadow-xs" : "bg-transparent text-fg-muted hover:text-fg"}`}
            >
              {t("Omzet (Rp)")}
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("orders")}
              className={`${toggleBase} ${activeMetric === "orders" ? "bg-white text-brand shadow-xs" : "bg-transparent text-fg-muted hover:text-fg"}`}
            >
              {t("Volume Pesanan")}
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex p-0.5 bg-sunken rounded-xl border border-line">
            {["7H", "30H", "3B", "1T"].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setActiveRange(range)}
                className={`px-2.5 py-1 text-caption font-bold rounded-lg transition-all border-none cursor-pointer ${
                  activeRange === range ? "bg-brand text-white shadow-xs" : "bg-transparent text-fg-muted hover:text-fg"
                }`}
              >
                {t(range)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-3 gap-3 py-3 px-4 my-4 bg-soft rounded-xl border border-line">
        <div className="min-w-0">
          <span className="text-caption text-fg-muted font-medium whitespace-nowrap">{t("Total Periode Ini")}</span>
          <div className="text-body font-bold text-fg mt-0.5 whitespace-nowrap tabular-nums">{formatVal(totalPeriod)}</div>
        </div>
        <div className="min-w-0">
          <span className="text-caption text-fg-muted font-medium whitespace-nowrap">{t("Rata-rata / Titik")}</span>
          <div className="text-body font-bold text-brand mt-0.5 whitespace-nowrap tabular-nums">{formatVal(avgPeriod)}</div>
        </div>
        <div className="min-w-0">
          <span className="text-caption text-fg-muted font-medium whitespace-nowrap">{t("Puncak Tertinggi")}</span>
          <div className="text-body font-bold text-success-600 mt-0.5 whitespace-nowrap tabular-nums">{formatVal(peakPeriod)}</div>
        </div>
      </div>

      {/* Chart: drawn at the real card width; axis labels share the x position of their points */}
      <div ref={wrapRef} className="relative w-full select-none" style={{ height: svgHeight }}>
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="block overflow-visible" role="img" aria-label={t(title)}>
          <defs>
            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.24" />
              <stop offset="80%" stopColor="var(--color-brand)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </linearGradient>
            <filter id="glowPoint" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--color-brand)" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Horizontal gridlines with value labels */}
          {Array.from({ length: scale.intervals + 1 }, (_, idx) => {
            const value = scale.step * idx;
            const yPos = baseY - (idx / scale.intervals) * plotH;
            return (
              <g key={idx}>
                <line
                  x1={PAD.left}
                  y1={yPos}
                  x2={svgWidth - PAD.right}
                  y2={yPos}
                  stroke={idx === 0 ? "var(--color-line-strong)" : "var(--color-line)"}
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? undefined : "4 4"}
                />
                <text x={PAD.left - 10} y={yPos + 4} textAnchor="end" className="fill-fg-subtle text-caption" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {axisLabel(value)}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#trendAreaGradient)" />}

          {linePath && (
            <path d={linePath} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Data points and x labels */}
          {points.map((pt, i) => {
            const active = hoveredPoint?.data?.date === pt.data.date;
            return (
              <g key={i}>
                <text x={pt.x} y={svgHeight - 10} textAnchor="middle" className={`text-caption ${active ? "fill-fg font-bold" : "fill-fg-subtle"}`}>
                  {pt.data.label}
                </text>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="18"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={active ? 6 : 3.5}
                  fill="var(--color-paper-white)"
                  stroke="var(--color-brand)"
                  strokeWidth={active ? 2.5 : 2}
                  filter={active ? "url(#glowPoint)" : "none"}
                  className="transition-all duration-200 pointer-events-none"
                />
              </g>
            );
          })}
        </svg>

        {totalPeriod === 0 && (
          <div className="absolute inset-x-0 top-[38%] flex justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-white/90 border border-line text-caption text-fg-muted font-medium">
              {t("Belum ada penjualan pada periode ini")}
            </span>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div
            style={{
              left: Math.min(Math.max(hoveredPoint.x, 70), svgWidth - 70),
              top: hoveredPoint.y,
              transform: "translate(-50%, -125%)",
            }}
            className="absolute z-20 pointer-events-none bg-ink text-white px-3 py-2 rounded-xl shadow-lift text-center border border-white/10 min-w-[120px] whitespace-nowrap animate-scale-pop"
          >
            <div className="text-caption text-brand-soft font-medium">{hoveredPoint.data.date}</div>
            <div className="text-body-sm font-bold text-white mt-0.5">{formatVal(hoveredPoint.val)}</div>
            {activeMetric === "revenue" && (
              <div className="text-micro text-brand-on-dark mt-0.5">
                {hoveredPoint.data.orders} {t("Transaksi Berhasil")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
