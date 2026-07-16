"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Optional extra control rendered next to the close button (e.g. "Mark all read"). */
  titleAction?: React.ReactNode;
  children: React.ReactNode;
  /** "sheet" slides from bottom on mobile; "center" is a centered dialog. */
  variant?: "sheet" | "center";
  className?: string;
}

/** Modal / bottom-sheet with backdrop, escape handling, body scroll lock. */
export function Modal({ open, onClose, title, titleAction, children, variant = "sheet", className }: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Callers frequently pass an inline `onClose={() => ...}` — a fresh
  // function identity on every one of THEIR re-renders, which may have
  // nothing to do with this modal's own open/close lifecycle. Keeping
  // onClose in a ref means the effects below only ever depend on `open`.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Android back button / edge-swipe fix: push a history entry on open so
  // hardware/gesture back closes the sheet first instead of falling through
  // to the browser's real history stack.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ dockinSheet: true }, "");
    const onPopState = () => onCloseRef.current();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.dockinSheet) window.history.back();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={variant === "sheet" ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 12 }}
            animate={variant === "sheet" ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={variant === "sheet" ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onAnimationComplete={(definition) => {
              if (definition !== "animate") return;
              const first = bodyRef.current?.querySelector<HTMLElement>(
                "input, textarea, select, [contenteditable]"
              );
              first?.focus();
            }}
            className={cn(
              "relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto",
              "flat-card",
              variant === "sheet"
                ? "rounded-t-card sm:rounded-card pb-safe"
                : "rounded-card mx-4",
              className
            )}
          >
            {variant === "sheet" && (
              <div className="sm:hidden pt-3 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-line/20" />
              </div>
            )}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              {title && <h2 className="text-base font-bold">{title}</h2>}
              <div className="flex items-center gap-3 ml-auto">
                {titleAction}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-ink-dim hover:text-ink hover:bg-line/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div ref={bodyRef} className="px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
