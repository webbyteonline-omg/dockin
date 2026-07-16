import webpush from "web-push";
import type { SupabaseAdmin } from "../supabase/server";
import type { PushSubscriptionJSON } from "../supabase/types";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:notifications@pulse.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    email.startsWith("mailto:") ? email : `mailto:${email}`,
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to every subscription a user has.
 * Removes subscriptions that the push service reports as gone (404/410).
 */
export async function sendPushToUser(
  admin: SupabaseAdmin,
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured()) return;

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (row) => {
      const sub = row.subscription as PushSubscriptionJSON;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    })
  );
}
