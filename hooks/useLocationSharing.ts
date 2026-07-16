"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

const UPDATE_INTERVAL_MS = 60_000;

/**
 * Explicit opt-in live location sharing for the Friends-page map — separate
 * from `useLocationTracking` (which drives the coarse campus/off-campus
 * indicator via `location_shares`). This one writes exact coordinates to
 * `user_locations` only while the user has actively toggled sharing on,
 * and stops immediately (both the interval AND the stored row) the moment
 * they toggle it off or the component unmounts.
 */
export function useLocationSharing() {
  const user = useAuthStore((s) => s.user);
  const [isSharing, setIsSharing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!user) return;
      const supabase = getSupabaseBrowser();
      await supabase.from("user_locations").upsert(
        {
          user_id: user.id,
          latitude: lat,
          longitude: lng,
          is_sharing: true,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    [user]
  );

  const stopSharing = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSharing(false);
    if (!user) return;
    const supabase = getSupabaseBrowser();
    await supabase
      .from("user_locations")
      .update({ is_sharing: false, last_updated: new Date().toISOString() })
      .eq("user_id", user.id);
  }, [user]);

  const startSharing = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsSharing(true);
        setPermissionDenied(false);
        void uploadLocation(pos.coords.latitude, pos.coords.longitude);

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => void uploadLocation(p.coords.latitude, p.coords.longitude),
            () => undefined,
            { enableHighAccuracy: false, maximumAge: 55_000, timeout: 10_000 }
          );
        }, UPDATE_INTERVAL_MS);
      },
      () => setPermissionDenied(true),
      { enableHighAccuracy: false, maximumAge: 55_000, timeout: 10_000 }
    );
  }, [uploadLocation]);

  const toggleSharing = useCallback(() => {
    if (isSharing) void stopSharing();
    else startSharing();
  }, [isSharing, startSharing, stopSharing]);

  // Restore sharing state on mount if the user left it on last session —
  // and always clear the interval on unmount so a closed tab/app never
  // keeps silently polling geolocation in the background.
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowser();
    let cancelled = false;
    supabase
      .from("user_locations")
      .select("is_sharing")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.is_sharing) startSharing();
      });
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { isSharing, toggleSharing, permissionDenied };
}
