"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Static suffix shown at the right, e.g. "@bennett.edu.in". */
  suffix?: string;
  /** Interactive right element, e.g. a show/hide-password toggle. */
  rightSlot?: React.ReactNode;
  error?: string;
}

/** Bordered auth text field — matches the Sign Up / Profile Setup mockups exactly: label above, flat #F5F3FA fill, 1.5px border. */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, suffix, rightSlot, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      <div className="text-xs font-bold text-ink/45 mb-1.5 tracking-wide">{label.toUpperCase()}</div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-input bg-input border-[1.5px] border-line/[0.08] px-[18px] py-4 transition",
          "focus-within:ring-2 focus-within:ring-primary/40",
          error && "ring-2 ring-danger/50"
        )}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-faint focus:outline-none",
            className
          )}
          {...props}
        />
        {suffix && <span className="shrink-0 text-sm font-semibold text-secondary">{suffix}</span>}
        {rightSlot}
      </div>
      {error && (
        <p className="mt-1.5 px-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
