"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { encryptJSON } from "@/lib/encryption";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";

const INTERVAL_MS = 30_000;

/** Haversine distance in meters. */
function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * When location sharing is on: every 30s read geolocation, encrypt the exact
 * coordinates with the user's device key (never sent in plaintext), and store
 * only the coarse area ("campus"/"outside") readable by friends.
 */
export function useLocationTracking(): void {
  const user = useAuthStore((s) => s.user);
  const enabled = useSettingsStore((s) => s.locationSharing);
  const campus = useSettingsStore((s) => s.campusCenter);

  useEffect(() => {
    if (!user || !enabled || !("geolocation" in navigator)) return;

    let cancelled = false;

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          const area =
            campus &&
            distanceM(latitude, longitude, campus.lat, campus.lng) <= (campus.radiusM || 800)
              ? ("campus" as const)
              : ("outside" as const);
          const encrypted = await encryptJSON({ lat: latitude, lng: longitude, at: Date.now() });
          const supabase = getSupabaseBrowser();
          await supabase
            .from("location_shares")
            .upsert(
              {
                user_id: user.id,
                area: campus ? area : null,
                encrypted_coords: encrypted,
                // ~110m-rounded position for the friends map (consented via
                // the same location-sharing toggle); exact coords stay encrypted
                approx_lat: Math.round(latitude * 1000) / 1000,
                approx_lng: Math.round(longitude * 1000) / 1000,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            )
            .then(() => undefined); // rate-limit trigger may reject fast updates — fine
        },
        () => undefined,
        { enableHighAccuracy: false, maximumAge: 25_000, timeout: 10_000 }
      );
    };

    tick();
    const interval = setInterval(tick, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, enabled, campus]);
}
