"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Splash / landing screen — matches "01 — Splash" in the DockIn UI reference
 * exactly: full-bleed campus photo, dark gradient wash, mood + live-hint
 * sticker pills up top, gradient "Dock in." wordmark + Caveat tagline at the
 * bottom, "swipe up to enter" hint. Swiping up (or tapping) advances to signup.
 */
export default function WelcomePage() {
  const router = useRouter();
  const startY = useRef<number | null>(null);

  const enter = () => router.push("/signup");

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startY.current == null) return;
      const endY = e.changedTouches[0]?.clientY ?? startY.current;
      if (startY.current - endY > 60) enter();
      startY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      onClick={enter}
      className="relative min-h-dvh w-full overflow-hidden bg-[#14121C] cursor-pointer select-none"
    >
      <Image
        src="/dockin/campus-sunset.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,45,120,0.25) 0%, rgba(20,18,26,0.15) 35%, rgba(20,18,26,0.94) 100%)",
        }}
      />
      <div
        className="absolute rounded-full blur-[10px]"
        style={{
          bottom: 170,
          right: -40,
          width: 200,
          height: 200,
          background: "radial-gradient(circle, rgba(255,107,53,0.45), transparent 70%)",
        }}
      />
      <div
        className="absolute text-[26px] text-accent"
        style={{ top: 130, right: 30, transform: "rotate(12deg)" }}
      >
        ✦
      </div>

      {/* Top pills */}
      <div className="absolute top-16 left-6 right-6 flex flex-col gap-2.5 pt-safe">
        <div className="self-start bg-accent rounded-pill px-4 py-2.5 text-[13px] font-extrabold text-[#14121C] -rotate-3">
          Mood: buried in assignments
        </div>
        <div className="self-start bg-white rounded-pill px-4 py-2.5 text-[13px] font-extrabold text-[#14121C] flex items-center gap-1.5 rotate-1">
          <span className="w-[7px] h-[7px] rounded-full bg-success inline-block" />
          3 friends online · 2 new snaps
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-14 left-6 right-6 flex flex-col gap-3.5 pb-safe">
        <div>
          <div className="font-display font-bold text-xl text-white/65">Hey, Ananya</div>
          <div
            className="font-display font-black text-[46px] leading-none -tracking-[0.03em] mt-1 bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(120deg, #fff 25%, #FF6B35 65%, #FF2D78 100%)",
            }}
          >
            Dock in.
          </div>
        </div>
        <div className="font-hand font-bold text-accent text-[23px] -rotate-2">
          ur bestie&apos;s already here
        </div>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-2 text-white/85 text-sm font-semibold"
        >
          <span className="text-lg leading-none">↑</span> Swipe up to enter
        </motion.div>
      </div>
    </main>
  );
}
