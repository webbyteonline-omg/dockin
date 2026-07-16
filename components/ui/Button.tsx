"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "dockin-gradient text-white",
  secondary: "flat-card-plain text-ink",
  ghost: "bg-transparent text-ink-dim hover:text-ink hover:bg-card",
  danger: "bg-danger-dim text-danger border border-danger/30 hover:bg-danger/25",
  success: "bg-success-dim text-success border border-success/30 hover:bg-success/25",
  dark: "bg-[#14121C] text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-xs rounded-pill gap-1.5",
  md: "h-10 px-5 text-sm rounded-pill gap-2",
  lg: "h-[52px] px-7 text-[16px] rounded-pill gap-2",
};

/** Button with haptic-like press feedback (scale animation). Pill-shaped by default, per the DockIn flat design system. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center font-bold select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});
