"use client";
import React from "react";

export default function MetricCard({
  title,
  value,
  subtitle,
  delta,
  deltaType = "positive",
  sparklineData = [],
  icon: Icon,
  prefix = "",
  suffix = "",
  className = "",
}) {
  // Generate smooth SVG Sparkline path
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 100;
    const height = 36;
    const padding = 2;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const isPositive = deltaType === "positive";
    const strokeColor = isPositive ? "#10b981" : deltaType === "negative" ? "#f43f5e" : "#2545ff";
    const fillColor = isPositive ? "rgba(16, 185, 129, 0.12)" : deltaType === "negative" ? "rgba(244, 63, 94, 0.12)" : "rgba(37, 69, 255, 0.12)";
    const pathD = `M ${points.join(" L ")}`;
    const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-24 h-9 overflow-visible"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d={areaD} fill={fillColor} />
        <path
          d={pathD}
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-[#e8eaef] p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] hover:border-[#d0d5dd] transition-all duration-200 flex flex-col justify-between group ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-[13px] font-medium text-[#64748b] tracking-tight truncate">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[#f4f6fb] text-[#475467] flex items-center justify-center flex-shrink-0 group-hover:bg-[#2545ff]/10 group-hover:text-[#2545ff] transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 my-1">
        <div className="text-[26px] font-extrabold text-[#0f172a] tracking-tight leading-none">
          {prefix}
          {value}
          {suffix}
        </div>
        {renderSparkline()}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#f1f3f7]">
        {delta && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-bold ${
              deltaType === "positive"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : deltaType === "negative"
                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            <span>{deltaType === "positive" ? "↑" : deltaType === "negative" ? "↓" : "•"}</span>
            <span>{delta}</span>
          </div>
        )}
        {subtitle && (
          <span className="text-[11.5px] text-[#94a3b8] font-medium truncate ml-auto">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
