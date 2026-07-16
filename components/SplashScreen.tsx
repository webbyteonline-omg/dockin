"use client";

import { motion } from "framer-motion";

/**
 * Brief branded overlay shown once per browser session on app boot (see
 * useShowSplash in components/providers.tsx) — NOT the same as the
 * /welcome landing screen. This is a fast fade covering cold-start data
 * fetching, not an onboarding step.
 */
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center dockin-dark"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onAnimationComplete={() => {
        // Give the boot animation a beat, then let the app show through.
        const t = setTimeout(onComplete, 650);
        return () => clearTimeout(t);
      }}
    >
      <div className="font-display font-black text-[42px] leading-none bg-gradient-to-br from-white via-primary to-secondary bg-clip-text text-transparent">
        Dock in.
      </div>
    </motion.div>
  );
}
