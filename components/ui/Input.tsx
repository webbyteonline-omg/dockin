"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, rightSlot, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-ink-dim mb-1.5 tracking-wide"
        >
          {label.toUpperCase()}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            "w-full h-[52px] px-4 rounded-input bg-input border-[1.5px] border-line/[0.08] text-[15px] font-medium text-ink",
            "placeholder:text-ink-faint transition-shadow",
            "focus:outline-none focus:ring-2 focus:ring-primary/40",
            error && "ring-2 ring-danger/50",
            rightSlot ? "pr-11" : null,
            className
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-ink-dim mb-1.5 tracking-wide">
          {label.toUpperCase()}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          "w-full min-h-[96px] p-4 rounded-input bg-input border-[1.5px] border-line/[0.08] text-[15px] text-ink resize-y",
          "placeholder:text-ink-faint transition-shadow",
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
          error && "ring-2 ring-danger/50",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
