"use client";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

/**
 * The eye button that sits at the end of a password box: press it to see what was typed, press it again to hide it.
 * The page owns the `shown` state and sets the input's type from it.
 */
export default function RevealButton({ shown, onToggle, showLabel = "Tampilkan kata sandi", hideLabel = "Sembunyikan kata sandi", className = "" }) {
  const Icon = shown ? EyeOffIcon : EyeIcon;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? hideLabel : showLabel}
      aria-pressed={shown}
      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-ink hover:bg-sunken cursor-pointer transition-colors ${className}`}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );
}
