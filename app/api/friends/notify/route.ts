import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/notifications/webpush";

/** Push a friend-request notification to the receiver. */
export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = z
    .object({ receiverId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = getSupabaseAdmin();
  // Verify a real pending request exists (no spoofed notifications)
  const { data: req } = await admin
    .from("friend_requests")
    .select("id")
    .eq("sender_id", user.id)
    .eq("receiver_id", parsed.data.receiverId)
    .eq("status", "pending")
    .maybeSingle();
  if (!req) return NextResponse.json({ error: "No pending request" }, { status: 404 });

  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.display_name ?? profile?.username ?? "Someone";

  await sendPushToUser(admin, parsed.data.receiverId, {
    title: `👥 ${name} sent you a friend request`,
    body: "Open DockIn to accept or reject.",
    url: "/friends?tab=requests",
    tag: `freq-${req.id}`,
  });
  return NextResponse.json({ ok: true });
}
