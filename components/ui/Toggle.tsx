"use client";

import { cn } from "@/lib/utils";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-6 rounded-pill transition-colors shrink-0",
        checked ? "dockin-gradient" : "bg-line/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
