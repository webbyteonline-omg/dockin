"use client";

import { useEffect, useState } from "react";

/** Tiny local toast — matches the existing per-page pattern (e.g.
 * finance/borrow/page.tsx) rather than introducing a global toast system,
 * but centralizes the auto-dismiss timer so callers don't each reimplement
 * (and risk getting wrong) the setTimeout cleanup. */
export function useToast(durationMs = 1800) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  return { toast: message, showToast: setMessage };
}
