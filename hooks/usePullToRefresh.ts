"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh via touch events. Attach the returned ref to a scroll
 * container; pulling down >70px from the top triggers onRefresh.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;
    let pulling = false;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      const touch = e.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      pulling = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const touch = e.touches[0];
      if (!touch) return;
      const delta = touch.clientY - startY;
      if (delta > 0 && el.scrollTop <= 0) {
        setPull(Math.min(110, delta * 0.5));
      } else {
        setPull(0);
      }
    };

    const onTouchEnd = async () => {
      if (!pulling) return;
      pulling = false;
      setPull((current) => {
        if (current > 70) {
          setRefreshing(true);
          onRefresh().finally(() => {
            setRefreshing(false);
            setPull(0);
          });
          return 60;
        }
        return 0;
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);

  return { ref, pull, refreshing };
}
