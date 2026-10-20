"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import Icon from "@/components/icons/Icon";

const CONTROL =
  "w-full px-3.5 py-2.5 text-body-sm text-fg bg-white border border-line-strong rounded-xl outline-none placeholder:text-fg-subtle focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:bg-sunken disabled:text-fg-subtle";

/** Label, control, hint and error laid out the same way everywhere. The control gets the id and aria wiring. */
function Labelled({ label, hint, error, required, children, id }) {
  const { t } = useDashboard();
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label ? (
        <label htmlFor={id} className="text-label font-semibold text-fg">
          {label}
          {required ? <span className="text-danger-700" aria-label={t("wajib diisi")}> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function Input({ className = "", ...props }) {
  return <input className={`${CONTROL} ${className}`} {...props} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return <textarea rows={rows} className={`${CONTROL} resize-y ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${CONTROL} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}

export function TextField({ label, hint, error, required, className, ...props }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint} error={error} required={required}>
      <Input id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={className} {...props} />
    </Labelled>
  );
}

export function TextAreaField({ label, hint, error, required, rows, ...props }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint} error={error} required={required}>
      <Textarea id={id} rows={rows} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </Labelled>
  );
}

/** @param {{ options: { value: string|number, label: string }[] }} props */
export function SelectField({ label, hint, error, required, options, placeholder, ...props }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint} error={error} required={required}>
      <Select id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Labelled>
  );
}

/** A search box with the magnifier inside. */
export function SearchInput({ className = "", ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="w-4 h-4 text-fg-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <Input type="search" className="pl-10" {...props} />
    </div>
  );
}

/**
 * An on/off setting. `label` names it, `description` says what changes. Reads as a switch to assistive tech.
 */
export function Switch({ checked, onChange, label, description, disabled = false }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-body-sm font-semibold text-fg cursor-pointer">
          {label}
        </label>
        {description ? <p className="text-label text-fg-muted mt-0.5">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 mt-0.5 rounded-full border-none cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-brand" : "bg-line-strong"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform motion-reduce:transition-none ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export function CheckboxField({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-brand cursor-pointer" />
      <div>
        <label htmlFor={id} className="text-body-sm font-medium text-fg cursor-pointer">
          {label}
        </label>
        {description ? <p className="text-caption text-fg-muted">{description}</p> : null}
      </div>
    </div>
  );
}

/**
 * Pick several of a few known options (channels, intents, tools) as toggle chips.
 * @param {{ options: { value: string, label: string, hint?: string }[], value: string[], onChange: (v: string[]) => void }} props
 */
export function ChipPicker({ label, hint, options, value, onChange }) {
  const groupId = useId();
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-labelledby={label ? groupId : undefined}>
      {label ? (
        <span id={groupId} className="text-label font-semibold text-fg">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              title={o.hint}
              onClick={() => toggle(o.value)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-9 max-sm:min-h-11 rounded-full text-label font-semibold border cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                on ? "bg-brand-soft text-ink border-brand/40" : "bg-white text-fg-muted border-line-strong hover:bg-sunken"
              }`}
            >
              {on ? <Icon name="check" className="w-3.5 h-3.5 text-brand" /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
      {hint ? <p className="text-caption text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

/** Free words typed one by one (keywords). Enter or comma adds, the x removes. */
export function TagInput({ label, hint, value, onChange, placeholder, max = 50 }) {
  const { t } = useDashboard();
  const id = useId();
  const [draft, setDraft] = useState("");

  const commit = () => {
    const words = draft.split(",").map((w) => w.trim()).filter(Boolean);
    if (!words.length) return;
    onChange([...new Set([...value, ...words])].slice(0, max));
    setDraft("");
  };

  return (
    <Labelled id={id} label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-line-strong rounded-xl focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        {value.map((word) => (
          <span key={word} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-brand-soft text-ink text-label font-medium">
            {word}
            <button type="button" aria-label={t("Hapus {word}", { word })} onClick={() => onChange(value.filter((w) => w !== word))} className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-fg-muted hover:bg-white">
              <Icon name="close" className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          className="flex-1 min-w-[8rem] px-1.5 py-1 text-body-sm bg-transparent border-none outline-none text-fg placeholder:text-fg-subtle"
        />
      </div>
    </Labelled>
  );
}
