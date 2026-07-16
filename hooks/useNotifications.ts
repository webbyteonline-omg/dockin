"use client";

import { useCallback, useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

/**
 * Web-push subscription lifecycle. On first login we prompt once; the
 * subscription is stored server-side via /api/push/subscribe.
 */
export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => undefined);
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user || permission === "unsupported") return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) return false;
      setSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [user, permission]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { permission, subscribed, busy, subscribe, unsubscribe };
}

/** One-time gentle prompt after first login. */
export function usePushPromptOnce() {
  const { permission, subscribed, subscribe } = usePushNotifications();
  const user = useAuthStore((s) => s.user);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || permission !== "default" || subscribed) return;
    const asked = localStorage.getItem("pulse-push-prompted");
    if (asked) return;
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [user, permission, subscribed]);

  const accept = useCallback(async () => {
    localStorage.setItem("pulse-push-prompted", "1");
    setShow(false);
    await subscribe();
  }, [subscribe]);

  const dismiss = useCallback(() => {
    localStorage.setItem("pulse-push-prompted", "1");
    setShow(false);
  }, []);

  return { show, accept, dismiss };
}
