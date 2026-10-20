"use client";
import { useRef } from "react";

/**
 * Tabs for switching views inside one screen. Left and Right move between them, Home and End jump.
 * @param {{ tabs: { id: string, label: string, count?: number }[], value: string, onChange: (id: string) => void, label: string }} props `label` names the group for assistive tech
 */
export default function Tabs({ tabs, value, onChange, label }) {
  const refs = useRef({});

  const onKeyDown = (e) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    let next = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 border-b border-line overflow-x-auto overflow-y-hidden">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 -mb-px text-body-sm font-semibold whitespace-nowrap bg-transparent border-0 border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-brand ${
              active ? "text-brand border-brand" : "text-fg-muted border-transparent hover:text-fg"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? <span className={`ml-2 text-caption tabular-nums ${active ? "text-brand" : "text-fg-subtle"}`}>{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
