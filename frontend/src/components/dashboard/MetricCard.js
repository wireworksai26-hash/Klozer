"use client";
import React from "react";

const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 32;
const SPARK_PAD = 3;

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
  // Full-width sparkline under the value. It reserves its height even without data so every card
  // in a row lines up.
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return <div className="h-8" aria-hidden="true" />;

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - SPARK_PAD - ((val - min) / range) * (SPARK_HEIGHT - SPARK_PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const isPositive = deltaType === "positive";
    const strokeColor = isPositive ? "var(--color-success-500)" : deltaType === "negative" ? "var(--color-danger-500)" : "var(--color-brand)";
    const fillColor = isPositive ? "rgba(16, 185, 129, 0.12)" : deltaType === "negative" ? "rgba(244, 63, 94, 0.12)" : "rgba(37, 69, 255, 0.12)";
    const pathD = `M ${points.join(" L ")}`;
    const areaD = `M 0,${SPARK_HEIGHT} L ${points.join(" L ")} L ${SPARK_WIDTH},${SPARK_HEIGHT} Z`;

    return (
      <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} className="w-full h-8 overflow-visible" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d={areaD} fill={fillColor} />
        <path d={pathD} stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  return (
    <div
      className={`@container bg-white rounded-2xl border border-line p-5 shadow-xs hover:shadow-card hover:border-line-strong transition-all duration-200 flex flex-col gap-3 group ${className}`}
    >
      <span className="text-body-sm font-medium text-fg-muted tracking-tight truncate" title={title}>
        {title}
      </span>

      {/* One line always: the number steps down a size on narrow cards instead of wrapping. */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-heading-sm @min-[210px]:text-heading-md font-bold text-fg tracking-tight leading-none whitespace-nowrap tabular-nums">
          {prefix}
          {value}
          {suffix}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-sunken text-fg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {renderSparkline()}

      <div className="flex items-center gap-2 pt-3 border-t border-line">
        {delta && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold whitespace-nowrap ${
              deltaType === "positive"
                ? "bg-success-50 text-success-700 border border-success-200/60"
                : deltaType === "negative"
                ? "bg-danger-50 text-danger-700 border border-danger-200/60"
                : "bg-sunken text-fg border border-line"
            }`}
          >
            <span>{deltaType === "positive" ? "↑" : deltaType === "negative" ? "↓" : "•"}</span>
            <span>{delta}</span>
          </div>
        )}
        {subtitle && (
          <span className="text-caption text-fg-subtle font-medium truncate" title={subtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
