"use client";
import { CheckCircleIcon, AlertTriangleIcon, XIcon } from "@/components/icons";

const TONES = {
  success: { box: "bg-success-50 border-success-200 text-success-800", bar: "bg-success-600", Icon: CheckCircleIcon, role: "status", ms: 5000 },
  error: { box: "bg-danger-50 border-danger-200 text-danger-700", bar: "bg-danger-600", Icon: AlertTriangleIcon, role: "alert", ms: 9000 },
};

/**
 * The result of an action, pinned to the corner of the screen so it is seen wherever the page is scrolled.
 * `notice` is { type: "success" | "error", message, at }; a new `at` replaces the toast and restarts its timer.
 * The timer is the progress bar's own CSS animation: it pauses while the pointer or keyboard focus is on the toast.
 */
export default function Toast({ notice, onClose, label }) {
  if (!notice) return null;
  const tone = TONES[notice.type] || TONES.success;
  const { Icon } = tone;
  return (
    <div className="fixed z-50 top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 sm:w-96 pointer-events-none">
      <div
        key={notice.at}
        role={tone.role}
        className={`group pointer-events-auto relative overflow-hidden rounded-xl border shadow-float animate-toast-in ${tone.box}`}
      >
        <div className="flex items-start gap-3 p-4 pr-3">
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1 min-w-0 text-body-sm font-semibold break-words m-0">{notice.message}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 -mt-0.5 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-current opacity-70 hover:opacity-100 focus-visible:opacity-100"
            aria-label={label}
          >
            <XIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <span
          aria-hidden="true"
          onAnimationEnd={onClose}
          style={{ animationDuration: `${tone.ms}ms` }}
          className={`absolute left-0 bottom-0 h-1 w-full origin-left animate-toast-timer group-hover:[animation-play-state:paused] group-has-[:focus-visible]:[animation-play-state:paused] ${tone.bar}`}
        />
      </div>
    </div>
  );
}
