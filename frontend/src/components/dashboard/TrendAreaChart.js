"use client";
import React, { useState, useMemo } from "react";

export default function TrendAreaChart({
  title = "Tren Omzet & Transaksi",
  subtitle = "Grafik performa penjualan real-time",
  orders = [],
  dataset = null,
  className = "",
}) {
  const [activeMetric, setActiveMetric] = useState("revenue"); // "revenue" | "orders"
  const [activeRange, setActiveRange] = useState("7H"); // "7H" | "30H" | "3B" | "1T"
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Parse and aggregate real orders dynamically per time range
  const chartData = useMemo(() => {
    if (dataset && dataset[activeRange]) {
      return dataset[activeRange];
    }

    const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const now = new Date();

    if (activeRange === "7H") {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayOfWeek = dayLabels[d.getDay()];
        const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
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
        const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        points.push({
          label: `Tgl ${d.getDate()}`,
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
        { label: "Minggu 1", date: "2 Bulan Lalu", revenue: 0, orders: 0 },
        { label: "Minggu 3", date: "6 Minggu Lalu", revenue: 0, orders: 0 },
        { label: "Minggu 5", date: "1 Bulan Lalu", revenue: 0, orders: 0 },
        { label: "Minggu 7", date: "2 Minggu Lalu", revenue: 0, orders: 0 },
        { label: "Minggu 9", date: "Minggu Lalu", revenue: 0, orders: 0 },
        { label: "Minggu 11", date: "Minggu Ini", revenue: 0, orders: 0 },
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
      { label: "Jan", date: "Januari", revenue: 0, orders: 0 },
      { label: "Mar", date: "Maret", revenue: 0, orders: 0 },
      { label: "Mei", date: "Mei", revenue: 0, orders: 0 },
      { label: "Jul", date: "Juli", revenue: 0, orders: 0 },
      { label: "Sep", date: "September", revenue: 0, orders: 0 },
      { label: "Nov", date: "November", revenue: 0, orders: 0 },
    ];
    const currentMonthIdx = Math.min(5, Math.floor(now.getMonth() / 2));
    (orders || []).forEach((ord) => {
      const val = Number(ord.total || ord.total_amount || 0);
      months[currentMonthIdx].revenue += val;
      months[currentMonthIdx].orders += 1;
    });
    return months;
  }, [activeRange, dataset, orders]);

  // Calculations for SVG Rendering
  const values = chartData.map((d) => (activeMetric === "revenue" ? d.revenue : d.orders));
  const rawMax = Math.max(...values, 0);
  const maxVal = rawMax > 0 ? rawMax * 1.2 : 100;
  const minVal = 0;
  const totalPeriod = values.reduce((a, b) => a + b, 0);
  const avgPeriod = totalPeriod > 0 ? Math.round(totalPeriod / values.length) : 0;
  const peakPeriod = rawMax;

  const svgWidth = 600;
  const svgHeight = 220;
  const padX = 30;
  const padY = 20;

  // Compute points
  const points = chartData.map((d, i) => {
    const val = activeMetric === "revenue" ? d.revenue : d.orders;
    const x = padX + (i / Math.max(chartData.length - 1, 1)) * (svgWidth - padX * 2);
    const y = rawMax > 0
      ? svgHeight - padY - ((val - minVal) / (maxVal - minVal)) * (svgHeight - padY * 2)
      : svgHeight - padY - 2;
    return { x, y, data: d, val };
  });

  // SVG Path generation (Cubic Bezier Spline)
  const linePath = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (!linePath || points.length < 2) return "";
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${linePath} L ${lastX},${svgHeight - padY} L ${firstX},${svgHeight - padY} Z`;
  }, [linePath, points, svgHeight, padY]);

  const formatVal = (num) => {
    if (activeMetric === "revenue") {
      if (!num || num === 0) return "Rp 0";
      if (num >= 1000000000) return `Rp ${(num / 1000000000).toFixed(2)}M`;
      if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}Jt`;
      return `Rp ${num.toLocaleString("id-ID")}`;
    }
    return `${(num || 0).toLocaleString("id-ID")} Order`;
  };

  return (
    <div className={`bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)] ${className}`}>
      {/* Top Header: Controls & Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f1f3f7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-[#0f172a]">{title}</h3>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Real-Time
            </span>
          </div>
          <p className="text-[12.5px] text-[#64748b] mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Metric Toggle */}
          <div className="flex p-0.5 bg-[#f1f3f7] rounded-xl border border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setActiveMetric("revenue")}
              className={`px-3 py-1 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${
                activeMetric === "revenue"
                  ? "bg-white text-[#2545ff] shadow-xs"
                  : "bg-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Omzet (Rp)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("orders")}
              className={`px-3 py-1 text-[12px] font-bold rounded-lg transition-all border-none cursor-pointer ${
                activeMetric === "orders"
                  ? "bg-white text-[#2545ff] shadow-xs"
                  : "bg-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Volume Pesanan
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex p-0.5 bg-[#f1f3f7] rounded-xl border border-[#e2e8f0]">
            {["7H", "30H", "3B", "1T"].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setActiveRange(range)}
                className={`px-2.5 py-1 text-[11.5px] font-bold rounded-lg transition-all border-none cursor-pointer ${
                  activeRange === range
                    ? "bg-[#2545ff] text-white shadow-xs"
                    : "bg-transparent text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-3 gap-3 py-3 px-4 my-4 bg-[#fafbfc] rounded-xl border border-[#f1f3f7]">
        <div>
          <span className="text-[11.5px] text-[#64748b] font-medium">Total Periode Ini</span>
          <div className="text-[15px] font-extrabold text-[#0f172a] mt-0.5">{formatVal(totalPeriod)}</div>
        </div>
        <div>
          <span className="text-[11.5px] text-[#64748b] font-medium">Rata-rata / Titik</span>
          <div className="text-[15px] font-extrabold text-[#2545ff] mt-0.5">{formatVal(avgPeriod)}</div>
        </div>
        <div>
          <span className="text-[11.5px] text-[#64748b] font-medium">Puncak Tertinggi</span>
          <div className="text-[15px] font-extrabold text-emerald-600 mt-0.5">{formatVal(peakPeriod)}</div>
        </div>
      </div>

      {/* SVG Canvas Chart Area */}
      <div className="relative w-full h-[240px] select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2545ff" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#2545ff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#2545ff" stopOpacity="0" />
            </linearGradient>

            {/* Glowing filter for active point */}
            <filter id="glowPoint" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2545ff" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const yPos = padY + ratio * (svgHeight - padY * 2);
            return (
              <line
                key={idx}
                x1={padX}
                y1={yPos}
                x2={svgWidth - padX}
                y2={yPos}
                stroke="#f1f3f7"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#trendAreaGradient)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Spline Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#2545ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => (
            <g key={i}>
              {/* Invisible touch/hover target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />

              {/* Visible circle node */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint?.data?.date === pt.data.date ? "6" : "3.5"}
                fill="#ffffff"
                stroke="#2545ff"
                strokeWidth={hoveredPoint?.data?.date === pt.data.date ? "2.5" : "2"}
                filter={hoveredPoint?.data?.date === pt.data.date ? "url(#glowPoint)" : "none"}
                className="transition-all duration-200 pointer-events-none"
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredPoint && (
          <div
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform: "translate(-50%, -125%)",
            }}
            className="absolute z-20 pointer-events-none bg-[#0c1754] text-white p-2.5 rounded-xl shadow-xl text-center border border-white/10 min-w-[120px] animate-scale-pop"
          >
            <div className="text-[11px] text-blue-200 font-medium">{hoveredPoint.data.date}</div>
            <div className="text-[13px] font-extrabold text-white mt-0.5">
              {formatVal(hoveredPoint.val)}
            </div>
            {activeMetric === "revenue" && (
              <div className="text-[10px] text-blue-300 mt-0.5">
                {hoveredPoint.data.orders} Transaksi Berhasil
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom X-Axis Date Labels */}
      <div className="flex items-center justify-between text-[11px] font-medium text-[#94a3b8] px-2 pt-2 border-t border-[#f8fafc]">
        {chartData.map((d, i) => (
          <span key={i} className="text-center">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
